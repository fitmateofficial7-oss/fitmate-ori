import Link from "next/link";

const supportEmail =
  process.env.NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL || "support@fitmate-ai.example";

export default function DeleteAccountInfoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-7 sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-green-400">FitMate AI</p>
        <h1 className="mt-3 text-3xl font-black">Delete Account</h1>
        <p className="mt-4 leading-7 text-slate-300">Sign in to FitMate, open Settings, choose “Delete my account,” and type <strong className="text-white">HAPUS AKUN</strong>. This permanently removes the Supabase authentication account and associated FitMate records, including private progress-photo objects.</p>
        <p className="mt-4 leading-7 text-slate-300">When you cannot access the account, contact <a className="font-bold text-green-400 underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>. Set the official support address before public launch.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login?redirect=%2Fsettings" className="rounded-2xl bg-green-600 px-5 py-3 font-black">Sign in</Link>
          <Link href="/privacy" className="rounded-2xl bg-white/10 px-5 py-3 font-black">Privacy policy</Link>
        </div>
      </section>
    </main>
  );
}
