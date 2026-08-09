"use client";

import { useState } from "react";

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest: string;

  target_muscle?: string;
  secondary_muscles?: string[];
  equipment?: string;
  difficulty?: string;

  animation_url?: string | null;
  video_url?: string | null;

  instructions?: string[];
  tips?: string[];
};

type Props = {
  exercise: Exercise;
};

export default function ExerciseDetail({
  exercise,
}: Props) {
  const [open, setOpen] =
    useState(false);

  return (
    <>
      <button
        onClick={() =>
          setOpen(true)
        }
        className="text-left w-full"
      >
        <div className="rounded-xl border p-4 hover:bg-gray-50 transition">
          <h3 className="font-semibold">
            {exercise.name}
          </h3>

          <p className="text-sm text-gray-500">
            {exercise.sets} Sets ×{" "}
            {exercise.reps}
          </p>

          <p className="text-sm text-gray-500">
            Rest: {exercise.rest}
          </p>

          <p className="text-sm text-blue-600 mt-2">
            Lihat cara melakukan →
          </p>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            
            <div className="p-6">

              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">
                  {exercise.name}
                </h2>

                <button
                  onClick={() =>
                    setOpen(false)
                  }
                  className="text-gray-500"
                >
                  ✕
                </button>
              </div>

              {/* ANIMATION */}
              <div className="mt-4 rounded-xl overflow-hidden bg-gray-100 aspect-video flex items-center justify-center">
                
                {exercise.animation_url ? (
                  <img
                    src={
                      exercise.animation_url
                    }
                    alt={
                      exercise.name
                    }
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <p>
                      Animasi belum tersedia
                    </p>

                    <p className="text-sm mt-1">
                      Akan segera ditambahkan
                    </p>
                  </div>
                )}

              </div>

              {/* INFO */}

              <div className="grid grid-cols-2 gap-3 mt-5">

                <div>
                  <p className="text-xs text-gray-500">
                    Target Muscle
                  </p>

                  <p className="font-medium">
                    {exercise.target_muscle ||
                      "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Equipment
                  </p>

                  <p className="font-medium">
                    {exercise.equipment ||
                      "Not specified"}
                  </p>
                </div>

              </div>

              {/* INSTRUCTIONS */}

              {exercise.instructions &&
                exercise.instructions
                  .length > 0 && (
                  <div className="mt-6">

                    <h3 className="font-semibold">
                      How to Perform
                    </h3>

                    <ol className="mt-3 space-y-2">
                      {exercise.instructions.map(
                        (
                          instruction,
                          index
                        ) => (
                          <li
                            key={index}
                            className="flex gap-3"
                          >
                            <span className="font-bold">
                              {index + 1}.
                            </span>

                            <span>
                              {instruction}
                            </span>
                          </li>
                        )
                      )}
                    </ol>

                  </div>
                )}

              {/* TIPS */}

              {exercise.tips &&
                exercise.tips
                  .length > 0 && (
                  <div className="mt-6">

                    <h3 className="font-semibold">
                      Tips
                    </h3>

                    <ul className="mt-3 space-y-2">
                      {exercise.tips.map(
                        (
                          tip,
                          index
                        ) => (
                          <li
                            key={index}
                            className="text-sm text-gray-600"
                          >
                            • {tip}
                          </li>
                        )
                      )}
                    </ul>

                  </div>
                )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}