"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";
import { localizeStoredReadinessRecommendation } from "@/lib/prelaunch-fitness";

type Readiness = {
  readiness_score: number;
  recommendation: string;
  volume_modifier: number;
  intensity_modifier: number;
};

function jakartaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function ReadinessBanner() {
  const { language, tr } = useLanguage();
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("readiness_logs")
        .select(
          "readiness_score, recommendation, volume_modifier, intensity_modifier"
        )
        .eq("user_id", user.id)
        .eq("log_date", jakartaDate())
        .maybeSingle();

      setReadiness((data as Readiness | null) || null);
      setLoaded(true);
    };

    void load();
  }, []);

  if (!loaded) return null;

  if (!readiness) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-400/20 dark:bg-amber-400/10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-amber-950 dark:text-amber-100">
              {tr("Cek kesiapan tubuh", "Check your readiness")}
            </p>
            <p className="truncate text-xs text-amber-800 dark:text-amber-200/80">
              {tr(
                "Sesuaikan latihan dengan energi dan kondisi hari ini.",
                "Match today’s workout to your energy and condition."
              )}
            </p>
          </div>
          <Link
            href="/progress"
            className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white"
          >
            {tr("Isi", "Check")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl rounded-2xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-400/20 dark:bg-green-400/10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white">
            {readiness.readiness_score}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-green-950 dark:text-green-100">
              {tr("Kesiapan hari ini", "Today’s readiness")}
            </p>
            <p className="truncate text-xs text-green-800 dark:text-green-200/80">
              {localizeStoredReadinessRecommendation(readiness.recommendation, language)}
            </p>
          </div>
        </div>
        <Link
          href="/progress"
          className="shrink-0 rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white"
        >
          {tr("Ubah", "Update")}
        </Link>
      </div>
    </div>
  );
}
