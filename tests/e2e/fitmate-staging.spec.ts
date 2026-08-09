import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const target =
  process.env.FITMATE_E2E_TARGET?.trim().toLowerCase();
const email = process.env.FITMATE_E2E_EMAIL?.trim();
const password =
  process.env.FITMATE_E2E_PASSWORD?.trim();
const supabaseUrl =
  process.env.FITMATE_E2E_SUPABASE_URL?.trim();
const supabaseAnonKey =
  process.env.FITMATE_E2E_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey =
  process.env.FITMATE_E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();
const canMutateStaging =
  target === "staging" &&
  Boolean(
    email &&
      password &&
      supabaseUrl &&
      supabaseAnonKey &&
      serviceRoleKey
  );

async function getStagingAdminContext() {
  const admin = createClient(
    supabaseUrl!,
    serviceRoleKey!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
  const {
    data: { users },
    error,
  } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1_000,
  });

  expect(error).toBeNull();
  const user = users.find(
    (candidate) =>
      candidate.email?.toLowerCase() ===
      email!.toLowerCase()
  );
  expect(user).toBeTruthy();

  return { admin, user: user! };
}

test.describe("FitMate Supabase staging", () => {
  test.skip(
    !canMutateStaging,
    "Set the dedicated FITMATE_E2E_* staging variables before running mutating E2E tests."
  );

  test("login and protected Dashboard work on desktop and mobile", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page
      .getByTestId("login-submit")
      .click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("forgot-password entry is understandable", async ({
    page,
  }) => {
    await page.goto("/login");
    await page
      .getByTestId("forgot-password-open")
      .click();

    await expect(
      page.getByTestId("forgot-password-submit")
    ).toBeVisible();
    await expect(
      page.getByLabel("Email")
    ).toBeVisible();
  });

  test("generated workout supports muscle-matched substitution and Start Workout", async ({
    page,
  }) => {
    const { admin, user } =
      await getStagingAdminContext();
    const { error: cleanupError } = await admin
      .from("workout_sessions")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("status", "in_progress");
    expect(cleanupError).toBeNull();

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page
      .getByTestId("login-submit")
      .click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/workout");
    const startButton = page
      .getByTestId("start-workout")
      .first();
    await expect(startButton).toBeVisible({
      timeout: 30_000,
    });

    const unavailable = page
      .getByTestId("equipment-unavailable")
      .first();

    if (await unavailable.isVisible()) {
      await unavailable.click();
      await expect(
        page.getByText(
          /Pilihan dengan target otot yang sama|Options for the same target muscle/
        )
      ).toBeVisible();
    }

    await startButton.click();
    await expect(
      page.getByText(
        /Workout started|Latihan dimulai|workout in progress/i
      )
    ).toBeVisible({ timeout: 30_000 });

    const loadInput = page
      .getByTestId("exercise-load-input")
      .first();

    if (await loadInput.isVisible()) {
      await loadInput.fill("12.5");
      await expect(loadInput).toHaveValue("12.5");
    }
  });

  test("AI server enforces Free lifetime and Premium daily limits without calling the model", async ({
    request,
  }) => {
    const { admin } = await getStagingAdminContext();
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const temporaryEmail = `fitmate-limit-${suffix}@example.com`;
    const temporaryPassword = `FitMate-${suffix}-A9!`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: temporaryEmail,
      password: temporaryPassword,
      email_confirm: true,
    });
    expect(createError).toBeNull();
    expect(created.user).toBeTruthy();
    const temporaryUser = created.user!;

    try {
      const publicClient = createClient(
        supabaseUrl!,
        supabaseAnonKey!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );
      const {
        data: { session },
        error: signInError,
      } = await publicClient.auth.signInWithPassword({
        email: temporaryEmail,
        password: temporaryPassword,
      });

      expect(signInError).toBeNull();
      expect(session?.access_token).toBeTruthy();

      const { error: freeUsageError } = await admin
        .from("ai_feature_usage_lifetime")
        .upsert({
          user_id: temporaryUser.id,
          free_chat_successes: 1,
          free_nutrition_successes: 1,
          total_chat_successes: 1,
          total_nutrition_successes: 1,
        });
      expect(freeUsageError).toBeNull();

      const headers = {
        Authorization: `Bearer ${session!.access_token}`,
      };

      const checkoutWithoutConsent = await request.post(
        "/api/billing/checkout",
        {
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          data: { acceptRecurringTerms: false },
        }
      );
      expect(checkoutWithoutConsent.status()).toBe(422);
      expect((await checkoutWithoutConsent.json()).code).toBe(
        "BILLING_CONSENT_REQUIRED"
      );

      const { error: generationUsageError } = await admin
        .from("plan_generation_usage")
        .upsert({
          user_id: temporaryUser.id,
          free_successful_generations: 2,
          total_successful_generations: 2,
        });
      expect(generationUsageError).toBeNull();

      const { data: generationReservation, error: generationReservationError } =
        await admin.rpc("reserve_plan_generation", {
          p_user_id: temporaryUser.id,
        });
      expect(generationReservationError).toBeNull();
      const generationRow = Array.isArray(generationReservation)
        ? generationReservation[0]
        : generationReservation;
      expect(generationRow.allowed).toBe(false);
      expect(generationRow.reason).toBe("FREE_LIFETIME_LIMIT_REACHED");

      const freeChatResponse = await request.post("/api/coach", {
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        data: {
          message: "This Free request must be stopped before calling the model.",
          language: "en",
        },
      });
      expect(freeChatResponse.status()).toBe(402);
      expect((await freeChatResponse.json()).code).toBe("PREMIUM_REQUIRED");

      const tinyPng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      );
      const freeNutritionResponse = await request.post("/api/coach", {
        headers,
        multipart: {
          image: {
            name: "staging-meal.png",
            mimeType: "image/png",
            buffer: tinyPng,
          },
          language: "en",
        },
      });
      expect(freeNutritionResponse.status()).toBe(402);
      expect((await freeNutritionResponse.json()).code).toBe("PREMIUM_REQUIRED");

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1_000);
      const { error: subscriptionError } = await admin
        .from("user_subscriptions")
        .insert({
          user_id: temporaryUser.id,
          reference_id: `e2e-${suffix}`,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_at: periodEnd.toISOString(),
          amount: 49000,
        });
      expect(subscriptionError).toBeNull();

      const jakartaDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
      const { error: dailyUsageError } = await admin
        .from("ai_feature_usage_daily")
        .upsert({
          user_id: temporaryUser.id,
          usage_date: jakartaDate,
          premium_chat_successes: 10,
          premium_nutrition_successes: 10,
        });
      expect(dailyUsageError).toBeNull();

      const premiumChatResponse = await request.post("/api/coach", {
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        data: {
          message: "This Premium request must stop at the daily limit.",
          language: "en",
        },
      });
      expect(premiumChatResponse.status()).toBe(429);
      expect((await premiumChatResponse.json()).code).toBe("DAILY_LIMIT_REACHED");

      const premiumNutritionResponse = await request.post("/api/coach", {
        headers,
        multipart: {
          image: {
            name: "staging-meal.png",
            mimeType: "image/png",
            buffer: tinyPng,
          },
          language: "en",
        },
      });
      expect(premiumNutritionResponse.status()).toBe(429);
      expect((await premiumNutritionResponse.json()).code).toBe("DAILY_LIMIT_REACHED");
    } finally {
      await admin.auth.admin.deleteUser(temporaryUser.id);
    }
  });

  test("Generate Plan completes against staging when explicitly enabled", async ({
    page,
  }) => {
    test.skip(
      process.env.FITMATE_E2E_RUN_AI !== "true",
      "Set FITMATE_E2E_RUN_AI=true to run the paid generation flow."
    );

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page
      .getByTestId("login-submit")
      .click();
    await page.goto("/plan");

    const generate = page
      .getByTestId("generate-plan")
      .first();
    await expect(generate).toBeVisible({
      timeout: 30_000,
    });

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/generate-plan") &&
        response.request().method() === "POST",
      { timeout: 90_000 }
    );
    await generate.click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    await expect(
      page.getByText(/RENCANA SIAP|PLAN READY/)
    ).toBeVisible({ timeout: 30_000 });
  });
});
