"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { getExercise2DMeta, getExercise2DSteps } from "@/lib/exercise-2d-guides";
import { getExercisePosterAsset } from "@/lib/exercise-poster-assets";
import { getExerciseGuide } from "@/lib/exercise-guides";

type Exercise3DGuideProps = {
  exerciseName: string;
  exerciseSlug?: string | null;
  equipment?: string | null;
  targetMuscle?: string | null;
};

export default function Exercise3DGuide({
  exerciseName,
  exerciseSlug,
  equipment,
  targetMuscle,
}: Exercise3DGuideProps) {
  const { language, tr } = useLanguage();
  const guide = getExerciseGuide(exerciseSlug, exerciseName, language);
  const steps = getExercise2DSteps(guide, language);
  const meta = getExercise2DMeta(guide.preset, language);
  const posterAsset = getExercisePosterAsset(guide.slug);
  const availableSlides = posterAsset?.stepSrcs?.length ?? 0;
  const [activeStep, setActiveStep] = useState(0);

  const safeIndex = useMemo(() => {
    if (!availableSlides) return 0;
    return Math.min(activeStep, availableSlides - 1);
  }, [activeStep, availableSlides]);

  const currentStep = steps[Math.min(safeIndex, steps.length - 1)] ?? steps[0];

  useEffect(() => {
    setActiveStep(0);
  }, [guide.slug]);

  const goPrev = () => {
    if (!availableSlides) return;
    setActiveStep((value) => (value - 1 + availableSlides) % availableSlides);
  };

  const goNext = () => {
    if (!availableSlides) return;
    setActiveStep((value) => (value + 1) % availableSlides);
  };

  return (
    <section
      aria-label={tr(
        `Panduan latihan 2D untuk ${exerciseName}`,
        `2D exercise guide for ${exerciseName}`
      )}
      className="overflow-hidden rounded-[32px] border border-emerald-200 bg-white shadow-sm dark:border-emerald-400/20 dark:bg-slate-900"
    >
      <div className="border-b border-emerald-100 bg-[linear-gradient(180deg,#f6fcf8_0%,#ffffff_100%)] px-5 py-5 dark:border-emerald-400/10 dark:bg-[linear-gradient(180deg,#063a31_0%,#0f172a_100%)] sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {tr("Panduan gerakan 2D", "2D movement guide")}
              </span>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700 dark:border-emerald-400/20 dark:bg-slate-950 dark:text-emerald-200">
                {tr("Slide lucu & simple", "Cute & simple slides")}
              </span>
            </div>

            <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {exerciseName}
            </h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              {guide.motionLabel}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <div className="rounded-3xl border border-emerald-200/80 bg-white/90 p-4 shadow-sm dark:border-emerald-400/10 dark:bg-slate-950/80">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
                {tr("Sumber visual", "Visual source")}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">
                {tr(
                  "Menggunakan poster 2D dari folder yang kamu berikan, lalu langkah-langkahnya dipotong menjadi slide.",
                  "Uses the 2D poster files you provided, then crops the step panels into slides."
                )}
              </p>
            </div>
            <div className="rounded-3xl border border-emerald-200/80 bg-white/90 p-4 shadow-sm dark:border-emerald-400/10 dark:bg-slate-950/80">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
                {tr("Isi panduan", "Guide contents")}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">
                {tr(
                  "Slide langkah, target otot, persiapan alat, cue teknik, dan kesalahan yang perlu dihindari.",
                  "Step slides, target muscles, setup, technique cues, and mistakes to avoid."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_360px]">
          <div className="rounded-[28px] border border-emerald-200 bg-[#fbfffc] p-4 shadow-sm dark:border-emerald-400/10 dark:bg-slate-950/40 sm:p-5">
            {posterAsset?.available && availableSlides > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {tr("Langkah gerakan", "Movement steps")}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {tr(
                        "Geser langkah dari awal sampai selesai.",
                        "Slide through each step from start to finish."
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goPrev}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-emerald-400/10 dark:bg-slate-950 dark:text-emerald-200"
                    >
                      ←
                    </button>
                    <div className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm">
                      {tr("Langkah", "Step")} {safeIndex + 1}/{availableSlides}
                    </div>
                    <button
                      type="button"
                      onClick={goNext}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-emerald-400/10 dark:bg-slate-950 dark:text-emerald-200"
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbf7_100%)] shadow-inner dark:border-emerald-400/10 dark:bg-[linear-gradient(180deg,#0f172a_0%,#052e2b_100%)]">
                  <div className="relative mx-auto aspect-[9/14] w-full max-w-[420px] p-3 sm:p-4">
                    <Image
                      src={posterAsset.stepSrcs[safeIndex]}
                      alt={`${exerciseName} step ${safeIndex + 1}`}
                      fill
                      className="rounded-[20px] object-contain"
                      sizes="(max-width: 768px) 100vw, 420px"
                      priority={safeIndex === 0}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {posterAsset.stepSrcs.map((_, index) => (
                    <button
                      key={`dot-${index}`}
                      type="button"
                      onClick={() => setActiveStep(index)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                        index === safeIndex
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/10 dark:bg-slate-950 dark:text-emerald-200"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          index === safeIndex ? "bg-white" : "bg-emerald-500"
                        }`}
                      />
                      {tr("Langkah", "Step")} {index + 1}
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm dark:border-emerald-400/10 dark:bg-slate-950">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {currentStep?.title ?? tr("Langkah", "Step")}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {currentStep?.caption}
                  </p>
                  {currentStep?.coachingCues?.length ? (
                    <ul className="mt-3 space-y-2">
                      {currentStep.coachingCues.map((cue) => (
                        <li
                          key={cue}
                          className="flex gap-2 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span>{cue}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {posterAsset.posterSrc ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={posterAsset.posterSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-emerald-400/10 dark:bg-slate-950 dark:text-emerald-200"
                    >
                      {tr("Lihat poster lengkap", "View full poster")}
                    </a>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-amber-300 bg-amber-50 p-5 text-sm font-medium leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                <p className="font-black">{tr("Poster 2D belum tersedia", "2D poster not available yet")}</p>
                <p className="mt-2">
                  {tr(
                    "Untuk latihan ini belum ada file poster 2D di folder upload. Jika kamu kirim file gambarnya, bagian slide akan otomatis bisa disesuaikan juga.",
                    "There is no uploaded 2D poster file for this exercise yet. If you provide the image, the slide section can be matched as well."
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="rounded-[26px] border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-400/10 dark:bg-slate-950">
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {tr("Target & ringkasan", "Target & summary")}
              </p>

              {posterAsset?.available && posterAsset.targetSrc ? (
                <div className="mt-4 overflow-hidden rounded-[22px] border border-emerald-100 bg-[#fcfffd] p-3 dark:border-emerald-400/10 dark:bg-slate-900/70">
                  <div className="relative mx-auto aspect-[5/4] w-full max-w-[250px]">
                    <Image
                      src={posterAsset.targetSrc}
                      alt={`${exerciseName} target muscles`}
                      fill
                      className="object-contain"
                      sizes="250px"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {targetMuscle ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                    {tr("Otot target", "Target muscle")}: {targetMuscle}
                  </span>
                ) : null}
                {equipment ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
                    {tr("Alat", "Equipment")}: {equipment}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl bg-emerald-50/70 px-4 py-3 text-xs font-medium leading-5 text-slate-700 dark:bg-emerald-950/20 dark:text-slate-300">
                <p className="font-black text-emerald-700 dark:text-emerald-200">
                  {tr("Fokus gerakan", "Movement focus")}
                </p>
                <p className="mt-1">{guide.formFocus}</p>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">
                {tr("Persiapan alat", "Equipment setup")}
              </h4>
              <ol className="mt-3 space-y-2">
                {guide.equipmentSetup.map((item, idx) => (
                  <li key={`${item}-${idx}`} className="flex gap-3 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">
                {tr("Napas & rentang", "Breathing & range")}
              </h4>
              <div className="mt-3 space-y-3 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">
                <div>
                  <p className="font-black text-emerald-700 dark:text-emerald-200">{tr("Pola napas", "Breathing pattern")}</p>
                  <p className="mt-1">{meta.breathing}</p>
                </div>
                <div>
                  <p className="font-black text-emerald-700 dark:text-emerald-200">{tr("Fokus rentang", "Range focus")}</p>
                  <p className="mt-1">{meta.rangeFocus}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-400/20 dark:bg-rose-400/10">
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-rose-900 dark:text-rose-100">
                {tr("Gerakan yang perlu dihindari", "Mistakes to avoid")}
              </h4>
              <ul className="mt-3 space-y-2 text-xs font-medium leading-5 text-rose-900/90 dark:text-rose-100/90">
                {meta.mistakes.map((mistake) => (
                  <li key={mistake} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600 dark:bg-rose-200" />
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-xs font-medium leading-5 text-rose-950 dark:bg-black/10 dark:text-rose-50">
                <p>• {tr("Lakukan gerakan perlahan dan tetap terkontrol.", "Move slowly and stay in control.")}</p>
                <p>• {tr("Gunakan beban ringan dulu jika masih mempelajari tekniknya.", "Use a lighter load first while learning the technique.")}</p>
                <p>• {tr("Hentikan jika muncul nyeri tajam atau posisi terasa aneh.", "Stop if you feel sharp pain or an awkward position.")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
