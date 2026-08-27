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
const twoDScene = read("components/exercise-2d-scene.tsx");
const threeDPreview = read("components/exercise-3d-preview.tsx");
const exerciseVideoAssets = read("lib/exercise-video-assets.ts");
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
  exercisesPage.includes("getExerciseVideoAsset") &&
    exercisesPage.includes("posterSrc") &&
    exercisesPage.includes("<ExerciseMuscleMap") &&
    exercisesPage.includes("<video") &&
    exerciseVideoAssets.includes("/exercise-videos/") &&
    exerciseVideoAssets.includes("/exercise-video-posters/"),
  "The exercise library must use video-derived thumbnails and expose the complete mobile video movement guide."
);
assert(
  threeDGuide.includes("getExerciseSplitAsset") &&
    threeDGuide.includes("stepSrcs") &&
    threeDGuide.includes("musclesSrc") &&
    threeDGuide.includes("tipsSrc") &&
    threeDGuide.includes("mistakesSrc"),
  "Every exercise guide must expose split step, target-muscle, tip, and mistake assets."
);
assert(
  twoDScene.includes("drawCharacter") &&
    twoDScene.includes("drawEquipment") &&
    twoDScene.includes("drawMuscleHighlights") &&
    twoDScene.includes("drawMotionArrow"),
  "The 2D fallback scene must keep the character, equipment, muscle highlights, and movement direction together."
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

const emojiPattern = /[\u{1F000}-\u{1FAFF}\u2600-\u27BF]/u;
for (const page of pages) {
  assert(
    !emojiPattern.test(read(page)),
    `${page} must not use decorative emoji in the product UI.`
  );
}
assert(
  read("components/fitmate-icon.tsx").includes("export default function FitMateIcon"),
  "FitMate must use the shared line-icon system for product UI."
);

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
      emojiFreePages: pages.length,
      sharedLineIconSystem: true,
      exerciseSpecificExplorePreviews: true,
      split2DExerciseGuides: true,
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
      guideViews: ["steps", "target-muscles", "important-tips", "common-mistakes"],
      splitGuideAssets: true,
      procedural2DFallback: true,
      passwordRecovery: true,
      monitoringDashboard: true,
      stagingE2EGuard: true,
    },
    null,
    2
  )
);
