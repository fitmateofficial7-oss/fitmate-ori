#!/usr/bin/env node

const fs = require("node:fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const plan = read("app/plan/page.tsx");
const coach = read("app/coach/page.tsx");
const exercises = read("app/exercises/page.tsx");
const progress = read("app/progress/page.tsx");
const nutrition = read("app/nutrition/page.tsx");
const premium = read("app/premium/page.tsx");
const gate = read("components/premium-feature-gate.tsx");
const hook = read("hooks/use-premium-access.ts");
const coachApi = read("app/api/coach/route.ts");
const billingServer = read("lib/billing-server.ts");

assert(
  plan.includes('result?.code === "PREMIUM_REQUIRED"') &&
    plan.includes("feature=plan-generation"),
  "Plan generation must redirect Free users to Premium after the lifetime quota is exhausted."
);
assert(
  coach.includes("feature=ai-consultation") &&
    coach.includes('data.code === "PREMIUM_REQUIRED"') &&
    nutrition.includes("feature=meal-scan") &&
    nutrition.includes('data.code === "PREMIUM_REQUIRED"'),
  "Coach consultation and Nutrition meal scan must redirect Free users to Premium when their lifetime quota is exhausted."
);
assert(
  exercises.includes("const FREE_EXERCISE_LIMIT = 10") &&
    exercises.includes("blur-[5px]") &&
    exercises.includes("Khusus Premium"),
  "The Free exercise library must expose 10 exercises and blur-lock the rest."
);
assert(
  progress.includes("<PremiumFeatureGate") &&
    nutrition.includes("usePremiumAccess") &&
    nutrition.includes("Tracking nutrisi ada di Premium") &&
    nutrition.includes('capture="environment"'),
  "Progress must stay Premium-gated while Nutrition keeps meal scan accessible and locks advanced tracking for Free accounts."
);
assert(
  gate.includes("blur-[7px]") &&
    gate.includes("Upgrade ke Premium") &&
    hook.includes('/api/billing/status'),
  "Premium page gates must verify billing status and render a blurred upgrade state."
);
assert(
  premium.includes('text-slate-950 dark:text-white') &&
    !premium.includes('fitmate-app-page min-h-screen bg-slate-950 pb-20 text-white'),
  "Premium page typography must remain readable in both light and dark themes."
);
assert(
  coachApi.includes("async function getAuthenticatedUser(") &&
    coachApi.includes("admin.auth.getUser(accessToken)") &&
    coachApi.includes("createServerClient("),
  "Coach API must define Bearer-token and cookie authentication."
);
assert(
  billingServer.includes("isMissingSupabaseObject") &&
    billingServer.includes("subscriptionResult.error ? []"),
  "Billing status must gracefully handle a fresh Supabase schema while migrations are pending."
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      autoRedirects: ["plan-generation", "ai-consultation", "meal-scan"],
      free3DExerciseGuides: 10,
      lockedPages: ["progress", "nutrition-tracking"],
      themeAwarePremiumPage: true,
    },
    null,
    2
  )
);
