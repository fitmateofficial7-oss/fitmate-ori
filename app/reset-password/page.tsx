"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import FitMateBrand from "@/components/fitmate-brand";
import LiveIcon from "@/components/live-icon";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const { tr } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    let active = true;

    const prepareRecovery = async () => {
      const params = new URLSearchParams(
        window.location.search
      );
      const code = params.get("code");
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession) {
        if (active) {
          setReady(true);
          setChecking(false);
        }
        return;
      }

      if (code) {
        const { error } =
          await supabase.auth.exchangeCodeForSession(
            code
          );

        if (!error) {
          if (active) {
            setReady(true);
            setChecking(false);
          }
          return;
        }
      }

      if (active) {
        setErrorMessage(
          tr(
            "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman login.",
            "This reset link is invalid or has expired. Request a new link from the login page."
          )
        );
        setChecking(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          active &&
          event === "PASSWORD_RECOVERY" &&
          session
        ) {
          setReady(true);
          setChecking(false);
          setErrorMessage("");
        }
      }
    );

    void prepareRecovery();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [tr]);

  const handleUpdatePassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage(
        tr(
          "Kata sandi minimal 8 karakter.",
          "The password must contain at least 8 characters."
        )
      );
      return;
    }

    if (
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setErrorMessage(
        tr(
          "Gunakan minimal satu huruf dan satu angka.",
          "Use at least one letter and one number."
        )
      );
      return;
    }

    if (password !== confirmation) {
      setErrorMessage(
        tr(
          "Konfirmasi kata sandi belum sama.",
          "The password confirmation does not match."
        )
      );
      return;
    }

    setSaving(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      window.location.assign(
        "/login?notice=password-reset"
      );
    } catch (error) {
      console.error("Update password error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr(
              "Kata sandi belum dapat diperbarui.",
              "The password could not be updated."
            )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4 sm:p-6">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-8">
        <FitMateBrand href="/" size="md" showCompany />

        <LiveIcon
          variant="wiggle"
          className="mt-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl"
        >
          🔐
        </LiveIcon>
        <h1 className="mt-5 text-3xl font-black text-slate-900">
          {tr(
            "Buat kata sandi baru",
            "Create a new password"
          )}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {tr(
            "Gunakan kata sandi yang mudah kamu ingat tetapi sulit ditebak orang lain.",
            "Use a password that is easy for you to remember but difficult for others to guess."
          )}
        </p>

        {checking && (
          <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">
            {tr(
              "Memeriksa tautan reset…",
              "Checking the reset link…"
            )}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-700"
          >
            {errorMessage}
          </div>
        )}

        {ready && (
          <form
            onSubmit={handleUpdatePassword}
            className="mt-7 space-y-5"
          >
            <div>
              <label
                htmlFor="new-password"
                className="text-sm font-black text-slate-700"
              >
                {tr(
                  "Kata sandi baru",
                  "New password"
                )}
              </label>
              <div className="relative mt-2">
                <input
                  id="new-password"
                  type={
                    showPassword ? "text" : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  placeholder={tr(
                    "Minimal 8 karakter",
                    "At least 8 characters"
                  )}
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
                    ? tr("Tutup", "Hide")
                    : tr("Lihat", "Show")}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="text-sm font-black text-slate-700"
              >
                {tr(
                  "Ulangi kata sandi",
                  "Confirm password"
                )}
              </label>
              <input
                id="confirm-password"
                type={
                  showPassword ? "text" : "password"
                }
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(event.target.value)
                }
                autoComplete="new-password"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            <p className="rounded-2xl bg-green-50 px-4 py-3 text-xs font-semibold leading-5 text-green-800">
              {tr(
                "Minimal 8 karakter dan berisi setidaknya satu huruf serta satu angka.",
                "Use at least 8 characters with at least one letter and one number."
              )}
            </p>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-green-600 py-4 font-black text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {saving
                ? tr(
                    "Menyimpan…",
                    "Saving…"
                  )
                : tr(
                    "Simpan kata sandi baru →",
                    "Save new password →"
                  )}
            </button>
          </form>
        )}

        {!checking && !ready && (
          <Link
            href="/login"
            className="mt-6 block rounded-2xl border border-slate-200 px-5 py-3 text-center text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            ← {tr("Kembali ke login", "Back to login")}
          </Link>
        )}
      </section>
    </main>
  );
}
