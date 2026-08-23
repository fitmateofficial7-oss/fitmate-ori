"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { getExerciseSplitAsset } from "@/lib/exercise-split-assets";
import { getExerciseGuide } from "@/lib/exercise-guides";

type Exercise3DGuideProps = {
  exerciseName: string;
  exerciseSlug?: string | null;
  equipment?: string | null;
  targetMuscle?: string | null;
};

type InfoPanelProps = {
  title: string;
  subtitle: string;
  src: string | null;
  onZoom: (() => void) | null;
};

function InfoPanel({ title, subtitle, src, onZoom }: InfoPanelProps) {
  const { tr } = useLanguage();
  return (
    <section className="overflow-hidden rounded-[24px] border border-emerald-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-emerald-400/15 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-400/10 dark:bg-emerald-950/20">
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white">{title}</p>
          <p className="fitmate-info-subtitle mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        {src && onZoom ? (
          <button
            type="button"
            onClick={onZoom}
            className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-emerald-400/15 dark:bg-slate-900 dark:text-emerald-200"
          >
            Zoom
          </button>
        ) : null}
      </div>
      <div className="bg-[#fcfffd] p-3 dark:bg-slate-900/60">
        {src ? (
          <button
            type="button"
            onClick={onZoom ?? undefined}
            className="group relative mx-auto block aspect-square w-full max-w-[300px] overflow-hidden rounded-[18px] border border-emerald-100 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-400/10 dark:bg-slate-950"
          >
            <Image src={src} alt={title} fill className="object-contain" sizes="300px" unoptimized quality={100} />
            <span className="pointer-events-none absolute inset-x-3 bottom-3 rounded-full bg-white/92 px-3 py-1 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 opacity-0 shadow-sm transition group-hover:opacity-100 dark:bg-slate-900/92 dark:text-slate-100">
              {tr("Buka lebih besar", "Open larger")}
            </span>
          </button>
        ) : (
          <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            {subtitle}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Exercise3DGuide({ exerciseName, exerciseSlug }: Exercise3DGuideProps) {
  const { language, tr } = useLanguage();
  const guide = getExerciseGuide(exerciseSlug, exerciseName, language);
  const splitAsset = getExerciseSplitAsset(guide.slug);
  const [activeStep, setActiveStep] = useState(0);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>("");

  useEffect(() => {
    setActiveStep(0);
    setZoomSrc(null);
  }, [guide.slug]);

  const totalSteps = splitAsset?.stepSrcs?.length ?? 0;
  const safeIndex = useMemo(() => {
    if (!totalSteps) return 0;
    return Math.min(activeStep, totalSteps - 1);
  }, [activeStep, totalSteps]);

  const stepTitle = tr(
    safeIndex === 0 ? "Posisi awal" : safeIndex === totalSteps - 1 ? "Posisi akhir" : `Langkah ${safeIndex + 1}`,
    safeIndex === 0 ? "Start position" : safeIndex === totalSteps - 1 ? "End position" : `Step ${safeIndex + 1}`
  );

  const openZoom = (src: string | null, title: string) => {
    if (!src) return;
    setZoomSrc(src);
    setZoomTitle(title);
  };

  return (
    <>
      <section className="overflow-hidden rounded-[32px] border border-emerald-200 bg-white shadow-[0_20px_60px_rgba(22,163,74,0.08)] dark:border-emerald-400/20 dark:bg-slate-900">
        <div className="border-b border-emerald-100 bg-[linear-gradient(180deg,#f7fdf9_0%,#ffffff_100%)] px-5 py-5 dark:border-emerald-400/10 dark:bg-[linear-gradient(180deg,#063a31_0%,#0f172a_100%)] sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {tr("Panduan gerakan", "Movement guide")}
                </span>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-400/20 dark:bg-slate-950 dark:text-emerald-200">
                  {tr("Tampilan jelas", "Clear view")}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {exerciseName}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                {guide.motionLabel}
              </p>
            </div>

            <div className="fitmate-exercise-guide-help grid gap-3 sm:grid-cols-2 xl:w-[470px]">
              <div className="rounded-3xl border border-emerald-200/80 bg-white p-4 shadow-sm dark:border-emerald-400/10 dark:bg-slate-950/90">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
                  {tr("Di halaman ini", "On this page")}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">
                  {tr(
                    "Nama gerakan, langkah-langkah, otot yang dilatih, tips penting, dan kesalahan umum.",
                    "Exercise name, steps, target muscles, important tips, and common mistakes."
                  )}
                </p>
              </div>
              <div className="rounded-3xl border border-emerald-200/80 bg-white p-4 shadow-sm dark:border-emerald-400/10 dark:bg-slate-950/90">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
                  {tr("Cara melihat", "How to view")}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">
                  {tr(
                    "Geser antar langkah dan tekan gambar jika ingin melihat detail lebih dekat.",
                    "Move through each step and tap an image when you want a closer look."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {splitAsset?.available ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_390px]">
              <div className="rounded-[28px] border border-emerald-200 bg-[#fbfffc] p-4 shadow-sm dark:border-emerald-400/10 dark:bg-slate-950/40 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{tr("Langkah-langkah", "Step-by-step")}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {tr("Geser langkah.", "Swipe steps.")}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm">
                    {stepTitle} • {safeIndex + 1}/{totalSteps}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openZoom(splitAsset.stepSrcs[safeIndex], `${exerciseName} • ${stepTitle}`)}
                  className="mt-4 block w-full overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbf7_100%)] shadow-inner transition hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-400/10 dark:bg-[linear-gradient(180deg,#0f172a_0%,#052e2b_100%)]"
                >
                  <div className="relative mx-auto aspect-[4/5] w-full max-w-[560px] p-2 sm:p-3">
                    <Image
                      src={splitAsset.stepSrcs[safeIndex]}
                      alt={`${exerciseName} step ${safeIndex + 1}`}
                      fill
                      className="rounded-[22px] object-contain"
                      sizes="(max-width: 768px) 100vw, 560px"
                      priority={safeIndex === 0}
                      unoptimized
                      quality={100}
                    />
                    <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between rounded-full bg-white/94 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm dark:bg-slate-900/94 dark:text-slate-100">
                      <span>{tr("Ketuk untuk memperbesar", "Tap to enlarge")}</span>
                      <span>{tr("Perbesar", "Enlarge")}</span>
                    </div>
                  </div>
                </button>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep((v) => (v - 1 + totalSteps) % totalSteps)}
                    className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-emerald-400/10 dark:bg-slate-950 dark:text-emerald-200"
                  >
                    {tr("Sebelumnya", "Prev")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep((v) => (v + 1) % totalSteps)}
                    className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow dark:border-emerald-400/10 dark:bg-slate-950 dark:text-emerald-200"
                  >
                    {tr("Berikutnya", "Next")}
                  </button>
                </div>

                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {splitAsset.stepSrcs.map((src, index) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setActiveStep(index)}
                      className={`group min-w-[104px] overflow-hidden rounded-[18px] border bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
                        index === safeIndex
                          ? "border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-400/20"
                          : "border-emerald-100 dark:border-emerald-400/10 dark:bg-slate-950"
                      }`}
                    >
                      <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-[12px] bg-slate-50 dark:bg-slate-900">
                        <Image src={src} alt={`${exerciseName} thumbnail ${index + 1}`} fill className="object-contain" sizes="104px" unoptimized quality={100} />
                      </div>
                      <p className="mt-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">
                        {tr("Langkah", "Step")} {index + 1}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="fitmate-exercise-guide-info grid gap-4">
                <InfoPanel
                  title={tr("Otot yang dilatih", "Target muscles")}
                  subtitle={tr("Bagian otot utama yang paling dominan bekerja.", "Main muscles worked by this movement.")}
                  src={splitAsset.musclesSrc}
                  onZoom={splitAsset.musclesSrc ? () => openZoom(splitAsset.musclesSrc, tr("Otot yang dilatih", "Target muscles")) : null}
                />
                <InfoPanel
                  title={tr("Tips penting", "Important tips")}
                  subtitle={tr("Panduan singkat agar gerakan lebih rapi dan aman.", "Quick guidance to keep the movement cleaner and safer.")}
                  src={splitAsset.tipsSrc}
                  onZoom={splitAsset.tipsSrc ? () => openZoom(splitAsset.tipsSrc, tr("Tips penting", "Important tips")) : null}
                />
                <InfoPanel
                  title={tr("Kesalahan umum", "Common mistakes")}
                  subtitle={tr("Hal-hal yang sebaiknya dihindari saat latihan.", "Things you should avoid during the exercise.")}
                  src={splitAsset.mistakesSrc}
                  onZoom={splitAsset.mistakesSrc ? () => openZoom(splitAsset.mistakesSrc, tr("Kesalahan umum", "Common mistakes")) : null}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-amber-300 bg-amber-50 px-5 py-8 text-sm font-medium leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
              <p className="font-black">{tr("Gambar 2D belum tersedia", "2D images not available yet")}</p>
              <p className="mt-2">
                {tr(
                  `Panduan ${exerciseName} belum tersedia.`,
                  `${exerciseName} guide is not available yet.`
                )}
              </p>
            </div>
          )}
        </div>
      </section>

      {zoomSrc ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={() => setZoomSrc(null)}>
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <p className="pr-4 text-sm font-black text-slate-900 dark:text-white">{zoomTitle}</p>
              <button
                type="button"
                onClick={() => setZoomSrc(null)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
              >
                {tr("Tutup", "Close")}
              </button>
            </div>
            <div className="relative h-[78vh] w-full bg-[linear-gradient(180deg,#ffffff_0%,#f6faf8_100%)] dark:bg-[linear-gradient(180deg,#0f172a_0%,#052e2b_100%)]">
              <Image src={zoomSrc} alt={zoomTitle} fill className="object-contain p-3" sizes="100vw" unoptimized quality={100} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
