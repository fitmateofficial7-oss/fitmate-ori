const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase/migrations");
const migrationNames = [
  "202607280008_prelaunch_features.sql",
  "202607300009_subscription_and_generation_quota.sql",
  "202607300010_ai_feature_entitlements.sql",
  "202607300011_billing_checkout_lock.sql",
  "202607300012_atomic_ai_completions.sql",
  "202607310011_jogging_tracker.sql",
  "202608050013_legal_and_premium_weekly_quota.sql",
];
const migrations = Object.fromEntries(
  migrationNames.map((name) => [
    name,
    fs.readFileSync(path.join(migrationsDir, name), "utf8"),
  ])
);

const failures = [];
const compatibilitySql = migrations["202607280008_prelaunch_features.sql"];
const requiredCompatibilityTokens = [
  "format_type(a.atttypid, a.atttypmod)",
  "public.workout_sessions'::regclass",
  "public.workout_exercise_logs'::regclass",
  "public.exercises'::regclass",
  "public.nutrition_analyses'::regclass",
  "workout_set_logs_workout_session_id_fkey",
  "workout_set_logs_workout_exercise_log_id_fkey",
  "adaptive_recommendations_source_session_id_fkey",
  "nutrition_entries_nutrition_analysis_id_fkey",
];

for (const token of requiredCompatibilityTokens) {
  if (!compatibilitySql.includes(token)) {
    failures.push(`Missing compatibility token: ${token}`);
  }
}

const forbiddenCompatibilityPatterns = [
  /workout_session_id\s+uuid\s+not null\s+references\s+public\.workout_sessions/i,
  /workout_exercise_log_id\s+uuid\s+not null\s+references\s+public\.workout_exercise_logs/i,
  /source_session_id\s+uuid\s+references\s+public\.workout_sessions/i,
  /nutrition_analysis_id\s+uuid\s+references\s+public\.nutrition_analyses/i,
  /exercise_id\s+bigint\s+references\s+public\.exercises/i,
];
for (const pattern of forbiddenCompatibilityPatterns) {
  if (pattern.test(compatibilitySql)) {
    failures.push(`Hard-coded foreign-key type remains: ${pattern}`);
  }
}

const requiredCommercialTokens = {
  "202607300009_subscription_and_generation_quota.sql": [
    "free_successful_generations between 0 and 2",
    "create or replace function public.reserve_plan_generation",
    "create or replace function public.complete_plan_generation",
    "create table if not exists public.user_subscriptions",
    "create table if not exists public.billing_webhook_events",
    "grant execute on function public.reserve_plan_generation(uuid) to service_role",
  ],
  "202607300010_ai_feature_entitlements.sql": [
    "free_chat_successes between 0 and 1",
    "free_nutrition_successes between 0 and 1",
    "premium_chat_successes between 0 and 10",
    "premium_nutrition_successes between 0 and 10",
    "create or replace function public.reserve_ai_feature_usage",
    "grant execute on function public.reserve_ai_feature_usage(uuid, text) to service_role",
  ],
  "202607300011_billing_checkout_lock.sql": [
    "create table if not exists public.billing_checkout_locks",
    "create or replace function public.acquire_billing_checkout_lock",
    "create or replace function public.release_billing_checkout_lock",
    "grant execute on function public.acquire_billing_checkout_lock(uuid, integer)",
  ],
  "202607300012_atomic_ai_completions.sql": [
    "create or replace function public.complete_generated_workout_plan",
    "create or replace function public.complete_ai_feature_result",
    "from public.complete_plan_generation",
    "from public.finalize_ai_feature_usage",
    "grant execute on function public.complete_generated_workout_plan",
    "grant execute on function public.complete_ai_feature_result",
  ],
  "202607310011_jogging_tracker.sql": [
    "create table if not exists public.jogging_sessions",
    "route_points jsonb not null",
    "alter table public.jogging_sessions enable row level security",
    "auth.uid() = user_id",
    "grant select, insert, update, delete",
  ],
  "202608050013_legal_and_premium_weekly_quota.sql": [
    "subscription_terms",
    "recurring_payment",
    "premium_week_successful_generations",
    "PREMIUM_WEEKLY_LIMIT_REACHED",
    "count_completed_premium_plan_generation",
    "timezone('Asia/Jakarta', now())",
  ],
};

for (const [name, tokens] of Object.entries(requiredCommercialTokens)) {
  for (const token of tokens) {
    if (!migrations[name].includes(token)) {
      failures.push(`${name}: missing required token: ${token}`);
    }
  }
}

const migrationChecks = {};
for (const [name, sql] of Object.entries(migrations)) {
  const beginCount = (sql.match(/^begin;$/gim) || []).length;
  const commitCount = (sql.match(/^commit;$/gim) || []).length;
  const dollarQuoteCount = (sql.match(/\$\$/g) || []).length;
  const doStartCount = (sql.match(/^do \$\$$/gim) || []).length;
  const doEndCount = (sql.match(/^end \$\$;$/gim) || []).length;

  if (beginCount !== 1 || commitCount !== 1) {
    failures.push(
      `${name}: expected one transaction wrapper, found begin=${beginCount}, commit=${commitCount}`
    );
  }
  if (dollarQuoteCount % 2 !== 0) {
    failures.push(`${name}: unbalanced dollar quotes (${dollarQuoteCount})`);
  }
  if (doStartCount !== doEndCount) {
    failures.push(
      `${name}: unbalanced DO blocks, starts=${doStartCount}, ends=${doEndCount}`
    );
  }
  if (/grant execute on function public\.(reserve|finalize|release|complete|acquire)[^(]*\([^;]+\) to authenticated/i.test(sql)) {
    failures.push(`${name}: privileged entitlement function granted to authenticated role`);
  }

  migrationChecks[name] = {
    begin: beginCount,
    commit: commitCount,
    dollarQuotes: dollarQuoteCount,
    dynamicDoBlocks: doStartCount,
  };
}

const result = {
  status: failures.length ? "FAIL" : "PASS",
  migrations: migrationChecks,
  compatibleParentIds: [
    "workout_sessions.id",
    "workout_exercise_logs.id",
    "exercises.id",
    "nutrition_analyses.id",
  ],
  commercialRules: {
    freePlanGenerationsLifetime: 2,
    freeAiConsultationsLifetime: 1,
    freeMealScansLifetime: 1,
    premiumAiConsultationsDaily: 10,
    premiumMealScansDaily: 10,
    premiumPlanGenerationsWeekly: 10,
    checkoutMutex: true,
    atomicPlanCompletion: true,
    atomicCoachCompletion: true,
  },
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
