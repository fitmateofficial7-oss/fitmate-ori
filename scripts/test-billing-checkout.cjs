const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const { NextRequest, NextResponse } = require("next/server");

const root = path.resolve(__dirname, "..");
const user = {
  id: "12345678-1234-4234-8234-123456789abc",
  email: "checkout@example.com",
  user_metadata: { full_name: "FitMate Member" },
};

// Run the real checkout route and Xendit client. Only authentication, storage,
// and HTTP transport are replaced; no test sends a payment or uses real keys.
function checkoutHarness({ existingCustomer = false, providerError = false } = {}) {
  const requests = [];
  const subscriptions = [];
  const consents = [];
  const locks = [];
  const admin = {
    async rpc(name) {
      locks.push(name);
      return {
        data: name === "acquire_billing_checkout_lock"
          ? { allowed: true, lock_token: "test-lock" }
          : null,
        error: null,
      };
    },
    from(table) {
      const query = {
        select() { return query; },
        eq() { return query; },
        in() { return query; },
        gte() { return query; },
        not() { return query; },
        order() { return query; },
        limit() { return query; },
        then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
        async maybeSingle() {
          return {
            data: existingCustomer ? { provider_customer_id: "cust-test" } : null,
            error: null,
          };
        },
        async upsert(rows) {
          assert.equal(table, "user_consents");
          consents.push(...rows);
          return { error: null };
        },
        async insert(row) {
          assert.equal(table, "user_subscriptions");
          subscriptions.push(row);
          return { error: null };
        },
      };
      return query;
    },
  };
  const fakeFetch = async (url, options) => {
    assert.equal(url, "https://api.xendit.co/sessions");
    assert.equal(options.method, "POST");
    const payload = JSON.parse(options.body);
    requests.push({ payload, headers: options.headers });
    const entries = Object.entries(payload.metadata);
    if (entries.some(([, value]) => typeof value !== "string")) {
      return Response.json({ error_code: "INVALID_METADATA", message: "Metadata value must be a string" }, { status: 400 });
    }
    assert.ok(entries.length <= 20);
    for (const [key, value] of entries) {
      assert.ok(key.length <= 40);
      assert.ok(value.length <= 80);
    }
    if (providerError) {
      return Response.json({ error_code: "INVALID_PAYMENT_CHANNEL", message: "QRIS unavailable" }, { status: 400 });
    }
    return Response.json({
      payment_session_id: "ps-test",
      reference_id: payload.reference_id,
      customer_id: "cust-test",
      status: "ACTIVE",
      payment_link_url: "https://checkout.example.com/test",
    }, { status: 201 });
  };
  const modules = new Map();
  function load(relativePath) {
    if (modules.has(relativePath)) return modules.get(relativePath);
    const filename = path.join(root, relativePath);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const loadedModule = { exports: {} };
    vm.runInNewContext(outputText, {
      module: loadedModule,
      exports: loadedModule.exports,
      require(specifier) {
        if (specifier === "server-only") return {};
        if (specifier === "next/server") return { NextRequest, NextResponse };
        if (specifier === "@/lib/server-auth") return {
          createServiceRoleClient: () => admin,
          getBearerUser: async () => user,
        };
        if (specifier === "@/lib/billing-server") return {
          getBillingStatus: async () => ({ isPremium: false }),
        };
        if (specifier.startsWith("@/lib/")) return load(`${specifier.slice(2)}.ts`);
        if (specifier === "node:crypto") return require(specifier);
        throw new Error(`Unexpected test dependency: ${specifier}`);
      },
      process: { env: { XENDIT_SECRET_KEY: "xnd_development_test_only", FITMATE_APP_URL: "https://fitmate.example.com" } },
      Buffer, URL, AbortSignal, console, fetch: fakeFetch,
    }, { filename });
    modules.set(relativePath, loadedModule.exports);
    return loadedModule.exports;
  }
  const { POST } = load("app/api/billing/checkout/route.ts");
  return {
    requests, subscriptions, consents, locks,
    async checkout(body) {
      const response = await POST(new NextRequest("https://fitmate.example.com/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }));
      return { status: response.status, body: await response.json() };
    },
  };
}

for (const paymentMode of ["qris", "recurring"]) {
  for (const existingCustomer of [false, true]) {
    test(`${paymentMode}: ${existingCustomer ? "saved" : "new"} customer receives checkout URL`, async () => {
      const harness = checkoutHarness({ existingCustomer });
      const result = await harness.checkout({
        paymentMode,
        acceptSubscriptionTerms: true,
        acceptRecurringTerms: paymentMode === "recurring",
        language: existingCustomer ? "en" : "id",
      });
      assert.equal(result.status, 201, result.body.error);
      assert.equal(result.body.checkoutUrl, "https://checkout.example.com/test");
      assert.equal(result.body.paymentMode, paymentMode);
      assert.equal(harness.requests.length, 1);
      const { payload, headers } = harness.requests[0];
      assert.equal(payload.amount, 49000);
      assert.equal(payload.currency, "IDR");
      assert.equal(payload.metadata.fitmate_user_id, user.id);
      assert.equal(payload.metadata.reference_id, result.body.referenceId);
      assert.equal(headers["idempotency-key"], result.body.referenceId);
      assert.equal(headers["api-version"], "2026-01-01");
      assert.equal(payload.metadata.payment_mode, paymentMode);
      assert.equal(payload.metadata.subscription_terms_version, "2026-08-05");
      assert.equal(Boolean(payload.customer_id), existingCustomer);
      assert.equal(Boolean(payload.customer), !existingCustomer);
      const saved = harness.subscriptions[0];
      assert.equal(saved.status, "pending");
      assert.equal(saved.metadata.payment_mode, paymentMode);
      if (paymentMode === "qris") {
        assert.equal(payload.session_type, "PAY");
        assert.deepEqual(payload.allowed_payment_channels, ["QRIS"]);
        assert.equal(payload.allow_save_payment_method, "DISABLED");
        assert.equal(Object.hasOwn(payload.metadata, "recurring_consent_version"), false);
        assert.equal(Object.hasOwn(payload, "subscription"), false);
        assert.equal(saved.metadata.access_days, 30);
        assert.equal(saved.metadata.manual_renewal, true);
        assert.equal(harness.consents.length, 1);
      } else {
        assert.equal(payload.session_type, "SUBSCRIPTION");
        assert.equal(payload.metadata.recurring_consent_version, "2026-08-05");
        assert.equal(payload.subscription.immediate_payment, true);
        assert.ok(Date.parse(payload.subscription.schedule.anchor_date) >= Date.parse(payload.expires_at));
        assert.equal(saved.metadata.manual_renewal, false);
        assert.equal(harness.consents.length, 2);
      }
      assert.deepEqual(harness.locks, ["acquire_billing_checkout_lock", "release_billing_checkout_lock"]);
    });
  }
}

test("recurring checkout still requires explicit recurring consent", async () => {
  const harness = checkoutHarness();
  const result = await harness.checkout({ paymentMode: "recurring", acceptSubscriptionTerms: true });
  assert.equal(result.status, 422);
  assert.equal(result.body.code, "BILLING_CONSENT_REQUIRED");
  assert.equal(harness.requests.length, 0);
});

test("provider rejection releases lock without creating a subscription", async () => {
  const harness = checkoutHarness({ providerError: true });
  const result = await harness.checkout({ paymentMode: "qris", acceptSubscriptionTerms: true });
  assert.equal(result.status, 400);
  assert.match(result.body.error, /QRIS unavailable/);
  assert.equal(harness.subscriptions.length, 0);
  assert.deepEqual(harness.locks, ["acquire_billing_checkout_lock", "release_billing_checkout_lock"]);
});
