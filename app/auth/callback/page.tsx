"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import FitMateBrand from "@/components/fitmate-brand";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/onboarding";
  }
  return value;
}

async function recoverSessionFromUrl() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");

  const {
    data: { session: existingSession },
  } = await supabase.auth.getSession();

  if (existingSession) {
    return { session: existingSession, error: null as Error | null };
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      return { session: data.session, error: null as Error | null };
    }
    if (error) {
      return { session: null, error };
    }
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error && data.session) {
      return { session: data.session, error: null as Error | null };
    }
    if (error) {
      return { session: null, error };
    }
  }

  const errorDescription =
    url.searchParams.get("error_description") ??
    hash.get("error_description") ??
    url.searchParams.get("error") ??
    hash.get("error");

  return {
    session: null,
    error: new Error(errorDescription || "Unable to confirm this email link."),
  };
}

export default function AuthCallbackPage() {
  const { tr } = useLanguage();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const run = async () => {
      const url = new URL(window.location.href);
      const nextPath = safeNextPath(url.searchParams.get("next"));
      const { session, error } = await recoverSessionFromUrl();

      if (!active) return;

      if (session) {
        window.history.replaceState({}, "", window.location.pathname);
        window.location.replace(nextPath);
        return;
      }

      // A confirmation link can be opened on a different browser/device.
      // In PKCE mode the code verifier may not exist there, even though
      // Supabase already confirmed the email before redirecting back here.
      if (url.searchParams.get("code")) {
        window.history.replaceState({}, "", window.location.pathname);
        window.location.replace("/login?notice=email-confirmed");
        return;
      }

      setErrorMessage(
        error?.message ||
          tr(
            "Tautan verifikasi tidak valid atau sudah kedaluwarsa.",
            "The verification link is invalid or has expired."
          )
      );
    };

    void run();

    return () => {
      active = false;
    };
  }, [tr]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4 sm:p-6">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-8">
        <FitMateBrand href="/" size="md" showCompany />

        {!errorMessage ? (
          <div className="mt-10 rounded-2xl bg-green-50 p-5 text-sm font-semibold leading-6 text-green-800">
            {tr(
              "Memverifikasi email kamu… Jangan tutup halaman ini.",
              "Verifying your email… Please keep this page open."
            )}
          </div>
        ) : (
          <div className="mt-10">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold leading-6 text-rose-700">
              {errorMessage}
            </div>
            <Link
              href="/login"
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
            >
              {tr("Kembali ke login", "Back to login")}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
