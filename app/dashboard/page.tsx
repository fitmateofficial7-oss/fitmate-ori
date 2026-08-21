"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import CompanySignature from "@/components/company-signature";
import FitMateBrand from "@/components/fitmate-brand";
import FitMateIcon from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";
import {
  localizeExperience,
  localizeGoal,
  localizeTrainingDays,
  localizeWorkoutSessionName,
  localizeWorkoutStatus,
} from "@/lib/fitness-i18n";

// ======================================================
// TYPES
// ======================================================

type FitnessProfile = {
  id: string;
  goal: string;
  experience: string | null;
  training_days: string | null;
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  difficulty: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
};

type WorkoutSession = {
  id: string | number;
  user_id: string;
  workout_plan_id: number | null;
  workout_day: number;
  workout_name: string;
  started_at: string;
  completed_at: string | null;
  status: "in_progress" | "completed" | "cancelled" | string;
  created_at: string;
};

type WorkoutExerciseLog = {
  id: string | number;
  workout_session_id: string | number;
  user_id: string;
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
  created_at: string;
  updated_at: string | null;
};

type WeightLog = {
  id: string;
  user_id: string;
  weight: number;
  recorded_at: string;
  created_at: string;
};

type DailyProgress = {
  date: string;
  label: string;
  completed: number;
};

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function DashboardPage() {
  const router = useRouter();
  const { language, tr } = useLanguage();

  // ======================================================
  // USER
  // ======================================================

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  // ======================================================
  // DATA
  // ======================================================

  const [profile, setProfile] =
    useState<FitnessProfile | null>(null);

  const [sessions, setSessions] =
    useState<WorkoutSession[]>([]);

  const [exerciseLogs, setExerciseLogs] =
    useState<WorkoutExerciseLog[]>([]);

  const [weightLogs, setWeightLogs] =
    useState<WeightLog[]>([]);

  const [
    selectedLoadExercise,
    setSelectedLoadExercise,
  ] = useState("");

  // ======================================================
  // WEIGHT FORM
  // ======================================================

  const [weightInput, setWeightInput] =
    useState("");

  const [savingWeight, setSavingWeight] =
    useState(false);

  const [deletingWeightId, setDeletingWeightId] =
    useState<string | null>(null);

  // ======================================================
  // LOADING
  // ======================================================

  const [loading, setLoading] =
    useState(true);

  const [loggingOut, setLoggingOut] =
    useState(false);

  // ======================================================
  // ERROR
  // ======================================================

  const [errorMessage, setErrorMessage] =
    useState("");

  // ======================================================
  // LOAD DASHBOARD DATA
  // ======================================================

  const loadDashboardData =
    useCallback(async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        // ==================================================
        // AUTH
        // ==================================================

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw new Error(
            `Authentication error: ${userError.message}`
          );
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email || "");

        // ==================================================
        // LOAD FITNESS PROFILE
        // ==================================================

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("fitness_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Load fitness profile error:",
            profileError
          );
        }

        setProfile(
          profileData
            ? (profileData as FitnessProfile)
            : null
        );

        // ==================================================
        // LOAD WORKOUT SESSIONS
        // ==================================================

        const {
          data: sessionData,
          error: sessionError,
        } = await supabase
          .from("workout_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("started_at", {
            ascending: false,
          });

        if (sessionError) {
          throw new Error(
            `Failed to load workout history: ${sessionError.message}`
          );
        }

        setSessions(
          (sessionData || []) as WorkoutSession[]
        );

        // ==================================================
        // LOAD EXERCISE LOGS
        // ==================================================

        const {
          data: exerciseData,
          error: exerciseError,
        } = await supabase
          .from("workout_exercise_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (exerciseError) {
          console.error(
            "Load exercise logs error:",
            exerciseError
          );
        }

        setExerciseLogs(
          (exerciseData || []) as WorkoutExerciseLog[]
        );

        // ==================================================
        // LOAD WEIGHT LOGS
        // ==================================================

        const {
          data: weightData,
          error: weightError,
        } = await supabase
          .from("weight_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("recorded_at", {
            ascending: false,
          });

        if (weightError) {
          console.error(
            "Load weight logs error:",
            weightError
          );

          setWeightLogs([]);
        } else {
          setWeightLogs(
            (weightData || []) as WeightLog[]
          );
        }

      } catch (error) {
        console.error(
          "Dashboard load error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }, [router]);

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadDashboardData();
      }, 0);

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [loadDashboardData]);

  // ======================================================
  // COMPLETED WORKOUTS
  // ======================================================

  const completedSessions =
    useMemo(() => {
      return sessions.filter(
        (session) =>
          session.status === "completed" ||
          Boolean(session.completed_at)
      );
    }, [sessions]);

  // ======================================================
  // ACTIVE WORKOUT
  // ======================================================

  const activeSession =
    useMemo(() => {
      return (
        sessions.find(
          (session) =>
            session.status === "in_progress"
        ) || null
      );
    }, [sessions]);

  // ======================================================
  // TOTAL WORKOUTS
  // ======================================================

  const totalWorkouts =
    completedSessions.length;

  // ======================================================
  // COMPLETED EXERCISES
  // ======================================================

  const completedExercises =
    useMemo(() => {
      return exerciseLogs.filter(
        (log) => log.completed
      ).length;
    }, [exerciseLogs]);

  // ======================================================
  // TOTAL EXERCISE LOGS
  // ======================================================

  const totalExerciseLogs =
    exerciseLogs.length;

  // ======================================================
  // COMPLETION RATE
  // ======================================================

  const completionRate =
    totalExerciseLogs > 0
      ? Math.round(
          (completedExercises /
            totalExerciseLogs) *
            100
        )
      : 0;

  // ======================================================
  // WORKOUT STREAK
  // ======================================================

  const workoutStreak =
    useMemo(() => {
      if (completedSessions.length === 0) {
        return 0;
      }

      const completedDates = Array.from(
        new Set(
          completedSessions
            .map((session) => {
              const date = new Date(
                session.completed_at ||
                  session.started_at
              );

              return date
                .toISOString()
                .split("T")[0];
            })
        )
      ).sort(
        (a, b) =>
          new Date(b).getTime() -
          new Date(a).getTime()
      );

      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const todayString =
        today
          .toISOString()
          .split("T")[0];

      const yesterday =
        new Date(today);

      yesterday.setDate(
        today.getDate() - 1
      );

      const yesterdayString =
        yesterday
          .toISOString()
          .split("T")[0];

      if (
        !completedDates.includes(
          todayString
        ) &&
        !completedDates.includes(
          yesterdayString
        )
      ) {
        return 0;
      }

      let streak = 0;

      const currentDate =
        completedDates.includes(
          todayString
        )
          ? new Date(today)
          : new Date(yesterday);

      for (;;) {
        const dateString =
          currentDate
            .toISOString()
            .split("T")[0];

        if (
          completedDates.includes(
            dateString
          )
        ) {
          streak++;

          currentDate.setDate(
            currentDate.getDate() - 1
          );
        } else {
          break;
        }
      }

      return streak;
    }, [completedSessions]);

  // ======================================================
  // WEEKLY PROGRESS
  // ======================================================

  const weeklyProgress =
    useMemo(() => {
      const result: DailyProgress[] = [];

      const now = new Date();

      for (
        let i = 6;
        i >= 0;
        i--
      ) {
        const date =
          new Date(now);

        date.setDate(
          now.getDate() - i
        );

        const year =
          date.getFullYear();

        const month = String(
          date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
          date.getDate()
        ).padStart(2, "0");

        const dateString =
          `${year}-${month}-${day}`;

        const completed =
          completedSessions.filter(
            (session) => {
              const sessionDate =
                new Date(
                  session.completed_at ||
                    session.started_at
                );

              const sessionYear =
                sessionDate.getFullYear();

              const sessionMonth =
                String(
                  sessionDate.getMonth() + 1
                ).padStart(2, "0");

              const sessionDay =
                String(
                  sessionDate.getDate()
                ).padStart(2, "0");

              const sessionDateString =
                `${sessionYear}-${sessionMonth}-${sessionDay}`;

              return (
                sessionDateString ===
                dateString
              );
            }
          ).length;

        result.push({
          date: dateString,
          label:
            date.toLocaleDateString(
              "en-US",
              {
                weekday: "short",
              }
            ),
          completed,
        });
      }

      return result;
    }, [completedSessions]);

  // ======================================================
  // WEEKLY COMPLETED COUNT
  // ======================================================

  const weeklyCompleted =
    weeklyProgress.reduce(
      (total, day) =>
        total + day.completed,
      0
    );

  // ======================================================
  // WEIGHT PROGRESS
  // ======================================================

  const sortedWeightLogs =
    useMemo(() => {
      return [...weightLogs].sort(
        (a, b) =>
          new Date(
            a.recorded_at
          ).getTime() -
          new Date(
            b.recorded_at
          ).getTime()
      );
    }, [weightLogs]);

  const latestWeight =
    weightLogs.length > 0
      ? Number(weightLogs[0].weight)
      : profile?.weight != null
      ? Number(profile.weight)
      : null;

  const previousWeight =
    weightLogs.length > 1
      ? Number(weightLogs[1].weight)
      : null;

  const weightChange =
    latestWeight !== null &&
    previousWeight !== null
      ? Number(
          (
            latestWeight -
            previousWeight
          ).toFixed(2)
        )
      : null;

  const startingWeight =
    sortedWeightLogs.length > 0
      ? Number(
          sortedWeightLogs[0].weight
        )
      : profile?.weight != null
      ? Number(profile.weight)
      : null;

  const totalWeightChange =
    latestWeight !== null &&
    startingWeight !== null
      ? Number(
          (
            latestWeight -
            startingWeight
          ).toFixed(2)
        )
      : null;

  // ======================================================
  // EXERCISE LOAD PROGRESS
  // ======================================================

  const exerciseLoadOptions =
    useMemo(() => {
      const latestByExercise =
        new Map<string, number>();

      exerciseLogs.forEach((log) => {
        const load = Number(log.load_kg);

        if (
          !log.completed ||
          log.load_kg == null ||
          !Number.isFinite(load)
        ) {
          return;
        }

        const timestamp = new Date(
          log.completed_at || log.created_at
        ).getTime();
        const previous =
          latestByExercise.get(log.exercise_name) || 0;

        latestByExercise.set(
          log.exercise_name,
          Math.max(previous, timestamp)
        );
      });

      return [...latestByExercise.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);
    }, [exerciseLogs]);

  const activeLoadExercise =
    exerciseLoadOptions.includes(
      selectedLoadExercise
    )
      ? selectedLoadExercise
      : exerciseLoadOptions[0] || "";

  const selectedExerciseLoadLogs =
    useMemo(() => {
      if (!activeLoadExercise) {
        return [];
      }

      return exerciseLogs
        .filter(
          (log) =>
            log.completed &&
            log.exercise_name ===
              activeLoadExercise &&
            log.load_kg != null &&
            Number.isFinite(
              Number(log.load_kg)
            )
        )
        .sort(
          (a, b) =>
            new Date(
              a.completed_at || a.created_at
            ).getTime() -
            new Date(
              b.completed_at || b.created_at
            ).getTime()
        )
        .slice(-12);
    }, [
      activeLoadExercise,
      exerciseLogs,
    ]);

  const latestExerciseLoad =
    selectedExerciseLoadLogs.length > 0
      ? Number(
          selectedExerciseLoadLogs[
            selectedExerciseLoadLogs.length - 1
          ].load_kg
        )
      : null;

  const previousExerciseLoad =
    selectedExerciseLoadLogs.length > 1
      ? Number(
          selectedExerciseLoadLogs[
            selectedExerciseLoadLogs.length - 2
          ].load_kg
        )
      : null;

  const bestExerciseLoad =
    selectedExerciseLoadLogs.length > 0
      ? Math.max(
          ...selectedExerciseLoadLogs.map(
            (log) => Number(log.load_kg)
          )
        )
      : null;

  const exerciseLoadChange =
    latestExerciseLoad !== null &&
    previousExerciseLoad !== null
      ? Number(
          (
            latestExerciseLoad -
            previousExerciseLoad
          ).toFixed(2)
        )
      : null;

  const exerciseLoadChartPoints =
    useMemo(() => {
      const width = 720;
      const height = 260;
      const paddingX = 46;
      const paddingTop = 30;
      const paddingBottom = 50;
      const values =
        selectedExerciseLoadLogs.map(
          (log) => Number(log.load_kg)
        );

      if (values.length === 0) {
        return [];
      }

      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      const range = Math.max(1, maximum - minimum);
      const usableWidth = width - paddingX * 2;
      const usableHeight =
        height - paddingTop - paddingBottom;

      return selectedExerciseLoadLogs.map(
        (log, index) => ({
          log,
          x:
            values.length === 1
              ? width / 2
              : paddingX +
                (index /
                  (values.length - 1)) *
                  usableWidth,
          y:
            paddingTop +
            ((maximum -
              Number(log.load_kg)) /
              range) *
              usableHeight,
        })
      );
    }, [selectedExerciseLoadLogs]);

  // ======================================================
  // WEIGHT INPUT
  // ======================================================

  const handleAddWeight =
    async () => {
      if (!userId) {
        alert(
          tr(
            "Anda harus login terlebih dahulu.",
            "You must be logged in."
          )
        );
        return;
      }

      const numericWeight =
        Number(weightInput);

      if (
        !weightInput ||
        !Number.isFinite(
          numericWeight
        ) ||
        numericWeight <= 0 ||
        numericWeight >= 500
      ) {
        alert(
          tr(
            "Masukkan berat yang valid antara 1 dan 499 kg.",
            "Please enter a valid weight between 1 and 499 kg."
          )
        );
        return;
      }

      try {
        setSavingWeight(true);

        const {
          data,
          error,
        } = await supabase
          .from("weight_logs")
          .insert({
            user_id: userId,
            weight: numericWeight,
            recorded_at:
              new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setWeightLogs((prev) =>
            [
              data as WeightLog,
              ...prev,
            ].sort(
              (a, b) =>
                new Date(
                  b.recorded_at
                ).getTime() -
                new Date(
                  a.recorded_at
                ).getTime()
            )
          );
        }

        setWeightInput("");

        alert(
          tr(
            "Berat berhasil disimpan!",
            "Weight successfully recorded!"
          )
        );
      } catch (error) {
        console.error(
          "Add weight error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : tr(
                "Gagal menyimpan berat.",
                "Failed to save weight."
              )
        );
      } finally {
        setSavingWeight(false);
      }
    };

  // ======================================================
  // DELETE WEIGHT
  // ======================================================

  const handleDeleteWeight =
    async (id: string) => {
      const confirmed =
        window.confirm(
          tr(
            "Hapus catatan berat ini?",
            "Delete this weight record?"
          )
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingWeightId(id);

        const {
          error,
        } = await supabase
          .from("weight_logs")
          .delete()
          .eq("id", id)
          .eq(
            "user_id",
            userId
          );

        if (error) {
          throw error;
        }

        setWeightLogs((prev) =>
          prev.filter(
            (item) =>
              item.id !== id
          )
        );
      } catch (error) {
        console.error(
          "Delete weight error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : tr(
                "Gagal menghapus catatan berat.",
                "Failed to delete weight record."
              )
        );
      } finally {
        setDeletingWeightId(null);
      }
    };

  // ======================================================
  // GOAL
  // ======================================================

  const currentGoal = localizeGoal(profile?.goal, language);

  // ======================================================
  // EXPERIENCE
  // ======================================================

  const experience = localizeExperience(profile?.experience, language);

  // ======================================================
  // TRAINING DAYS
  // ======================================================

  const trainingDays = localizeTrainingDays(profile?.training_days, language);

  // ======================================================
  // AI INSIGHTS
  // ======================================================

  const aiInsight =
    useMemo(() => {
      if (totalWorkouts === 0) {
        return tr(
          "Belum ada latihan selesai. Mulai latihan hari ini.",
          "No completed workout yet. Start today."
        );
      }

      if (workoutStreak >= 7) {
        return tr(
          `Konsistensi luar biasa! Anda mempertahankan streak ${workoutStreak} hari. Tetap prioritaskan recovery, tidur, dan progres bertahap.`,
          `Amazing consistency! You have maintained a ${workoutStreak}-day streak. Keep focusing on recovery, sleep, and gradual progress.`
        );
      }

      if (completionRate >= 80) {
        return tr(
          `Tingkat penyelesaian latihan Anda mencapai ${completionRate}%. Pertahankan konsistensi, progres bertahap, dan teknik yang baik.`,
          `Your exercise completion rate is ${completionRate}%. Keep progressing gradually with good form.`
        );
      }

      if (completionRate >= 50) {
        return tr(
          `Progres Anda sudah baik dengan tingkat penyelesaian ${completionRate}%. Selesaikan latihan secara bertahap tanpa mengurangi kualitas gerakan.`,
          `You are making good progress with a ${completionRate}% completion rate. Complete more exercises gradually without reducing movement quality.`
        );
      }

      return tr(
        `Anda telah menyelesaikan ${totalWorkouts} latihan. Fokus membangun rutinitas yang konsisten selangkah demi selangkah.`,
        `You have completed ${totalWorkouts} workout${totalWorkouts === 1 ? "" : "s"}. Focus on building a consistent routine step by step.`
      );
    }, [
      totalWorkouts,
      workoutStreak,
      completionRate,
      tr,
    ]);

  // ======================================================
  // FORMAT DATE
  // ======================================================

  const formatDate = (
    dateString: string
  ) => {
    try {
      return new Date(
        dateString
      ).toLocaleDateString(
        language === "id" ? "id-ID" : "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      );
    } catch {
      return dateString;
    }
  };

  // ======================================================
  // FORMAT TIME
  // ======================================================

  const formatTime = (
    dateString: string
  ) => {
    try {
      return new Date(
        dateString
      ).toLocaleTimeString(
        language === "id" ? "id-ID" : "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "";
    }
  };

  // ======================================================
  // LOGOUT
  // ======================================================

  const handleLogout =
    async () => {
      if (loggingOut) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to logout?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setLoggingOut(true);

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
        setLoggingOut(false);
      }
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <main className="fitmate-app-page flex min-h-screen items-center justify-center bg-white px-6">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700"><FitMateIcon name="activity" className="h-6 w-6" /></span>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            {tr("Menyiapkan Beranda", "Preparing Dashboard")}
          </h1>

          <p className="mt-3 text-gray-500">
            {tr(
              "Sedang memuat rencana dan perkembangan Anda.",
              "Loading your plan and progress."
            )}
          </p>
        </div>
      </main>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    errorMessage &&
    !userId
  ) {
    return (
      <main className="fitmate-app-page flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><FitMateIcon name="x" className="h-6 w-6" /></span>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            {tr(
              "Beranda Tidak Dapat Dimuat",
              "Dashboard Could Not Load"
            )}
          </h1>

          <p className="mt-4 text-sm text-red-600">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/login"
              )
            }
            className="mt-6 w-full rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            {tr("Kembali ke Login", "Back to Login")}
          </button>
        </div>
      </main>
    );
  }

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <main className="fitmate-app-page fitmate-dashboard-page min-h-screen bg-white pb-28">

      {/* NAVBAR */}

      <nav className="sticky top-0 z-30 border-b border-white/80 bg-white/85 px-4 py-4 shadow-sm shadow-slate-200/40 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">

          <FitMateBrand href="/dashboard" size="sm" showCompany />

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/coach"
                )
              }
              className="hidden rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-700 transition hover:bg-green-100 sm:block"
            >
              Coach
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="hidden rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 md:block"
            >
              {tr("Beranda", "Home")}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/plan"
                )
              }
              className="hidden rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-green-600 md:block"
            >
              {tr("Rencana", "Plan")}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/workout"
                )
              }
              className="hidden rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 md:block"
            >
              {tr("Latihan", "Workout")}
            </button>

            <button
              type="button"
              onClick={
                handleLogout
              }
              disabled={
                loggingOut
              }
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut
                ? tr("Sedang keluar...", "Logging out...")
                : tr("Keluar", "Log out")}
            </button>

          </div>
        </div>
      </nav>

      {errorMessage && (
        <div
          role="alert"
          className="mx-auto mt-5 flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {tr(
              "Sebagian data dashboard belum berhasil dimuat:",
              "Some dashboard data could not be loaded:"
            )}{" "}
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => void loadDashboardData()}
            className="shrink-0 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-black text-green-700 hover:bg-green-50"
          >
            {tr("Muat ulang", "Reload")}
          </button>
        </div>
      )}

      {/* HERO */}

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl">

          <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-8 text-white shadow-2xl shadow-green-500/20 md:p-10">

            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

              <div>

                <p className="font-semibold text-green-100">
                  {tr("Hari ini", "Today")}
                </p>

                <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold md:text-5xl">
                  {tr("Ringkasan latihan", "Training overview")}
                </h1>

                <p className="mt-4 max-w-2xl text-green-50">
                  {userEmail
                    ? tr(
                        "Latihan dan progresmu dalam satu tempat.",
                        "View your plan, start a workout, and track progress in one place."
                      )
                    : tr(
                        "Mulai perjalanan latihan Anda bersama FitMate.",
                        "Start your fitness journey with FitMate."
                      )}
                </p>

              </div>

              <div className="flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/workout"
                    )
                  }
                  className="rounded-xl bg-white px-6 py-3 font-bold text-green-700 transition hover:bg-green-50"
                >
                  {tr("Mulai Latihan", "Start Workout")}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/plan"
                    )
                  }
                  className="rounded-xl border border-green-300 px-6 py-3 font-bold text-white transition hover:bg-green-700"
                >
                  {tr("Lihat Rencana", "Lihat rencana")}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/coach"
                    )
                  }
                  className="hidden rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:bg-white/20 sm:inline-flex"
                >
                  {tr("Tanya Coach", "Ask Coach")}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/jogging")}
                  className="hidden rounded-xl border border-emerald-200 bg-emerald-300 px-6 py-3 font-bold text-emerald-950 transition hover:bg-emerald-200 sm:inline-flex"
                >
                  {tr("Mulai Jogging", "Start Jogging")}
                </button>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* QUICK STATS */}

      <section className="px-6">
        <div className="mx-auto max-w-7xl">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* TOTAL WORKOUT */}

            <div className="rounded-[1.75rem] border border-white bg-white p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm font-medium text-gray-500">
                    {tr("Total Latihan", "Total Workouts")}
                  </p>

                  <p className="mt-2 text-4xl font-bold text-gray-900">
                    {totalWorkouts}
                  </p>

                </div>

                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700"><FitMateIcon name="dumbbell" className="h-5 w-5" /></span>

              </div>

              <p className="mt-4 text-sm text-gray-500">
                {tr(
                  "Sesi latihan yang selesai",
                  "Completed workout sessions"
                )}
              </p>

            </div>

            {/* STREAK */}

            <div className="rounded-[1.75rem] border border-white bg-white p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm font-medium text-gray-500">
                    {tr("Streak Latihan", "Workout Streak")}
                  </p>

                  <p className="mt-2 text-4xl font-bold text-gray-900">
                    {workoutStreak}
                  </p>

                </div>

                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><FitMateIcon name="energy" className="h-5 w-5" /></span>

              </div>

              <p className="mt-4 text-sm text-gray-500">
                {tr(
                  "Hari aktif berturut-turut",
                  "Consecutive active days"
                )}
              </p>

            </div>

            {/* WEIGHT */}

            <div className="rounded-[1.75rem] border border-white bg-white p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm font-medium text-gray-500">
                    {tr("Berat Saat Ini", "Current Weight")}
                  </p>

                  <p className="mt-2 text-4xl font-bold text-gray-900">
                    {latestWeight !== null
                      ? `${latestWeight} kg`
                      : "--"}
                  </p>

                </div>

                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700"><FitMateIcon name="scale" className="h-5 w-5" /></span>

              </div>

              <p className="mt-4 text-sm text-gray-500">
                {tr(
                  "Pengukuran berat terbaru",
                  "Latest weight measurement"
                )}
              </p>

            </div>

            {/* COMPLETION */}

            <div className="rounded-[1.75rem] border border-white bg-white p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm font-medium text-gray-500">
                    {tr("Tingkat Penyelesaian", "Completion Rate")}
                  </p>

                  <p className="mt-2 text-4xl font-bold text-gray-900">
                    {completionRate}%
                  </p>

                </div>

                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><FitMateIcon name="chart" className="h-5 w-5" /></span>

              </div>

              <p className="mt-4 text-sm text-gray-500">
                {tr(
                  "Persentase gerakan yang selesai",
                  "Exercise completion rate"
                )}
              </p>

            </div>

          </div>

        </div>
      </section>

      {/* PROFILE + ACTIVE WORKOUT */}

      <section className="px-6 py-10">

        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">

          {/* PROFILE */}

          <div className="fitmate-dashboard-profile rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-semibold uppercase text-green-600">
                  {tr("PROFIL KEBUGARAN", "YOUR FITNESS PROFILE")}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {tr("Tujuan Anda Saat Ini", "Your Current Goal")}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/plan"
                  )
                }
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                {tr("Lihat Rencana", "Lihat rencana")}
              </button>

            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  {tr("Tujuan", "Goal")}
                </p>
                <p className="mt-2 font-bold text-gray-900">
                  {currentGoal}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  {tr("Pengalaman", "Experience")}
                </p>
                <p className="mt-2 font-bold text-gray-900">
                  {experience}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  {tr("Jadwal", "Training")}
                </p>
                <p className="mt-2 font-bold text-gray-900">
                  {trainingDays}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  {tr("Data Tubuh", "Body")}
                </p>
                <p className="mt-2 font-bold text-gray-900">
                  {profile?.height
                    ? `${profile.height} cm`
                    : "--"}
                  {" / "}
                  {latestWeight !== null
                    ? `${latestWeight} kg`
                    : "--"}
                </p>
              </div>

            </div>

          </div>

          {/* ACTIVE WORKOUT */}

          <div className="rounded-3xl bg-gray-900 p-6 text-white shadow-sm">

            <p className="text-sm font-semibold text-gray-400">
              {tr("STATUS LATIHAN", "WORKOUT STATUS")}
            </p>

            {activeSession ? (
              <>
                <h2 className="mt-3 text-2xl font-bold">
                  {tr(
                    "Latihan Sedang Berjalan",
                    "Workout In Progress"
                  )}
                </h2>

                <p className="mt-2 text-gray-400">
                  {localizeWorkoutSessionName(activeSession.workout_name, activeSession.workout_day, language)}
                </p>

                <p className="mt-4 text-sm text-gray-400">
                  {tr("Hari", "Day")}{" "}
                  {activeSession.workout_day}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/workout"
                    )
                  }
                  className="mt-6 w-full rounded-xl bg-green-600 py-3 font-bold text-white transition hover:bg-green-700"
                >
                  {tr("Lanjutkan Latihan", "Continue Workout")}
                </button>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-2xl font-bold">
                  {tr("Siap Latihan?", "Ready to Train?")}
                </h2>

                <p className="mt-2 text-gray-400">
                  {tr(
                    "Mulai latihan berikutnya dan lanjutkan streak Anda.",
                    "Start your next workout and keep building your streak."
                  )}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/workout"
                    )
                  }
                  className="mt-6 w-full rounded-xl bg-green-600 py-3 font-bold text-white transition hover:bg-green-700"
                >
                  {tr("Buka Latihan", "Go to Workout")}
                </button>
              </>
            )}

          </div>

        </div>

      </section>

      {/* PROGRESS CHART */}

      <section className="fitmate-dashboard-detail px-6">

        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm md:p-8">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-semibold uppercase text-green-600">
                {tr("Progres", "Progress")}
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {tr("Aktivitas Mingguan", "Your Weekly Activity")}
              </h2>

            </div>

            <div className="rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
              {weeklyCompleted}{" "}
              {tr("latihan minggu ini", "workouts this week")}
            </div>

          </div>

          <div className="mt-8 grid grid-cols-7 gap-3">

            {weeklyProgress.map(
              (day) => {

                const maxHeight = 160;

                const barHeight =
                  day.completed > 0
                    ? Math.min(
                        maxHeight,
                        Math.max(
                          35,
                          day.completed *
                            50
                        )
                      )
                    : 20;

                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center"
                  >

                    <div className="flex h-40 w-full items-end justify-center rounded-2xl bg-gray-50 p-2">

                      <div
                        className={`w-full max-w-10 rounded-xl transition-all ${
                          day.completed > 0
                            ? "bg-green-600"
                            : "bg-gray-200"
                        }`}
                        style={{
                          height: `${barHeight}px`,
                        }}
                      />

                    </div>

                    <p className="mt-3 text-xs font-semibold text-gray-500">
                      {day.label}
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {day.completed}
                    </p>

                  </div>
                );
              }
            )}

          </div>

          <p className="mt-6 text-sm text-gray-500">
            {tr(
              "Sesi selesai dalam 7 hari terakhir.",
              "This chart shows completed workout sessions over the last 7 days."
            )}
          </p>

        </div>

      </section>

      {/* EXERCISE LOAD PROGRESS */}

      <section className="fitmate-dashboard-detail px-6 py-10">

        <div className="mx-auto max-w-7xl">

          <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">

            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">

              <div className="flex items-start gap-4">

                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700"><FitMateIcon name="chart" className="h-5 w-5" /></span>

                <div>

                  <p className="text-sm font-semibold uppercase text-green-600">
                    {tr(
                      "Progres Beban Latihan",
                      "Workout Load Progress"
                    )}
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-gray-900">
                    {tr(
                      "Lihat Kekuatanmu Bertumbuh",
                      "Watch Your Strength Grow"
                    )}
                  </h2>

                  <p className="mt-2 max-w-2xl text-gray-500">
                    {tr(
                      "Beban dicatat per gerakan.",
                      "Load is optional and recorded per exercise when you mark it complete."
                    )}
                  </p>

                </div>

              </div>

              {exerciseLoadOptions.length > 0 && (
                <label className="block w-full md:w-72">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    {tr(
                      "Pilih gerakan",
                      "Choose exercise"
                    )}
                  </span>

                  <select
                    value={activeLoadExercise}
                    onChange={(event) =>
                      setSelectedLoadExercise(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  >
                    {exerciseLoadOptions.map(
                      (exerciseName) => (
                        <option
                          key={exerciseName}
                          value={exerciseName}
                        >
                          {exerciseName}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}

            </div>

            {selectedExerciseLoadLogs.length > 0 ? (
              <>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">

                  <div className="rounded-2xl bg-green-50 p-5">
                    <p className="text-sm text-green-700">
                      {tr(
                        "Beban Terbaru",
                        "Latest Load"
                      )}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-green-950">
                      {latestExerciseLoad} kg
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">
                      {tr(
                        "Beban Terbaik",
                        "Best Load"
                      )}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {bestExerciseLoad} kg
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">
                      {tr(
                        "Perubahan Terakhir",
                        "Latest Change"
                      )}
                    </p>
                    <p
                      className={`mt-2 text-2xl font-bold ${
                        exerciseLoadChange !== null &&
                        exerciseLoadChange > 0
                          ? "text-green-600"
                          : exerciseLoadChange !== null &&
                            exerciseLoadChange < 0
                          ? "text-orange-600"
                          : "text-gray-900"
                      }`}
                    >
                      {exerciseLoadChange === null
                        ? "--"
                        : `${
                            exerciseLoadChange > 0
                              ? "+"
                              : ""
                          }${exerciseLoadChange} kg`}
                    </p>
                  </div>

                </div>

                <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:p-5">
                  <svg
                    viewBox="0 0 720 260"
                    role="img"
                    aria-label={tr(
                      `Grafik progres beban ${activeLoadExercise}`,
                      `${activeLoadExercise} load progress chart`
                    )}
                    className="min-w-[620px]"
                  >
                    {[55, 105, 155, 205].map(
                      (y) => (
                        <line
                          key={y}
                          x1="46"
                          y1={y}
                          x2="674"
                          y2={y}
                          stroke="currentColor"
                          strokeOpacity="0.08"
                          strokeWidth="1"
                        />
                      )
                    )}

                    {exerciseLoadChartPoints.length >
                      1 && (
                      <polyline
                        points={exerciseLoadChartPoints
                          .map(
                            (point) =>
                              `${point.x},${point.y}`
                          )
                          .join(" ")}
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {exerciseLoadChartPoints.map(
                      ({ log, x, y }) => (
                        <g key={log.id}>
                          <circle
                            cx={x}
                            cy={y}
                            r="8"
                            fill="#16a34a"
                            stroke="#ffffff"
                            strokeWidth="4"
                          >
                            <title>
                              {log.load_kg} kg ·{" "}
                              {new Date(
                                log.completed_at ||
                                  log.created_at
                              ).toLocaleDateString(
                                language === "id"
                                  ? "id-ID"
                                  : "en-US"
                              )}
                            </title>
                          </circle>

                          <text
                            x={x}
                            y={Math.max(18, y - 16)}
                            textAnchor="middle"
                            className="fill-gray-900 text-[12px] font-bold"
                          >
                            {Number(log.load_kg)} kg
                          </text>

                          <text
                            x={x}
                            y="238"
                            textAnchor="middle"
                            className="fill-gray-500 text-[11px]"
                          >
                            {new Date(
                              log.completed_at ||
                                log.created_at
                            ).toLocaleDateString(
                              language === "id"
                                ? "id-ID"
                                : "en-US",
                              {
                                day: "numeric",
                                month: "short",
                              }
                            )}
                          </text>
                        </g>
                      )
                    )}
                  </svg>
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  {tr(
                    "Menampilkan maksimal 12 catatan terbaru untuk gerakan yang dipilih.",
                    "Showing up to 12 latest records for the selected exercise."
                  )}
                </p>
              </>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500"><FitMateIcon name="dumbbell" className="h-5 w-5" /></span>

                <h3 className="mt-4 font-bold text-gray-900">
                  {tr(
                    "Belum Ada Catatan Beban",
                    "No Load Records Yet"
                  )}
                </h3>

                <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
                  {tr(
                    "Catat beban saat latihan untuk melihat grafik.",
                    "Log your load during workouts to see the chart."
                  )}
                </p>
              </div>
            )}

          </div>

        </div>

      </section>

      {/* BODY WEIGHT PROGRESS */}

      <section className="fitmate-dashboard-detail px-6 py-10">

        <div className="mx-auto max-w-7xl">

          <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">

            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">

              <div>

                <p className="text-sm font-semibold uppercase text-green-600">
                  {tr("Progres Berat", "Weight Progress")}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {tr("Pantau Berat Badan", "Track Your Body Weight")}
                </h2>

                <p className="mt-2 text-gray-500">
                  {tr(
                    "Tambahkan berat setiap kali mengukur agar progres dapat dipantau.",
                    "Add your weight whenever you measure it to track progress over time."
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-green-50 px-6 py-5 text-center">

                <p className="text-sm font-medium text-green-600">
                  {tr("Berat Saat Ini", "Current Weight")}
                </p>

                <p className="mt-1 text-3xl font-bold text-green-900">
                  {latestWeight !== null
                    ? `${latestWeight} kg`
                    : "--"}
                </p>

                {weightChange !== null && (
                  <p
                    className={`mt-2 text-sm font-bold ${
                      weightChange > 0
                        ? "text-orange-600"
                        : weightChange < 0
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {weightChange > 0
                      ? "+"
                      : ""}
                    {weightChange} kg
                    {" "}
                    {tr("dibanding sebelumnya", "vs previous")}
                  </p>
                )}

              </div>

            </div>

            {/* ADD WEIGHT */}

            <div className="mt-8 rounded-2xl bg-gray-50 p-5">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">

                <div className="flex-1">

                  <label className="text-sm font-semibold text-gray-700">
                    {tr(
                      "Masukkan berat saat ini",
                      "Enter your current weight"
                    )}
                  </label>

                  <div className="mt-2 flex items-center">

                    <input
                      type="number"
                      min="1"
                      max="499"
                      step="0.1"
                      value={weightInput}
                      onChange={(e) =>
                        setWeightInput(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key ===
                          "Enter"
                        ) {
                          handleAddWeight();
                        }
                      }}
                      placeholder="e.g. 71.5"
                      className="w-full rounded-l-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />

                    <div className="rounded-r-xl border border-l-0 border-gray-200 bg-gray-100 px-4 py-3 font-semibold text-gray-600">
                      kg
                    </div>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={
                    handleAddWeight
                  }
                  disabled={
                    savingWeight ||
                    !weightInput
                  }
                  className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingWeight
                    ? tr("Menyimpan...", "Saving...")
                    : tr("Tambah Berat", "Add Weight")}
                </button>

              </div>

            </div>

            {/* WEIGHT SUMMARY */}

            <div className="mt-6 grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl border border-gray-100 bg-white p-5">

                <p className="text-sm text-gray-500">
                  {tr("Berat Awal", "Starting Weight")}
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {startingWeight !== null
                    ? `${startingWeight} kg`
                    : "--"}
                </p>

              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">

                <p className="text-sm text-gray-500">
                  {tr("Berat Saat Ini", "Current Weight")}
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {latestWeight !== null
                    ? `${latestWeight} kg`
                    : "--"}
                </p>

              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">

                <p className="text-sm text-gray-500">
                  {tr("Total Perubahan", "Total Change")}
                </p>

                <p
                  className={`mt-2 text-2xl font-bold ${
                    totalWeightChange !==
                      null &&
                    totalWeightChange < 0
                      ? "text-green-600"
                      : totalWeightChange !==
                          null &&
                        totalWeightChange > 0
                      ? "text-orange-600"
                      : "text-gray-900"
                  }`}
                >
                  {totalWeightChange !==
                  null
                    ? `${
                        totalWeightChange >
                        0
                          ? "+"
                          : ""
                      }${totalWeightChange} kg`
                    : "--"}
                </p>

              </div>

            </div>

            {/* WEIGHT CHART */}

            {sortedWeightLogs.length >
              0 && (

              <div className="mt-8">

                <div className="flex items-center justify-between">

                  <div>

                    <h3 className="text-lg font-bold text-gray-900">
                      {tr("Riwayat Berat", "Weight History")}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {tr(
                        "Riwayat pengukuran berat Anda.",
                        "Your recorded weight measurements over time."
                      )}
                    </p>

                  </div>

                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600">
                    {
                      sortedWeightLogs.length
                    }{" "}
                    {tr("catatan", "record")}
                    {
                      sortedWeightLogs.length !==
                      1
                        ? "s"
                        : ""
                    }
                  </span>

                </div>

                <div className="mt-6 overflow-x-auto">

                  <div
                    className="flex min-w-[600px] items-end gap-4"
                    style={{
                      height: "240px",
                    }}
                  >

                    {sortedWeightLogs.map(
                      (
                        log,
                        index
                      ) => {

                        const minWeight =
                          Math.min(
                            ...sortedWeightLogs.map(
                              (item) =>
                                Number(
                                  item.weight
                                )
                            )
                          );

                        const maxWeight =
                          Math.max(
                            ...sortedWeightLogs.map(
                              (item) =>
                                Number(
                                  item.weight
                                )
                            )
                          );

                        const range =
                          Math.max(
                            1,
                            maxWeight -
                              minWeight
                          );

                        const height =
                          60 +
                          ((Number(
                            log.weight
                          ) -
                            minWeight) /
                            range) *
                            120;

                        return (

                          <div
                            key={
                              log.id
                            }
                            className="flex min-w-[70px] flex-1 flex-col items-center justify-end"
                          >

                            <div className="mb-2 text-sm font-bold text-green-700">
                              {
                                log.weight
                              }{" "}
                              kg
                            </div>

                            <div
                              className="w-full max-w-12 rounded-t-xl bg-green-500 transition-all"
                              style={{
                                height: `${height}px`,
                              }}
                            />

                            <p className="mt-3 text-xs font-semibold text-gray-500">
                              {new Date(
                                log.recorded_at
                              ).toLocaleDateString(
                                "en-US",
                                {
                                  month:
                                    "short",
                                  day:
                                    "numeric",
                                }
                              )}
                            </p>

                            {index ===
                              sortedWeightLogs.length -
                                1 && (
                              <p className="mt-1 text-[10px] font-bold uppercase text-green-600">
                                Start
                              </p>
                            )}

                            {index ===
                              sortedWeightLogs.length -
                                1 && (
                              <div className="mt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteWeight(
                                      log.id
                                    )
                                  }
                                  disabled={
                                    deletingWeightId ===
                                    log.id
                                  }
                                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                                >
                                  {deletingWeightId ===
                                  log.id
                                    ? "..."
                                    : tr("Hapus", "Delete")}
                                </button>
                              </div>
                            )}

                          </div>

                        );
                      }
                    )}

                  </div>

                </div>

                {/* RECENT WEIGHT RECORDS */}

                <div className="mt-8">

                  <h3 className="text-lg font-bold text-gray-900">
                    Recent Measurements
                  </h3>

                  <div className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-100">

                    {weightLogs
                      .slice(
                        0,
                        5
                      )
                      .map(
                        (log, index) => {

                          const previous =
                            weightLogs[
                              index + 1
                            ];

                          const change =
                            previous
                              ? Number(
                                  (
                                    Number(
                                      log.weight
                                    ) -
                                    Number(
                                      previous.weight
                                    )
                                  ).toFixed(
                                    2
                                  )
                                )
                              : null;

                          return (

                            <div
                              key={
                                log.id
                              }
                              className="flex items-center justify-between p-4"
                            >

                              <div>

                                <p className="font-bold text-gray-900">
                                  {
                                    log.weight
                                  }{" "}
                                  kg
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {new Date(
                                    log.recorded_at
                                  ).toLocaleDateString(
                                    "en-US",
                                    {
                                      month:
                                        "short",
                                      day:
                                        "numeric",
                                      year:
                                        "numeric",
                                    }
                                  )}
                                </p>

                              </div>

                              <div className="flex items-center gap-4">

                                {change !==
                                  null && (
                                  <span
                                    className={`text-sm font-bold ${
                                      change >
                                      0
                                        ? "text-orange-600"
                                        : change <
                                          0
                                        ? "text-green-600"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {change >
                                    0
                                      ? "+"
                                      : ""}
                                    {
                                      change
                                    }{" "}
                                    kg
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteWeight(
                                      log.id
                                    )
                                  }
                                  disabled={
                                    deletingWeightId ===
                                    log.id
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-700"
                                >
                                  {deletingWeightId ===
                                  log.id
                                    ? "Deleting..."
                                    : tr("Hapus", "Delete")}
                                </button>

                              </div>

                            </div>

                          );
                        }
                      )}

                  </div>

                </div>

              </div>

            )}

            {sortedWeightLogs.length ===
              0 && (

              <div className="mt-8 rounded-2xl border border-dashed border-gray-200 p-8 text-center">

                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FitMateIcon name="scale" className="h-5 w-5" /></span>

                <h3 className="mt-4 font-bold">
                  Start Tracking Your Weight
                </h3>

                <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
                  {tr(
                    "Catat berat untuk melihat perubahannya.",
                    "Log your weight to track changes."
                  )}
                </p>

                {profile?.weight !==
                  null &&
                  profile?.weight !==
                    undefined && (

                  <p className="mt-4 text-sm font-semibold text-green-600">
                    Profile starting weight:{" "}
                    {
                      profile.weight
                    }{" "}
                    kg
                  </p>

                )}

              </div>

            )}

          </div>

        </div>

      </section>

      {/* AI INSIGHTS */}

      <section className="fitmate-dashboard-detail px-6">

        <div className="mx-auto max-w-7xl">

          <div className="rounded-3xl bg-gray-900 p-6 text-white md:p-8">

            <div className="flex flex-col gap-6 md:flex-row md:items-start">

              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white"><FitMateIcon name="activity" className="h-6 w-6" /></span>

              <div>

                <p className="text-sm font-semibold uppercase text-green-400">
                  {tr("Ringkasan FitMate", "FitMate Summary")}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {tr("Insight Fitness Pribadi", "Your Personal Fitness Insight")}
                </h2>

                <p className="mt-4 max-w-3xl leading-7 text-gray-300">
                  {aiInsight}
                </p>

              </div>

            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">

              <div className="rounded-2xl bg-white/5 p-5">

                <p className="text-sm text-gray-400">
                  {tr("Tujuan", "Goal")}
                </p>

                <p className="mt-2 font-bold">
                  {currentGoal}
                </p>

              </div>

              <div className="rounded-2xl bg-white/5 p-5">

                <p className="text-sm text-gray-400">
                  {tr("Streak Saat Ini", "Current Streak")}
                </p>

                <p className="mt-2 font-bold">
                  {workoutStreak} {language === "id" ? "hari" : `day${workoutStreak === 1 ? "" : "s"}`}
                </p>

              </div>

              <div className="rounded-2xl bg-white/5 p-5">

                <p className="text-sm text-gray-400">
                  {tr(
                    "Penyelesaian Gerakan",
                    "Exercise Completion"
                  )}
                </p>

                <p className="mt-2 font-bold">
                  {completionRate}%
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* WORKOUT HISTORY */}

      <section className="fitmate-dashboard-detail px-6 py-10">

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-semibold uppercase text-green-600">
                {tr("Riwayat", "History")}
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {tr("Riwayat Latihan", "Workout History")}
              </h2>

            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/workout"
                )
              }
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {tr("Buka Halaman Latihan", "View Workout Page")}
            </button>

          </div>

          <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">

            {sessions.length ===
            0 ? (

              <div className="p-10 text-center">

                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FitMateIcon name="list" className="h-5 w-5" /></div>

                <h3 className="mt-4 font-bold">
                  {tr(
                    "Belum ada riwayat latihan",
                    "No workout history yet"
                  )}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Complete your first workout to see your history here.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/workout"
                    )
                  }
                  className="mt-5 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
                >
                  {tr(
                    "Mulai Latihan Pertama",
                    "Start Your First Workout"
                  )}
                </button>

              </div>

            ) : (

              <div className="divide-y divide-gray-100">

                {sessions
                  .slice(
                    0,
                    10
                  )
                  .map(
                    (
                      session
                    ) => {

                      const sessionLogs =
                        exerciseLogs.filter(
                          (
                            log
                          ) =>
                            log.workout_session_id ===
                            session.id
                        );

                      const completedLogs =
                        sessionLogs.filter(
                          (
                            log
                          ) =>
                            log.completed
                        ).length;

                      return (

                        <div
                          key={
                            session.id
                          }
                          className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between"
                        >

                          <div className="flex items-center gap-4">

                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 font-bold text-green-700">
                              {
                                session.workout_day
                              }
                            </div>

                            <div>

                              <h3 className="font-bold text-gray-900">
                                {localizeWorkoutSessionName(
                                  session.workout_name,
                                  session.workout_day,
                                  language
                                )}
                              </h3>

                              <p className="mt-1 text-sm text-gray-500">
                                {tr("Hari", "Day")}{" "}
                                {
                                  session.workout_day
                                }
                                {" • "}
                                {formatDate(
                                  session.started_at
                                )}
                                {" • "}
                                {formatTime(
                                  session.started_at
                                )}
                              </p>

                            </div>

                          </div>

                          <div className="flex items-center gap-4">

                            {sessionLogs.length >
                              0 && (

                              <div className="text-right">

                                <p className="text-xs uppercase text-gray-400">
                                  {tr("Gerakan", "Exercises")}
                                </p>

                                <p className="mt-1 font-bold">
                                  {
                                    completedLogs
                                  }
                                  /
                                  {
                                    sessionLogs.length
                                  }
                                </p>

                              </div>

                            )}

                            <span
                              className={`rounded-full px-4 py-2 text-xs font-bold uppercase ${
                                session.status ===
                                  "completed" ||
                                Boolean(
                                  session.completed_at
                                )
                                  ? "bg-green-100 text-green-700"
                                  : session.status ===
                                    "in_progress"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {session.status === "completed" || Boolean(session.completed_at)
                                ? tr("Selesai", "Completed")
                                : localizeWorkoutStatus(session.status, language)}
                            </span>

                          </div>

                        </div>

                      );
                    }
                  )}

              </div>

            )}

          </div>

        </div>

      </section>

      {/* MOBILE-FIRST SHORTCUTS */}

      <section className="px-6 pb-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { href: "/plan", icon: "list" as const, id: "Rencana", en: "Plan" },
              { href: "/nutrition", icon: "food" as const, id: "Nutrisi", en: "Nutrition" },
              { href: "/progress", icon: "chart" as const, id: "Progres", en: "Progress" },
              { href: "/settings", icon: "settings" as const, id: "Pengaturan", en: "Settings" },
            ].map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-green-200 hover:bg-green-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <FitMateIcon name={item.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 truncate text-sm font-black text-slate-800">
                  {tr(item.id, item.en)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-gray-100 bg-white px-6 py-8 dark:border-white/10 dark:bg-slate-950">
        <CompanySignature compact className="mx-auto max-w-7xl" />
      </footer>

    </main>
  );
}
