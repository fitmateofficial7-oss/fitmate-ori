"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import FitMateIcon from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";

type CoachMessage = {
  id: string;
  role: "user" | "assistant";
  mode: "chat" | "nutrition";
  content: string;
  created_at: string;
};

type DailyUsage = {
  plan: "free" | "premium";
  isPremium: boolean;
  chat: {
    used: number;
    limit: number;
    remaining: number;
    period: "lifetime" | "day";
    resets_at: string | null;
  };
  nutrition: {
    used: number;
    limit: number;
    remaining: number;
    period: "lifetime" | "day";
    resets_at: string | null;
  };
  resets_at: string | null;
};

type CoachApiResponse = {
  success?: boolean;
  answer?: string;
  messages?: CoachMessage[];
  usage?: DailyUsage;
  error?: string;
  code?: string;
  upgradeUrl?: string | null;
};

// Quota policy remains unchanged even though meal scanning now lives in Nutrition.
// Audit markers: 1 konsultasi + 1 scan makanan seumur hidup
// Premium policy: 10 konsultasi + 10 scan makanan per hari

const SUGGESTIONS = [
  {
    id: "Bagaimana progres latihan saya minggu ini?",
    en: "How is my training progress this week?",
  },
  {
    id: "Berapa protein yang saya butuhkan?",
    en: "How much protein do I need?",
  },
  {
    id: "Kenapa recovery saya terasa lambat?",
    en: "Why does my recovery feel slow?",
  },
];

function createLocalMessage(
  role: CoachMessage["role"],
  content: string
): CoachMessage {
  return {
    id: `local-${Date.now()}-${Math.random()}`,
    role,
    mode: "chat",
    content,
    created_at: new Date().toISOString(),
  };
}

export default function CoachPage() {
  const router = useRouter();
  const { language, tr } = useLanguage();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [usage, setUsage] = useState<DailyUsage | null>(null);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      router.replace("/login?redirect=%2Fcoach");
      throw new Error(
        tr(
          "Sesi kamu sudah berakhir. Silakan login kembali.",
          "Your session has ended. Please sign in again."
        )
      );
    }

    return session.access_token;
  }, [router, tr]);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      setErrorMessage("");
      const token = await getAccessToken();
      const response = await fetch("/api/coach", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as CoachApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || tr("Riwayat chat gagal dimuat.", "Unable to load chat history.")
        );
      }

      setMessages(
        (Array.isArray(data.messages) ? data.messages : []).filter(
          (item) => item.mode === "chat"
        )
      );
      setUsage(data.usage || null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr("Riwayat chat gagal dimuat.", "Unable to load chat history.")
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [getAccessToken, tr]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, submitting]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || submitting) return;

    if (usage?.chat.remaining === 0) {
      if (usage.plan === "free") {
        router.push("/premium?from=coach&feature=ai-consultation");
      } else {
        setErrorMessage(
          tr(
            "Batas 10 konsultasi hari ini sudah habis. Kuota reset pukul 00.00 WIB.",
            "You have used all 10 consultations today. The quota resets at 00:00 WIB."
          )
        );
      }
      return;
    }

    setMessages((previous) => [...previous, createLocalMessage("user", trimmed)]);
    setMessage("");
    setSubmitting(true);
    setErrorMessage("");

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, language }),
      });
      const data = (await response.json()) as CoachApiResponse;

      if (data.usage) setUsage(data.usage);

      if (!response.ok || !data.success || !data.answer) {
        if (data.code === "PREMIUM_REQUIRED" || data.upgradeUrl) {
          router.push(
            `${data.upgradeUrl || "/premium"}?from=coach&feature=ai-consultation`
          );
          return;
        }
        throw new Error(
          data.error || tr("Coach belum dapat menjawab.", "The coach cannot answer right now.")
        );
      }

      setMessages((previous) => [
        ...previous,
        createLocalMessage("assistant", data.answer || ""),
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr("Coach belum dapat menjawab.", "The coach cannot answer right now.")
      );
    } finally {
      setSubmitting(false);
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  const remainingLabel = usage
    ? usage.plan === "free"
      ? `${usage.chat.remaining}/${usage.chat.limit} ${tr("konsultasi gratis", "free consult")}`
      : `${usage.chat.remaining}/${usage.chat.limit} ${tr("tersisa hari ini", "left today")}`
    : tr("Coach siap", "Coach ready");

  return (
    <main className="fitmate-app-page fitmate-coach-page flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#06100b] dark:text-slate-100">
      <header className="fitmate-coach-header shrink-0 border-b border-slate-200/80 bg-white/95 px-3 py-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-[#07110c]/95 sm:px-5">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          <span className="fitmate-coach-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-sm shadow-green-600/20">
            <FitMateIcon name="coach" className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-black tracking-tight">FitMate Coach</h1>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
            </div>
            <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {remainingLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loadingHistory}
            className="fitmate-coach-refresh inline-flex h-9 min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            {loadingHistory ? tr("Memuat…", "Loading…") : tr("Segarkan", "Refresh")}
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="fitmate-coach-error mx-auto w-full max-w-3xl shrink-0 px-3 pt-2 sm:px-5">
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100">
            {errorMessage}
          </div>
        </div>
      )}

      <section className="fitmate-coach-shell mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <div className="fitmate-coach-messages min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3 sm:px-5">
          {loadingHistory ? (
            <div className="flex h-full min-h-40 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-[3px] border-green-100 border-t-green-500 dark:border-green-400/20 dark:border-t-green-400" />
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {tr("Menyiapkan Coach…", "Preparing Coach…")}
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="fitmate-coach-empty flex h-full min-h-0 flex-col justify-end pb-2">
              <div className="mb-auto flex flex-1 flex-col items-center justify-center px-5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-300">
                  <FitMateIcon name="message" className="h-5 w-5" />
                </span>
                <h2 className="mt-3 text-lg font-black">
                  {tr("Ada yang mau ditanyakan?", "What can I help with?")}
                </h2>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {tr(
                    "Konsultasikan latihan, teknik, recovery, atau nutrisi yang berkaitan dengan fitness.",
                    "Ask about training, technique, recovery, or fitness-related nutrition."
                  )}
                </p>
              </div>

              <div className="fitmate-coach-suggestions flex gap-2 overflow-x-auto pb-1">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMessage(language === "id" ? item.id : item.en);
                      inputRef.current?.focus();
                    }}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  >
                    {language === "id" ? item.id : item.en}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`fitmate-chat-row flex items-end gap-1.5 ${item.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {item.role === "assistant" && (
                    <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white">
                      <FitMateIcon name="coach" className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div
                    className={`fitmate-chat-bubble max-w-[84%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-[13px] leading-5 ${
                      item.role === "user"
                        ? "rounded-br-md bg-green-600 text-white"
                        : "rounded-bl-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10"
                    }`}
                  >
                    {item.content}
                  </div>
                </div>
              ))}

              {submitting && (
                <div className="flex items-end gap-1.5 justify-start">
                  <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white">
                    <FitMateIcon name="coach" className="h-3.5 w-3.5" />
                  </span>
                  <div className="fitmate-chat-typing rounded-2xl rounded-bl-md bg-white px-3 py-2.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200/80 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
                    <span className="inline-flex items-center gap-1" aria-label={tr("Coach sedang mengetik", "Coach is typing")}>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={sendMessage}
          className="fitmate-coach-composer shrink-0 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#07110c]/95 sm:px-5"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/10 dark:border-white/10 dark:bg-white/5">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={tr("Ketik pesan…", "Message Coach…")}
              className="fitmate-coach-input max-h-24 min-h-10 flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!message.trim() || submitting || (usage?.plan === "premium" && usage.chat.remaining === 0)}
              className="fitmate-coach-send flex h-10 w-10 min-h-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm shadow-green-600/20 disabled:opacity-35"
              aria-label={tr("Kirim pesan", "Send message")}
            >
              <FitMateIcon name="play" className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
