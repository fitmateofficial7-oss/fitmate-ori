"use client";

import type {
  ChangeEvent,
  FormEvent,
} from "react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import LiveIcon from "@/components/live-icon";
import { supabase } from "@/lib/supabase";

type MacroTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

type NutritionAnalysis = {
  food_detected: boolean;
  dish_name: string;
  summary: string;
  items: Array<
    MacroTotals & {
      name: string;
      estimated_portion: string;
    }
  >;
  totals: MacroTotals;
  estimated_calorie_range: string;
  confidence: "low" | "medium" | "high";
  assumptions: string[];
  suggestions: string[];
  disclaimer: string;
};

type CoachMessage = {
  id: string;
  role: "user" | "assistant";
  mode: "chat" | "nutrition";
  content: string;
  metadata?: {
    analysis?: NutritionAnalysis;
    image_name?: string;
  } | null;
  created_at: string;
};

type CoachApiResponse = {
  success?: boolean;
  answer?: string;
  analysis?: NutritionAnalysis;
  messages?: CoachMessage[];
  usage?: DailyUsage;
  error?: string;
  code?: string;
  upgradeUrl?: string | null;
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

const SUGGESTIONS = [
  {
    id: "Berapa kali saya sebaiknya latihan minggu ini?",
    en: "How often should I train this week?",
  },
  {
    id: "Bantu evaluasi pola makan untuk bulking",
    en: "Help me review my diet for bulking",
  },
  {
    id: "Kenapa badan saya sulit recovery?",
    en: "Why is my body struggling to recover?",
  },
];

function createLocalMessage(
  role: CoachMessage["role"],
  mode: CoachMessage["mode"],
  content: string,
  metadata?: CoachMessage["metadata"]
): CoachMessage {
  return {
    id: `local-${Date.now()}-${Math.random()}`,
    role,
    mode,
    content,
    metadata,
    created_at: new Date().toISOString(),
  };
}

function formatNumber(value: number) {
  return Number.isFinite(value)
    ? Math.round(value)
    : 0;
}

function NutritionResult({
  analysis,
}: {
  analysis: NutritionAnalysis;
}) {
  const { tr } = useLanguage();
  const confidenceStyle = {
    high: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-rose-100 text-rose-700",
  }[analysis.confidence];

  if (!analysis.food_detected) {
    return (
      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-bold">
          {tr("Makanan belum dapat dikenali", "Food not recognized")}
        </p>
        <p className="mt-2 leading-6">
          {analysis.summary}
        </p>
      </div>
    );
  }

  const macros = [
    {
      label: tr("Kalori", "Calories"),
      value: `${formatNumber(
        analysis.totals.calories
      )} kkal`,
      color: "from-orange-400 to-amber-500",
    },
    {
      label: "Protein",
      value: `${formatNumber(
        analysis.totals.protein_g
      )} g`,
      color: "from-green-400 to-green-500",
    },
    {
      label: tr("Karbo", "Carbs"),
      value: `${formatNumber(
        analysis.totals.carbs_g
      )} g`,
      color: "from-sky-400 to-blue-500",
    },
    {
      label: tr("Lemak", "Fat"),
      value: `${formatNumber(
        analysis.totals.fat_g
      )} g`,
      color: "from-violet-400 to-purple-500",
    },
  ];

  return (
    <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-sm">
      <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-50">
              {tr("Hasil scan makanan", "Meal scan result")}
            </p>
            <h3 className="mt-2 text-xl font-black">
              {analysis.dish_name}
            </h3>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceStyle}`}
          >
            {analysis.confidence} {tr("keyakinan", "confidence")}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-green-50">
          {analysis.summary}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {macros.map((macro) => (
          <div
            key={macro.label}
            className="rounded-2xl bg-slate-50 p-3"
          >
            <div
              className={`h-1.5 rounded-full bg-gradient-to-r ${macro.color}`}
            />
            <p className="mt-3 text-xs font-semibold text-slate-500">
              {macro.label}
            </p>
            <p className="mt-1 text-lg font-black">
              {macro.value}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold">
            {tr(
              "Perkiraan komponen makanan",
              "Estimated meal components"
            )}
          </p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {analysis.estimated_calorie_range}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {analysis.items.map((item) => (
            <div
              key={`${item.name}-${item.estimated_portion}`}
              className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {item.estimated_portion}
                </p>
              </div>
              <p className="font-semibold text-slate-600">
                {formatNumber(item.calories)} kkal ·{" "}
                {formatNumber(item.protein_g)} g protein
              </p>
            </div>
          ))}
        </div>
      </div>

      {analysis.suggestions.length > 0 && (
        <div className="border-t border-slate-100 bg-green-50/70 px-4 py-4">
          <p className="text-sm font-black text-green-900">
            {tr("Saran FitMate", "FitMate Suggestions")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-green-900">
            {analysis.suggestions.map((suggestion) => (
              <li key={suggestion}>
                • {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-t border-slate-100 px-4 py-3 text-[11px] leading-5 text-slate-500">
        {analysis.disclaimer}
      </p>
    </div>
  );
}

export default function CoachPage() {
  const router = useRouter();
  const { language, tr } = useLanguage();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(
    null
  );
  const [mode, setMode] = useState<
    "chat" | "nutrition"
  >("chat");
  const [messages, setMessages] = useState<
    CoachMessage[]
  >([]);
  const [message, setMessage] = useState("");
  const [foodNote, setFoodNote] = useState("");
  const [foodFile, setFoodFile] = useState<File | null>(
    null
  );
  const [foodPreview, setFoodPreview] = useState<
    string | null
  >(null);
  const [loadingHistory, setLoadingHistory] =
    useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [usage, setUsage] =
    useState<DailyUsage | null>(null);

  const chatLocked =
    usage?.plan === "free" && usage.chat.remaining === 0;
  const nutritionLocked =
    usage?.plan === "free" && usage.nutrition.remaining === 0;

  const openPremium = (feature: "ai-consultation" | "meal-scan") => {
    router.push(`/premium?from=coach&feature=${feature}`);
  };

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      router.replace(
        "/login?redirect=%2Fcoach"
      );
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
      const token = await getAccessToken();
      const response = await fetch("/api/coach", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data =
        (await response.json()) as CoachApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            tr(
              "Riwayat chat gagal dimuat.",
              "Unable to load chat history."
            )
        );
      }

      setMessages(
        Array.isArray(data.messages)
          ? data.messages
          : []
      );
      setUsage(data.usage || null);
    } catch (error) {
      console.error("Coach history error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr(
              "Riwayat chat gagal dimuat.",
              "Unable to load chat history."
            )
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [getAccessToken, tr]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, submitting]);

  useEffect(() => {
    return () => {
      if (foodPreview) {
        URL.revokeObjectURL(foodPreview);
      }
    };
  }, [foodPreview]);

  const sendMessage = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const trimmed = message.trim();

    if (!trimmed || submitting) {
      return;
    }

    if (usage?.chat.remaining === 0) {
      if (usage.plan === "free") {
        openPremium("ai-consultation");
      } else {
        setErrorMessage(
          tr(
            "Batas 10 konsultasi hari ini sudah habis dan direset pukul 00.00 WIB.",
            "You have used all 10 consultations today. The limit resets at 00:00 WIB."
          )
        );
      }
      return;
    }

    const localUserMessage = createLocalMessage(
      "user",
      "chat",
      trimmed
    );
    setMessages((previous) => [
      ...previous,
      localUserMessage,
    ]);
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
        body: JSON.stringify({
          message: trimmed,
          language,
        }),
      });
      const data =
        (await response.json()) as CoachApiResponse;

      if (data.usage) {
        setUsage(data.usage);
      }

      if (!response.ok || !data.success || !data.answer) {
        if (data.code === "PREMIUM_REQUIRED" || data.upgradeUrl) {
          router.push(
            `${data.upgradeUrl || "/premium"}?from=coach&feature=ai-consultation`
          );
          return;
        }

        throw new Error(
          data.error ||
            tr(
              "Coach belum dapat menjawab.",
              "The coach cannot answer right now."
            )
        );
      }

      setMessages((previous) => [
        ...previous,
        createLocalMessage(
          "assistant",
          "chat",
          data.answer || ""
        ),
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr(
              "Coach belum dapat menjawab.",
              "The coach cannot answer right now."
            )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectFood = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setErrorMessage(
        tr(
          "Gunakan foto JPG, PNG, atau WebP.",
          "Use a JPG, PNG, or WebP photo."
        )
      );
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage(
        tr(
          "Ukuran foto maksimal 8 MB.",
          "The photo must be no larger than 8 MB."
        )
      );
      event.target.value = "";
      return;
    }

    if (foodPreview) {
      URL.revokeObjectURL(foodPreview);
    }

    setFoodFile(file);
    setFoodPreview(URL.createObjectURL(file));
    setErrorMessage("");
  };

  const analyzeFood = async () => {
    if (submitting) {
      return;
    }

    if (usage?.nutrition.remaining === 0) {
      if (usage.plan === "free") {
        openPremium("meal-scan");
      } else {
        setErrorMessage(
          tr(
            "Batas 10 scan makanan hari ini sudah habis.",
            "You have used all 10 meal scans for today."
          )
        );
      }
      return;
    }

    if (!foodFile) {
      setErrorMessage(
        tr(
          "Pilih foto makanan terlebih dahulu.",
          "Choose a meal photo first."
        )
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append("image", foodFile);
      formData.append("note", foodNote.trim());
      formData.append("language", language);

      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data =
        (await response.json()) as CoachApiResponse;

      if (data.usage) {
        setUsage(data.usage);
      }

      if (
        !response.ok ||
        !data.success ||
        !data.analysis
      ) {
        if (data.code === "PREMIUM_REQUIRED" || data.upgradeUrl) {
          router.push(
            `${data.upgradeUrl || "/premium"}?from=coach&feature=meal-scan`
          );
          return;
        }

        throw new Error(
          data.error ||
            tr(
              "Foto makanan belum dapat dianalisis.",
              "The meal photo could not be analyzed."
            )
        );
      }

      const analysis = data.analysis;
      setMessages((previous) => [
        ...previous,
        createLocalMessage(
          "user",
          "nutrition",
          foodNote.trim() ||
            `${tr(
              "Analisis makanan",
              "Meal analysis"
            )}: ${foodFile.name}`,
          {
            image_name: foodFile.name,
          }
        ),
        createLocalMessage(
          "assistant",
          "nutrition",
          analysis.summary,
          { analysis }
        ),
      ]);
      setFoodFile(null);
      setFoodNote("");
      setFoodPreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr(
              "Foto makanan belum dapat dianalisis.",
              "The meal photo could not be analyzed."
            )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="fitmate-app-page min-h-screen bg-white pb-28 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-3 text-left"
          >
            <LiveIcon
              variant="wiggle"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-xl text-white shadow-lg shadow-green-500/20"
            >
              ✦
            </LiveIcon>
            <span>
              <span className="block text-xs font-black uppercase tracking-[0.18em] text-green-600">
                FitMate AI
              </span>
              <span className="block font-black">
                {tr(
                  "Coach & Foto Makanan",
                  "Coach & Meal Photos"
                )}
              </span>
            </span>
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-green-200 bg-white px-4 py-2 text-xs font-bold text-green-700 shadow-sm sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            {usage
              ? `${usage.chat.remaining}/${usage.chat.limit} ${tr(
                  "konsul",
                  "consults"
                )} · ${usage.nutrition.remaining}/${usage.nutrition.limit} ${tr(
                  "foto",
                  "photos"
                )}`
              : tr("Coach siap", "Coach ready")}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-green-950 p-5 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-green-300">
                  {tr(
                    "Tanya. Foto. Lanjut latihan.",
                    "Ask. Snap. Keep moving."
                  )}
                </p>
                <h1 className="mt-2 text-2xl font-black">
                  {tr(
                    "Butuh bantuan apa hari ini?",
                    "How can FitMate help today?"
                  )}
                </h1>
              </div>

              <div className="flex rounded-2xl bg-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setMode("chat")}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    mode === "chat"
                      ? "bg-white text-slate-950 shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <LiveIcon variant="float">💬</LiveIcon>{" "}
                  {tr("Konsultasi", "Consult")}
                  {usage &&
                    ` · ${usage.chat.remaining}/${usage.chat.limit}`}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("nutrition")}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    mode === "nutrition"
                      ? "bg-white text-slate-950 shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <LiveIcon variant="pop">📷</LiveIcon>{" "}
                  {tr("Upload foto", "Upload photo")}
                  {usage &&
                    ` · ${usage.nutrition.remaining}/${usage.nutrition.limit}`}
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-green-100/90">
              {usage?.plan === "free"
                ? tr(
                    "Paket Free: 1 konsultasi + 1 scan makanan seumur hidup.",
                    "Free plan: 1 consultation + 1 meal scan for life."
                  )
                : tr(
                    "Paket Premium: 10 konsultasi + 10 scan makanan per hari.",
                    "Premium plan: 10 consultations + 10 meal scans per day."
                  )}
            </p>
          </div>

          <div className="max-h-[58vh] min-h-[420px] overflow-y-auto bg-white p-4 sm:p-6">
            {loadingHistory ? (
              <div className="flex min-h-80 items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-green-500" />
                  <p className="mt-4 text-sm font-semibold text-slate-500">
                    {tr(
                      "Menyiapkan FitMate Coach…",
                      "Preparing FitMate Coach…"
                    )}
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto flex min-h-80 max-w-xl flex-col items-center justify-center text-center">
                <LiveIcon
                  variant="wiggle"
                  className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-green-400 to-green-600 text-4xl shadow-xl shadow-green-500/20"
                >
                  🤝
                </LiveIcon>
                <h2 className="mt-6 text-2xl font-black">
                  {tr(
                    "Hai! Aku FitMate Coach.",
                    "Hi! I'm FitMate Coach."
                  )}
                </h2>
                <p className="mt-3 leading-7 text-slate-500">
                  {tr(
                    "Tanyakan latihan, pemulihan, pola makan, atau unggah foto makanan untuk mendapatkan estimasi nutrisinya.",
                    "Ask about training, recovery, or nutrition, or upload a meal photo for a nutrition estimate."
                  )}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => {
                    const label =
                      language === "en"
                        ? suggestion.en
                        : suggestion.id;
                    return (
                    <button
                      type="button"
                      key={suggestion.id}
                      onClick={() => {
                        if (chatLocked) {
                          openPremium("ai-consultation");
                          return;
                        }
                        setMode("chat");
                        setMessage(label);
                      }}
                      className={`rounded-full border px-4 py-2 text-xs font-bold shadow-sm transition ${
                        chatLocked
                          ? "border-slate-200 bg-slate-100 text-slate-400"
                          : "border-green-200 bg-white text-green-700 hover:-translate-y-0.5 hover:bg-green-50"
                      }`}
                    >
                      {label}
                    </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`flex gap-3 ${
                      item.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {item.role === "assistant" && (
                      <LiveIcon
                        variant="wiggle"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white"
                      >
                        ✦
                      </LiveIcon>
                    )}

                    <div
                      className={`max-w-[88%] ${
                        item.role === "user"
                          ? "rounded-[1.35rem] rounded-br-md bg-slate-900 px-4 py-3 text-white"
                          : "min-w-0"
                      }`}
                    >
                      {item.role === "assistant" ? (
                        <div className="rounded-[1.35rem] rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm">
                          <p className="whitespace-pre-wrap text-sm leading-7">
                            {item.content}
                          </p>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {item.content}
                        </p>
                      )}

                      {item.role === "assistant" &&
                        item.metadata?.analysis && (
                          <NutritionResult
                            analysis={
                              item.metadata.analysis
                            }
                          />
                        )}
                    </div>
                  </div>
                ))}

                {submitting && (
                  <div className="flex items-center gap-3">
                    <LiveIcon
                      variant="pulse"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white"
                    >
                      ✦
                    </LiveIcon>
                    <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="h-2 w-2 animate-bounce rounded-full bg-green-500"
                          style={{
                            animationDelay: `${index * 120}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {errorMessage && (
            <div className="mx-4 mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 sm:mx-6">
              {errorMessage}
            </div>
          )}

          {mode === "chat" ? (
            <form
              onSubmit={sendMessage}
              className="border-t border-slate-100 bg-white p-4 sm:p-5"
            >
              <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-green-400 focus-within:ring-4 focus-within:ring-green-100">
                <textarea
                  value={message}
                  readOnly={chatLocked}
                  onClick={() => {
                    if (chatLocked) openPremium("ai-consultation");
                  }}
                  onChange={(event) => {
                    if (!chatLocked) setMessage(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={2_000}
                  placeholder={
                    chatLocked
                      ? tr("🔒 Konsultasi terkunci · upgrade Premium", "🔒 Consultation locked · upgrade to Premium")
                      : tr(
                          "Tanyakan latihan, nutrisi, atau pemulihan…",
                          "Ask about training, nutrition, or recovery…"
                        )
                  }
                  className={`max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 ${
                    chatLocked ? "cursor-pointer text-slate-400" : ""
                  }`}
                />
                <button
                  type={chatLocked ? "button" : "submit"}
                  onClick={() => {
                    if (chatLocked) openPremium("ai-consultation");
                  }}
                  disabled={!chatLocked && (submitting || !message.trim())}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    chatLocked
                      ? "cursor-pointer bg-slate-900 shadow-slate-900/20 hover:scale-105"
                      : "bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/20 hover:scale-105"
                  }`}
                  aria-label={chatLocked ? tr("Buka Premium", "Open Premium") : tr("Kirim pesan", "Send message")}
                >
                  {chatLocked ? "🔒" : "↑"}
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                {usage?.chat.remaining === 0
                  ? usage.plan === "free"
                    ? tr(
                        "Kuota gratis 1 kali konsultasi sudah digunakan. Upgrade Premium untuk 10 konsultasi per hari.",
                        "Your one free lifetime consultation has been used. Upgrade to Premium for 10 consultations per day."
                      )
                    : tr(
                        "Batas 10 konsultasi hari ini sudah habis dan direset pukul 00.00 WIB.",
                        "You have used all 10 consultations today. The limit resets at 00:00 WIB."
                      )
                  : usage?.plan === "free"
                    ? tr(
                        "Paket Free menyediakan 1 konsultasi seumur hidup. FitMate bukan pengganti tenaga kesehatan.",
                        "The Free plan includes 1 lifetime consultation. FitMate is not a substitute for a health professional."
                      )
                    : tr(
                        "Maksimal 10 konsultasi per hari. FitMate bukan pengganti tenaga kesehatan.",
                        "Maximum 10 consultations per day. FitMate is not a substitute for a health professional."
                      )}
              </p>
            </form>
          ) : (
            <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectFood}
                className="hidden"
              />

              {foodPreview ? (
                <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                  <div
                    role="img"
                    aria-label={tr(
                      "Pratinjau foto makanan",
                      "Meal photo preview"
                    )}
                    className="h-40 rounded-2xl bg-cover bg-center shadow-inner"
                    style={{
                      backgroundImage: `url(${foodPreview})`,
                    }}
                  />
                  <div>
                    <textarea
                      value={foodNote}
                      readOnly={nutritionLocked}
                      onClick={() => {
                        if (nutritionLocked) openPremium("meal-scan");
                      }}
                      onChange={(event) => {
                        if (!nutritionLocked) setFoodNote(event.target.value);
                      }}
                      maxLength={500}
                      rows={3}
                      placeholder={tr(
                        "Opsional: nasi 2 centong, ayam digoreng, saus sedikit…",
                        "Optional: two scoops of rice, fried chicken, a little sauce…"
                      )}
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-green-400 focus:ring-4 focus:ring-green-100"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={analyzeFood}
                        disabled={
                          !nutritionLocked &&
                          (submitting ||
                            (usage?.plan === "premium" &&
                              usage.nutrition.remaining === 0))
                        }
                        className={`rounded-xl px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50 ${
                          nutritionLocked
                            ? "cursor-pointer bg-slate-900 shadow-slate-900/20"
                            : "bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/20"
                        }`}
                      >
                        {usage?.nutrition.remaining === 0
                          ? usage.plan === "free"
                            ? tr(
                                "🔒 Upgrade untuk scan lagi",
                                "🔒 Upgrade to scan again"
                              )
                            : tr(
                                "Token scan hari ini habis",
                                "Today's scan tokens are used"
                              )
                          : submitting
                          ? tr("Menganalisis…", "Analyzing…")
                          : tr(
                              "✨ Cek makanan",
                              "✨ Check meal"
                            )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (nutritionLocked) {
                            openPremium("meal-scan");
                            return;
                          }
                          fileInputRef.current?.click();
                        }}
                        className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                          nutritionLocked
                            ? "border-slate-200 bg-slate-100 text-slate-400"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {tr("Ganti foto", "Change photo")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      usage?.plan === "free" &&
                      usage.nutrition.remaining === 0
                    ) {
                      router.push(
                        "/premium?from=coach&feature=meal-scan"
                      );
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={
                    usage?.plan === "premium" &&
                    usage.nutrition.remaining === 0
                  }
                  className={`group flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-8 text-center transition ${
                    nutritionLocked
                      ? "cursor-pointer border-slate-300 bg-slate-100"
                      : "border-green-200 bg-green-50/60 hover:border-green-400 hover:bg-green-50"
                  }`}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm transition group-hover:scale-110">
                    {nutritionLocked ? "🔒" : "📸"}
                  </span>
                  <span className="mt-4 font-black text-slate-900">
                    {nutritionLocked
                      ? tr("Scan makanan terkunci", "Meal scan locked")
                      : tr(
                          "Upload atau foto makanan",
                          "Upload or photograph a meal"
                        )}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    {usage?.nutrition.remaining === 0
                      ? usage.plan === "free"
                        ? tr(
                            "Kuota gratis sudah dipakai · upgrade untuk 10 scan/hari",
                            "Free quota used · upgrade for 10 scans/day"
                          )
                        : tr(
                            "10 token scan sudah dipakai · reset 00.00 WIB",
                            "All 10 scan tokens used · resets at 00:00 WIB"
                          )
                      : usage?.plan === "free"
                        ? tr(
                            "JPG, PNG, WebP · maks. 8 MB · 1 scan seumur hidup",
                            "JPG, PNG, WebP · max 8 MB · 1 lifetime scan"
                          )
                        : tr(
                            "JPG, PNG, WebP · maks. 8 MB · 10 scan/hari",
                            "JPG, PNG, WebP · max 8 MB · 10 scans/day"
                          )}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {usage?.plan === "free" &&
            (usage.chat.remaining === 0 || usage.nutrition.remaining === 0) && (
              <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-slate-950 shadow-lg">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  FitMate Premium
                </p>
                <h2 className="mt-2 text-xl font-black">
                  {tr("Lanjutkan dengan 10 kuota per hari", "Continue with 10 uses per day")}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  {tr(
                    "Premium membuka 10 konsultasi AI dan 10 scan makanan setiap hari seharga Rp49.000 per bulan.",
                    "Premium unlocks 10 AI consultations and 10 meal scans every day for IDR 49,000 per month."
                  )}
                </p>
                <Link
                  href="/premium"
                  className="mt-4 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
                >
                  {tr("Lihat Premium", "View Premium")}
                </Link>
              </div>
            )}
          <div className="rounded-[1.75rem] bg-gradient-to-br from-green-500 to-green-700 p-6 text-white shadow-xl shadow-green-500/20">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-100">
              {tr(
                "Tips foto lebih akurat",
                "Tips for a more accurate photo"
              )}
            </p>
            <ol className="mt-4 space-y-3 text-sm leading-6">
              <li>
                1.{" "}
                {tr(
                  "Foto dari atas dengan cahaya cukup.",
                  "Photograph from above in good lighting."
                )}
              </li>
              <li>
                2.{" "}
                {tr(
                  "Pastikan seluruh piring terlihat.",
                  "Make sure the entire plate is visible."
                )}
              </li>
              <li>
                3.{" "}
                {tr(
                  "Tambahkan catatan jumlah atau cara masak.",
                  "Add notes about portions or cooking method."
                )}
              </li>
            </ol>
          </div>

          <div className="rounded-[1.75rem] border border-white bg-white p-6 shadow-lg shadow-slate-200/60">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              {tr("Bisa ditanyakan", "Topics you can ask about")}
            </p>
            <div className="mt-4 space-y-3 text-sm font-semibold text-slate-700">
              {[
                tr(
                  "Program latihan dan teknik",
                  "Training plans and technique"
                ),
                tr(
                  "Pemulihan, tidur, dan hari istirahat",
                  "Recovery, sleep, and rest days"
                ),
                tr(
                  "Protein serta kebutuhan makan",
                  "Protein and nutrition needs"
                ),
                tr(
                  "Evaluasi foto makanan",
                  "Meal photo review"
                ),
              ].map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => {
                    setMode("chat");
                    setMessage(item);
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-left transition hover:bg-green-50 hover:text-green-700"
                >
                  {item}
                  <span>→</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
