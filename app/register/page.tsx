"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";

import FitMateBrand from "@/components/fitmate-brand";
import { useLanguage } from "@/components/language-provider";
import LiveIcon from "@/components/live-icon";
import {
  FITMATE_AI_PROCESSING_VERSION,
  FITMATE_PRIVACY_VERSION,
  FITMATE_TERMS_VERSION,
} from "@/lib/legal";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const { tr } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRegister = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setErrorMessage("");

    if (!normalizedEmail || !password) {
      setErrorMessage(
        tr(
          "Masukkan email dan password terlebih dahulu.",
          "Enter your email and password first."
        )
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage(
        tr(
          "Gunakan password minimal 8 karakter.",
          "Use a password with at least 8 characters."
        )
      );
      return;
    }

    if (!acceptedLegal) {
      setErrorMessage(
        tr(
          "Setujui Ketentuan, Kebijakan Privasi, dan pemrosesan AI untuk membuat akun.",
          "Agree to the Terms, Privacy Policy, and AI processing to create an account."
        )
      );
      return;
    }

    setLoading(true);

    try {
      const consentedAt = new Date().toISOString();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            fitmate_terms_accepted: true,
            fitmate_terms_version: FITMATE_TERMS_VERSION,
            fitmate_privacy_accepted: true,
            fitmate_privacy_version: FITMATE_PRIVACY_VERSION,
            fitmate_ai_processing_accepted: true,
            fitmate_ai_processing_version: FITMATE_AI_PROCESSING_VERSION,
            fitmate_consented_at: consentedAt,
          },
        },
      });

      if (error) {
        const lowerMessage = error.message.toLowerCase();

        if (
          lowerMessage.includes("already") ||
          lowerMessage.includes("registered") ||
          lowerMessage.includes("exists")
        ) {
          window.location.assign(
            `/login?notice=account-exists&email=${encodeURIComponent(
              normalizedEmail
            )}`
          );
          return;
        }

        throw error;
      }

      const identities = data.user?.identities;
      const existingAccount =
        Boolean(data.user) &&
        Array.isArray(identities) &&
        identities.length === 0;

      if (existingAccount) {
        window.location.assign(
          `/login?notice=account-exists&email=${encodeURIComponent(
            normalizedEmail
          )}`
        );
        return;
      }

      if (!data.user) {
        throw new Error(
          tr(
            "Akun belum berhasil dibuat. Silakan coba lagi.",
            "The account could not be created. Please try again."
          )
        );
      }

      if (!data.session) {
        window.location.assign(
          `/login?notice=check-email&email=${encodeURIComponent(
            normalizedEmail
          )}`
        );
        return;
      }

      window.location.assign("/onboarding");
    } catch (error) {
      console.error("Registration error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr(
              "Terjadi kendala saat membuat akun.",
              "Something went wrong while creating the account."
            )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2.25rem] border border-white bg-white shadow-2xl shadow-slate-200/70 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-32 -top-24 h-80 w-80 rounded-full bg-green-400/25 blur-3xl" />
          <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />

          <FitMateBrand href="/" size="md" showCompany inverse className="relative" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-green-300">
              {tr("Mulai perjalananmu", "Start your journey")}
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight tracking-tight">
              {tr(
                "Versi terkuatmu dimulai dari sini.",
                "Your strongest version starts here."
              )}
            </h1>
            <p className="mt-5 max-w-md text-lg leading-8 text-slate-300">
              {tr(
                "Plan personal, AI coach, meal scan, dan panduan gerakan—siap membantu setiap langkah.",
                "A personal plan, AI coach, meal scan, and exercise guides are ready for every step."
              )}
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3">
            {[
              ["✦", "AI Coach"],
              ["📷", "Meal Scan"],
              ["◉", "2D Guide"],
            ].map(([icon, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <LiveIcon
                  variant={
                    label === "AI Coach"
                      ? "wiggle"
                      : label === "Meal Scan"
                        ? "pop"
                        : "float"
                  }
                  className="text-2xl"
                >
                  {icon}
                </LiveIcon>
                <p className="mt-3 text-sm font-bold">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <FitMateBrand href="/" size="sm" showCompany className="lg:hidden" />

            <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-green-600 lg:mt-0">
              {tr("Gratis untuk memulai", "Free to start")}
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">
              {tr("Buat akun FitMate", "Create your FitMate account")}
            </h2>
            <p className="mt-3 leading-7 text-slate-500">
              {tr(
                "Hanya perlu satu menit. Setelah itu kami akan menyesuaikan FitMate untukmu.",
                "It only takes a minute. Then FitMate will adapt to you."
              )}
            </p>

            {errorMessage && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
              >
                {errorMessage}
              </div>
            )}

            <form
              onSubmit={handleRegister}
              className="mt-7 space-y-5"
            >
              <div>
                <label
                  htmlFor="register-email"
                  className="text-sm font-black text-slate-700"
                >
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="nama@email.com"
                  autoComplete="email"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="text-sm font-black text-slate-700"
                >
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder={tr(
                      "Minimal 8 karakter",
                      "At least 8 characters"
                    )}
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pr-20 outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    className="absolute inset-y-0 right-3 my-auto h-9 rounded-xl px-3 text-xs font-black text-slate-500 hover:bg-slate-100"
                  >
                    {showPassword
                      ? tr("Sembunyikan", "Hide")
                      : tr("Tampilkan", "Show")}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(event) => setAcceptedLegal(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-green-600"
                />
                <span>
                  {tr("Saya menyetujui", "I agree to the")} {" "}
                  <Link href="/terms" target="_blank" className="font-black text-green-700 underline">
                    {tr("Ketentuan", "Terms")}
                  </Link>
                  , {" "}
                  <Link href="/privacy" target="_blank" className="font-black text-green-700 underline">
                    {tr("Kebijakan Privasi", "Privacy Policy")}
                  </Link>
                  , {tr("dan pemrosesan pesan/foto oleh AI untuk fitur yang saya gunakan.", "and AI processing of messages/photos for features I use.")}
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !acceptedLegal}
                className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-green-600 py-4 font-black text-white shadow-xl shadow-green-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? tr("Membuat akun…", "Creating account…")
                  : tr(
                      "Buat akun & lanjutkan →",
                      "Create account & continue →"
                    )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {tr(
                "Sudah memiliki akun?",
                "Already have an account?"
              )}{" "}
              <Link
                href="/login"
                className="font-black text-green-600 hover:text-green-700"
              >
                {tr("Login di sini", "Log in here")}
              </Link>
            </p>

            <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">
              {tr(
                "Persetujuan dicatat bersama versi dokumen dan waktu pendaftaran.",
                "Consent is recorded with the document version and registration time."
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
