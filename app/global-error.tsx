"use client";

import { useEffect, useState } from "react";

import { reportClientEvent } from "@/components/client-monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [english, setEnglish] = useState(false);

  useEffect(() => {
    try {
      setEnglish(window.localStorage.getItem("fitmate_language") === "en");
    } catch {
      // Keep Indonesian as the fallback language.
    }

    void reportClientEvent({
      eventType: "global_render_error",
      severity: "error",
      message: error.message,
      metadata: {
        digest: error.digest || null,
      },
    });
  }, [error]);

  const tr = (id: string, en: string) => (english ? en : id);

  return (
    <html lang={english ? "en" : "id"}>
      <body className="min-h-screen bg-white">
        <main className="flex min-h-screen items-center justify-center px-5">
          <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-200/60">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-2xl">!</span>
            <h1 className="mt-5 text-2xl font-black text-slate-900">
              {tr("FitMate perlu dimuat ulang", "FitMate needs to reload")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {tr(
                "Masalah ini sudah dicatat. Data akun dan progres Anda tetap aman.",
                "This issue has been logged. Your account and progress data remain safe."
              )}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 w-full rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
            >
              {tr("Coba lagi", "Try again")}
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
