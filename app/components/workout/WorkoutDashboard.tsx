"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkoutDayCard from "./WorkoutDayCard";

type WorkoutPlan = {
  id: number;
  name: string;
  description: string | null;
  goal: string | null;
  level: string | null;
  days_per_week: number | null;
  status: string;
};

type Exercise = {
  id: number;
  name: string;
  slug: string;
  category: string;
  target_muscle: string;
  equipment: string;
  difficulty: string;
};

type WorkoutPlanExercise = {
  id: number;
  exercise_order: number;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise: Exercise;
};

type WorkoutDay = {
  id: number;
  day_number: number;
  name: string;
  description: string | null;
  muscle_group: string | null;
  is_rest_day: boolean;
  workout_plan_exercises: WorkoutPlanExercise[];
};

export default function WorkoutDashboard() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);

  const [days, setDays] = useState<WorkoutDay[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [startingWorkout, setStartingWorkout] = useState(false);

  const todayDayNumber = useMemo(() => {
    const day = new Date().getDay();

    return day === 0 ? 7 : day;
  }, []);

  const todayWorkout = useMemo(() => {
    return days.find(
      (day) => day.day_number === todayDayNumber
    );
  }, [days, todayDayNumber]);

  useEffect(() => {
    loadWorkout();
  }, []);

  async function loadWorkout() {
    try {
      setLoading(true);

      setError(null);

      const {
        data: {
          user
        },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError(
          "You must be logged in to view your workout."
        );

        return;
      }

      const {
        data: planData,
        error: planError
      } = await supabase
        .from("workout_plans")
        .select(`
          id,
          name,
          description,
          goal,
          level,
          days_per_week,
          status
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", {
          ascending: false
        })
        .limit(1)
        .maybeSingle();

      if (planError) {
        throw planError;
      }

      if (!planData) {
        setPlan(null);
        setDays([]);

        return;
      }

      setPlan(planData);

      const {
        data: daysData,
        error: daysError
      } = await supabase
        .from("workout_days")
        .select(`
          id,
          day_number,
          name,
          description,
          muscle_group,
          is_rest_day,

          workout_plan_exercises (
            id,
            exercise_order,
            sets,
            reps,
            duration_seconds,
            rest_seconds,
            notes,

            exercise:exercises (
              id,
              name,
              slug,
              category,
              target_muscle,
              equipment,
              difficulty
            )
          )
        `)
        .eq("workout_plan_id", planData.id)
        .order("day_number", {
          ascending: true
        });

      if (daysError) {
        throw daysError;
      }

      const formattedDays = (daysData || []).map(
        (day: any) => ({
          ...day,

          workout_plan_exercises:
            (day.workout_plan_exercises || [])
              .sort(
                (
                  a: WorkoutPlanExercise,
                  b: WorkoutPlanExercise
                ) =>
                  a.exercise_order -
                  b.exercise_order
              )
        })
      );

      setDays(formattedDays);
    } catch (err: any) {
      console.error(
        "Workout loading error:",
        err
      );

      setError(
        err?.message ||
          "Failed to load workout data."
      );
    } finally {
      setLoading(false);
    }
  }

  async function startWorkout() {
    if (!todayWorkout || !plan) {
      return;
    }

    try {
      setStartingWorkout(true);

      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();

      if (!user) {
        alert(
          "Please login first."
        );

        return;
      }

      const {
        data: existingSession,
        error: existingError
      } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq(
          "workout_day_id",
          todayWorkout.id
        )
        .eq(
          "status",
          "in_progress"
        )
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingSession) {
        window.location.href =
          `/workout/session/${existingSession.id}`;

        return;
      }

      const {
        data: session,
        error: sessionError
      } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          workout_plan_id: plan.id,
          workout_day_id:
            todayWorkout.id,
          status: "in_progress"
        })
        .select("id")
        .single();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        throw new Error(
          "Failed to create workout session."
        );
      }

      window.location.href =
        `/workout/session/${session.id}`;
    } catch (err: any) {
      console.error(
        "Start workout error:",
        err
      );

      alert(
        err?.message ||
          "Failed to start workout."
      );
    } finally {
      setStartingWorkout(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 rounded-lg bg-zinc-800" />

            <div className="h-48 rounded-3xl bg-zinc-800" />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="h-48 rounded-2xl bg-zinc-800" />
              <div className="h-48 rounded-2xl bg-zinc-800" />
              <div className="h-48 rounded-2xl bg-zinc-800" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="mb-6 text-5xl">
            ⚠️
          </div>

          <h1 className="mb-3 text-2xl font-bold">
            Something went wrong
          </h1>

          <p className="mb-6 text-zinc-400">
            {error}
          </p>

          <button
            onClick={loadWorkout}
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="mb-6 text-6xl">
            🏋️
          </div>

          <h1 className="mb-4 text-3xl font-bold">
            No Workout Plan Yet
          </h1>

          <p className="mb-8 text-zinc-400">
            You don't have an active workout
            plan yet. Let FitMate create a
            personalized workout plan for you.
          </p>

          <button
            onClick={() => {
              window.location.href =
                "/onboarding";
            }}
            className="rounded-xl bg-white px-8 py-4 font-bold text-black transition hover:bg-zinc-200"
          >
            Create My Workout Plan
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-12">

        {/* HEADER */}

        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-500">
              Your Training
            </p>

            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Workout
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Follow your personalized training
              program and track your progress
              with FitMate.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Current Plan
            </p>

            <p className="mt-1 font-semibold">
              {plan.name}
            </p>
          </div>
        </div>


        {/* TODAY'S WORKOUT */}

        {todayWorkout && (
          <section className="mb-12">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Today
                </p>

                <h2 className="text-2xl font-bold">
                  {todayWorkout.name}
                </h2>
              </div>

              {!todayWorkout.is_rest_day && (
                <span className="rounded-full bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400">
                  Training Day
                </span>
              )}
            </div>

            {todayWorkout.is_rest_day ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
                <div className="mb-4 text-4xl">
                  😴
                </div>

                <h3 className="mb-2 text-2xl font-bold">
                  Rest Day
                </h3>

                <p className="text-zinc-400">
                  Recovery is part of progress.
                  Take some time to rest and let
                  your body recover.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
                <div className="p-6 md:p-8">
                  <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="mb-2 text-sm text-zinc-500">
                        Focus
                      </p>

                      <p className="text-xl font-semibold">
                        {todayWorkout.muscle_group ||
                          "Full Body"}
                      </p>

                      <p className="mt-2 text-sm text-zinc-400">
                        {
                          todayWorkout
                            .workout_plan_exercises
                            .length
                        }{" "}
                        exercises
                      </p>
                    </div>

                    <button
                      onClick={startWorkout}
                      disabled={startingWorkout}
                      className="rounded-2xl bg-white px-8 py-4 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {startingWorkout
                        ? "Starting..."
                        : "Start Workout →"}
                    </button>
                  </div>

                  {todayWorkout.description && (
                    <p className="border-t border-zinc-800 pt-5 text-sm text-zinc-400">
                      {
                        todayWorkout.description
                      }
                    </p>
                  )}
                </div>

                <div className="border-t border-zinc-800">
                  {todayWorkout.workout_plan_exercises.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b border-zinc-800 px-6 py-5 last:border-b-0 md:px-8"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-sm font-bold text-zinc-400">
                            {
                              item.exercise_order
                            }
                          </div>

                          <div>
                            <p className="font-semibold">
                              {
                                item.exercise.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {
                                item.exercise
                                  .target_muscle
                              }
                              {" · "}
                              {
                                item.exercise
                                  .equipment
                              }
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          {item.sets &&
                          item.reps ? (
                            <p className="font-semibold">
                              {item.sets} ×{" "}
                              {item.reps}
                            </p>
                          ) : item.duration_seconds ? (
                            <p className="font-semibold">
                              {Math.round(
                                item.duration_seconds /
                                  60
                              )}{" "}
                              min
                            </p>
                          ) : (
                            <p className="text-sm text-zinc-500">
                              As prescribed
                            </p>
                          )}

                          {item.rest_seconds && (
                            <p className="mt-1 text-xs text-zinc-500">
                              Rest{" "}
                              {item.rest_seconds}s
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        )}


        {/* WEEKLY PROGRAM */}

        <section>
          <div className="mb-5">
            <p className="text-sm font-medium text-zinc-500">
              Training Schedule
            </p>

            <h2 className="text-2xl font-bold">
              Your Week
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {days.map((day) => (
              <WorkoutDayCard
                key={day.id}
                day={day}
                isToday={
                  day.day_number ===
                  todayDayNumber
                }
              />
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
