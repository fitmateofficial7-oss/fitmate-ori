"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import FitMateBrand from "@/components/fitmate-brand";
import FitMateIcon from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";

async function establishRecoverySession() {
  const url = new URL(window.location.href);
  const query = url.searchParams;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const errorDescription =
    query.get("error_description") ??
    hash.get("error_description") ??
    query.get("error") ??
    hash.get("error");

  if (errorDescription) {
    return { ready: false, error: new Error(errorDescription) };
  }

  const {
    data: { session: existingSession },
  } = await supabase.auth.getSession();

  if (existingSession) {
    return { ready: true, error: null as Error | null };
  }

  const code = query.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      window.history.replaceState({}, "", window.location.pathname);
      return { ready: true, error: null as Error | null };
    }
    if (error) {
      return { ready: false, error };
    }
  }

  // Also support links that return access/refresh tokens in the URL hash.
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error && data.session) {
      window.history.replaceState({}, "", window.location.pathname);
      return { ready: true, error: null as Error | null };
    }
    if (error) {
      return { ready: false, error };
    }
  }

  return {
    ready: false,
    error: new Error("No recovery session was found in this link."),
  };
}

export default function ResetPasswordPage() {
  const { tr } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const finishReady = () => {
      if (!active) return;
      setReady(true);
      setChecking(false);
      setErrorMessage("");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || !session) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        finishReady();
      }
    });

    const prepareRecovery = async () => {
      try {
        const result = await establishRecoverySession();
        if (!active) return;

        if (result.ready) {
          finishReady();
          return;
        }

        // Give Supabase's URL/session detector a brief chance to finish.
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;
        if (session) {
          finishReady();
          return;
        }

        setErrorMessage(
          tr(
            "Tautan reset tidak valid, sudah kedaluwarsa, atau dibuka dari browser yang berbeda. Minta tautan reset baru dari halaman login lalu buka pada browser yang sama.",
            "This reset link is invalid, expired, or was opened in a different browser. Request a new reset link from the login page and open it in the same browser."
          )
        );
        setChecking(false);
      } catch (error) {
        if (!active) return;
        console.error("Recovery link error:", error);
        setErrorMessage(
          tr(
            "Tautan reset tidak dapat diproses. Minta tautan baru dari halaman login.",
            "The reset link could not be processed. Request a new link from the login page."
          )
        );
        setChecking(false);
      }
    };

    void prepareRecovery();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [tr]);

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage(tr("Kata sandi minimal 8 karakter.", "The password must contain at least 8 characters."));
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setErrorMessage(tr("Gunakan minimal satu huruf dan satu angka.", "Use at least one letter and one number."));
      return;
    }

    if (password !== confirmation) {
      setErrorMessage(tr("Konfirmasi kata sandi belum sama.", "The password confirmation does not match."));
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          tr(
            "Sesi reset sudah tidak aktif. Minta tautan reset baru dari halaman login.",
            "The reset session is no longer active. Request a new reset link from the login page."
          )
        );
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();
      window.location.replace("/login?notice=password-reset");
    } catch (error) {
      console.error("Update password error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr("Kata sandi belum dapat diperbarui.", "The password could not be updated.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4 sm:p-6">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-8">
        <FitMateBrand href="/" size="md" showCompany />

        <span className="mt-10 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
          <FitMateIcon name="shield" className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-3xl font-black text-slate-900">
          {tr("Buat kata sandi baru", "Create a new password")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {tr(
            "Gunakan kata sandi yang mudah kamu ingat tetapi sulit ditebak orang lain.",
            "Use a password that is easy for you to remember but difficult for others to guess."
          )}
        </p>

        {checking && (
          <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">
            {tr("Memeriksa tautan reset…", "Checking the reset link…")}
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-700">
            {errorMessage}
          </div>
        )}

        {ready && (
          <form onSubmit={handleUpdatePassword} className="mt-7 space-y-5">
            <div>
              <label htmlFor="new-password" className="text-sm font-black text-slate-700">
                {tr("Kata sandi baru", "New password")}
              </label>
              <div className="relative mt-2">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder={tr("Minimal 8 karakter", "At least 8 characters")}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pr-20 outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-black text-green-700 hover:bg-green-50"
                >
                  {showPassword ? tr("Sembunyi", "Hide") : tr("Lihat", "Show")}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="text-sm font-black text-slate-700">
                {tr("Ulangi kata sandi", "Confirm password")}
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                placeholder={tr("Ketik ulang kata sandi", "Re-enter the password")}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-green-600 px-5 py-4 font-black text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? tr("Menyimpan…", "Saving…") : tr("Simpan kata sandi baru", "Save new password")}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-6 inline-flex text-sm font-black text-green-700 hover:text-green-800">
          ← {tr("Kembali ke login", "Back to login")}
        </Link>
      </section>
    </main>
  );
}
