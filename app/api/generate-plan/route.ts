import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

import { getBillingStatus } from "@/lib/billing-server";
import { getCanonicalExerciseName } from "@/lib/exercise-guides";
import {
  recordAiMonitoringEvent,
  recordMonitoringEvent,
} from "@/lib/server-monitoring";

// ======================================================
// CONFIG
// ======================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ======================================================
// ENVIRONMENT VARIABLES
// ======================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiPlanModel =
  process.env.OPENAI_PLAN_MODEL?.trim() ||
  process.env.OPENAI_MODEL?.trim() ||
  "gpt-5.6";
const openaiFallbackModel =
  process.env.OPENAI_FALLBACK_MODEL?.trim() ||
  "gpt-4.1-mini";

// ======================================================
// VALIDATE ENVIRONMENT VARIABLES
// ======================================================

function getRequiredEnv(
  value: string | undefined,
  name: string
): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

const SUPABASE_URL = getRequiredEnv(
  supabaseUrl,
  "NEXT_PUBLIC_SUPABASE_URL"
);

const SUPABASE_PUBLIC_KEY = getRequiredEnv(
  supabasePublicKey,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
);

const SUPABASE_SERVICE_ROLE_KEY = getRequiredEnv(
  supabaseServiceRoleKey,
  "SUPABASE_SERVICE_ROLE_KEY"
);

const OPENAI_API_KEY = getRequiredEnv(
  openaiApiKey,
  "OPENAI_API_KEY"
);

// ======================================================
// SUPABASE ADMIN CLIENT
// ======================================================

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ======================================================
// OPENAI CLIENT
// ======================================================

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// ======================================================
// TYPES
// ======================================================

type Difficulty = "easy" | "medium" | "hard";

type FitnessProfile = {
  id?: string;
  user_id: string;

  goal?: string | null;
  experience?: string | null;
  training_days?: string | null;
  difficulty?: Difficulty | string | null;

  age?: number | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  injury_history?: string[] | null;
  movement_limitations?: string[] | null;
  pain_areas?: string[] | null;
  available_equipment?: string[] | null;
  medical_clearance_required?: boolean | null;
};

type Exercise = {
  name: string;
  muscle_group: string;
  sets: number;
  reps: string;
  rest: string;
};

type WorkoutDay = {
  day: number;
  name: string;
  focus: string;
  muscle_groups: string[];
  exercises: Exercise[];
};

type WorkoutSummary = {
  goal: string;
  experience: string;
  training_days: string;
  difficulty: Difficulty;

  age: number;
  gender: string;
  height: number;
  weight: number;
};

type WorkoutPlan = {
  title: string;
  summary: WorkoutSummary;
  days: WorkoutDay[];
};

type GeneratePlanRequest = {
  goal?: string;
  experience?: string | null;
  training_days?: string | null;
  difficulty?: Difficulty | string;
  language?: "id" | "en" | string;

  age?: number | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
};

const GeneratedExerciseSchema = z.object({
  name: z.string(),
  muscle_group: z.string(),
  sets: z.number().int(),
  reps: z.string(),
  rest: z.string(),
});

const GeneratedWorkoutDaySchema = z.object({
  day: z.number().int(),
  name: z.string(),
  focus: z.string(),
  muscle_groups: z.array(z.string()),
  exercises: z.array(GeneratedExerciseSchema),
});

const GeneratedWorkoutPlanSchema = z.object({
  title: z.string(),
  summary: z.object({
    goal: z.string(),
    experience: z.string(),
    training_days: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    age: z.number(),
    gender: z.string(),
    height: z.number(),
    weight: z.number(),
  }),
  days: z.array(GeneratedWorkoutDaySchema).length(7),
});

// ======================================================
// HELPER
// NORMALIZE DIFFICULTY
// ======================================================

function normalizeDifficulty(
  value: unknown
): Difficulty {
  if (
    value === "easy" ||
    value === "medium" ||
    value === "hard"
  ) {
    return value;
  }

  return "medium";
}

// ======================================================
// HELPER
// CLEAN STRING
// ======================================================

function cleanString(
  value: unknown,
  fallback = ""
): string {
  if (
    typeof value === "string" &&
    value.trim().length > 0
  ) {
    return value.trim();
  }

  return fallback;
}

// ======================================================
// HELPER
// NORMALIZE NUMBER
// ======================================================

function normalizeNumber(
  value: unknown,
  fallback = 0
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return fallback;
}

// ======================================================
// HELPER
// NORMALIZE MUSCLE GROUP
// ======================================================

function normalizeMuscleGroup(
  value: unknown
): string {
  return cleanString(
    value,
    "General Fitness"
  );
}

// ======================================================
// HELPER
// NORMALIZE EXERCISE
// ======================================================

function normalizeExercise(
  exercise: unknown,
  index: number
): Exercise {
  const item =
    typeof exercise === "object" &&
    exercise !== null
      ? (exercise as Record<string, unknown>)
      : {};

  const requestedName = cleanString(
    item.name,
    `Exercise ${index + 1}`
  );

  const muscle_group =
    normalizeMuscleGroup(
      item.muscle_group
    );

  const fallbackByMuscleGroup: Array<
    [RegExp, string]
  > = [
    [/chest|dada|pectoralis/i, "Machine Chest Press"],
    [/back|punggung|latissimus/i, "Lat Pulldown"],
    [/shoulder|bahu|deltoid/i, "Dumbbell Shoulder Press"],
    [/tricep/i, "Rope Triceps Pushdown"],
    [/bicep|brachialis|lengan/i, "Alternating Dumbbell Curl"],
    [/hamstring/i, "Romanian Deadlift"],
    [/glute/i, "Hip Thrust Machine"],
    [/calf|calves|betis/i, "Standing Calf Raise Machine"],
    [/leg|quadricep|kaki|paha/i, "Leg Press"],
    [/core|abs|abdom|perut/i, "Plank"],
    [/cardio|kardio/i, "Treadmill Walk"],
  ];

  const name =
    getCanonicalExerciseName(requestedName) ||
    fallbackByMuscleGroup.find(([pattern]) =>
      pattern.test(muscle_group)
    )?.[1] ||
    "Plank";

  const rawSets =
    normalizeNumber(
      item.sets,
      3
    );

  const sets =
    rawSets > 0
      ? Math.min(
          Math.round(rawSets),
          10
        )
      : 3;

  let reps = "10-12";

  if (
    typeof item.reps === "string"
  ) {
    reps =
      item.reps.trim() ||
      "10-12";
  } else if (
    typeof item.reps === "number"
  ) {
    reps = String(item.reps);
  }

  let rest = "60-90 sec";

  if (
    typeof item.rest === "string"
  ) {
    rest =
      item.rest.trim() ||
      "60-90 sec";
  } else if (
    typeof item.rest === "number"
  ) {
    rest =
      `${item.rest} sec`;
  }

  return {
    name,
    muscle_group,
    sets,
    reps,
    rest,
  };
}

// ======================================================
// HELPER
// NORMALIZE WORKOUT DAY
// ======================================================

function normalizeWorkoutDay(
  day: unknown,
  index: number,
  language: "id" | "en"
): WorkoutDay {
  const item =
    typeof day === "object" &&
    day !== null
      ? (day as Record<string, unknown>)
      : {};

  const rawExercises =
    Array.isArray(item.exercises)
      ? item.exercises
      : [];

  const exercises =
    rawExercises.map(
      (
        exercise,
        exerciseIndex
      ) =>
        normalizeExercise(
          exercise,
          exerciseIndex
        )
    );

  const rawName =
    cleanString(
      item.name
    );

  const invalidNames = [
    "day",
    "day 1",
    "day 2",
    "day 3",
    "day 4",
    "day 5",
    "day 6",
    "day 7",
    "restday",
    "rest day",
    "workout day",
    "training day",
    "undefined",
    "null",
    "n/a",
    "na",
  ];

  const name =
    rawName &&
    !invalidNames.includes(
      rawName.toLowerCase()
    )
      ? rawName
      : exercises.length > 0
      ? language === "en"
        ? `Workout Day ${index + 1}`
        : `Hari Latihan ${index + 1}`
      : language === "en"
        ? "Rest Day"
        : "Hari Istirahat";

  const focus =
    cleanString(
      item.focus,
      exercises.length > 0
        ? language === "en"
          ? "Strength and Fitness Training"
          : "Latihan Kekuatan dan Kebugaran"
        : language === "en"
          ? "Recovery and Rest"
          : "Pemulihan dan Istirahat"
    );

  const rawMuscleGroups =
    Array.isArray(
      item.muscle_groups
    )
      ? item.muscle_groups
      : [];

  const muscleGroups =
    rawMuscleGroups
      .filter(
        (
          muscleGroup
        ): muscleGroup is string =>
          typeof muscleGroup ===
            "string" &&
          muscleGroup.trim().length > 0
      )
      .map(
        (
          muscleGroup
        ) =>
          muscleGroup.trim()
      );

  const uniqueMuscleGroups =
    Array.from(
      new Set(
        muscleGroups
      )
    );

  const finalMuscleGroups =
    uniqueMuscleGroups.length > 0
      ? uniqueMuscleGroups
      : exercises.length > 0
      ? Array.from(
          new Set(
            exercises.map(
              (
                exercise
              ) =>
                exercise.muscle_group
            )
          )
        )
      : [];

  return {
    day: index + 1,
    name,
    focus,
    muscle_groups:
      finalMuscleGroups,
    exercises,
  };
}

// ======================================================
// HELPER
// NORMALIZE WORKOUT PLAN
// ======================================================

function normalizeWorkoutPlan(
  rawPlan: unknown,
  profile: FitnessProfile,
  difficulty: Difficulty,
  expectedTrainingDays: number,
  language: "id" | "en"
): WorkoutPlan {
  if (
    typeof rawPlan !== "object" ||
    rawPlan === null
  ) {
    throw new Error(
      "AI returned an invalid workout plan."
    );
  }

  const source =
    rawPlan as Record<
      string,
      unknown
    >;

  const title =
    cleanString(
      source.title,
      language === "en"
        ? "Your Personalized Workout Plan"
        : "Rencana Latihan Personal Anda"
    );

  const rawSummary =
    typeof source.summary === "object" &&
    source.summary !== null
      ? (
          source.summary as Record<
            string,
            unknown
          >
        )
      : {};

  const summary: WorkoutSummary = {
    goal:
      cleanString(
        rawSummary.goal,
        profile.goal ||
          "General Fitness"
      ),

    experience:
      cleanString(
        rawSummary.experience,
        profile.experience ||
          "Beginner"
      ),

    training_days:
      cleanString(
        rawSummary.training_days,
        profile.training_days ||
          "3 days per week"
      ),

    difficulty:
      normalizeDifficulty(
        rawSummary.difficulty ||
          difficulty
      ),

    age:
      normalizeNumber(
        rawSummary.age,
        profile.age ?? 0
      ),

    gender:
      cleanString(
        rawSummary.gender,
        profile.gender || ""
      ),

    height:
      normalizeNumber(
        rawSummary.height,
        profile.height ?? 0
      ),

    weight:
      normalizeNumber(
        rawSummary.weight,
        profile.weight ?? 0
      ),
  };

  const rawDays =
    Array.isArray(
      source.days
    )
      ? source.days
      : [];

  if (
    rawDays.length !== 7
  ) {
    throw new Error(
      `AI generated ${rawDays.length} days. Exactly 7 days are required.`
    );
  }

  const days =
    rawDays.map(
      (
        day,
        index
      ) =>
        normalizeWorkoutDay(
          day,
          index,
          language
        )
    );

  const workoutDays =
    days.filter(
      (
        day
      ) =>
        day.exercises.length > 0
    );

  if (
    workoutDays.length === 0
  ) {
    throw new Error(
      "AI generated a plan without any workout days."
    );
  }

  // ====================================================
  // VALIDATE TRAINING DAY COUNT
  // ====================================================

  if (
    workoutDays.length !==
    expectedTrainingDays
  ) {
    throw new Error(
      `AI generated ${workoutDays.length} workout days, but exactly ${expectedTrainingDays} workout days are required.`
    );
  }

  // ====================================================
  // VALIDATE EXERCISES
  // ====================================================

  const totalExercises =
    days.reduce(
      (
        total,
        day
      ) =>
        total +
        day.exercises.length,
      0
    );

  if (
    totalExercises === 0
  ) {
    throw new Error(
      "AI generated a plan without exercises."
    );
  }

  return {
    title,
    summary,
    days,
  };
}

// ======================================================
// HELPER
// GET NUMBER OF TRAINING DAYS
// ======================================================

function extractTrainingDays(
  value: string | null | undefined
): number {
  if (!value) {
    return 3;
  }

  const lower =
    value.toLowerCase();

  const match =
    lower.match(
      /\d+/
    );

  if (match) {
    const number =
      Number(
        match[0]
      );

    if (
      Number.isFinite(
        number
      )
    ) {
      return Math.min(
        Math.max(
          Math.round(number),
          1
        ),
        7
      );
    }
  }

  const wordNumbers: Record<
    string,
    number
  > = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  };

  for (
    const [
      word,
      number,
    ] of Object.entries(
      wordNumbers
    )
  ) {
    if (
      lower.includes(
        word
      )
    ) {
      return number;
    }
  }

  return 3;
}

function shouldUseFallbackModel(
  error: unknown
) {
  if (!(error instanceof OpenAI.APIError)) {
    return false;
  }

  const code = String(error.code || "").toLowerCase();
  const message = error.message.toLowerCase();

  return (
    error.status === 404 ||
    code.includes("model") ||
    message.includes("model_not_found") ||
    message.includes("does not exist") ||
    message.includes("do not have access") ||
    message.includes("not supported")
  );
}

async function requestStructuredWorkoutPlan({
  systemPrompt,
  userPrompt,
}: {
  systemPrompt: string;
  userPrompt: string;
}) {
  const models = Array.from(
    new Set([
      openaiPlanModel,
      openaiFallbackModel,
    ])
  );
  let lastError: unknown;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];

    try {
      const response = await openai.responses.parse({
        model,
        instructions: systemPrompt,
        input: userPrompt,
        text: {
          format: zodTextFormat(
            GeneratedWorkoutPlanSchema,
            "fitmate_workout_plan"
          ),
        },
        max_output_tokens: 12_000,
      });

      if (!response.output_parsed) {
        throw new Error(
          "AI did not return a structured workout plan."
        );
      }

      return {
        plan: response.output_parsed,
        model,
        usage: response.usage,
      };
    } catch (error) {
      lastError = error;
      const hasFallback = index < models.length - 1;

      if (
        !hasFallback ||
        !shouldUseFallbackModel(error)
      ) {
        throw error;
      }

      console.warn(
        `Workout model ${model} is unavailable; retrying with ${models[index + 1]}.`
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "The AI service did not return a workout plan."
      );
}

// ======================================================
// AUTH HELPER
// ======================================================

async function getAuthenticatedUser(
  request: NextRequest
) {
  // ====================================================
  // OPTION 1
  // CHECK BEARER TOKEN
  // ====================================================

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    authorization &&
    authorization
      .toLowerCase()
      .startsWith(
        "bearer "
      )
  ) {
    const accessToken =
      authorization
        .replace(
          /^Bearer\s+/i,
          ""
        )
        .trim();

    if (
      accessToken
    ) {
      const {
        data: {
          user,
        },
        error,
      } =
        await supabaseAdmin.auth.getUser(
          accessToken
        );

      if (
        !error &&
        user
      ) {
        return user;
      }
    }
  }

  // ====================================================
  // OPTION 2
  // CHECK SUPABASE SESSION COOKIE
  // ====================================================

  const supabase =
    createServerClient(
      SUPABASE_URL,
      SUPABASE_PUBLIC_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll() {
            // Read-only authentication.
          },
        },
      }
    );

  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth.getUser();

  if (
    error ||
    !user
  ) {
    return null;
  }

  return user;
}

// ======================================================
// POST
// ======================================================

export async function POST(
  request: NextRequest
) {
  const requestStartedAt = Date.now();
  let monitoringUserId: string | null = null;
  let generationReservationId: string | null = null;
  let generationEntitlement: "free" | "premium" | null = null;

  try {
    // ==================================================
    // AUTHENTICATION
    // ==================================================

    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized. Please login again.",
        },
        {
          status: 401,
        }
      );
    }

    const userId =
      user.id;
    monitoringUserId = userId;

    // ==================================================
    // PARSE REQUEST BODY
    // ==================================================

    let body:
      GeneratePlanRequest = {};

    try {
      const parsedBody =
        await request.json();

      if (
        parsedBody &&
        typeof parsedBody ===
          "object"
      ) {
        body =
          parsedBody as GeneratePlanRequest;
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // LOAD FITNESS PROFILE
    // ==================================================

    const {
      data: profileData,
      error: profileError,
    } =
      await supabaseAdmin
        .from(
          "fitness_profiles"
        )
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        "Fitness profile error:",
        profileError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            `Failed to load fitness profile: ${profileError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    if (
      !profileData
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fitness profile not found. Please complete onboarding first.",
        },
        {
          status: 404,
        }
      );
    }

    // ==================================================
    // NORMALIZE PROFILE
    // ==================================================

    const profile =
      profileData as FitnessProfile;

    const responseLanguage =
      body.language === "en" ? "en" : "id";

    const difficulty =
      normalizeDifficulty(
        body.difficulty ||
          profile.difficulty ||
          "medium"
      );

    const goal =
      cleanString(
        profile.goal ||
          body.goal,
        "General Fitness"
      );

    const experience =
      cleanString(
        profile.experience ||
          body.experience,
        "Beginner"
      );

    const trainingDays =
      cleanString(
        profile.training_days ||
          body.training_days,
        "3 days per week"
      );

    const trainingDaysCount =
      extractTrainingDays(
        trainingDays
      );

    const age =
      normalizeNumber(
        profile.age ??
          body.age,
        0
      );

    const gender =
      cleanString(
        profile.gender ||
          body.gender
      );

    const height =
      normalizeNumber(
        profile.height ??
          body.height,
        0
      );

    const weight =
      normalizeNumber(
        profile.weight ??
          body.weight,
        0
      );

    const injuryHistory = (profile.injury_history || []).filter(Boolean);
    const movementLimitations = (profile.movement_limitations || []).filter(Boolean);
    const painAreas = (profile.pain_areas || []).filter(Boolean);
    const availableEquipment = (profile.available_equipment || []).filter(Boolean);
    const medicalClearanceRequired = Boolean(profile.medical_clearance_required);

    const historySince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const [sessionHistoryResult, readinessHistoryResult, recommendationHistoryResult] =
      await Promise.all([
        supabaseAdmin
          .from("workout_sessions")
          .select("status, started_at")
          .eq("user_id", userId)
          .gte("started_at", historySince),
        supabaseAdmin
          .from("readiness_logs")
          .select("readiness_score, created_at")
          .eq("user_id", userId)
          .gte("created_at", historySince),
        supabaseAdmin
          .from("adaptive_recommendations")
          .select("exercise_name, action, recommended_load_kg, reason, created_at")
          .eq("user_id", userId)
          .gte("created_at", historySince)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

    const recentSessions = sessionHistoryResult.data || [];
    const completedRecentSessions = recentSessions.filter(
      (session) => session.status === "completed"
    ).length;
    const attemptedRecentSessions = recentSessions.filter(
      (session) => session.status !== "cancelled"
    ).length;
    const adherencePercent = attemptedRecentSessions > 0
      ? Math.round((completedRecentSessions / attemptedRecentSessions) * 100)
      : null;
    const readinessScores = (readinessHistoryResult.data || [])
      .map((item) => Number(item.readiness_score))
      .filter(Number.isFinite);
    const averageReadiness = readinessScores.length > 0
      ? Math.round(readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length)
      : null;
    const adaptiveHistory = (recommendationHistoryResult.data || [])
      .map((item) => `${item.exercise_name}: ${item.action}${item.recommended_load_kg != null ? ` to ${item.recommended_load_kg} kg` : ""}`)
      .slice(0, 8);

    if (
      age < 13 ||
      age > 100 ||
      height < 100 ||
      height > 250 ||
      weight < 30 ||
      weight > 300
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your fitness profile is incomplete or contains invalid body data. Please update it before generating a plan.",
        },
        {
          status: 422,
        }
      );
    }

    // ==================================================
    // UPDATE DIFFICULTY
    // ==================================================

    const {
      error:
        updateProfileError,
    } =
      await supabaseAdmin
        .from(
          "fitness_profiles"
        )
        .update({
          difficulty,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "user_id",
          userId
        );

    if (
      updateProfileError
    ) {
      console.error(
        "Update profile error:",
        updateProfileError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            `Failed to save difficulty: ${updateProfileError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    // ==================================================
    // DIFFICULTY CONFIGURATION
    // ==================================================

    const difficultyConfig =
      {
        easy: {
          description:
            "Beginner-friendly, lower intensity, controlled volume, longer recovery, focus on technique and movement quality.",

          sets:
            "2-3 sets per exercise.",

          reps:
            "Mostly 10-15 reps. Compound movements may use 8-12 reps.",

          rest:
            "60-120 seconds.",

          exercises:
            "Usually 4-6 exercises per workout day.",

          volume:
            "Low to moderate weekly volume.",

          intensity:
            "Use manageable weights and stop with approximately 2-4 reps in reserve.",

          advancedTechniques:
            "Avoid advanced intensity techniques such as drop sets, forced reps, or failure training.",
        },

        medium: {
          description:
            "Intermediate balanced training with moderate volume, progressive overload and varied exercise selection.",

          sets:
            "3-4 sets per exercise.",

          reps:
            "Mostly 8-12 reps. Isolation exercises may use 10-15 reps.",

          rest:
            "45-120 seconds depending on exercise.",

          exercises:
            "Usually 5-8 exercises per workout day.",

          volume:
            "Moderate weekly volume.",

          intensity:
            "Use challenging but controlled weights and stop with approximately 1-3 reps in reserve.",

          advancedTechniques:
            "Occasional supersets or intensity variation may be used when appropriate.",
        },

        hard: {
          description:
            "Advanced high-volume and high-intensity training for experienced users.",

          sets:
            "3-5 sets per exercise.",

          reps:
            "Compound lifts may use 5-10 reps. Hypertrophy work usually uses 8-15 reps. Isolation exercises may use 10-20 reps.",

          rest:
            "60-180 seconds depending on exercise and intensity.",

          exercises:
            "Usually 6-10 exercises per workout day when recovery and training schedule allow.",

          volume:
            "High but sustainable weekly volume. Do not create excessive junk volume.",

          intensity:
            "Challenging loads with approximately 0-2 reps in reserve on selected exercises. Avoid failure on every set.",

          advancedTechniques:
            "May use limited supersets, drop sets, rest-pause or mechanical drop sets on suitable isolation exercises only.",
        },
      }[difficulty];

    // ==================================================
    // MUSCLE GROUP LIBRARY
    // ==================================================

    const muscleLibrary = `
CHEST:
- Pectoralis Major
- Upper Chest
- Mid Chest
- Lower Chest

BACK:
- Latissimus Dorsi
- Rhomboids
- Middle Traps
- Lower Traps
- Upper Traps
- Spinal Erectors

SHOULDERS:
- Front Deltoids
- Lateral Deltoids
- Rear Deltoids

ARMS:
- Biceps
- Triceps
- Brachialis
- Forearms

LOWER BODY:
- Quadriceps
- Hamstrings
- Gluteus Maximus
- Gluteus Medius
- Adductors
- Calves

CORE:
- Rectus Abdominis
- Obliques
- Transverse Abdominis
- Lower Back
`;

    // ==================================================
    // EXERCISE LIBRARY
    // ==================================================

    const exerciseLibrary = `
CHEST EXERCISES:
- Barbell Bench Press
- Incline Dumbbell Press
- Machine Chest Press
- Pec Deck Fly

BACK EXERCISES:
- Lat Pulldown
- Assisted Pull-Up
- Seated Cable Row

SHOULDER EXERCISES:
- Dumbbell Shoulder Press
- Dumbbell Lateral Raise

BICEPS EXERCISES:
- Barbell Curl
- Hammer Curl
- Preacher Curl Machine

TRICEPS EXERCISES:
- Rope Triceps Pushdown
- Assisted Dip Machine

LOWER-BODY EXERCISES:
- Barbell Back Squat
- Leg Press
- Bulgarian Split Squat
- Romanian Deadlift
- Hack Squat Machine
- Leg Extension Machine
- Seated Leg Curl Machine
- Hip Thrust Machine
- Standing Calf Raise Machine

CORE EXERCISES:
- Cable Crunch
- Ab Crunch Machine
- Ab Wheel Rollout
- Plank

CARDIO:
- Treadmill Walk

ADDITIONAL BICEPS VARIATIONS:
- Alternating Dumbbell Curl
`;

    // ==================================================
    // OPENAI SYSTEM PROMPT
    // ==================================================

    const systemPrompt = `
You are FitMate AI, a professional AI fitness coach and workout program designer.

Your task is to create a personalized, realistic, structured and varied 7-day gym workout plan.

IMPORTANT:
Return ONLY valid JSON.
Do NOT return Markdown.
Do NOT return code fences.
Do NOT return explanations outside JSON.

==================================================
LANGUAGE
==================================================

${
  responseLanguage === "en"
    ? "Write the plan title, day names, focus, muscle group labels, and all other descriptive text in English."
    : "Write the plan title, day names, focus, muscle group labels, and all other descriptive text in Indonesian."
}

Exercise name fields are the only exception: they MUST always use the exact English names from the exercise library, regardless of the selected language. Never translate an exercise name.

==================================================
SELECTED DIFFICULTY
==================================================

${difficulty.toUpperCase()}

Difficulty description:
${difficultyConfig.description}

Sets:
${difficultyConfig.sets}

Reps:
${difficultyConfig.reps}

Rest:
${difficultyConfig.rest}

Exercises:
${difficultyConfig.exercises}

Weekly volume:
${difficultyConfig.volume}

Intensity:
${difficultyConfig.intensity}

Advanced techniques:
${difficultyConfig.advancedTechniques}

==================================================
CORE RULES
==================================================

1. Return exactly 7 days.
2. Days must be numbered 1 through 7.
3. Every day must contain:
   - day
   - name
   - focus
   - muscle_groups
   - exercises
4. Rest days must have exercises as an empty array.
5. Workout days must contain real gym exercises.
6. Every exercise must contain:
   - name
   - muscle_group
   - sets
   - reps
   - rest
7. Sets must be positive integers.
8. Reps must be strings.
9. Rest must be strings.
10. Use different exercises throughout the week whenever practical.
10A. Use only exact exercise names from the exercise library. Never rename, abbreviate, or invent an exercise.
11. Avoid unnecessary exercise repetition.
12. Avoid junk volume.
13. Beginners should prioritize technique and recovery.
14. Intermediate users may receive moderate volume.
15. Advanced users may receive higher volume.
16. Do not recommend performance-enhancing drugs.
17. Do not recommend dangerous training practices.
18. Do not diagnose medical conditions.
19. Do not create more workout days than requested.
20. Create exactly ${trainingDaysCount} workout days.
21. If the user requests 1-2 training days, prioritize full-body training.
22. If the user requests 3-4 training days, use an appropriate full-body or upper/lower split.
23. If the user requests 5-6 training days, use an appropriate push/pull/legs or upper/lower split.
24. If the user requests 7 training days, at least one workout day must be lower-intensity recovery or mobility focused.
25. Ensure adequate recovery between training sessions targeting the same muscle groups.
26. Do not create excessive volume for beginners.
27. Avoid training the same major muscle group hard on consecutive days.
28. Never include an exercise that conflicts with reported injuries, pain areas, or movement limitations.
29. Prefer available equipment. If required equipment is unavailable, choose a safe exercise from the exact library that targets the same muscle group.
30. If medical_clearance_required is true, use conservative volume and intensity and avoid failure training.
31. Do not claim an exercise is safe for a specific injury; use cautious substitutions and recommend professional assessment for persistent or severe pain.
32. If recent adherence is below 60%, reduce unnecessary complexity and prioritize a schedule the user can consistently complete.
33. Use recent readiness and adaptive-load notes conservatively; never increase load solely because an AI recommendation exists.

==================================================
MUSCLE GROUP LIBRARY
==================================================

${muscleLibrary}

==================================================
EXERCISE LIBRARY
==================================================

${exerciseLibrary}

==================================================
TRAINING FREQUENCY
==================================================

The user requested exactly ${trainingDaysCount} workout days per week.

Create exactly 7 calendar days.

Provide exactly ${trainingDaysCount} actual workout days.

The remaining days should be:
- Rest
- Active Recovery
- Mobility
- Light Recovery Training

Do not make every day a hard workout.

==================================================
USER PROFILE
==================================================

Goal:
${goal}

Experience:
${experience}

Training schedule:
${trainingDays}

Age:
${age}

Gender:
${gender || "Not provided"}

Height:
${height || "Not provided"} cm

Weight:
${weight || "Not provided"} kg

Injury history:
${injuryHistory.length ? injuryHistory.join("; ") : "None reported"}

Movement limitations:
${movementLimitations.length ? movementLimitations.join("; ") : "None reported"}

Current pain areas:
${painAreas.length ? painAreas.join("; ") : "None reported"}

Available equipment:
${availableEquipment.length ? availableEquipment.join("; ") : "Use the FitMate exercise library and provide machine/bodyweight alternatives"}

Medical clearance flag:
${medicalClearanceRequired ? "Yes — keep intensity conservative and remind the user to follow professional clearance" : "No"}

Recent 14-day adherence:
${adherencePercent == null ? "No recent session history" : `${adherencePercent}% (${completedRecentSessions}/${attemptedRecentSessions} completed)`}

Average recent readiness:
${averageReadiness == null ? "No recent readiness history" : `${averageReadiness}/100`}

Recent adaptive load notes:
${adaptiveHistory.length ? adaptiveHistory.join("; ") : "No recommendations yet"}

Difficulty:
${difficulty}

==================================================
OUTPUT FORMAT
==================================================

{
  "title": "Personalized workout plan title",
  "summary": {
    "goal": "string",
    "experience": "string",
    "training_days": "string",
    "difficulty": "easy",
    "age": 0,
    "gender": "string",
    "height": 0,
    "weight": 0
  },
  "days": [
    {
      "day": 1,
      "name": "Push Day",
      "focus": "Chest, shoulders and triceps",
      "muscle_groups": [
        "Chest",
        "Shoulders",
        "Triceps"
      ],
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "muscle_group": "Chest",
          "sets": 3,
          "reps": "8-12",
          "rest": "90-120 sec"
        }
      ]
    },
    {
      "day": 2,
      "name": "Rest Day",
      "focus": "Recovery and Rest",
      "muscle_groups": [],
      "exercises": []
    }
  ]
}

The days array MUST contain exactly 7 objects.

The day values MUST be exactly:
1, 2, 3, 4, 5, 6, 7.

The plan MUST contain exactly ${trainingDaysCount} workout days.

The remaining days MUST have an empty exercises array.

Return ONLY valid JSON.
`;

    // ==================================================
    // OPENAI USER PROMPT
    // ==================================================

    const userPrompt = `
Create a personalized FitMate AI workout plan.

USER PROFILE:

Goal:
${goal}

Experience:
${experience}

Training Schedule:
${trainingDays}

Training Days Number:
${trainingDaysCount}

Difficulty:
${difficulty}

Age:
${age || "Not provided"}

Gender:
${gender || "Not provided"}

Height:
${height || "Not provided"} cm

Weight:
${weight || "Not provided"} kg

==================================================
REQUIREMENTS
==================================================

Create exactly 7 calendar days.

Create exactly ${trainingDaysCount} workout days.

Do not exceed ${trainingDaysCount} workout days.

The remaining days must be rest, active recovery or mobility days.

Use different exercises throughout the week whenever practical.

Choose a realistic training split based on:
- goal
- experience
- training frequency
- difficulty
- recovery requirements

Make sure the selected difficulty (${difficulty.toUpperCase()}) meaningfully changes:
- exercise volume
- sets
- reps
- rest periods
- training intensity
- recovery requirements

Ensure that the plan is realistic for the user's training frequency.

Return ONLY valid JSON.
`;

    // ==================================================
    // RESERVE GENERATION ENTITLEMENT
    // ==================================================

    const { data: reservationData, error: reservationError } =
      await supabaseAdmin.rpc("reserve_plan_generation", {
        p_user_id: userId,
      });

    if (reservationError) {
      throw new Error(
        `Unable to verify plan-generation quota: ${reservationError.message}`
      );
    }

    const reservation = (Array.isArray(reservationData)
      ? reservationData[0]
      : reservationData) as
      | {
          allowed?: boolean;
          reservation_id?: string | null;
          entitlement?: "free" | "premium";
          free_used?: number;
          free_limit?: number;
          reason?: string | null;
        }
      | null;

    if (!reservation?.allowed || !reservation.reservation_id) {
      const billing = await getBillingStatus(supabaseAdmin, userId);
      const inProgress = reservation?.reason === "GENERATION_IN_PROGRESS";
      const premiumWeeklyLimitReached =
        reservation?.reason === "PREMIUM_WEEKLY_LIMIT_REACHED";

      return NextResponse.json(
        {
          success: false,
          code: inProgress
            ? "GENERATION_IN_PROGRESS"
            : premiumWeeklyLimitReached
              ? "PREMIUM_WEEKLY_LIMIT_REACHED"
              : "PREMIUM_REQUIRED",
          error: inProgress
            ? responseLanguage === "en"
              ? "Another workout plan is still being generated. Wait for it to finish."
              : "Pembuatan program lain masih berlangsung. Tunggu hingga proses tersebut selesai."
            : premiumWeeklyLimitReached
              ? responseLanguage === "en"
                ? "You have used all 10 Premium plan generations for this week. The quota resets Monday at 00:00 WIB."
                : "Batas 10 generate program Premium minggu ini sudah digunakan. Kuota akan tersedia kembali Senin pukul 00.00 WIB."
              : responseLanguage === "en"
                ? "Both lifetime Free plan generations have been used. Upgrade to FitMate Premium to create a new plan."
                : "Dua kuota generate gratis seumur hidup sudah digunakan. Berlangganan FitMate Premium untuk membuat program baru.",
          upgradeUrl:
            inProgress || premiumWeeklyLimitReached ? null : "/premium",
          billing,
        },
        {
          status: inProgress
            ? 409
            : premiumWeeklyLimitReached
              ? 429
              : 402,
        }
      );
    }

    generationReservationId = reservation.reservation_id;
    generationEntitlement = reservation.entitlement || "free";

    // ==================================================
    // CALL OPENAI
    // ==================================================

    console.log(
      "Calling OpenAI..."
    );

    const aiStartedAt = Date.now();
    const {
      plan: rawPlan,
      model: generatedByModel,
      usage: generatedUsage,
    } =
      await requestStructuredWorkoutPlan({
        systemPrompt,
        userPrompt,
      });

    await recordAiMonitoringEvent({
      source: "generate-plan",
      eventType: "workout_plan_ai_completed",
      userId,
      route: "/api/generate-plan",
      model: generatedByModel,
      usage: generatedUsage,
      durationMs: Date.now() - aiStartedAt,
      metadata: {
        difficulty,
        training_days: trainingDaysCount,
        language: responseLanguage,
      },
    });

    console.log(
      `AI response received from ${generatedByModel}.`
    );

    // ==================================================
    // NORMALIZE PLAN
    // ==================================================

    const normalizedPlan =
      normalizeWorkoutPlan(
        rawPlan,

        {
          ...profile,

          goal,

          experience,

          training_days:
            trainingDays,

          difficulty,

          age,

          gender,

          height,

          weight,
        },

        difficulty,

        trainingDaysCount,

        responseLanguage
      );

    // ==================================================
    // PLAN STATISTICS
    // ==================================================

    const totalWorkoutDays =
      normalizedPlan.days.filter(
        (
          day
        ) =>
          day.exercises.length > 0
      ).length;

    const totalExercises =
      normalizedPlan.days.reduce(
        (
          total,
          day
        ) =>
          total +
          day.exercises.length,

        0
      );

    console.log(
      "Generated plan statistics:",
      {
        difficulty,
        trainingDaysCount,
        totalWorkoutDays,
        totalExercises,
      }
    );

    // ==================================================
    // PREPARE DATABASE VALUES
    // ==================================================

    const planName =
      cleanString(
        normalizedPlan.title,
        responseLanguage === "en"
          ? "Personalized Workout Plan"
          : "Rencana Latihan Personal"
      );

    const goalLabel =
      responseLanguage === "en"
        ? ({
            "Membentuk Otot": "Build Muscle",
            "Mengurangi Lemak": "Lose Fat",
            "Menambah Kekuatan": "Gain Strength",
            "Menjaga Kebugaran": "Stay Fit",
          } as Record<string, string>)[goal] || goal
        : goal;
    const difficultyLabel =
      responseLanguage === "en"
        ? ({ easy: "beginner-friendly", medium: "intermediate", hard: "advanced" } as Record<string, string>)[difficulty] || difficulty
        : difficulty;

    const planDescription =
      responseLanguage === "en"
        ? `Personalized ${difficultyLabel} workout plan for ${goalLabel}.`
        : `Rencana latihan personal tingkat ${difficultyLabel} untuk tujuan ${goalLabel}.`;

    // ==================================================
    // SAVE PLAN + CONSUME QUOTA ATOMICALLY
    // ==================================================

    if (!generationReservationId) {
      throw new Error("Plan-generation reservation is missing.");
    }

    const { data: completionData, error: completionError } =
      await supabaseAdmin.rpc("complete_generated_workout_plan", {
        p_reservation_id: generationReservationId,
        p_name: planName,
        p_description: planDescription,
        p_goal: goal,
        p_level: difficulty,
        p_days_per_week: trainingDaysCount,
        p_plan: normalizedPlan,
        p_generated_by_model: generatedByModel,
      });

    if (completionError) {
      throw new Error(
        `Workout plan could not be saved atomically: ${completionError.message}`
      );
    }

    const completion = Array.isArray(completionData)
      ? completionData[0]
      : completionData;

    const savedPlanId = Number(completion?.workout_plan_id);
    if (!Number.isFinite(savedPlanId) || savedPlanId <= 0) {
      throw new Error("Workout plan completion returned an invalid plan ID.");
    }

    const { data: savedPlan, error: savedPlanError } =
      await supabaseAdmin
        .from("workout_plans")
        .select(
          "id, user_id, name, description, goal, level, days_per_week, status, plan, created_at, updated_at"
        )
        .eq("id", savedPlanId)
        .eq("user_id", userId)
        .single();

    if (savedPlanError || !savedPlan) {
      throw new Error(
        `Workout plan was saved, but could not be loaded: ${
          savedPlanError?.message || "record not found"
        }`
      );
    }

    const saveAction = completion?.save_action === "create"
      ? "create"
      : "update";

    await recordMonitoringEvent({
      source: "generate-plan",
      eventType: "workout_plan_saved",
      userId,
      route: "/api/generate-plan",
      durationMs: Date.now() - requestStartedAt,
      metadata: {
        action: saveAction,
        plan_id: savedPlanId,
        workout_days: totalWorkoutDays,
        total_exercises: totalExercises,
        version_number: completion?.version_number || null,
        entitlement: completion?.entitlement || generationEntitlement,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          saveAction === "create"
            ? "Workout plan generated successfully."
            : "Workout plan generated and updated successfully.",
        plan: normalizedPlan,
        plan_id: savedPlanId,
        user_id: userId,
        saved_plan: savedPlan,
        entitlement: completion?.entitlement || generationEntitlement,
        generation_usage: completion || null,
        statistics: {
          difficulty,
          training_days: trainingDaysCount,
          workout_days: totalWorkoutDays,
          rest_days: 7 - totalWorkoutDays,
          total_exercises: totalExercises,
        },
      },
      { status: 200 }
    );

  } catch (
    error
  ) {
    if (generationReservationId) {
      const { error: releaseError } = await supabaseAdmin.rpc(
        "release_plan_generation",
        { p_reservation_id: generationReservationId }
      );

      if (releaseError) {
        console.warn(
          "Unable to release plan-generation reservation:",
          releaseError.message
        );
      }
    }

    console.error(
      "================================="
    );

    console.error(
      "GENERATE WORKOUT PLAN ERROR"
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );

    let status = 500;
    let message =
      error instanceof Error
        ? error.message
        : "Failed to generate workout plan.";

    if (
      error instanceof
      OpenAI.APIError
    ) {
      const errorCode =
        String(error.code || "").toLowerCase();

      if (
        error.status === 429 &&
        errorCode === "insufficient_quota"
      ) {
        status = 503;
        message =
          "OpenAI API quota is unavailable. Please check the API billing or usage limit, then try again.";
      } else if (
        error.status === 429
      ) {
        status = 429;
        message =
          "FitMate AI is receiving too many requests. Please wait a moment and try again.";
      } else if (
        error.status === 401 ||
        error.status === 403
      ) {
        message =
          "The OpenAI API key is invalid or does not have permission to use the selected model.";
      } else if (
        error.status === 404 ||
        errorCode.includes("model")
      ) {
        status = 502;
        message =
          "The configured workout model is unavailable. Set OPENAI_PLAN_MODEL to a model enabled for this OpenAI project.";
      } else {
        status = 502;
        message =
          "The AI service could not generate a plan right now. Please try again.";
      }
    }

    await recordMonitoringEvent({
      source: "generate-plan",
      eventType: "workout_plan_failed",
      severity: "error",
      userId: monitoringUserId,
      route: "/api/generate-plan",
      message,
      durationMs: Date.now() - requestStartedAt,
      metadata: {
        error_name:
          error instanceof Error
            ? error.name
            : "UnknownError",
        status,
      },
    });

    return NextResponse.json(
      {
        success: false,

        error:
          message,
      },
      {
        status,
      }
    );
  }
}
