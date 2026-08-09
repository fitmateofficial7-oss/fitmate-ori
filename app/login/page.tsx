"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";

import FitMateBrand from "@/components/fitmate-brand";
import { useLanguage } from "@/components/language-provider";
import LiveIcon from "@/components/live-icon";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { tr } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] =
    useState(false);
  const [resetLoading, setResetLoading] =
    useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(
        window.location.search
      );
      const noticeType = params.get("notice");
      const emailParam = params.get("email");

      if (emailParam) {
        setEmail(emailParam);
      }

      if (noticeType === "account-exists") {
        setNotice(
          tr(
            "Akun dengan email tersebut sudah tersedia. Silakan login untuk melanjutkan.",
            "An account with this email already exists. Please log in to continue."
          )
        );
      } else if (noticeType === "check-email") {
        setNotice(
          tr(
            "Akun berhasil dibuat. Periksa email untuk konfirmasi, lalu login.",
            "Your account was created. Check your email to confirm it, then log in."
          )
        );
      } else if (params.get("registered") === "true") {
        setNotice(
          tr(
            "Akun berhasil dibuat. Silakan login.",
            "Your account was created. Please log in."
          )
        );
      } else if (noticeType === "password-reset") {
        setNotice(
          tr(
            "Kata sandi berhasil diperbarui. Silakan login dengan kata sandi baru.",
            "Your password has been updated. Log in with your new password."
          )
        );
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [tr]);

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage(
        tr(
          "Masukkan email dan password terlebih dahulu.",
          "Enter your email and password first."
        )
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (error) {
        throw error;
      }

      const redirect = new URLSearchParams(
        window.location.search
      ).get("redirect");
      const destination =
        redirect?.startsWith("/") &&
        !redirect.startsWith("//")
          ? redirect
          : "/dashboard";

      window.location.assign(destination);
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr(
              "Login gagal. Periksa kembali email dan password.",
              "Login failed. Check your email and password."
            )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    setResetSent(false);

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage(
        tr(
          "Masukkan email akun terlebih dahulu.",
          "Enter your account email first."
        )
      );
      return;
    }

    setResetLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

      if (error) {
        throw error;
      }

      setResetSent(true);
    } catch (error) {
      console.error(
        "Password reset request error:",
        error
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr(
              "Tautan reset belum dapat dikirim. Coba lagi.",
              "The reset link could not be sent. Try again."
            )
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2.25rem] border border-white bg-white shadow-2xl shadow-slate-200/70 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.1fr_.9fr]">
        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <FitMateBrand href="/" size="md" showCompany />

            <p className="mt-12 text-xs font-black uppercase tracking-[0.18em] text-green-600">
              {tr("Selamat datang kembali", "Welcome back")}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              {tr("Lanjutkan progresmu.", "Continue your progress.")}
            </h1>
            <p className="mt-3 leading-7 text-slate-500">
              {tr(
                "Workout plan, AI coach, dan seluruh riwayatmu sudah menunggu.",
                "Your workout plan, AI coach, and full history are ready."
              )}
            </p>

            {notice && (
              <div
                role="status"
                className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold leading-6 text-green-800"
              >
                ✓ {notice}
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
              >
                {errorMessage}
              </div>
            )}

            {forgotPassword ? (
              <form
                onSubmit={handleForgotPassword}
                className="mt-7 space-y-5"
              >
                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="font-black text-green-900">
                    {tr(
                      "Atur ulang kata sandi",
                      "Reset your password"
                    )}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-green-700">
                    {tr(
                      "Masukkan email akun. Kami akan mengirim tautan aman untuk membuat kata sandi baru.",
                      "Enter your account email. We will send a secure link to create a new password."
                    )}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="reset-email"
                    className="text-sm font-black text-slate-700"
                  >
                    Email
                  </label>
                  <input
                    id="reset-email"
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

                {resetSent && (
                  <div
                    role="status"
                    className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold leading-6 text-green-800"
                  >
                    {tr(
                      "Jika email terdaftar, tautan reset sudah dikirim. Periksa Inbox dan folder Spam.",
                      "If the email is registered, a reset link has been sent. Check your inbox and spam folder."
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="forgot-password-submit"
                  disabled={resetLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-green-600 py-4 font-black text-white shadow-xl shadow-green-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resetLoading
                    ? tr(
                        "Mengirim tautan…",
                        "Sending link…"
                      )
                    : tr(
                        "Kirim tautan reset →",
                        "Send reset link →"
                      )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotPassword(false);
                    setResetSent(false);
                    setErrorMessage("");
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  ← {tr("Kembali ke login", "Back to login")}
                </button>
              </form>
            ) : (
            <form
              onSubmit={handleLogin}
              className="mt-7 space-y-5"
            >
              <div>
                <label
                  htmlFor="login-email"
                  className="text-sm font-black text-slate-700"
                >
                  Email
                </label>
                <input
                  id="login-email"
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
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="login-password"
                    className="text-sm font-black text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    data-testid="forgot-password-open"
                    onClick={() => {
                      setForgotPassword(true);
                      setErrorMessage("");
                      setNotice("");
                    }}
                    className="text-xs font-black text-green-600 transition hover:text-green-700"
                  >
                    {tr(
                      "Lupa kata sandi?",
                      "Forgot password?"
                    )}
                  </button>
                </div>
                <div className="relative mt-2">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder={tr(
                      "Masukkan password",
                      "Enter your password"
                    )}
                    autoComplete="current-password"
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

              <button
                type="submit"
                data-testid="login-submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-green-600 py-4 font-black text-white shadow-xl shadow-green-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? tr("Sedang login…", "Logging in…")
                  : tr(
                      "Login & lanjutkan →",
                      "Log in & continue →"
                    )}
              </button>
            </form>
            )}

            <p className="mt-6 text-center text-sm text-slate-500">
              {tr(
                "Belum memiliki akun?",
                "Do not have an account?"
              )}{" "}
              <Link
                href="/register"
                className="font-black text-green-600 hover:text-green-700"
              >
                {tr("Buat akun gratis", "Create a free account")}
              </Link>
            </p>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />

          <div className="relative flex justify-end">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] backdrop-blur">
              {tr(
                "Pendamping fitness yang ramah",
                "Your friendly fitness companion"
              )}
            </span>
          </div>

          <div className="relative">
            <LiveIcon
              variant="wiggle"
              className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-white text-3xl shadow-xl"
            >
              👋
            </LiveIcon>
            <h2 className="mt-7 text-5xl font-black leading-tight tracking-tight">
              {tr(
                "Senang melihatmu kembali.",
                "It is good to see you again."
              )}
            </h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-green-50">
              {tr(
                "Sedikit progres setiap hari tetaplah progres. Mari lanjut dari tempat terakhir kamu berhenti.",
                "A little progress every day still counts. Let’s continue where you left off."
              )}
            </p>
          </div>

          <div className="relative rounded-[1.75rem] border border-white/20 bg-white/10 p-5 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-100">
              {tr("Pengingat FitMate", "FitMate reminder")}
            </p>
            <p className="mt-3 text-lg font-bold leading-7">
              {tr(
                "“Konsistensi yang realistis lebih kuat daripada motivasi yang hanya datang sesekali.”",
                "“Realistic consistency is stronger than motivation that only appears occasionally.”"
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
