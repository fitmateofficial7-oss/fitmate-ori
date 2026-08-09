"use client";

import { useEffect } from "react";
import { useLanguage } from "@/components/language-provider";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const { tr } = useLanguage();

  useEffect(() => {
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl dark:bg-green-500/10">
          ↻
        </span>
        <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">
          {tr("Dashboard belum dapat ditampilkan", "Dashboard could not be displayed")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {tr(
            "Data kamu tetap aman. Muat ulang untuk mencoba lagi.",
            "Your data is safe. Reload the dashboard to try again."
          )}
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-6 w-full rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
        >
          {tr("Coba lagi", "Try again")}
        </button>
      </section>
    </main>
  );
}
