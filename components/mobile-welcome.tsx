"use client";

import Image from "next/image";
import Link from "next/link";

import GetStartedButton from "@/components/get-started-button";
import { useLanguage } from "@/components/language-provider";

export default function MobileWelcome() {
  const { tr } = useLanguage();

  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-black text-white lg:hidden">
      <div className="absolute inset-x-0 top-0 h-[66dvh] min-h-[430px]">
        <Image
          src="/brand/fitmate-mobile-welcome.jpg"
          alt="FitMate fitness"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[48%_20%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18)_0%,rgba(0,0,0,.04)_36%,rgba(0,0,0,.72)_77%,#000_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.38)_0%,transparent_55%)]" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-green-400/60 bg-black/55 shadow-lg shadow-green-500/20 backdrop-blur-md">
              <Image
                src="/brand/fitmate-mark.png"
                alt=""
                width={34}
                height={34}
                className="h-8 w-8 object-contain"
              />
            </span>
            <span className="text-[1.75rem] font-black leading-none tracking-[-0.045em]">
              <span className="text-green-500">Fit</span>
              <span className="text-white">Mate</span>
            </span>
          </div>

          <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white/75 backdrop-blur-md">
            {tr("Fitness App", "Fitness App")}
          </span>
        </div>

        <div className="mt-auto pb-2">
          <div className="max-w-[22rem]">
            <p className="text-[2.85rem] font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
              {tr("Your Fitness", "Your Fitness")}
              <br />
              <span className="text-white">Your </span>
              <span className="text-green-500">Mate</span>
            </p>
            <p className="mt-5 max-w-[21rem] text-[15px] font-medium leading-6 text-white/72">
              {tr(
                "Latihanmu, lebih simpel.",
                "Your training, simplified."
              )}
            </p>
          </div>

          <div className="mt-7 space-y-4">
            <GetStartedButton className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 text-base font-black text-white shadow-[0_14px_40px_rgba(34,197,94,.28)] transition active:scale-[.985] disabled:opacity-60">
              {tr("Mulai Sekarang", "Start Now")}
            </GetStartedButton>

            <p className="text-center text-sm font-semibold text-white/70">
              {tr("Sudah punya akun?", "Already have an account?")} {" "}
              <Link
                href="/login"
                className="font-black text-green-400 transition hover:text-green-300"
              >
                {tr("Masuk", "Login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
