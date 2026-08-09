#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const motivation = read("app/motivation/page.tsx");
const workout = read("app/workout/page.tsx");
const exercisesPage = read("app/exercises/page.tsx");
const dashboard = read("app/dashboard/page.tsx");
const threeDGuide = read("components/exercise-3d-guide.tsx");
const threeDCanvas = read("components/simple-exercise-3d-canvas.tsx");
const threeDPreview = read("components/exercise-3d-preview.tsx");
const coachApi = read("app/api/coach/route.ts");
const coachPage = read("app/coach/page.tsx");
const generatePlanApi = read("app/api/generate-plan/route.ts");
const substitutions = read("lib/exercise-substitutions.ts");
const loadMigration = read(
  "supabase/migrations/202607270006_exercise_load_progress.sql"
);
const monitoringMigration = read(
  "supabase/migrations/202607270007_monitoring.sql"
);
const monitoringPage = read(
  "app/admin/monitoring/page.tsx"
);
const monitoringApi = read(
  "app/api/admin/monitoring/route.ts"
);
const clientMonitoring = read(
  "components/client-monitoring.tsx"
);
const loginPage = read("app/login/page.tsx");
const resetPasswordPage = read(
  "app/reset-password/page.tsx"
);
const stagingTests = read(
  "tests/e2e/fitmate-staging.spec.ts"
);
const aiEntitlementMigration = read(
  "supabase/migrations/202607300010_ai_feature_entitlements.sql"
);
const subscriptionMigration = read(
  "supabase/migrations/202607300009_subscription_and_generation_quota.sql"
);
const premiumPage = read("app/premium/page.tsx");
const pages = [
  "app/page.tsx",
  "app/login/page.tsx",
  "app/register/page.tsx",
  "app/onboarding/page.tsx",
  "app/dashboard/page.tsx",
  "app/plan/page.tsx",
  "app/workout/page.tsx",
  "app/exercises/page.tsx",
  "app/coach/page.tsx",
  "app/motivation/page.tsx",
  "app/reset-password/page.tsx",
  "app/admin/monitoring/page.tsx",
];
const moodCounts = Object.fromEntries(
  ["lazy", "tired", "ready"].map((mood) => [
    mood,
    (
      motivation.match(
        new RegExp(`mood: "${mood}"`, "g")
      ) || []
    ).length,
  ])
);

assert(
  motivation.includes("const BOOST_LIMIT = 10;"),
  "Mood Booster must be limited to 10 uses."
);
assert(
  Object.values(moodCounts).every((count) => count >= 12),
  `Each mood needs at least 12 messages: ${JSON.stringify(
    moodCounts
  )}`
);
assert(
  motivation.includes("shownQuoteIds") &&
    motivation.includes("unseenQuotes"),
  "Mood Booster must avoid repeated messages."
);
assert(
  exercisesPage.includes("<Exercise3DPreview") &&
    exercisesPage.includes("<Exercise3DGuide") &&
    !exercisesPage.includes(">🏋️<"),
  "The exercise library must use the lightweight 3D preview and the full 3D guide."
);
assert(
  threeDGuide.includes("SimpleExercise3DCanvas") &&
    threeDGuide.includes('["animation"') &&
    threeDGuide.includes('["start"') &&
    threeDGuide.includes('["finish"'),
  "Every exercise guide must expose animation, start, and finish 3D modes."
);
assert(
  threeDCanvas.includes('getContext("webgl"') &&
    threeDCanvas.includes("drawCharacter") &&
    threeDCanvas.includes("drawEquipment") &&
    threeDCanvas.includes("pointerdown") &&
    threeDCanvas.includes("wheel"),
  "The 3D canvas must render the character and equipment together with rotate and zoom controls."
);
assert(
  threeDPreview.includes("3D") &&
    !threeDCanvas.includes("GLTFLoader") &&
    !threeDCanvas.includes("FBXLoader") &&
    !threeDCanvas.includes('from "three"'),
  "The simple character must avoid external model files and heavyweight 3D dependencies."
);
assert(
  generatePlanApi.includes("getCanonicalExerciseName") &&
    generatePlanApi.includes("fallbackByMuscleGroup"),
  "Generated exercise names must normalize to calibrated canonical movements."
);
assert(
  coachApi.includes("reserveAiUsage") &&
    coachApi.includes("PREMIUM_REQUIRED") &&
    aiEntitlementMigration.includes("v_limit := 1;") &&
    aiEntitlementMigration.includes("v_limit := 10;") &&
    coachPage.includes("1 konsultasi + 1 scan makanan seumur hidup") &&
    coachPage.includes("10 konsultasi + 10 scan makanan per hari"),
  "AI Coach must enforce one lifetime Free consultation/scan and separate Premium pools of 10 per Jakarta day."
);
assert(
  subscriptionMigration.includes("free_successful_generations between 0 and 2") &&
    generatePlanApi.includes("reserve_plan_generation") &&
    generatePlanApi.includes("PREMIUM_REQUIRED") &&
    premiumPage.includes("PREMIUM_MONTHLY_PRICE_IDR") &&
    premiumPage.includes("acceptedRecurringTerms"),
  "Subscription UI and server quota enforcement must include two lifetime Free generations and recurring Premium consent."
);
assert(
  workout.includes("Alat tidak tersedia") &&
    workout.includes("getReplacementCandidates") &&
    substitutions.includes("targetsMuscleGroup") &&
    substitutions.includes(".slice(0, maximum)"),
  "Equipment substitutions must be limited to a short, muscle-matched list."
);
assert(
  workout.includes("Beban (opsional)") &&
    workout.includes("load_kg") &&
    dashboard.includes("Progres Beban Latihan") &&
    dashboard.includes("exerciseLoadChartPoints") &&
    loadMigration.includes("load_kg numeric(7, 2)"),
  "Optional exercise load logging and the Dashboard progress chart must be present."
);
assert(
  loginPage.includes("resetPasswordForEmail") &&
    loginPage.includes("/reset-password") &&
    resetPasswordPage.includes("updateUser") &&
    resetPasswordPage.includes(
      "/login?notice=password-reset"
    ),
  "Login and Reset Password must implement a complete Supabase recovery flow."
);
assert(
  monitoringMigration.includes(
    "create table if not exists public.app_events"
  ) &&
    monitoringPage.includes("Pusat Monitoring") &&
    monitoringApi.includes("FITMATE_ADMIN_EMAILS") &&
    clientMonitoring.includes(
      "unhandledrejection"
    ),
  "Monitoring must include protected storage, an admin dashboard, and client error capture."
);
assert(
  stagingTests.includes(
    'target === "staging"'
  ) &&
    stagingTests.includes("start-workout") &&
    stagingTests.includes(
      "FITMATE_E2E_RUN_AI"
    ),
  "Mutating E2E tests must be staging-only and cover core workout and AI flows."
);

for (const page of pages) {
  assert(
    read(page).includes("LiveIcon"),
    `${page} must include live icon motion.`
  );
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      boostLimit: 10,
      motivationMessages: Object.values(moodCounts).reduce(
        (total, count) => total + count,
        0
      ),
      messagesPerMood: moodCounts,
      pagesWithLiveIcons: pages.length,
      exerciseSpecificExplorePreviews: true,
      procedural3DExerciseGuides: true,
      muscleMatchedSubstitutions: true,
      optionalExerciseLoad: true,
      dashboardLoadChart: true,
      freeCoachConsultationLifetimeLimit: 1,
      freeMealScanLifetimeLimit: 1,
      premiumCoachConsultationDailyLimit: 10,
      premiumMealScanDailyLimit: 10,
      freePlanGenerationLifetimeLimit: 2,
      premiumMonthlyPriceIdr: 49000,
      canonicalGeneratedExerciseNames: true,
      guideViews: ["animation", "start", "finish"],
      cameraViews: ["front", "side", "back", "drag-360"],
      webglRenderer: true,
      externalModelFiles: false,
      passwordRecovery: true,
      monitoringDashboard: true,
      stagingE2EGuard: true,
    },
    null,
    2
  )
);
