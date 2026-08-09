"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import FitMateIcon from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";
import { usePremiumAccess } from "@/hooks/use-premium-access";

type PremiumFeatureGateProps = {
  children: ReactNode;
  featureNameId: string;
  featureNameEn: string;
  descriptionId: string;
  descriptionEn: string;
};

export default function PremiumFeatureGate({
  children,
  featureNameId,
  featureNameEn,
  descriptionId,
  descriptionEn,
}: PremiumFeatureGateProps) {
  const { tr } = useLanguage();
  const { isPremium, loading, error, refresh } = usePremiumAccess();

  if (isPremium) {
    return children;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none min-h-screen select-none blur-[7px] opacity-40 saturate-50"
      >
        {children}
      </div>

      <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/35 px-4 py-8 backdrop-blur-sm dark:bg-black/55">
        <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/95 p-6 text-center text-slate-950 shadow-2xl shadow-slate-950/25 dark:border-white/10 dark:bg-slate-900/95 dark:text-white sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <FitMateIcon name="lock" className="h-6 w-6" />
          </div>
          <p className="mt-5 text-sm font-semibold text-amber-700 dark:text-amber-300">
            FitMate Premium
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {tr(featureNameId, featureNameEn)}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {tr(descriptionId, descriptionEn)}
          </p>

          {loading ? (
            <div className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">
              {tr("Memeriksa akses akun…", "Checking account access…")}
            </div>
          ) : error === "AUTH_REQUIRED" ? (
            <Link
              href="/login"
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 font-black text-white dark:bg-white dark:text-slate-950"
            >
              {tr("Login untuk melanjutkan", "Sign in to continue")}
            </Link>
          ) : (
            <>
              {error && (
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  {tr("Periksa akses lagi", "Check access again")}
                </button>
              )}
              <Link
                href="/premium"
                className="mt-3 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-4 font-black text-slate-950 shadow-lg shadow-amber-500/20"
              >
                {tr("Upgrade ke Premium", "Upgrade to Premium")}
              </Link>
              <Link
                href="/dashboard"
                className="mt-3 inline-flex px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                {tr("Kembali ke dashboard", "Back to dashboard")}
              </Link>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
