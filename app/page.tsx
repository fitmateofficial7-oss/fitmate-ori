"use client";

import Link from "next/link";

import CompanySignature from "@/components/company-signature";
import FitMateBrand from "@/components/fitmate-brand";
import GetStartedButton from "@/components/get-started-button";
import FitMateIcon, { type FitMateIconName } from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";
import LiveIcon from "@/components/live-icon";
import MobileWelcome from "@/components/mobile-welcome";

const FEATURES = [
  {
    icon: "message" as FitMateIconName,
    motion: "wiggle",
    eyebrow: "COACH",
    titleId: "Konsultasi tanpa terasa menghakimi",
    titleEn: "Support without judgment",
    descriptionId:
      "Tanya soal latihan, nutrisi, dan recovery.",
    descriptionEn:
      "Ask about training, nutrition, and recovery.",
    color:
      "from-green-400/20 to-green-400/5 text-green-700",
  },
  {
    icon: "camera" as FitMateIconName,
    motion: "pop",
    eyebrow: "MEAL SCAN",
    titleId: "Foto makanan, lihat estimasi nutrisinya",
    titleEn: "Photograph a meal and estimate its nutrition",
    descriptionId:
      "Lihat estimasi kalori dan makro dari foto.",
    descriptionEn:
      "Estimate calories and macros from a photo.",
    color:
      "from-orange-400/20 to-amber-400/5 text-orange-700",
  },
  {
    icon: "dumbbell" as FitMateIconName,
    motion: "float",
    eyebrow: "2D GUIDE",
    titleId: "Gerakan lebih mudah dipahami",
    titleEn: "Movements are easier to understand",
    descriptionId:
      "Lihat langkah gerakan 2D dari awal sampai akhir.",
    descriptionEn:
      "Follow clear 2D movement steps from start to finish.",
    color:
      "from-sky-400/20 to-blue-400/5 text-sky-700",
  },
  {
    icon: "timer" as FitMateIconName,
    motion: "tick",
    eyebrow: "REST TIMER",
    titleId: "Recovery tepat di setiap set",
    titleEn: "The right recovery for every set",
    descriptionId:
      "Timer istirahat otomatis setelah set selesai.",
    descriptionEn:
      "Rest timer starts after a completed set.",
    color:
      "from-violet-400/20 to-purple-400/5 text-violet-700",
  },
];

export default function Home() {
  const { tr } = useLanguage();

  return (
    <main className="fitmate-marketing-page min-h-screen overflow-hidden bg-white text-slate-950">
      <MobileWelcome />
      <div className="hidden lg:block">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(circle_at_20%_8%,_rgba(34,197,94,.12),_transparent_34%)]" />

      <nav className="relative z-20 px-4 py-5 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-lg shadow-slate-200/50 backdrop-blur-xl sm:px-5">
          <FitMateBrand href="/" size="sm" showCompany />

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Login
            </Link>
            <GetStartedButton className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-green-600 disabled:opacity-60 sm:px-5">
              {tr("Mulai", "Get Started")}
            </GetStartedButton>
          </div>
        </div>
      </nav>

      <section className="relative px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:px-10 lg:pb-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-green-700 shadow-sm backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              {tr(
                "Pendamping latihan personal",
                "Personal training companion"
              )}
            </div>

            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              {tr("Menjadi lebih sehat terasa", "Getting healthier feels")}{" "}
              <span className="bg-gradient-to-r from-green-500 via-green-500 to-sky-500 bg-clip-text text-transparent">
                {tr("lebih sederhana.", "much simpler.")}
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              {tr(
                "Rencana latihan, Coach, nutrisi, jogging, dan panduan gerakan dalam satu aplikasi.",
                "Workout plans, Coach, nutrition, jogging, and exercise guides in one app."
              )}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <GetStartedButton className="rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-7 py-4 text-base font-black text-white shadow-xl shadow-green-500/25 transition hover:-translate-y-1 disabled:opacity-60">
                {tr("Mulai sekarang", "Get started")}
              </GetStartedButton>
              <a
                href="#features"
                className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-center text-base font-black text-slate-700 shadow-sm transition hover:-translate-y-1 hover:border-green-200 hover:text-green-700"
              >
                {tr("Lihat semua fitur", "Explore all features")}
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-500">
              <span>
                {tr("Gratis untuk memulai", "Free to start")}
              </span>
              <span>
                {tr(
                  "Dibuat sesuai profilmu",
                  "Built around your profile"
                )}
              </span>
              <span>
                {tr("Mudah digunakan", "Easy to use")}
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-6 rotate-3 rounded-[3rem] bg-gradient-to-br from-green-300/30 to-sky-300/20 blur-2xl" />

            <div className="relative overflow-hidden rounded-[2.4rem] border border-white bg-slate-950 p-4 shadow-2xl shadow-slate-950/25 sm:p-5">
              <div className="flex items-center justify-between px-2 pb-4 text-white">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
                    {tr("Selamat pagi", "Good morning")}
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {tr(
                      "Siap menjadi lebih kuat?",
                      "Ready to feel stronger?"
                    )}
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <FitMateIcon name="activity" className="h-5 w-5" />
                </span>
              </div>

              <div className="rounded-[1.8rem] bg-gradient-to-br from-green-400 to-green-600 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-green-50">
                      {tr("Latihan hari ini", "Today’s workout")}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      Upper Body Power
                    </h2>
                    <p className="mt-2 text-sm text-green-50">
                      6 exercises ·{" "}
                      {tr("45 menit", "45 minutes")}
                    </p>
                  </div>
                  <span className="rounded-2xl bg-white/20 p-3">
                    <FitMateIcon name="dumbbell" className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-[68%] rounded-full bg-white" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[1.5rem] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                      <FitMateIcon name="camera" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-400">
                        MEAL SCAN
                      </p>
                      <p className="font-black">Chicken bowl</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-xs text-slate-400">Protein</p>
                      <p className="font-black">42g</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-xs text-slate-400">
                        {tr("Kalori", "Calories")}
                      </p>
                      <p className="font-black">560</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                      <FitMateIcon name="message" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-400">
                        COACH
                      </p>
                      <p className="font-black">Online</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl bg-green-50 p-3 text-xs leading-5 text-green-900">
                    {tr(
                      "“Recovery-mu hari ini terlihat baik. Siap latihan?”",
                      "“Your recovery looks good today. Ready to train?”"
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-[1.5rem] bg-white/10 px-4 py-3 text-white">
                <div className="flex items-center gap-3">
                  <LiveIcon
                    variant="tick"
                    active
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400 text-slate-950"
                  >
                    <FitMateIcon name="timer" className="h-5 w-5" />
                  </LiveIcon>
                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      REST TIMER
                    </p>
                    <p className="font-black">
                      00:42 {tr("tersisa", "remaining")}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-orange-300">
                  {tr("Berjalan", "Running")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative bg-white px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-green-600">
              {tr(
                "Semua yang kamu butuhkan",
                "Everything you need"
              )}
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              {tr(
                "Fitness yang personal, tetapi tetap terasa manusiawi.",
                "Personal fitness that still feels human."
              )}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              {tr(
                "Latihan, nutrisi, dan progres dalam satu alur sederhana.",
                "Training, nutrition, and progress in one simple flow."
              )}
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <article
                key={feature.titleId}
                className={`group rounded-[2rem] border border-slate-100 bg-gradient-to-br p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${feature.color}`}
              >
                <LiveIcon
                  variant={
                    feature.motion as
                      | "float"
                      | "tick"
                      | "wiggle"
                      | "pop"
                  }
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm"
                >
                  <FitMateIcon name={feature.icon} className="h-6 w-6" />
                </LiveIcon>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] opacity-80">
                  {feature.eyebrow}
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  {tr(feature.titleId, feature.titleEn)}
                </h3>
                <p className="mt-3 max-w-xl leading-7 text-slate-600">
                  {tr(
                    feature.descriptionId,
                    feature.descriptionEn
                  )}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-green-600">
              {tr("Cara memulai", "How to start")}
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight">
              {tr(
                "Tiga langkah. Tidak ribet.",
                "Three simple steps."
              )}
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              {tr(
                "Isi profil, buat rencana, lalu mulai latihan.",
                "Set your profile, build a plan, and start training."
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                number: "01",
                titleId: "Buat akun",
                titleEn: "Create an account",
                textId: "Daftar dan isi profil singkat.",
                textEn: "Sign up and complete a short profile.",
              },
              {
                number: "02",
                titleId: "Pilih tujuan",
                titleEn: "Choose your goal",
                textId: "Beritahu target dan jadwalmu.",
                textEn: "Tell us your goal and schedule.",
              },
              {
                number: "03",
                titleId: "Mulai bergerak",
                titleEn: "Start moving",
                textId: "Ikuti plan dan konsultasi kapan pun.",
                textEn: "Follow the plan and ask for help anytime.",
              },
            ].map((step) => (
              <article
                key={step.number}
                className="rounded-[1.75rem] border border-white bg-white p-6 shadow-lg shadow-slate-200/50"
              >
                <p className="text-3xl font-black text-green-500">
                  {step.number}
                </p>
                <h3 className="mt-5 text-lg font-black">
                  {tr(step.titleId, step.titleEn)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {tr(step.textId, step.textEn)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-14 text-center text-white shadow-2xl shadow-slate-950/20 sm:px-10 sm:py-20">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500 text-white">
            <FitMateIcon name="activity" className="h-6 w-6" />
          </span>
          <h2 className="mx-auto mt-7 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            {tr(
              "Mulai dari satu langkah kecil hari ini.",
              "Start with one small step today."
            )}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            {tr(
              "Mulai latihan dan pantau progresmu.",
              "FitMate stays with you through the process, so you never feel lost or alone."
            )}
          </p>
          <GetStartedButton className="mt-8 rounded-2xl bg-gradient-to-r from-green-400 to-green-500 px-8 py-4 font-black text-slate-950 shadow-xl shadow-green-500/20 transition hover:-translate-y-1 disabled:opacity-60">
            {tr("Mulai Gratis", "Get Started for Free")}
          </GetStartedButton>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white px-6 py-8 dark:border-white/10 dark:bg-slate-950">
        <CompanySignature compact className="mx-auto max-w-7xl" />
      </footer>
      </div>
    </main>
  );
}
