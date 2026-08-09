"use client";

type WorkoutExercise = {
  id: number;
  exercise_order: number;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  exercise: {
    name: string;
    target_muscle: string;
  };
};

type WorkoutDay = {
  id: number;
  day_number: number;
  name: string;
  description: string | null;
  muscle_group: string | null;
  is_rest_day: boolean;
  workout_plan_exercises: WorkoutExercise[];
};

type Props = {
  day: WorkoutDay;
  isToday: boolean;
};

export default function WorkoutDayCard({
  day,
  isToday
}: Props) {
  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        isToday
          ? "border-white bg-white text-black"
          : "border-zinc-800 bg-zinc-900 text-white hover:border-zinc-700"
      }`}
    >
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p
            className={`text-xs font-medium uppercase tracking-wider ${
              isToday
                ? "text-zinc-500"
                : "text-zinc-600"
            }`}
          >
            Day {day.day_number}
          </p>

          <h3 className="mt-1 text-lg font-bold">
            {day.name}
          </h3>
        </div>

        {isToday && (
          <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
            TODAY
          </span>
        )}
      </div>

      {day.is_rest_day ? (
        <div>
          <p
            className={
              isToday
                ? "text-zinc-500"
                : "text-zinc-400"
            }
          >
            Recovery & Rest
          </p>
        </div>
      ) : (
        <>
          <p
            className={`mb-4 text-sm ${
              isToday
                ? "text-zinc-500"
                : "text-zinc-400"
            }`}
          >
            {day.muscle_group ||
              "Full Body"}
          </p>

          <div className="space-y-2">
            {day.workout_plan_exercises
              .slice(0, 4)
              .map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between text-sm ${
                    isToday
                      ? "text-zinc-700"
                      : "text-zinc-400"
                  }`}
                >
                  <span className="truncate">
                    {
                      item.exercise.name
                    }
                  </span>

                  {item.sets &&
                    item.reps && (
                      <span className="ml-3 shrink-0 text-xs font-medium">
                        {item.sets} ×{" "}
                        {item.reps}
                      </span>
                    )}
                </div>
              ))}
          </div>

          {day.workout_plan_exercises
            .length > 4 && (
            <p
              className={`mt-4 text-xs ${
                isToday
                  ? "text-zinc-500"
                  : "text-zinc-600"
              }`}
            >
              +
              {day.workout_plan_exercises
                .length - 4}{" "}
              more exercises
            </p>
          )}
        </>
      )}
    </div>
  );
}