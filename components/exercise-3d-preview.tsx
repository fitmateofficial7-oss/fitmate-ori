"use client";

import Exercise2DScene from "@/components/exercise-2d-scene";
import type { ExerciseGuidePreset } from "@/lib/exercise-guides";

type Exercise3DPreviewProps = {
  exerciseName: string;
  preset: ExerciseGuidePreset;
  language?: "id" | "en";
};

export default function Exercise3DPreview({
  exerciseName,
  preset,
  language = "id",
}: Exercise3DPreviewProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Exercise2DScene
        preset={preset}
        exerciseName={exerciseName}
        language={language}
        stepIndex={1}
        compact
        className="h-full w-full"
      />
      <div className="absolute bottom-3 left-3 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 shadow-sm backdrop-blur">
        2D
      </div>
    </div>
  );
}
