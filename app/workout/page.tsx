"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";
import { getExerciseGuide } from "@/lib/exercise-guides";
import Exercise3DGuide from "@/components/exercise-3d-guide";
import { reportClientEvent } from "@/components/client-monitoring";
import {
  getExerciseReplacementCandidates,
  getMuscleGroup,
} from "@/lib/exercise-substitutions";
import FitMateBrand from "@/components/fitmate-brand";
import FitMateIcon from "@/components/fitmate-icon";
import RestTimer, {
  parseRestSeconds,
} from "@/components/rest-timer";
import ExerciseSetLogger from "@/components/exercise-set-logger";
import ReadinessBanner from "@/components/readiness-banner";
import {
  localizeWorkoutDayName,
  localizeWorkoutFocus,
  localizeWorkoutSessionName,
} from "@/lib/fitness-i18n";

// ======================================================
// TYPES
// ======================================================

type Exercise = {
  name: string;
  reps: string;
  rest: string;
  sets: number;
};

type WorkoutDay = {
  day: number;
  name: string;
  focus: string;
  exercises: Exercise[];
};

type WorkoutPlanData = {
  title?: string;
  summary?: {
    age?: number;
    goal?: string;
    gender?: string;
    height?: number;
    weight?: number;
    difficulty?: string;
    experience?: string;
    training_days?: string;
  };
  days?: WorkoutDay[];
};

type WorkoutPlan = {
  id: number;
  created_at: string;
  user_id: string | null;
  plan: WorkoutPlanData | null;
  profile_id: number | null;
};

type WorkoutSession = {
  id: string | number;
  user_id: string;
  workout_plan_id: number | null;
  workout_day: number;
  workout_name: string;
  started_at: string;
  completed_at: string | null;
  status:
    | "in_progress"
    | "completed"
    | "cancelled"
    | string;
  created_at: string;
};

type WorkoutExerciseLog = {
  id: string | number;
  workout_session_id: string | number;
  exercise_id: string | number | null;
  exercise_name: string;
  original_exercise_name?: string | null;
  equipment_unavailable?: boolean;
  load_kg?: number | null;
  workout_day: number;
  sets: number;
  reps: string | null;
  completed: boolean;
  completed_at: string | null;
  user_id: string;
  created_at: string;
  updated_at?: string | null;
};

type ExerciseLibraryItem = {
  id: string | number;
  name: string;
  slug?: string | null;
  category?: string | null;
  target_muscle?: string | null;
  secondary_muscles?: string[] | null;
  equipment?: string | null;
  difficulty?: string | null;
  movement_pattern?: string | null;
  description?: string | null;
  instructions?: string[] | null;
  tips?: string[] | null;
  animation_url?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  created_at?: string | null;
};

type RestTimerRequest = {
  id: number;
  seconds: number;
  exerciseName: string;
};

// ======================================================
// HELPERS
// ======================================================

function normalizeExerciseName(
  value: string
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9\s]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}

function getExerciseMatchScore(
  workoutName: string,
  libraryName: string
) {
  const workout =
    normalizeExerciseName(
      workoutName
    );

  const library =
    normalizeExerciseName(
      libraryName
    );

  if (
    workout ===
    library
  ) {
    return 100;
  }

  if (
    workout.includes(
      library
    )
  ) {
    return 80;
  }

  if (
    library.includes(
      workout
    )
  ) {
    return 70;
  }

  const workoutWords =
    new Set(
      workout.split(" ")
    );

  const libraryWords =
    new Set(
      library.split(" ")
    );

  const commonWords =
    [...workoutWords].filter(
      (word) =>
        libraryWords.has(
          word
        ) &&
        word.length > 2
    );

  return (
    commonWords.length * 10
  );
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function WorkoutPage() {
  const router =
    useRouter();
  const { language, tr } = useLanguage();

  // ====================================================
  // AUTH
  // ====================================================

  const [userId, setUserId] =
    useState<string | null>(
      null
    );

  const [, setUserEmail] =
    useState("");

  // ====================================================
  // DATA
  // ====================================================

  const [workoutPlan, setWorkoutPlan] =
    useState<WorkoutPlan | null>(
      null
    );

  const [sessions, setSessions] =
    useState<WorkoutSession[]>(
      []
    );

  const [exerciseLogs, setExerciseLogs] =
    useState<WorkoutExerciseLog[]>(
      []
    );

  const [
    exerciseLibrary,
    setExerciseLibrary,
  ] =
    useState<ExerciseLibraryItem[]>(
      []
    );

  // ====================================================
  // UI STATE
  // ====================================================

  const [
    selectedDayNumber,
    setSelectedDayNumber,
  ] =
    useState<number | null>(
      null
    );

  const [
    activeSession,
    setActiveSession,
  ] =
    useState<WorkoutSession | null>(
      null
    );

  const [
    selectedExercise,
    setSelectedExercise,
  ] =
    useState<ExerciseLibraryItem | null>(
      null
    );

  const [
    restTimerRequest,
    setRestTimerRequest,
  ] = useState<RestTimerRequest | null>(null);

  const [
    exerciseReplacements,
    setExerciseReplacements,
  ] = useState<Record<string, ExerciseLibraryItem>>({});

  const [
    replacementPickerKey,
    setReplacementPickerKey,
  ] = useState<string | null>(null);

  const [
    exerciseLoadInputs,
    setExerciseLoadInputs,
  ] = useState<Record<string, string>>({});


  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    startingWorkout,
    setStartingWorkout,
  ] =
    useState(false);

  const [
    completingWorkout,
    setCompletingWorkout,
  ] =
    useState(false);

  const [
    updatingExercise,
    setUpdatingExercise,
  ] =
    useState<string | number | null>(
      null
    );

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  // ====================================================
  // LOAD DATA
  // ====================================================

  const loadWorkoutData =
    useCallback(
      async () => {
        try {
          setLoading(true);

          setErrorMessage("");

          // ----------------------------------------------
          // AUTH USER
          // ----------------------------------------------

          const {
            data: {
              user,
            },
            error: userError,
          } =
            await supabase.auth.getUser();

          if (userError) {
            throw new Error(
              userError.message
            );
          }

          if (!user) {
            router.replace(
              "/login"
            );

            return;
          }

          setUserId(
            user.id
          );

          setUserEmail(
            user.email || ""
          );

          // ----------------------------------------------
          // LOAD WORKOUT PLAN
          // ----------------------------------------------

          const {
            data: planData,
            error: planError,
          } =
            await supabase
              .from(
                "workout_plans"
              )
              .select("*")
              .eq(
                "user_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(1)
              .maybeSingle();

          if (planError) {
            throw new Error(
              `Failed to load workout plan: ${planError.message}`
            );
          }

          const typedPlan =
            planData
              ? (planData as WorkoutPlan)
              : null;

          setWorkoutPlan(
            typedPlan
          );

          // ----------------------------------------------
          // LOAD WORKOUT SESSIONS
          // ----------------------------------------------

          const {
            data: sessionData,
            error: sessionError,
          } =
            await supabase
              .from(
                "workout_sessions"
              )
              .select("*")
              .eq(
                "user_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              );

          if (sessionError) {
            throw new Error(
              `Failed to load workout sessions: ${sessionError.message}`
            );
          }

          const typedSessions =
            (sessionData ||
              []) as WorkoutSession[];

          setSessions(
            typedSessions
          );

          // ----------------------------------------------
          // FIND ACTIVE SESSION
          // ----------------------------------------------

          const currentActiveSession =
            typedSessions.find(
              (
                session
              ) =>
                session.status ===
                "in_progress"
            ) || null;

          setActiveSession(
            currentActiveSession
          );

          // ----------------------------------------------
          // LOAD EXERCISE LOGS
          // ----------------------------------------------

          const {
            data: logData,
            error: logError,
          } =
            await supabase
              .from(
                "workout_exercise_logs"
              )
              .select("*")
              .eq(
                "user_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              );

          if (logError) {
            console.error(
              "Exercise logs error:",
              logError
            );

            setExerciseLogs(
              []
            );
          } else {
            setExerciseLogs(
              (logData ||
                []) as WorkoutExerciseLog[]
            );
          }

          // ----------------------------------------------
          // LOAD EXERCISE LIBRARY
          // ----------------------------------------------

          const {
            data: libraryData,
            error: libraryError,
          } =
            await supabase
              .from(
                "exercises"
              )
              .select("*")
              .eq(
                "is_active",
                true
              )
              .order(
                "name",
                {
                  ascending:
                    true,
                }
              );

          if (libraryError) {
            console.error(
              "Exercise library error:",
              libraryError
            );

            setExerciseLibrary(
              []
            );
          } else {
            setExerciseLibrary(
              (libraryData ||
                []) as ExerciseLibraryItem[]
            );
          }

          // ----------------------------------------------
          // AUTO SELECT ACTIVE DAY
          // ----------------------------------------------

          if (
            currentActiveSession
          ) {
            setSelectedDayNumber(
              currentActiveSession.workout_day
            );
          } else if (
            typedPlan?.plan?.days &&
            typedPlan.plan.days
              .length > 0
          ) {
            setSelectedDayNumber(
              typedPlan.plan.days[0]
                .day
            );
          }

        } catch (error) {
          console.error(
            "Workout page error:",
            error
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load workout data."
          );

        } finally {
          setLoading(
            false
          );
        }
      },
      [
        router,
      ]
    );

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(
    () => {
      const timeoutId =
        window.setTimeout(() => {
          void loadWorkoutData();
        }, 0);

      return () => {
        window.clearTimeout(
          timeoutId
        );
      };
    },
    [
      loadWorkoutData,
    ]
  );

  useEffect(() => {
    if (!selectedExercise) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedExercise(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedExercise]);

  // ====================================================
  // PLAN DAYS
  // ====================================================

  const workoutDays =
    useMemo(
      () => {
        const days =
          workoutPlan?.plan?.days;

        return Array.isArray(days)
          ? days
          : [];
      },
      [
        workoutPlan,
      ]
    );

  // ====================================================
  // SELECTED DAY
  // ====================================================

  const selectedDay =
    useMemo(
      () => {
        if (
          selectedDayNumber ===
          null
        ) {
          return null;
        }

        return (
          workoutDays.find(
            (
              day
            ) =>
              day.day ===
              selectedDayNumber
          ) || null
        );
      },
      [
        workoutDays,
        selectedDayNumber,
      ]
    );

  // ====================================================
  // ACTIVE SESSION LOGS
  // ====================================================

  const activeSessionLogs =
    useMemo(
      () => {
        if (
          !activeSession
        ) {
          return [];
        }

        return exerciseLogs
          .filter(
            (
              log
            ) =>
              log.workout_session_id ===
              activeSession.id
          )
          .sort(
            (
              a,
              b
            ) =>
              a.created_at.localeCompare(
                b.created_at
              )
          );
      },
      [
        activeSession,
        exerciseLogs,
      ]
    );

  const activeWorkoutDay =
    useMemo(() => {
      if (!activeSession) {
        return null;
      }

      return (
        workoutDays.find(
          (day) =>
            day.day === activeSession.workout_day
        ) || null
      );
    }, [activeSession, workoutDays]);

  const startRestForExercise = useCallback(
    (
      exerciseName: string,
      restValue?: string | null
    ) => {
      setRestTimerRequest({
        id: Date.now(),
        seconds: parseRestSeconds(restValue),
        exerciseName,
      });
    },
    []
  );

  // ====================================================
  // ACTIVE COMPLETED EXERCISES
  // ====================================================

  const activeCompletedExercises =
    useMemo(
      () => {
        return activeSessionLogs.filter(
          (
            log
          ) =>
            log.completed
        ).length;
      },
      [
        activeSessionLogs,
      ]
    );

  // ====================================================
  // ACTIVE TOTAL EXERCISES
  // ====================================================

  const activeTotalExercises =
    activeSessionLogs.length;

  // ====================================================
  // ACTIVE PROGRESS
  // ====================================================

  const activeProgress =
    activeTotalExercises >
    0
      ? Math.round(
          (
            activeCompletedExercises /
            activeTotalExercises
          ) *
            100
        )
      : 0;

  // ====================================================
  // COMPLETED DAYS
  // ====================================================

  const completedDays =
    useMemo(
      () => {
        return sessions
          .filter(
            (
              session
            ) =>
              session.status ===
              "completed"
          )
          .map(
            (
              session
            ) =>
              session.workout_day
          );
      },
      [
        sessions,
      ]
    );

  // ====================================================
  // EXERCISE LIBRARY MATCH
  // ====================================================

  const getExerciseLibraryItem =
    useCallback(
      (
        exerciseName: string
      ) => {
        if (
          !exerciseName ||
          exerciseLibrary.length ===
            0
        ) {
          return null;
        }

        let bestMatch:
          | ExerciseLibraryItem
          | null =
          null;

        let bestScore =
          0;

        for (
          const exercise of exerciseLibrary
        ) {
          const score =
            getExerciseMatchScore(
              exerciseName,
              exercise.name
            );

          if (
            score >
            bestScore
          ) {
            bestScore =
              score;

            bestMatch =
              exercise;
          }
        }

        return bestScore >=
          20
          ? bestMatch
          : null;
      },
      [
        exerciseLibrary,
      ]
    );

  const getPlanExerciseKey = useCallback(
    (day: number, index: number) => `${day}:${index}`,
    []
  );

  const getReplacementCandidates = useCallback(
    (exerciseName: string) => {
      const original = getExerciseLibraryItem(exerciseName);

      return getExerciseReplacementCandidates(
        original,
        exerciseLibrary,
        4
      );
    },
    [exerciseLibrary, getExerciseLibraryItem]
  );

  // ====================================================
  // GET SESSION FOR DAY
  // ====================================================

  const getSessionForDay =
    (
      dayNumber: number
    ) => {
      return (
        sessions.find(
          (
            session
          ) =>
            session.workout_day ===
              dayNumber &&
            session.status ===
              "completed"
        ) || null
      );
    };

  // ====================================================
  // START WORKOUT
  // ====================================================

  const handleStartWorkout =
    async () => {
      if (
        !userId ||
        !selectedDay
      ) {
        return;
      }

      if (
        activeSession
      ) {
        setSuccessMessage(
          "You already have a workout in progress."
        );

        return;
      }

      if (
        selectedDay.exercises
          .length ===
        0
      ) {
        setErrorMessage(
          "This is a rest day and does not contain any exercises."
        );

        return;
      }

      try {
        setStartingWorkout(
          true
        );

        setErrorMessage(
          ""
        );

        setSuccessMessage(
          ""
        );

        // ----------------------------------------------
        // CREATE WORKOUT SESSION
        // ----------------------------------------------

        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase
            .from(
              "workout_sessions"
            )
            .insert({
              user_id:
                userId,

              workout_plan_id:
                workoutPlan?.id ||
                null,

              workout_day:
                selectedDay.day,

              workout_name:
                selectedDay.name,

              status:
                "in_progress",

              started_at:
                new Date().toISOString(),
            })
            .select()
            .single();

        if (sessionError) {
          throw new Error(
            `Failed to start workout: ${sessionError.message}`
          );
        }

        if (
          !sessionData
        ) {
          throw new Error(
            "Failed to create workout session."
          );
        }

        const newSession =
          sessionData as WorkoutSession;

        // ----------------------------------------------
        // CREATE EXERCISE LOGS
        //
        // IMPORTANT:
        // exercise_id is intentionally omitted here. Older FitMate
        // databases used UUID exercise IDs, while the current schema
        // uses bigint IDs. exercise_name is the stable cross-version
        // reference, and the nullable relation can be backfilled by a
        // database migration without blocking workout creation.
        // ----------------------------------------------

        const logs =
          selectedDay.exercises.map(
            (
              exercise,
              index
            ) => {
              const replacement =
                exerciseReplacements[
                  getPlanExerciseKey(selectedDay.day, index)
                ];

              return {
                workout_session_id:
                  newSession.id,

                exercise_name:
                  replacement?.name || exercise.name,

                original_exercise_name:
                  exercise.name,

                equipment_unavailable:
                  Boolean(replacement),

                workout_day:
                  selectedDay.day,

                sets:
                  exercise.sets,

                reps:
                  null,

                completed:
                  false,

                completed_at:
                  null,

                user_id:
                  userId,
              };
            }
          );

        const {
          data: createdLogs,
          error: logError,
        } =
          await supabase
            .from(
              "workout_exercise_logs"
            )
            .insert(
              logs
            )
            .select();

        // ----------------------------------------------
        // ROLLBACK SESSION IF LOG CREATION FAILS
        // ----------------------------------------------

        if (logError) {
          console.error(
            "Exercise logs insert error:",
            logError
          );

          await supabase
            .from(
              "workout_sessions"
            )
            .delete()
            .eq(
              "id",
              newSession.id
            );

          throw new Error(
            `Failed to create exercise logs: ${logError.message}`
          );
        }

        // ----------------------------------------------
        // UPDATE LOCAL STATE
        // ----------------------------------------------

        setActiveSession(
          newSession
        );

        setSessions(
          (
            previous
          ) => [
            newSession,
            ...previous,
          ]
        );

        setExerciseLogs(
          (
            previous
          ) => [
            ...((createdLogs ||
              []) as WorkoutExerciseLog[]),
            ...previous,
          ]
        );

        setSuccessMessage(
          tr(
            "Latihan dimulai. Catat setiap set agar progres tetap rapi.",
            "Workout started. Log each set to keep your progress organized."
          )
        );

        setReplacementPickerKey(null);

      } catch (error) {
        console.error(
          "Start workout error:",
          error
        );

        void reportClientEvent({
          eventType: "start_workout_failed",
          severity: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to start workout.",
          metadata: {
            workout_day: selectedDay.day,
            exercise_count:
              selectedDay.exercises.length,
          },
        });

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to start workout."
        );

      } finally {
        setStartingWorkout(
          false
        );
      }
    };

  // ====================================================
  // TOGGLE EXERCISE
  // ====================================================

  const handleToggleExercise =
    async (
      log: WorkoutExerciseLog
    ) => {
      if (
        !activeSession ||
        updatingExercise ===
          log.id
      ) {
        return;
      }

      try {
        setUpdatingExercise(
          log.id
        );

        const newCompleted =
          !log.completed;

        const completedAt =
          newCompleted
            ? new Date().toISOString()
            : null;

        const loadValue =
          exerciseLoadInputs[log.id] ??
          (log.load_kg != null ? String(log.load_kg) : "");

        const parsedLoad =
          loadValue.trim() === ""
            ? null
            : Number(loadValue);

        if (
          parsedLoad !== null &&
          (!Number.isFinite(parsedLoad) ||
            parsedLoad < 0 ||
            parsedLoad > 1000)
        ) {
          throw new Error(
            tr(
              "Masukkan beban antara 0 dan 1000 kg, atau kosongkan kolom.",
              "Enter a load between 0 and 1000 kg, or leave the field empty."
            )
          );
        }

        const {
          error,
        } =
          await supabase
            .from(
              "workout_exercise_logs"
            )
            .update({
              completed:
                newCompleted,

              completed_at:
                completedAt,

              load_kg:
                parsedLoad,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              log.id
            )
            .eq(
              "user_id",
              userId
            );

        if (error) {
          throw new Error(
            error.message
          );
        }

        setExerciseLogs(
          (
            previous
          ) =>
            previous.map(
              (
                item
              ) =>
                item.id ===
                log.id
                  ? {
                      ...item,

                      completed:
                        newCompleted,

                      completed_at:
                        completedAt,

                      load_kg:
                        parsedLoad,

                      updated_at:
                        new Date().toISOString(),
                    }
                  : item
            )
        );

        if (newCompleted) {
          const plannedExercise =
            activeWorkoutDay?.exercises.find(
              (exercise) =>
                normalizeExerciseName(exercise.name) ===
                normalizeExerciseName(
                  log.original_exercise_name ||
                    log.exercise_name
                )
            );

          startRestForExercise(
            log.exercise_name,
            plannedExercise?.rest
          );
        }

      } catch (error) {
        console.error(
          "Toggle exercise error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to update exercise."
        );

      } finally {
        setUpdatingExercise(
          null
        );
      }
    };

  // ====================================================
  // COMPLETE WORKOUT
  // ====================================================

  const handleCompleteWorkout =
    async () => {
      if (
        !activeSession
      ) {
        return;
      }

      if (
        activeCompletedExercises ===
        0
      ) {
        setErrorMessage(
          "Complete at least one exercise before finishing the workout."
        );

        return;
      }

      try {
        setCompletingWorkout(
          true
        );

        setErrorMessage(
          ""
        );

        setSuccessMessage(
          ""
        );

        const completedAt =
          new Date().toISOString();

        const {
          error,
        } =
          await supabase
            .from(
              "workout_sessions"
            )
            .update({
              status:
                "completed",

              completed_at:
                completedAt,
            })
            .eq(
              "id",
              activeSession.id
            )
            .eq(
              "user_id",
              userId
            );

        if (error) {
          throw new Error(
            error.message
          );
        }

        const updatedSession:
          WorkoutSession = {
          ...activeSession,

          status:
            "completed",

          completed_at:
            completedAt,
        };

        setSessions(
          (
            previous
          ) =>
            previous.map(
              (
                session
              ) =>
                session.id ===
                activeSession.id
                  ? updatedSession
                  : session
            )
        );

        setActiveSession(
          null
        );

        setSuccessMessage(
          tr(
            "Latihan selesai. Progres sesi ini sudah tersimpan.",
            "Workout complete. This session has been saved."
          )
        );

      } catch (error) {
        console.error(
          "Complete workout error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to complete workout."
        );

      } finally {
        setCompletingWorkout(
          false
        );
      }
    };

  // ====================================================
  // REPEAT WORKOUT
  // ====================================================

  const handleRepeatWorkout =
    (
      day: WorkoutDay
    ) => {
      setSelectedDayNumber(
        day.day
      );

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      });

      setSuccessMessage(
        tr(
          `Hari ${day.day} dipilih. Tekan "Mulai Latihan" untuk mengulang sesi ini.`,
          `Day ${day.day} selected. Tap "Start Workout" to repeat this session.`
        )
      );
    };

  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout =
    async () => {
      if (
        loggingOut
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to logout?"
        );

      if (
        !confirmed
      ) {
        return;
      }

      try {
        setLoggingOut(
          true
        );

        const {
          error,
        } =
          await supabase.auth.signOut();

        if (error) {
          throw new Error(
            error.message
          );
        }

        localStorage.removeItem(
          "fitmate_ai_plan"
        );

        window.location.href =
          "/login";

      } catch (error) {
        console.error(
          "Logout error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Logout failed."
        );

      } finally {
        setLoggingOut(
          false
        );
      }
    };

  const selectedExerciseGuide =
    selectedExercise
      ? getExerciseGuide(
          selectedExercise.slug,
          selectedExercise.name,
          language
        )
      : null;

  // ====================================================
  // LOADING
  // ====================================================

  if (
    loading
  ) {
    return (
      <main className="fitmate-app-page flex min-h-screen items-center justify-center bg-white px-6">

        <div className="text-center">

          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700"><FitMateIcon name="dumbbell" className="h-6 w-6" /></span>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            {tr("Menyiapkan Latihan", "Preparing Your Workout")}
          </h1>

          <p className="mt-3 text-gray-500">
            {tr(
              "Sedang memuat sesi latihan Anda.",
              "Loading your workout session."
            )}
          </p>

        </div>

      </main>
    );
  }

  // ====================================================
  // NO PLAN
  // ====================================================

  if (
    !workoutPlan
  ) {
    return (
      <main className="fitmate-app-page min-h-screen bg-white">

        <nav className="border-b border-gray-100 bg-white px-6 py-5">

          <div className="mx-auto flex max-w-7xl items-center justify-between">

            <FitMateBrand href="/dashboard" size="sm" showCompany />

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              {tr("Keluar", "Log out")}
            </button>

          </div>

        </nav>

        <div className="flex min-h-[80vh] items-center justify-center px-6">

          <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">

            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><FitMateIcon name="list" className="h-6 w-6" /></span>

            <h1 className="mt-6 text-3xl font-bold text-gray-900">
              {tr(
                "Belum Ada Rencana Latihan",
                "No Workout Plan Yet"
              )}
            </h1>

            <p className="mt-4 text-gray-500">
              {tr(
                "Buat rencana latihan terlebih dahulu sebelum memulai sesi.",
                "Create a workout plan before starting a session."
              )}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/plan"
                )
              }
              className="mt-7 w-full rounded-xl bg-green-600 px-6 py-4 font-bold text-white transition hover:bg-green-700"
            >
              {tr("Buat Rencana", "Create Plan")}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="mt-3 w-full rounded-xl border border-gray-200 px-6 py-4 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {tr("Kembali ke Beranda", "Back to Home")}
            </button>

          </div>

        </div>

      </main>
    );
  }

  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <main className="fitmate-app-page min-h-screen bg-slate-50 pb-48 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <FitMateBrand href="/dashboard" size="sm" showCompany />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/plan")}
              className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200"
            >
              {tr("Rencana", "Plan")}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-400/10"
            >
              {loggingOut ? tr("Keluar…", "Logging out…") : tr("Keluar", "Log out")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        <ReadinessBanner />

        {(errorMessage || successMessage) && (
          <div
            className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
              errorMessage
                ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100"
                : "border-green-200 bg-green-50 text-green-800 dark:border-green-400/20 dark:bg-green-400/10 dark:text-green-100"
            }`}
          >
            <span>{errorMessage || successMessage}</span>
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="min-h-0 shrink-0 text-lg leading-none"
              aria-label={tr("Tutup pesan", "Close message")}
            >
              ×
            </button>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 to-emerald-500 p-5 text-white shadow-lg shadow-green-600/15 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-green-100">
                {activeSession
                  ? tr("Sesi berjalan", "Session in progress")
                  : tr("Hari ini", "Today")}
              </p>
              <h1 className="mt-2 truncate text-3xl font-black sm:text-4xl">
                {activeSession
                  ? localizeWorkoutSessionName(activeSession.workout_name, activeSession.workout_day, language)
                  : selectedDay
                    ? localizeWorkoutDayName(selectedDay.name, selectedDay.day, selectedDay.exercises.length > 0, language)
                    : tr("Pilih latihan", "Choose a workout")}
              </h1>
              <p className="mt-2 text-sm text-green-50/90">
                {activeSession
                  ? `${activeCompletedExercises}/${activeTotalExercises} ${tr("gerakan selesai", "exercises complete")}`
                  : selectedDay
                    ? `${selectedDay.exercises.length} ${tr("gerakan", "exercises")} · ${localizeWorkoutFocus(selectedDay.focus, selectedDay.exercises.length > 0, language)}`
                    : tr("Pilih hari latihan.", "Choose a workout day.")}
              </p>
            </div>

            {activeSession ? (
              <div className="shrink-0 rounded-2xl bg-white/15 px-5 py-3 text-center backdrop-blur">
                <p className="text-3xl font-black">{activeProgress}%</p>
                <p className="text-xs text-green-50">{tr("Progres", "Progress")}</p>
              </div>
            ) : selectedDay && selectedDay.exercises.length > 0 ? (
              <button
                type="button"
                data-testid="start-workout"
                onClick={handleStartWorkout}
                disabled={startingWorkout}
                className="shrink-0 rounded-2xl bg-white px-6 py-3 font-black text-green-700 shadow-sm hover:bg-green-50 disabled:opacity-50"
              >
                {startingWorkout
                  ? tr("Memulai…", "Starting…")
                  : completedDays.includes(selectedDay.day)
                    ? tr("Ulangi Latihan", "Repeat Workout")
                    : tr("Mulai Latihan", "Start Workout")}
              </button>
            ) : null}
          </div>

          {activeSession && (
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${activeProgress}%` }}
              />
            </div>
          )}
        </section>

        {activeSession ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-green-600 dark:text-green-300">
                  {tr("Gerakan", "Exercises")}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {tr("Gerakan", "Exercises")}
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {activeCompletedExercises}/{activeTotalExercises}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {activeSessionLogs.map((log, index) => {
                const libraryExercise = getExerciseLibraryItem(log.exercise_name);
                const plannedExercise = activeWorkoutDay?.exercises.find(
                  (exercise) =>
                    normalizeExerciseName(exercise.name) ===
                    normalizeExerciseName(log.original_exercise_name || log.exercise_name)
                );

                return (
                  <article
                    key={log.id}
                    className={`rounded-2xl border p-4 ${
                      log.completed
                        ? "border-green-200 bg-green-50 dark:border-green-400/20 dark:bg-green-400/10"
                        : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                          log.completed
                            ? "bg-green-600 text-white"
                            : "bg-white text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200"
                        }`}
                      >
                        {log.completed ? <FitMateIcon name="check" className="h-3.5 w-3.5" /> : index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate font-black">{log.exercise_name}</h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {log.sets} {tr("set", "sets")}
                              {plannedExercise?.reps ? ` · ${plannedExercise.reps} ${tr("rep", "reps")}` : ""}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            {plannedExercise?.rest && (
                              <button
                                type="button"
                                onClick={() => startRestForExercise(log.exercise_name, plannedExercise.rest)}
                                className="rounded-xl bg-orange-100 px-3 py-2 text-xs font-black text-orange-700 dark:bg-orange-400/10 dark:text-orange-200"
                              >
                                {tr("Istirahat", "Rest")} {plannedExercise.rest}
                              </button>
                            )}
                            {libraryExercise && (
                              <button
                                type="button"
                                onClick={() => setSelectedExercise(libraryExercise)}
                                className="rounded-xl bg-green-100 px-3 py-2 text-xs font-black text-green-700 dark:bg-green-400/10 dark:text-green-200"
                              >
                                {tr("Lihat", "View")}
                              </button>
                            )}
                          </div>
                        </div>

                        {userId && activeSession && (
                          <details className="mt-3 rounded-xl bg-white px-3 py-2 dark:bg-slate-950/40">
                            <summary className="cursor-pointer text-xs font-black text-slate-600 dark:text-slate-300">
                              {tr("Catat set", "Log sets")}
                            </summary>
                            <div className="pt-2">
                              <ExerciseSetLogger
                                userId={userId}
                                workoutSessionId={activeSession.id}
                                workoutExerciseLogId={log.id}
                                exerciseId={libraryExercise?.id ?? log.exercise_id}
                                exerciseName={log.exercise_name}
                                plannedSets={log.sets}
                                plannedReps={plannedExercise?.reps ?? log.reps}
                              />
                            </div>
                          </details>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex min-w-0 flex-1">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              step="0.5"
                              inputMode="decimal"
                              value={
                                exerciseLoadInputs[log.id] ??
                                (log.load_kg != null ? String(log.load_kg) : "")
                              }
                              onChange={(event) =>
                                setExerciseLoadInputs((previous) => ({
                                  ...previous,
                                  [log.id]: event.target.value,
                                }))
                              }
                              placeholder={tr("Beban (opsional)", "Load (optional)")}
                              disabled={updatingExercise === log.id}
                              className="min-w-0 flex-1 rounded-l-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"
                              aria-label={tr(
                                `Beban ${log.exercise_name} dalam kilogram`,
                                `${log.exercise_name} load in kilograms`
                              )}
                            />
                            <span className="rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                              kg
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleExercise(log)}
                            disabled={updatingExercise === log.id}
                            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black disabled:opacity-50 ${
                              log.completed
                                ? "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                                : "bg-green-600 text-white"
                            }`}
                          >
                            {updatingExercise === log.id
                              ? tr("Menyimpan…", "Saving…")
                              : log.completed
                                ? tr("Selesai", "Done")
                                : tr("Tandai", "Complete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleCompleteWorkout}
              disabled={completingWorkout || activeCompletedExercises === 0}
              className="mt-5 w-full rounded-2xl bg-green-600 py-4 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10"
            >
              {completingWorkout
                ? tr("Menyelesaikan…", "Completing…")
                : tr("Selesaikan Latihan", "Complete Workout")}
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-green-600 dark:text-green-300">
                    {tr("Minggu ini", "This week")}
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {tr("Pilih latihan", "Choose workout")}
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {workoutDays.length} {tr("hari", "days")}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {workoutDays.map((day) => {
                  const selected = selectedDayNumber === day.day;
                  const completed = completedDays.includes(day.day);
                  const restDay = day.exercises.length === 0;

                  return (
                    <button
                      key={day.day}
                      type="button"
                      onClick={() => setSelectedDayNumber(day.day)}
                      className={`fitmate-day-card flex min-h-[10.5rem] flex-col rounded-[1.4rem] border p-4 text-left shadow-sm transition ${
                        selected
                          ? "border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-400/10"
                          : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${
                            selected
                              ? "bg-green-600 text-white"
                              : "bg-white text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200"
                          }`}
                        >
                          {day.day}
                        </span>
                        <span className="text-xs font-black text-slate-400">
                          {completed ? tr("Selesai", "Done") : restDay ? tr("REST", "REST") : day.exercises.length}
                        </span>
                      </div>
                      <p className="mt-4 line-clamp-3 text-lg font-black leading-snug">{localizeWorkoutDayName(day.name, day.day, day.exercises.length > 0, language)}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedDay && (
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-green-600 dark:text-green-300">
                      {tr("Hari", "Day")} {selectedDay.day}
                    </p>
                    <h2 className="mt-1 truncate text-2xl font-black">{localizeWorkoutDayName(selectedDay.name, selectedDay.day, selectedDay.exercises.length > 0, language)}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{localizeWorkoutFocus(selectedDay.focus, selectedDay.exercises.length > 0, language)}</p>
                  </div>

                  {selectedDay.exercises.length > 0 && (
                    <button
                      type="button"
                      data-testid="start-workout"
                      onClick={handleStartWorkout}
                      disabled={startingWorkout}
                      className="w-full rounded-2xl bg-green-600 px-6 py-3 font-black text-white disabled:opacity-50 sm:w-auto"
                    >
                      {startingWorkout
                        ? tr("Memulai…", "Starting…")
                        : completedDays.includes(selectedDay.day)
                          ? tr("Ulangi Latihan", "Repeat Workout")
                          : tr("Mulai Latihan", "Start Workout")}
                    </button>
                  )}
                </div>

                {selectedDay.exercises.length === 0 ? (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center dark:bg-white/5">
                    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FitMateIcon name="activity" className="h-5 w-5" /></span>
                    <h3 className="mt-2 font-black">{tr("Hari pemulihan", "Recovery day")}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {tr("Istirahat, hidrasi, dan tidur cukup.", "Rest, hydrate, and get enough sleep.")}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 divide-y divide-slate-200 dark:divide-white/10">
                    {selectedDay.exercises.map((exercise, index) => {
                      const libraryExercise = getExerciseLibraryItem(exercise.name);
                      const planExerciseKey = getPlanExerciseKey(selectedDay.day, index);
                      const selectedReplacement = exerciseReplacements[planExerciseKey] || null;
                      const guideExercise = selectedReplacement || libraryExercise;
                      const replacementCandidates = getReplacementCandidates(exercise.name);

                      return (
                        <article key={`${exercise.name}-${index}`} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-sm font-black text-green-700 dark:bg-green-400/10 dark:text-green-200">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <h3 className="truncate font-black">
                                    {selectedReplacement?.name || exercise.name}
                                  </h3>
                                  {selectedReplacement && (
                                    <p className="mt-1 text-xs font-bold text-green-600 dark:text-green-300">
                                      {tr("Pengganti", "Replacement")} · {exercise.name}
                                    </p>
                                  )}
                                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {exercise.sets} {tr("set", "sets")} · {exercise.reps} {tr("rep", "reps")} · {exercise.rest}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {libraryExercise && (
                                    <button
                                      type="button"
                                      data-testid="equipment-unavailable"
                                      aria-label={tr(
                                        "Alat tidak tersedia, pilih gerakan pengganti",
                                        "Equipment unavailable, choose a replacement"
                                      )}
                                      onClick={() =>
                                        setReplacementPickerKey(
                                          replacementPickerKey === planExerciseKey ? null : planExerciseKey
                                        )
                                      }
                                      className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-800 dark:bg-amber-400/10 dark:text-amber-200"
                                    >
                                      {tr("Ganti", "Replace")}
                                    </button>
                                  )}
                                  {guideExercise && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedExercise(guideExercise)}
                                      className="rounded-xl bg-green-100 px-3 py-2 text-xs font-black text-green-700 dark:bg-green-400/10 dark:text-green-200"
                                    >
                                      {tr("Panduan", "Guide")}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {replacementPickerKey === planExerciseKey && libraryExercise && (
                                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-950/50">
                                  <p className="text-xs font-black text-slate-600 dark:text-slate-300">
                                    {tr("Pilih gerakan dengan otot yang sama", "Choose the same muscle group")}: {libraryExercise.target_muscle || getMuscleGroup(libraryExercise.category)}
                                  </p>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {replacementCandidates.map((candidate) => (
                                      <button
                                        key={candidate.id}
                                        type="button"
                                        onClick={() => {
                                          setExerciseReplacements((previous) => ({
                                            ...previous,
                                            [planExerciseKey]: candidate,
                                          }));
                                          setReplacementPickerKey(null);
                                        }}
                                        className="rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-bold dark:border-white/10 dark:bg-white/5"
                                      >
                                        {candidate.name}
                                        <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">
                                          {candidate.equipment || tr("Tanpa alat", "No equipment")}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                  {selectedReplacement && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExerciseReplacements((previous) => {
                                          const next = { ...previous };
                                          delete next[planExerciseKey];
                                          return next;
                                        });
                                        setReplacementPickerKey(null);
                                      }}
                                      className="mt-3 text-xs font-black text-rose-600 dark:text-rose-300"
                                    >
                                      {tr("Gunakan gerakan asli", "Use original exercise")}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {getSessionForDay(selectedDay.day) && selectedDay.exercises.length > 0 && (
                  <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-green-50 p-4 dark:bg-green-400/10 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-green-800 dark:text-green-100">
                      {tr("Sesi ini pernah diselesaikan.", "You completed this session before.")}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRepeatWorkout(selectedDay)}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white"
                    >
                      {tr("Ulangi", "Repeat")}
                    </button>
                  </div>
                )}
              </section>
            )}

            <button
              type="button"
              onClick={() => router.push("/exercises")}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <span>
                <span className="block font-black">{tr("Pustaka gerakan", "Exercise library")}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tr("Panduan dan alternatif gerakan.", "Guides and alternatives.")}
                </span>
              </span>
              
            </button>
          </>
        )}
      </div>

      {!activeSession && selectedDay && selectedDay.exercises.length > 0 && (
        <button
          type="button"
          data-testid="start-workout-floating"
          onClick={handleStartWorkout}
          disabled={startingWorkout}
          className="fixed bottom-[calc(max(0.8rem,env(safe-area-inset-bottom))+5.65rem)] left-1/2 z-40 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl bg-green-600 px-6 py-4 font-black text-white shadow-2xl shadow-green-900/25 disabled:opacity-60 sm:hidden"
        >
          {startingWorkout
            ? tr("Memulai…", "Starting…")
            : completedDays.includes(selectedDay.day)
              ? tr("Ulangi Latihan", "Repeat Workout")
              : tr("Mulai Latihan", "Start Workout")}
        </button>
      )}

      {selectedExercise && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={() => setSelectedExercise(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="workout-exercise-guide-title"
            className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-green-600 dark:text-green-300">
                  {tr("Panduan gerakan", "Exercise guide")}
                </p>
                <h2 id="workout-exercise-guide-title" className="truncate text-xl font-black">
                  {selectedExercise.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExercise(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-600 dark:bg-white/10 dark:text-white"
                aria-label={tr("Tutup panduan", "Close guide")}
              >
                ×
              </button>
            </div>

            <div className="bg-slate-50 p-3 dark:bg-slate-950 sm:p-5">
              <Exercise3DGuide
                key={selectedExercise.slug}
                exerciseName={selectedExercise.name}
                exerciseSlug={selectedExercise.slug}
                equipment={selectedExercise.equipment}
                targetMuscle={selectedExercise.target_muscle}
              />
            </div>

            {selectedExerciseGuide && (
              <div className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  {selectedExercise.target_muscle && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700 dark:bg-green-400/10 dark:text-green-200">
                      {selectedExercise.target_muscle}
                    </span>
                  )}
                  {selectedExercise.equipment && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {selectedExercise.equipment}
                    </span>
                  )}
                  {selectedExercise.difficulty && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
                      {selectedExercise.difficulty}
                    </span>
                  )}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                  <p className="text-xs font-black uppercase tracking-wide text-green-600 dark:text-green-300">
                    {tr("Fokus", "Focus")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {selectedExerciseGuide.formFocus}
                  </p>
                </div>

                <details className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <summary className="cursor-pointer font-black">
                    {tr("Lihat tahapan gerakan", "View movement steps")}
                  </summary>
                  <ol className="mt-4 space-y-3">
                    {selectedExerciseGuide.phases.map((instruction, index) => (
                      <li key={instruction} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-black text-green-700 dark:bg-green-400/10 dark:text-green-200">
                          {index + 1}
                        </span>
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </details>
              </div>
            )}
          </div>
        </div>
      )}

      <RestTimer
        key={restTimerRequest?.id ?? "rest-timer"}
        initialSeconds={restTimerRequest?.seconds ?? 60}
        exerciseName={
          restTimerRequest?.exerciseName ??
          tr("Pilih 30, 60, atau 90 detik", "Choose 30, 60, or 90 seconds")
        }
        autoStart={Boolean(restTimerRequest)}
      />
    </main>
  );
}
