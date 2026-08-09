"use client";

import FitMateBrand from "@/components/fitmate-brand";
import { useLanguage } from "@/components/language-provider";

export default function Loading() {
  const { tr } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="text-center">
        <div className="animate-pulse">
          <FitMateBrand size="lg" showCompany centered className="mx-auto" />
        </div>
        <p className="mt-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
          {tr("Menyiapkan FitMate…", "Preparing FitMate…")}
        </p>
      </div>
    </main>
  );
}
