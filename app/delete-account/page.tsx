"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

const supportEmail =
  process.env.NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL || "support@fitmate-ai.example";

export default function DeleteAccountInfoPage() {
  const { tr } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-7 sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-green-400">FitMate</p>
        <h1 className="mt-3 text-3xl font-black">{tr("Hapus Akun", "Delete Account")}</h1>
        <p className="mt-4 leading-7 text-slate-300">
          {tr(
            "Masuk ke FitMate, buka Pengaturan, pilih Hapus akun saya, lalu ketik HAPUS AKUN. Akun dan data FitMate akan dihapus permanen.",
            "Sign in to FitMate, open Settings, choose Delete my account, then type DELETE ACCOUNT. Your FitMate account and associated data will be permanently deleted."
          )}
        </p>
        <p className="mt-4 leading-7 text-slate-300">
          {tr("Jika tidak bisa mengakses akun, hubungi", "If you cannot access the account, contact")} {" "}
          <a className="font-bold text-green-400 underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login?redirect=%2Fsettings" className="rounded-2xl bg-green-600 px-5 py-3 font-black">
            {tr("Masuk", "Sign in")}
          </Link>
          <Link href="/privacy" className="rounded-2xl bg-white/10 px-5 py-3 font-black">
            {tr("Kebijakan privasi", "Privacy policy")}
          </Link>
        </div>
      </section>
    </main>
  );
}
