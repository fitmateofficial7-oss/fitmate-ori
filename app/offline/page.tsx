import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/15 text-3xl">
          ↻
        </div>
        <h1 className="mt-5 text-3xl font-black">Koneksi terputus</h1>
        <p className="mt-3 leading-7 text-slate-300">
          Halaman yang sudah pernah dibuka tetap tersedia. Catatan latihan offline akan disimpan di perangkat dan bisa disinkronkan setelah internet kembali.
        </p>
        <Link
          href="/workout"
          className="mt-6 inline-flex rounded-2xl bg-green-600 px-5 py-3 font-black text-white"
        >
          Buka latihan
        </Link>
      </section>
    </main>
  );
}
