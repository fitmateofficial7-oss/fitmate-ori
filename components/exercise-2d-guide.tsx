"use client";

import { useState } from "react";

import ExercisePoseThumbnail from "@/components/exercise-pose-thumbnail";
import { useLanguage } from "@/components/language-provider";
import { getExerciseGuide } from "@/lib/exercise-guides";

type GuideView = "comparison" | "start" | "finish";

type Exercise2DGuideProps = {
  exerciseName: string;
  exerciseSlug?: string | null;
  equipment?: string | null;
  targetMuscle?: string | null;
};

export default function Exercise2DGuide({
  exerciseName,
  exerciseSlug,
  equipment,
  targetMuscle,
}: Exercise2DGuideProps) {
  const { language, tr } = useLanguage();
  const [view, setView] = useState<GuideView>("comparison");
  const guide = getExerciseGuide(
    exerciseSlug,
    exerciseName,
    language
  );
  const views: Array<{
    value: GuideView;
    label: string;
  }> = [
    {
      value: "comparison",
      label: tr("Bandingkan", "Compare"),
    },
    {
      value: "start",
      label: tr("Posisi awal", "Start"),
    },
    {
      value: "finish",
      label: tr("Posisi akhir", "Finish"),
    },
  ];

  return (
    <section
      aria-label={tr(
        `Panduan latihan 2D untuk ${exerciseName}`,
        `2D exercise guide for ${exerciseName}`
      )}
      className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-400/20 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-4 border-b border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-400/10 dark:bg-emerald-950/40 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            {tr("Panduan gerakan 2D", "2D movement guide")}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {guide.motionLabel}
          </p>
        </div>

        <div
          role="group"
          aria-label={tr("Pilihan tampilan", "View options")}
          className="grid grid-cols-3 gap-1 rounded-2xl border border-emerald-200 bg-white p-1 dark:border-white/10 dark:bg-slate-950"
        >
          {views.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setView(item.value)}
              aria-pressed={view === item.value}
              className={`rounded-xl px-3 py-2 text-[11px] font-black transition sm:text-xs ${
                view === item.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 sm:p-5">
        <div className="aspect-video min-h-[220px] overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 dark:border-emerald-400/10 dark:bg-emerald-950/30 sm:min-h-[320px]">
          <ExercisePoseThumbnail
            exerciseName={exerciseName}
            preset={guide.preset}
            language={language}
            mode={view}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {guide.phases.map((phase, index) => (
            <div
              key={`${phase}-${index}`}
              className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                {index + 1}
              </span>
              <span className="text-xs font-bold leading-5 text-slate-700 dark:text-slate-200">
                {phase}
              </span>
            </div>
          ))}
        </div>

        {(targetMuscle || equipment) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {targetMuscle && (
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                {tr("Otot", "Muscle")}: {targetMuscle}
              </span>
            )}
            {equipment && (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {tr("Alat", "Equipment")}: {equipment}
              </span>
            )}
          </div>
        )}

        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          {tr(
            "Diagram memperlihatkan posisi kunci awal dan akhir. Ikuti tahapan tertulis, gunakan beban ringan saat belajar, dan berhenti jika terasa sakit.",
            "The diagram shows the key start and finish positions. Follow the written steps, use a light load while learning, and stop if you feel pain."
          )}
        </p>
      </div>
    </section>
  );
}
