"use client";

import { useEffect } from "react";

import { reportClientEvent } from "@/components/client-monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientEvent({
      eventType: "global_render_error",
      severity: "error",
      message: error.message,
      metadata: {
        digest: error.digest || null,
      },
    });
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-white">
        <main className="flex min-h-screen items-center justify-center px-5">
          <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-200/60">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-2xl">
              !
            </span>
            <h1 className="mt-5 text-2xl font-black text-slate-900">
              FitMate perlu dimuat ulang
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Masalah ini sudah dicatat untuk monitoring.
              Data akun dan progres Anda tetap aman.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 w-full rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
            >
              Coba lagi
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
