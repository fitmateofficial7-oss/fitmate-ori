"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import CompanySignature from "@/components/company-signature";
import FitMateBrand from "@/components/fitmate-brand";
import { useLanguage } from "@/components/language-provider";
import LiveIcon from "@/components/live-icon";
import type { BillingStatusResponse } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

// ======================================================
// TYPES
// ======================================================

type Difficulty =
  | "easy"
  | "medium"
  | "hard";

type FitnessProfile = {
  id?: string;

  user_id: string;

  goal: string;

  experience:
    | string
    | null;

  training_days:
    | string
    | null;

  difficulty: Difficulty;

  age:
    | number
    | null;

  gender:
    | string
    | null;

  height:
    | number
    | null;

  weight:
    | number
    | null;
};

type Exercise = {
  name: string;

  sets: number;

  reps: string;

  rest: string;
};

type WorkoutDay = {
  day: number;

  name: string;

  focus: string;

  exercises: Exercise[];
};

type WorkoutPlan = {
  title: string;

  summary: {
    goal: string;

    experience: string;

    training_days: string;

    difficulty: Difficulty;

    age: number;

    gender: string;

    height: number;

    weight: number;
  };

  days: WorkoutDay[];
};

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

function formatQuotaReset(value: string, language: "id" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "short",
  }).format(date);
}

// ======================================================
// HELPER
// NORMALIZE DAY NAME
// ======================================================

function normalizeDayName(
  value: unknown,
  dayNumber: number,
  hasExercises: boolean
): string {
  if (
    typeof value === "string" &&
    value.trim().length > 0
  ) {
    const cleanName =
      value.trim();

    const invalidNames = [
      "day",
      "day 1",
      "day 2",
      "day 3",
      "day 4",
      "day 5",
      "day 6",
      "day 7",
      "workout day",
      "training day",
      "restday",
      "rest day",
      "undefined",
      "null",
      "n/a",
      "na",
    ];

    if (
      !invalidNames.includes(
        cleanName.toLowerCase()
      )
    ) {
      return cleanName;
    }
  }

  if (!hasExercises) {
    return "Rest Day";
  }

  return `Workout Day ${dayNumber}`;
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
      ? (exercise as Record<
          string,
          unknown
        >)
      : {};

  const rawName =
    typeof item.name === "string"
      ? item.name.trim()
      : "";

  const name =
    rawName.length > 0
      ? rawName
      : `Exercise ${index + 1}`;

  const rawSets =
    Number(item.sets);

  const sets =
    Number.isFinite(rawSets) &&
    rawSets > 0
      ? Math.round(rawSets)
      : 3;

  const reps =
    typeof item.reps === "string" &&
    item.reps.trim().length > 0
      ? item.reps.trim()
      : typeof item.reps === "number"
      ? String(item.reps)
      : "10-12";

  const rest =
    typeof item.rest === "string" &&
    item.rest.trim().length > 0
      ? item.rest.trim()
      : typeof item.rest === "number"
      ? `${item.rest} sec`
      : "60-90 sec";

  return {
    name,
    sets,
    reps,
    rest,
  };
}

// ======================================================
// HELPER
// NORMALIZE WORKOUT PLAN
// ======================================================

function normalizeWorkoutPlan(
  rawPlan: unknown
): WorkoutPlan {
  if (
    typeof rawPlan !== "object" ||
    rawPlan === null
  ) {
    throw new Error(
      "AI generated an invalid workout plan format."
    );
  }

  const source =
    rawPlan as Record<
      string,
      unknown
    >;

  // ====================================================
  // SUMMARY
  // ====================================================

  const rawSummary =
    typeof source.summary === "object" &&
    source.summary !== null
      ? (source.summary as Record<
          string,
          unknown
        >)
      : {};

  const summary = {
    goal:
      typeof rawSummary.goal === "string"
        ? rawSummary.goal
        : "General Fitness",

    experience:
      typeof rawSummary.experience ===
      "string"
        ? rawSummary.experience
        : "Beginner",

    training_days:
      typeof rawSummary.training_days ===
      "string"
        ? rawSummary.training_days
        : "3 days per week",

    difficulty:
      normalizeDifficulty(
        rawSummary.difficulty
      ),

    age:
      typeof rawSummary.age === "number"
        ? rawSummary.age
        : 0,

    gender:
      typeof rawSummary.gender === "string"
        ? rawSummary.gender
        : "",

    height:
      typeof rawSummary.height === "number"
        ? rawSummary.height
        : 0,

    weight:
      typeof rawSummary.weight === "number"
        ? rawSummary.weight
        : 0,
  };

  // ====================================================
  // DAYS
  // ====================================================

  const rawDays =
    Array.isArray(source.days)
      ? source.days
      : [];

  if (
    rawDays.length !== 7
  ) {
    throw new Error(
      "AI generated workout plan must contain exactly 7 days."
    );
  }

  const days: WorkoutDay[] =
    rawDays.map(
      (
        rawDay,
        index
      ) => {
        const dayObject =
          typeof rawDay === "object" &&
          rawDay !== null
            ? (rawDay as Record<
                string,
                unknown
              >)
            : {};

        // Selalu gunakan posisi array
        // sebagai nomor hari 1-7

        const dayNumber =
          index + 1;

        // ==============================================
        // EXERCISES
        // ==============================================

        const rawExercises =
          Array.isArray(
            dayObject.exercises
          )
            ? dayObject.exercises
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

        // ==============================================
        // DAY NAME
        // ==============================================

        const name =
          normalizeDayName(
            dayObject.name,
            dayNumber,
            exercises.length > 0
          );

        // ==============================================
        // FOCUS
        // ==============================================

        const focus =
          typeof dayObject.focus ===
            "string" &&
          dayObject.focus.trim()
            .length > 0
            ? dayObject.focus.trim()
            : exercises.length > 0
            ? "Strength and Fitness Training"
            : "Recovery and Rest";

        return {
          day:
            dayNumber,

          name,

          focus,

          exercises,
        };
      }
    );

  // ====================================================
  // TITLE
  // ====================================================

  const title =
    typeof source.title ===
      "string" &&
    source.title.trim().length > 0
      ? source.title.trim()
      : "Your Personalized Workout Plan";

  return {
    title,

    summary,

    days,
  };
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function PlanPage(): import("react").JSX.Element {
  const router =
    useRouter();
  const { language, tr } = useLanguage();

  // ====================================================
  // STATE
  // ====================================================

  const [profile, setProfile] =
    useState<FitnessProfile | null>(
      null
    );

  const [plan, setPlan] =
    useState<WorkoutPlan | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [difficulty, setDifficulty] =
    useState<Difficulty>(
      "medium"
    );

  const [billing, setBilling] =
    useState<BillingStatusResponse | null>(
      null
    );

  const autoGenerateRequested =
    useRef(false);

  // ====================================================
  // LOAD BILLING STATUS
  // ====================================================

  const loadBillingStatus =
    useCallback(async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        return null;
      }

      const response = await fetch(
        "/api/billing/status",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );
      const payload =
        (await response.json()) as
          | BillingStatusResponse
          | { success?: false; error?: string };

      if (!response.ok || payload.success !== true) {
        console.error(
          "Load billing status error:",
          "error" in payload ? payload.error : response.status
        );
        return null;
      }

      setBilling(payload);
      return payload;
    }, []);

  // ====================================================
  // LOAD DATA
  // ====================================================

  const loadData =
    useCallback(
      async () => {
        try {
          setLoading(true);

          setErrorMessage("");

          // ==========================================
          // GET CURRENT USER
          // ==========================================

          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth.getUser();

          if (userError) {
            console.error(
              "Get user error:",
              userError
            );

            throw new Error(
              userError.message
            );
          }

          // ==========================================
          // USER NOT LOGGED IN
          // ==========================================

          if (!user) {
            router.replace(
              "/login"
            );

            return;
          }

          await loadBillingStatus();

          // ==========================================
          // LOAD FITNESS PROFILE
          // ==========================================

          const {
            data:
              profileData,
            error:
              profileError,
          } =
            await supabase
              .from(
                "fitness_profiles"
              )
              .select("*")
              .eq(
                "user_id",
                user.id
              )
              .maybeSingle();

          if (profileError) {
            throw new Error(
              profileError.message
            );
          }

          // ==========================================
          // PROFILE NOT FOUND
          // ==========================================

          if (!profileData) {
            router.replace(
              "/onboarding"
            );

            return;
          }

          // ==========================================
          // NORMALIZE DIFFICULTY
          // ==========================================

          const savedDifficulty =
            normalizeDifficulty(
              profileData.difficulty
            );

          // ==========================================
          // SAVE PROFILE STATE
          // ==========================================

          setProfile({
            ...profileData,

            difficulty:
              savedDifficulty,
          } as FitnessProfile);

          setDifficulty(
            savedDifficulty
          );

          // ==========================================
          // LOAD WORKOUT PLAN
          // ==========================================

          const {
            data:
              planData,
            error:
              planError,
          } =
            await supabase
              .from(
                "workout_plans"
              )
              .select(
                "id, user_id, plan, created_at, updated_at"
              )
              .eq(
                "user_id",
                user.id
              )
              .maybeSingle();

          if (planError) {
            console.error(
              "Load workout plan error:",
              planError
            );

            throw new Error(
              planError.message
            );
          }

          // ==========================================
          // NO SAVED PLAN
          // ==========================================

          if (
            !planData ||
            !planData.plan
          ) {
            console.log(
              "No saved workout plan found for user:",
              user.id
            );

            setPlan(null);

            return;
          }

          // ==========================================
          // NORMALIZE SAVED PLAN
          // ==========================================

          try {
            const normalizedPlan =
              normalizeWorkoutPlan(
                planData.plan
              );

            setPlan(
              normalizedPlan
            );

            console.log(
              "Saved workout plan loaded successfully."
            );
          } catch (
            planValidationError
          ) {
            console.error(
              "Existing plan is invalid:",
              planValidationError
            );

            setPlan(null);

            setErrorMessage(
              "Your saved workout plan is invalid. Please generate a new plan."
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Load plan error:",
            error
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load your fitness data."
          );
        } finally {
          setLoading(false);
        }
      },
      [loadBillingStatus, router]
    );

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadData();
      }, 0);

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [loadData]);

  // ====================================================
  // CHANGE DIFFICULTY
  // ====================================================

  const handleDifficultyChange =
    async (
      newDifficulty: Difficulty
    ) => {
      if (
        !profile ||
        generating
      ) {
        return;
      }

      const previousDifficulty =
        difficulty;

      try {
        setErrorMessage("");

        // ==========================================
        // UPDATE UI
        // ==========================================

        setDifficulty(
          newDifficulty
        );

        setProfile(
          (previous) => {
            if (!previous) {
              return previous;
            }

            return {
              ...previous,

              difficulty:
                newDifficulty,
            };
          }
        );

        // ==========================================
        // SAVE DIFFICULTY TO SUPABASE
        // ==========================================

        const {
          error,
        } =
          await supabase
            .from(
              "fitness_profiles"
            )
            .update({
              difficulty:
                newDifficulty,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "user_id",
              profile.user_id
            );

        if (error) {
          throw new Error(
            error.message
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Save difficulty error:",
          error
        );

        // ==========================================
        // ROLLBACK UI
        // ==========================================

        setDifficulty(
          previousDifficulty
        );

        setProfile(
          (previous) => {
            if (!previous) {
              return previous;
            }

            return {
              ...previous,

              difficulty:
                previousDifficulty,
            };
          }
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to save workout difficulty."
        );
      }
    };

  // ====================================================
  // GENERATE PLAN
  // ====================================================

  const generatePlan =
    useCallback(async () => {
      if (
        !profile ||
        generating
      ) {
        return;
      }

      try {
        setGenerating(true);

        setErrorMessage("");

        // ==========================================
        // GET CURRENT SESSION
        // ==========================================

        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "Get session error:",
            sessionError
          );

          throw new Error(
            "Failed to get authentication session. Please login again."
          );
        }

        if (
          !session ||
          !session.access_token
        ) {
          throw new Error(
            "Your session has expired. Please login again."
          );
        }

        const accessToken =
          session.access_token;

        // ==========================================
        // VERIFY CURRENT USER
        // ==========================================

        const {
          data: {
            user,
          },
          error:
            userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          console.error(
            "Current user error:",
            userError
          );

          throw new Error(
            "Unable to verify your account. Please login again."
          );
        }

        // ==========================================
        // SECURITY CHECK
        // ==========================================

        if (
          user.id !==
          profile.user_id
        ) {
          throw new Error(
            "User authentication mismatch. Please login again."
          );
        }

        // ==========================================
        // SAVE CURRENT DIFFICULTY
        // ==========================================

        const {
          error:
            difficultyError,
        } =
          await supabase
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
              user.id
            );

        if (difficultyError) {
          throw new Error(
            `Failed to save difficulty: ${difficultyError.message}`
          );
        }

        // ==========================================
        // CALL GENERATE PLAN API
        // ==========================================

        const response =
          await fetch(
            "/api/generate-plan",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${accessToken}`,
              },

              body:
                JSON.stringify({
                  goal:
                    profile.goal,

                  experience:
                    profile.experience,

                  training_days:
                    profile.training_days,

                  difficulty,

                  age:
                    profile.age,

                  gender:
                    profile.gender,

                  height:
                    profile.height,

                  weight:
                    profile.weight,

                  language,
                }),
            }
          );

        // ==========================================
        // PARSE API RESPONSE
        // ==========================================

        let result:
          | {
              success?: boolean;

              plan?: unknown;

              plan_id?:
                | string
                | number;

              error?: string;

              message?: string;

              code?: string;

              upgradeUrl?: string;

              billing?: BillingStatusResponse;
            }
          | null =
          null;

        try {
          result =
            await response.json();
        } catch {
          throw new Error(
            `Server returned an invalid response. HTTP status: ${response.status}`
          );
        }

        console.log(
          "Generate plan API response:",
          {
            status:
              response.status,

            ok:
              response.ok,

            result,
          }
        );

        // ==========================================
        // CHECK API RESPONSE
        // ==========================================

        if (
          !response.ok ||
          !result?.success
        ) {
          if (result?.billing) {
            setBilling(result.billing);
          } else if (result?.code === "PREMIUM_REQUIRED") {
            await loadBillingStatus();
          }

          if (
            result?.code === "PREMIUM_REQUIRED" ||
            result?.upgradeUrl
          ) {
            router.push(
              `${result.upgradeUrl || "/premium"}?from=plan&feature=plan-generation`
            );
            return;
          }

          setErrorMessage(
            result?.error ||
              result?.message ||
              `Failed to generate workout plan. HTTP status: ${response.status}`
          );
          return;
        }

        // ==========================================
        // CHECK PLAN
        // ==========================================

        if (
          !result.plan
        ) {
          throw new Error(
            "AI did not return a workout plan."
          );
        }

        // ==========================================
        // NORMALIZE PLAN
        // ==========================================

        const normalizedPlan =
          normalizeWorkoutPlan(
            result.plan
          );

        // ==========================================
        // UPDATE PROFILE STATE
        // ==========================================

        setProfile(
          (previous) => {
            if (!previous) {
              return previous;
            }

            return {
              ...previous,

              difficulty,
            };
          }
        );

        // ==========================================
        // UPDATE PLAN STATE
        // ==========================================

        setPlan(
          normalizedPlan
        );

        // ==========================================
        // IMPORTANT:
        // RELOAD PLAN FROM DATABASE
        //
        // Ini memastikan bahwa API benar-benar
        // sudah menyimpan plan ke Supabase.
        // ==========================================

        const {
          data:
            savedPlanData,
          error:
            savedPlanError,
        } =
          await supabase
            .from(
              "workout_plans"
            )
            .select(
              "id, user_id, plan, created_at, updated_at"
            )
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle();

        if (savedPlanError) {
          console.error(
            "Verify saved plan error:",
            savedPlanError
          );

          throw new Error(
            `Workout plan was generated but could not be verified in database: ${savedPlanError.message}`
          );
        }

        // ==========================================
        // VERIFY DATABASE SAVE
        // ==========================================

        if (
          !savedPlanData ||
          !savedPlanData.plan
        ) {
          throw new Error(
            "Workout plan was generated successfully, but it was not found in the database. Please check your workout_plans table and RLS policies."
          );
        }

        // ==========================================
        // LOAD PLAN FROM DATABASE
        // ==========================================

        try {
          const savedNormalizedPlan =
            normalizeWorkoutPlan(
              savedPlanData.plan
            );

          setPlan(
            savedNormalizedPlan
          );
        } catch (
          savedPlanValidationError
        ) {
          console.error(
            "Saved plan validation error:",
            savedPlanValidationError
          );

          throw new Error(
            "The workout plan was saved, but the saved data format is invalid."
          );
        }

        // ==========================================
        // CLEAR ERROR
        // ==========================================

        setErrorMessage("");
        await loadBillingStatus();

        console.log(
          "Workout plan generated and saved successfully."
        );
      } catch (
        error
      ) {
        console.error(
          "Generate plan error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : tr(
                "Gagal membuat rencana latihan.",
                "Failed to generate workout plan."
              )
        );
      } finally {
        setGenerating(false);
      }
    }, [
      difficulty,
      generating,
      language,
      loadBillingStatus,
      profile,
      router,
      tr,
    ]);

  // ====================================================
  // AUTO GENERATE AFTER ONBOARDING OR PROFILE UPDATE
  // ====================================================

  useEffect(() => {
    if (
      loading ||
      !profile ||
      generating ||
      autoGenerateRequested.current
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    if (
      params.get("generate") !==
      "true"
    ) {
      return;
    }

    autoGenerateRequested.current =
      true;

    window.history.replaceState(
      null,
      "",
      "/plan"
    );

    const timeoutId =
      window.setTimeout(() => {
        void generatePlan();
      }, 0);

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [
    generatePlan,
    generating,
    loading,
    profile,
  ]);

  const handleGenerateAction =
    () => {
      if (
        billing &&
        !billing.generation.canGenerate
      ) {
        if (billing.isPremium) {
          setErrorMessage(
            tr(
              `Kuota 10 generate Premium minggu ini sudah habis. Reset ${formatQuotaReset(billing.generation.premiumWeeklyResetsAt, language)}.`,
              `Your 10 Premium generations for this week are used. Resets ${formatQuotaReset(billing.generation.premiumWeeklyResetsAt, language)}.`
            )
          );
          return;
        }
        router.push("/premium?from=plan&feature=plan-generation");
        return;
      }

      void generatePlan();
    };

  // ====================================================
  // NAVIGATION
  // ====================================================

  const handleEditProfile =
    () => {
      router.push(
        "/onboarding"
      );
    };

  const handleViewDashboard =
    () => {
      router.push(
        "/dashboard"
      );
    };

  const handleViewWorkout =
    () => {
      router.push(
        "/workout"
      );
    };

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <main className="fitmate-app-page flex min-h-screen items-center justify-center bg-white px-6">
        <div className="text-center">

          <LiveIcon variant="pulse" className="text-6xl">
            🤖
          </LiveIcon>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            {tr("Menyiapkan Rencana", "Preparing Your Plan")}
          </h1>

          <p className="mt-3 text-gray-500">
            {tr(
              "Sedang memuat profil dan rencana latihan Anda.",
              "Loading your profile and workout plan."
            )}
          </p>

        </div>
      </main>
    );
  }

  // ====================================================
  // NO PROFILE
  // ====================================================

  if (!profile) {
    return (
      <main className="fitmate-app-page flex min-h-screen items-center justify-center bg-white px-6">

        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">

          <LiveIcon variant="wiggle" className="text-6xl">
            😕
          </LiveIcon>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            {tr(
              "Profil Tidak Dapat Dimuat",
              "Unable to Load Profile"
            )}
          </h1>

          {errorMessage && (
            <p className="mt-4 text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              router.push(
                "/onboarding"
              )
            }
            className="mt-6 w-full rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            {tr("Lengkapi Profil", "Complete Profile")}
          </button>

        </div>

      </main>
    );
  }

  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <main className="fitmate-app-page min-h-screen bg-white pb-24">

      {/* ==================================================
          NAVBAR
      ================================================== */}

      <nav className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-6">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">

          <FitMateBrand href="/dashboard" size="sm" showCompany />

          <div className="flex flex-wrap items-center justify-end gap-2">

            <button
              type="button"
              onClick={
                handleViewDashboard
              }
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-green-600 md:block"
            >
              {tr("Beranda", "Home")}
            </button>

            <button
              type="button"
              className="hidden rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 md:block"
            >
              {tr("Rencana", "Plan")}
            </button>

            {plan && (
              <button
                type="button"
                data-testid="generate-plan"
                onClick={
                  handleViewWorkout
                }
                className="hidden rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 md:block"
              >
                {tr("Latihan", "Workout")}
              </button>
            )}

            <button
              type="button"
              onClick={
                handleEditProfile
              }
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <span className="hidden sm:inline">
                {tr("Edit Profil", "Edit Profile")}
              </span>
              <span className="sm:hidden">
                {tr("Profil", "Profile")}
              </span>
            </button>

          </div>

        </div>

      </nav>

      {/* ==================================================
          HEADER
      ================================================== */}

      <section className="px-6 py-10">

        <div className="mx-auto max-w-7xl">

          <div className="rounded-3xl bg-green-600 p-8 text-white md:p-12">

            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">

              <div>

                <p className="font-semibold text-green-100">
                  FITMATE AI
                </p>

                <h1 className="mt-4 text-4xl font-bold md:text-5xl">
                  {tr(
                    "Rencana Latihan Anda",
                    "Your Workout Plan"
                  )}
                </h1>

                <p className="mt-5 max-w-2xl leading-7 text-green-50">
                  {tr(
                    "Pilih tingkat latihan. FitMate AI akan menyusun jadwal sesuai profil, tujuan, dan pengalaman Anda.",
                    "Choose your training level. FitMate AI will build a schedule around your profile, goal, and experience."
                  )}
                </p>

              </div>

              <div className="shrink-0">

                <div className="rounded-3xl bg-white/10 p-6 backdrop-blur-sm">

                  <p className="text-sm font-semibold text-green-100">
                    {tr("TUJUAN SAAT INI", "CURRENT GOAL")}
                  </p>

                  <p className="mt-2 text-2xl font-bold capitalize">
                    {profile.goal}
                  </p>

                  <p className="mt-2 text-sm text-green-100">
                    {profile.training_days ||
                      tr(
                        "Jadwal belum dipilih",
                        "Schedule not selected"
                      )}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* ==================================================
          PROFILE SUMMARY
      ================================================== */}

      <section className="px-6">

        <div className="mx-auto max-w-7xl">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-2xl bg-white p-5 shadow-sm">

              <p className="text-sm text-gray-500">
                {tr("Tujuan", "Goal")}
              </p>

              <p className="mt-2 font-bold capitalize text-gray-900">
                {profile.goal}
              </p>

            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">

              <p className="text-sm text-gray-500">
                {tr("Pengalaman", "Experience")}
              </p>

              <p className="mt-2 font-bold capitalize text-gray-900">
                {profile.experience ||
                  tr("Belum diatur", "Not set")}
              </p>

            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">

              <p className="text-sm text-gray-500">
                {tr("Jadwal", "Schedule")}
              </p>

              <p className="mt-2 font-bold text-gray-900">
                {profile.training_days ||
                  tr("Belum diatur", "Not set")}
              </p>

            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">

              <p className="text-sm text-gray-500">
                {tr("Data tubuh", "Body data")}
              </p>

              <p className="mt-2 font-bold text-gray-900">

                {profile.height
                  ? `${profile.height} cm`
                  : "--"}

                {" / "}

                {profile.weight
                  ? `${profile.weight} kg`
                  : "--"}

              </p>

            </div>

          </div>

        </div>

      </section>

      {/* ==================================================
          GENERATE SECTION
      ================================================== */}

      <section className="px-6 py-10">

        <div className="mx-auto max-w-7xl">

          {/* ERROR */}

          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-5">

              <p className="font-semibold text-red-700">
                {tr("Terjadi kesalahan", "Something went wrong")}
              </p>

              <p className="mt-2 text-sm leading-6 text-red-600">
                {errorMessage}
              </p>

            </div>
          )}

          {billing && (
            <div
              className={`mb-6 rounded-2xl border p-5 ${
                billing.isPremium
                  ? "border-amber-200 bg-amber-50"
                  : billing.generation.canGenerate
                    ? "border-green-100 bg-green-50"
                    : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-slate-900">
                    {billing.isPremium
                      ? "FitMate Premium"
                      : tr("Kuota generate Free", "Free generation quota")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {billing.isPremium
                      ? tr(
                          `${billing.generation.premiumWeeklyRemaining} dari ${billing.generation.premiumWeeklyLimit} generate minggu ini masih tersedia. Reset ${formatQuotaReset(billing.generation.premiumWeeklyResetsAt, language)}.`,
                          `${billing.generation.premiumWeeklyRemaining} of ${billing.generation.premiumWeeklyLimit} generations remain this week. Resets ${formatQuotaReset(billing.generation.premiumWeeklyResetsAt, language)}.`
                        )
                      : tr(
                          `${billing.generation.freeRemaining} dari ${billing.generation.freeLimit} generate gratis masih tersedia seumur hidup.`,
                          `${billing.generation.freeRemaining} of ${billing.generation.freeLimit} lifetime free generations remain.`
                        )}
                  </p>
                </div>
                {!billing.isPremium && (
                  <button
                    type="button"
                    onClick={() => router.push("/premium")}
                    className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
                  >
                    {tr("Lihat Premium Rp49.000", "View Premium IDR 49,000")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* DIFFICULTY */}

          <div className="rounded-3xl bg-white p-8 shadow-sm md:p-10">

            <div className="text-center">

              <p className="font-semibold text-green-600">
                {tr("TINGKAT LATIHAN", "TRAINING LEVEL")}
              </p>

              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                {tr(
                  "Pilih tingkat latihan",
                  "Choose your training level"
                )}
              </h2>

              <p className="mx-auto mt-3 max-w-2xl text-gray-600">
                {tr(
                  "Pilih sesuai kemampuan Anda saat ini.",
                  "Choose the level that fits your current ability."
                )}
              </p>

            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">

              {/* EASY */}

              <button
                type="button"
                onClick={() =>
                  handleDifficultyChange(
                    "easy"
                  )
                }
                disabled={
                  generating
                }
                className={`fitmate-level-card flex h-full flex-col rounded-[1.5rem] border-2 p-6 text-left transition sm:p-7 ${
                  difficulty === "easy"
                    ? "border-green-500 bg-green-50 ring-2 ring-green-100"
                    : "border-gray-100 bg-white hover:border-green-300 hover:bg-gray-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >

                <div className="flex min-h-14 items-start justify-between gap-3">

                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 shadow-sm">
                    <LiveIcon variant="pulse" className="text-2xl">
                      🟢
                    </LiveIcon>
                  </span>

                  {difficulty ===
                    "easy" && (
                    <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
                      {tr("DIPILIH", "SELECTED")}
                    </span>
                  )}

                </div>

                <h3 className="mt-5 text-xl font-bold">
                  {tr("Mudah", "Easy")}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {tr(
                    "Volume lebih ringan untuk pemula atau pengguna yang baru kembali berlatih.",
                    "Lighter volume for beginners or anyone returning to training."
                  )}
                </p>

                <div className="mt-auto pt-4 text-sm font-semibold text-green-600">
                  {tr("Cocok untuk pemula", "Beginner friendly")}
                </div>

              </button>

              {/* MEDIUM */}

              <button
                type="button"
                onClick={() =>
                  handleDifficultyChange(
                    "medium"
                  )
                }
                disabled={
                  generating
                }
                className={`fitmate-level-card flex h-full flex-col rounded-[1.5rem] border-2 p-6 text-left transition sm:p-7 ${
                  difficulty === "medium"
                    ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-100"
                    : "border-gray-100 bg-white hover:border-yellow-300 hover:bg-gray-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >

                <div className="flex min-h-14 items-start justify-between gap-3">

                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 shadow-sm">
                    <LiveIcon variant="pulse" className="text-2xl">
                      🟡
                    </LiveIcon>
                  </span>

                  {difficulty ===
                    "medium" && (
                    <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-white">
                      {tr("DIPILIH", "SELECTED")}
                    </span>
                  )}

                </div>

                <h3 className="mt-5 text-xl font-bold">
                  {tr("Sedang", "Medium")}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {tr(
                    "Intensitas seimbang untuk latihan rutin dan perkembangan bertahap.",
                    "Balanced intensity for consistent training and steady progress."
                  )}
                </p>

                <div className="mt-auto pt-4 text-sm font-semibold text-yellow-600">
                  {tr("Disarankan", "Recommended")}
                </div>

              </button>

              {/* HARD */}

              <button
                type="button"
                onClick={() =>
                  handleDifficultyChange(
                    "hard"
                  )
                }
                disabled={
                  generating
                }
                className={`fitmate-level-card flex h-full flex-col rounded-[1.5rem] border-2 p-6 text-left transition sm:p-7 ${
                  difficulty === "hard"
                    ? "border-red-500 bg-red-50 ring-2 ring-red-100"
                    : "border-gray-100 bg-white hover:border-red-300 hover:bg-gray-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >

                <div className="flex min-h-14 items-start justify-between gap-3">

                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 shadow-sm">
                    <LiveIcon variant="pulse" className="text-2xl">
                      🔴
                    </LiveIcon>
                  </span>

                  {difficulty ===
                    "hard" && (
                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                      {tr("DIPILIH", "SELECTED")}
                    </span>
                  )}

                </div>

                <h3 className="mt-5 text-xl font-bold">
                  {tr("Sulit", "Hard")}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {tr(
                    "Intensitas lebih tinggi untuk pengguna yang sudah berpengalaman.",
                    "Higher intensity for experienced users."
                  )}
                </p>

                <div className="mt-auto pt-4 text-sm font-semibold text-red-600">
                  {tr("Berpengalaman", "Experienced")}
                </div>

              </button>

            </div>

          </div>

          {/* =================================================
              PLAN CONTENT
          ================================================= */}

          {!plan ? (

            <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm md:p-12">

              <LiveIcon variant="wiggle" className="text-6xl">
                🤖
              </LiveIcon>

              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                {tr(
                  "Buat Rencana Latihan",
                  "Create a Workout Plan"
                )}
              </h2>

              <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-600">
                {tr(
                  "Rencana dibuat berdasarkan profil, tujuan, dan tingkat latihan yang dipilih.",
                  "Your plan is built around your profile, goal, and selected training level."
                )}
              </p>

              <div className="mx-auto mt-6 max-w-sm rounded-xl bg-gray-50 p-4">

                <p className="text-sm text-gray-500">
                  {tr("Tingkat dipilih", "Selected level")}
                </p>

                <p className="mt-1 text-xl font-bold capitalize text-gray-900">
                  {difficulty}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  handleGenerateAction
                }
                disabled={
                  generating
                }
                className={`mt-8 rounded-xl px-8 py-4 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  billing && !billing.generation.canGenerate
                    ? "cursor-pointer bg-slate-900 hover:bg-slate-800"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {generating
                  ? tr(
                      "Sedang Membuat Rencana...",
                      "Creating Your Plan..."
                    )
                  : billing && !billing.generation.canGenerate
                    ? billing.isPremium
                      ? tr(
                          "Kuota Mingguan Habis",
                          "Weekly Quota Used"
                        )
                      : tr(
                          "🔒 Generate Terkunci · Upgrade Premium",
                          "🔒 Generation Locked · Upgrade to Premium"
                        )
                    : tr(
                        "Buat Rencana Saya",
                        "Create My Plan"
                      )}
              </button>

            </div>

          ) : (

            <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm md:p-10">

              {/* PLAN HEADER */}

              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

                <div>

                  <p className="font-semibold text-green-600">
                    {tr("RENCANA SIAP", "PLAN READY")}
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-gray-900">
                    {plan.title}
                  </h2>

                  <p className="mt-3 max-w-2xl leading-7 text-gray-600">
                    {tr(
                      "Rencana Anda sudah siap. Lihat detail atau langsung mulai latihan.",
                      "Your plan is ready. Review the details or start training now."
                    )}
                  </p>

                </div>

                <div className="flex flex-col gap-3 sm:flex-row">

                  <button
                    type="button"
                    data-testid="generate-plan"
                    onClick={
                      handleViewWorkout
                    }
                    className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
                  >
                    {tr("Mulai Latihan", "Start Workout")}
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleGenerateAction
                    }
                    disabled={
                      generating
                    }
                    className={`rounded-xl px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      billing && !billing.generation.canGenerate
                        ? "cursor-pointer border border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                        : "border border-green-600 text-green-600 hover:bg-green-50"
                    }`}
                  >
                    {generating
                      ? tr(
                          "Sedang Membuat...",
                          "Creating..."
                        )
                      : billing && !billing.generation.canGenerate
                        ? billing.isPremium
                          ? tr(
                              "Kuota Mingguan Habis",
                              "Weekly Quota Used"
                            )
                          : tr(
                              "🔒 Generate Terkunci · Upgrade Premium",
                              "🔒 Generation Locked · Upgrade to Premium"
                            )
                        : tr(
                            "Buat Rencana Baru",
                            "Create New Plan"
                          )}
                  </button>

                </div>

              </div>

              {/* PLAN SUMMARY */}

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                <div className="rounded-2xl bg-gray-50 p-5">

                  <p className="text-sm text-gray-500">
                    {tr("Tujuan", "Goal")}
                  </p>

                  <p className="mt-2 font-bold capitalize text-gray-900">
                    {plan.summary.goal}
                  </p>

                </div>

                <div className="rounded-2xl bg-gray-50 p-5">

                  <p className="text-sm text-gray-500">
                    {tr("Pengalaman", "Experience")}
                  </p>

                  <p className="mt-2 font-bold capitalize text-gray-900">
                    {plan.summary.experience}
                  </p>

                </div>

                <div className="rounded-2xl bg-gray-50 p-5">

                  <p className="text-sm text-gray-500">
                    {tr("Tingkat", "Difficulty")}
                  </p>

                  <p className="mt-2 font-bold capitalize text-gray-900">
                    {plan.summary.difficulty}
                  </p>

                </div>

                <div className="rounded-2xl bg-gray-50 p-5">

                  <p className="text-sm text-gray-500">
                    {tr("Jadwal Latihan", "Training Days")}
                  </p>

                  <p className="mt-2 font-bold text-gray-900">
                    {plan.summary.training_days}
                  </p>

                </div>

                <div className="rounded-2xl bg-gray-50 p-5">

                  <p className="text-sm text-gray-500">
                    {tr("Hari Aktif", "Workout Days")}
                  </p>

                  <p className="mt-2 font-bold text-gray-900">

                    {
                      plan.days.filter(
                        (day) =>
                          day.exercises &&
                          day.exercises.length >
                            0
                      ).length
                    }{" "}
                    {tr("hari", "days")}

                  </p>

                </div>

              </div>

              {/* WEEKLY PLAN */}

              <div className="mt-10">

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-sm font-semibold uppercase text-green-600">
                      {tr("Jadwal Latihan", "Workout Schedule")}
                    </p>

                    <h3 className="mt-1 text-2xl font-bold text-gray-900">
                      {tr(
                        "Pratinjau Rencana Mingguan",
                        "Weekly Plan Preview"
                      )}
                    </h3>

                  </div>

                  <button
                    type="button"
                    onClick={
                      handleViewWorkout
                    }
                    className="text-sm font-semibold text-green-600 hover:text-green-700"
                  >
                    {tr(
                      "Buka Latihan Lengkap →",
                      "Open Full Workout →"
                    )}
                  </button>

                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">

                  {plan.days.map(
                    (day) => {

                      const hasExercises =
                        day.exercises &&
                        day.exercises.length >
                          0;

                      return (
                        <div
                          key={
                            day.day
                          }
                          className={`rounded-2xl border p-5 ${
                            hasExercises
                              ? "border-gray-100 bg-white"
                              : "border-gray-100 bg-gray-50"
                          }`}
                        >

                          <div className="flex items-start justify-between gap-4">

                            <div>

                              <p className="text-xs font-bold uppercase text-gray-400">
                                {tr("Hari", "Day")}{" "}
                                {
                                  day.day
                                }
                              </p>

                              <h4 className="mt-1 text-lg font-bold text-gray-900">
                                {
                                  day.name
                                }
                              </h4>

                              <p className="mt-1 text-sm text-gray-500">
                                {
                                  day.focus
                                }
                              </p>

                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                hasExercises
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {hasExercises
                                ? `${day.exercises.length} ${tr(
                                    "Latihan",
                                    "Exercises"
                                  )}`
                                : tr(
                                    "Hari Istirahat",
                                    "Rest Day"
                                  )}
                            </span>

                          </div>

                          {hasExercises && (

                            <div className="mt-5 space-y-2">

                              {day.exercises
                                .slice(
                                  0,
                                  3
                                )
                                .map(
                                  (
                                    exercise,
                                    index
                                  ) => (

                                    <div
                                      key={`${day.day}-${index}-${exercise.name}`}
                                      className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                                    >

                                      <div className="min-w-0">

                                        <p className="truncate text-sm font-semibold text-gray-800">
                                          {
                                            exercise.name
                                          }
                                        </p>

                                      </div>

                                      <p className="ml-4 shrink-0 text-xs font-medium text-gray-500">

                                        {
                                          exercise.sets
                                        }{" "}
                                        {tr("set", "sets")} ×{" "}
                                        {
                                          exercise.reps
                                        }

                                      </p>

                                    </div>

                                  )
                                )}

                              {day.exercises.length >
                                3 && (

                                <p className="pt-2 text-center text-xs font-semibold text-green-600">

                                  +
                                  {" "}
                                  {
                                    day.exercises.length -
                                    3
                                  }{" "}
                                  {tr(
                                    "latihan lainnya",
                                    "more exercises"
                                  )}

                                </p>

                              )}

                            </div>

                          )}

                        </div>
                      );
                    }
                  )}

                </div>

              </div>

            </div>

          )}

        </div>

      </section>

      {/* ==================================================
          QUICK ACTIONS
      ================================================== */}

      <section className="px-6 pb-12">

        <div className="mx-auto max-w-7xl">

          <div className="grid gap-4 md:grid-cols-3">

            <button
              type="button"
              onClick={
                handleViewDashboard
              }
              className="fitmate-action-card flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-green-200 hover:shadow-md sm:p-7"
            >

              <LiveIcon variant="float" className="text-3xl">
                📊
              </LiveIcon>

              <h3 className="mt-4 text-xl font-bold text-gray-900">
                {tr("Dashboard Saya", "My Dashboard")}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {tr(
                  "Pantau progres, rentetan latihan, aktivitas, dan insight kebugaran Anda.",
                  "Track your workout progress, streaks, activity, and fitness insights."
                )}
              </p>

              <p className="mt-auto pt-4 font-semibold text-green-600">
                {tr("Lihat Dashboard →", "View Dashboard →")}
              </p>

            </button>

            <button
              type="button"
              onClick={
                handleViewWorkout
              }
              disabled={!plan}
              className="fitmate-action-card flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-green-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:p-7"
            >

              <LiveIcon variant="pulse" className="text-3xl">
                🏋️
              </LiveIcon>

              <h3 className="mt-4 text-xl font-bold text-gray-900">
                {tr("Mulai Latihan", "Start Workout")}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {tr(
                  "Mulai atau lanjutkan sesi latihan personal Anda.",
                  "Start or continue your personalized workout session."
                )}
              </p>

              <p className="mt-auto pt-4 font-semibold text-green-600">
                {tr("Buka Latihan →", "Go to Workout →")}
              </p>

            </button>

            <button
              type="button"
              onClick={
                handleEditProfile
              }
              className="fitmate-action-card flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-green-200 hover:shadow-md sm:p-7"
            >

              <LiveIcon variant="tick" className="text-3xl">
                ⚙️
              </LiveIcon>

              <h3 className="mt-4 text-xl font-bold text-gray-900">
                {tr("Perbarui Profil", "Update Profile")}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {tr(
                  "Perbarui tujuan, pengalaman, data tubuh, dan preferensi latihan Anda.",
                  "Update your fitness goals, experience, body measurements, and training preferences."
                )}
              </p>

              <p className="mt-auto pt-4 font-semibold text-green-600">
                {tr("Edit Profil →", "Edit Profile →")}
              </p>

            </button>

          </div>

        </div>

      </section>

      {/* ==================================================
          FOOTER
      ================================================== */}

      <footer className="border-t border-gray-100 bg-white px-6 py-8 dark:border-white/10 dark:bg-slate-950">
        <CompanySignature compact className="mx-auto max-w-7xl" />
      </footer>

    </main>
  );
}
