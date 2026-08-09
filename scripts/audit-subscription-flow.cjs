const fs = require("node:fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const files = {
  subscription: read("lib/subscription.ts"),
  xendit: read("lib/xendit.ts"),
  billingServer: read("lib/billing-server.ts"),
  subscriptionManagement: read("lib/subscription-management.ts"),
  checkout: read("app/api/billing/checkout/route.ts"),
  schedule: read("lib/xendit-subscription-schedule.ts"),
  webhook: read("app/api/billing/webhook/xendit/route.ts"),
  coach: read("app/api/coach/route.ts"),
  plan: read("app/api/generate-plan/route.ts"),
  premium: read("app/premium/page.tsx"),
  atomic: read("supabase/migrations/202607300012_atomic_ai_completions.sql"),
  accountDelete: read("app/api/account/delete/route.ts"),
  monitoringApi: read("app/api/admin/monitoring/route.ts"),
  monitoringUi: read("app/admin/monitoring/page.tsx"),
  legalMigration: read("supabase/migrations/202608050013_legal_and_premium_weekly_quota.sql"),
  planBadge: read("components/account-plan-badge.tsx"),
};

const checks = [
  ["premium price", files.subscription.includes("49_000")],
  ["free plan generation limit", files.subscription.includes("FREE_LIFETIME_GENERATION_LIMIT = 2")],
  ["premium weekly generation limit", files.subscription.includes("PREMIUM_WEEKLY_GENERATION_LIMIT = 10")],
  ["Xendit 2026 API version", files.xendit.includes('"2026-01-01"')],
  ["session API uses version header", /createXenditPaymentSession[\s\S]*apiVersion: XENDIT_RECURRING_API_VERSION/.test(files.xendit)],
  ["checkout requires recurring consent", files.checkout.includes("BILLING_CONSENT_REQUIRED")],
  ["checkout requires subscription terms", files.checkout.includes("SUBSCRIPTION_TERMS_REQUIRED")],
  ["billing consent is versioned", files.checkout.includes("FITMATE_SUBSCRIPTION_TERMS_VERSION") && files.checkout.includes("FITMATE_RECURRING_PAYMENT_CONSENT_VERSION")],
  ["checkout offers QRIS one-time mode", files.checkout.includes('session_type: "PAY"') && files.checkout.includes('allowed_payment_channels: ["QRIS"]')],
  ["checkout keeps automatic recurring mode", files.checkout.includes('session_type: "SUBSCRIPTION"') && files.checkout.includes('paymentMode === "recurring"')],
  ["QRIS skips recurring consent", files.checkout.includes('paymentMode === "recurring" && body.acceptRecurringTerms !== true')],
  ["pending checkout is reused only for matching mode", files.checkout.includes("getPremiumPaymentMode(item.metadata) === paymentMode")],
  ["checkout uses idempotency reference", /createXenditPaymentSession[\s\S]*?referenceId\s*\)/.test(files.checkout) && /createXenditSubscriptionSession[\s\S]*?referenceId\s*\)/.test(files.checkout)],
  ["checkout mutex", files.checkout.includes("acquire_billing_checkout_lock")],
  ["checkout reuses Xendit customer id", files.checkout.includes("provider_customer_id") && files.checkout.includes("customer_id")],
  ["checkout has explicit Xendit expiry", files.checkout.includes("expires_at: expiresAt")],
  ["monthly anchor follows checkout expiry", files.checkout.includes("anchor_date: anchorDate") && files.schedule.includes("jakartaNow.getUTCMonth() + 1") && files.schedule.includes("MAX_XENDIT_MONTHLY_ANCHOR_DAY")],
  ["orphan checkout cleanup", files.checkout.includes("deactivateXenditSubscriptionPlan")],
  ["Xendit request timeout", files.xendit.includes("AbortSignal.timeout(15_000)")],
  ["webhook token verification", files.webhook.includes("verifyXenditWebhookToken")],
  ["webhook duplicate protection", files.webhook.includes('eventInsertError.code === "23505"')],
  ["failed webhook can be retried", files.webhook.includes("existingEvent") && files.webhook.includes("eventRow.processed")],
  ["unmatched webhook is acknowledged safely", files.webhook.includes("acknowledged: true") && files.webhook.includes("processed: false")],
  ["Xendit suffixed reference is canonicalized", files.webhook.includes("canonicalFitMateReference") && files.webhook.includes("FITMATE_CHECKOUT_REFERENCE")],
  ["unmatched real checkout requests a retry", files.webhook.includes("if (fitMateReference)") && files.webhook.includes("No local subscription matched")],
  ["cycle payment id parsing", files.webhook.includes("attempt_details") && files.webhook.includes("succeededAttempt.payment_id")],
  ["successful amount validation", files.webhook.includes("Payment amount mismatch")],
  ["capture.succeeded activates payment", files.webhook.includes('eventType.includes("capture.succeeded")')],
  ["capture.failed is handled", files.webhook.includes('eventType.includes("capture.failed")')],
  ["QRIS gets exactly 30-day access", files.subscription.includes("PREMIUM_QRIS_ACCESS_DAYS = 30") && files.webhook.includes("createQrisAccessPeriod(paidAt)")],
  ["verified QRIS session completion is accepted", files.webhook.includes("isVerifiedQrisSessionCompletion") && files.webhook.includes('payment.session.completed')],
  ["QRIS has no next automatic billing", files.webhook.includes('paymentMode === "qris" || subscription.status === "canceled"')],
  ["QRIS access mode reaches billing status", files.billingServer.includes("paymentMode: getPremiumPaymentMode")],
  ["active QRIS does not cancel a completed provider session", files.subscriptionManagement.includes('!(paymentMode === "qris" && wasActive)')],
  ["webhook preserves active state on late session events", files.webhook.includes('["active", "past_due", "canceled"].includes(subscription.status)')],
  ["stale failure protection", files.webhook.includes("isStaleFailure")],
  ["refund webhook support", files.webhook.includes('eventType.includes("refund.succeeded")')],
  ["refund cancels recurring plan", files.webhook.includes("deactivateXenditSubscriptionPlan")],
  ["account deletion cancels subscription first", files.accountDelete.includes("cancelSubscriptionForUser")],
  ["atomic workout completion", files.plan.includes("complete_generated_workout_plan") && files.atomic.includes("complete_generated_workout_plan")],
  ["premium weekly quota is enforced in SQL", files.legalMigration.includes("PREMIUM_WEEKLY_LIMIT_REACHED") && files.legalMigration.includes("count_completed_premium_plan_generation")],
  ["failed plan attempts do not count weekly quota", files.legalMigration.includes("new.status = 'completed'")],
  ["atomic coach completion", files.coach.includes("complete_ai_feature_result") && files.atomic.includes("complete_ai_feature_result")],
  ["premium UI has recurring consent", files.premium.includes("acceptedRecurringTerms")],
  ["premium UI has subscription terms consent", files.premium.includes("acceptedSubscriptionTerms")],
  ["premium UI offers QRIS and automatic choices", files.premium.includes('setPaymentMode("qris")') && files.premium.includes('setPaymentMode("recurring")')],
  ["premium UI displays 10 daily limits", files.premium.includes("10 konsultasi") && files.premium.includes("10 scan")],
  ["admin subscription metrics API", files.monitoringApi.includes("estimatedMrrIdr") && files.monitoringApi.includes("revenueIdr30d")],
  ["admin subscription metrics UI", files.monitoringUi.includes("activePremiumSubscriptions") && files.monitoringUi.includes("estimatedMrrIdr")],
  ["global account plan badge", files.planBadge.includes('data-testid="account-plan-badge"') && files.planBadge.includes("billing.isPremium")],
];

const checkoutReference = "fitmate-premium-14a32a97-373f-4a70-90bc-85e82ee61110";
const xenditReference = `${checkoutReference}_9c7f9272-544f-4c46-b332-c33c247739ce`;
const canonicalReference = xenditReference.match(
  /^(fitmate-premium-(?:(?:qris|recurring)-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:_|$)/i
)?.[1];
checks.push(["reference regression example", canonicalReference === checkoutReference]);

for (const paymentMode of ["qris", "recurring"]) {
  const modeReference = `fitmate-premium-${paymentMode}-14a32a97-373f-4a70-90bc-85e82ee61110`;
  const suffixedReference = `${modeReference}_9c7f9272-544f-4c46-b332-c33c247739ce`;
  const canonicalModeReference = suffixedReference.match(
    /^(fitmate-premium-(?:(?:qris|recurring)-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:_|$)/i
  )?.[1];
  checks.push([`${paymentMode} reference regression example`, canonicalModeReference === modeReference]);
}

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
const result = {
  status: failures.length ? "FAIL" : "PASS",
  checks: Object.fromEntries(checks),
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
