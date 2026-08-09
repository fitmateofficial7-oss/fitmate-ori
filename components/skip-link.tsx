"use client";

import { useLanguage } from "@/components/language-provider";

export default function SkipLink() {
  const { tr } = useLanguage();

  return (
    <a
      href="#fitmate-main"
      className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-xl bg-slate-950 px-4 py-3 font-black text-white shadow-xl transition focus:translate-y-0 dark:bg-white dark:text-slate-950"
    >
      {tr("Lewati ke konten utama", "Skip to main content")}
    </a>
  );
}
