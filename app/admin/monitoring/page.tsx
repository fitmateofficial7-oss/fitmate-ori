"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import AdminNavigation from "@/components/admin-navigation";
import LiveIcon from "@/components/live-icon";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";

type MonitoringEvent = {
  id: number;
  source: string;
  event_type: string;
  severity: "info" | "warning" | "error";
  route: string | null;
  message: string | null;
  duration_ms: number | null;
  ai_model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number | null;
  created_at: string;
};

type MonitoringData = {
  success: true;
  generatedAt: string;
  range: {
    from: string;
    to: string;
    timezone: string;
  };
  summary: {
    eventsToday: number;
    errorsToday: number;
    aiRequests7d: number;
    estimatedAiCostUsd7d: number;
    inputTokens7d: number;
    outputTokens7d: number;
    activeUsers7d: number;
    workouts7d: number;
    completedWorkouts7d: number;
    consultationsToday: number;
    mealScansToday: number;
    activePremiumSubscriptions: number;
    cancelingPremiumSubscriptions: number;
    successfulPayments30d: number;
    failedPayments30d: number;
    revenueIdr30d: number;
    estimatedMrrIdr: number;
    averageDurationMs: number;
  };
  pricingConfigured: boolean;
  days: Array<{
    date: string;
    events: number;
    errors: number;
    aiRequests: number;
    estimatedCostUsd: number;
  }>;
  recentErrors: MonitoringEvent[];
  recentEvents: MonitoringEvent[];
  externalDashboards: {
    vercel: string;
    supabase: string;
    openai: string;
    sentry: string;
  };
};

function MetricCard({
  icon,
  label,
  value,
  note,
  tone = "green",
}: {
  icon: string;
  label: string;
  value: string;
  note: string;
  tone?: "green" | "blue" | "amber" | "rose";
}) {
  const tones = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}
      >
        <LiveIcon variant="pulse" className="text-xl">
          {icon}
        </LiveIcon>
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {note}
      </p>
    </article>
  );
}

export default function MonitoringPage() {
  const router = useRouter();
  const { language, tr } = useLanguage();
  const [data, setData] =
    useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const loadMonitoring = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/admin/monitoring",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );
      const result = (await response.json()) as
        | MonitoringData
        | {
            success: false;
            error?: string;
            migrationPending?: boolean;
          };

      if (!response.ok || !result.success) {
        throw new Error(
          language === "en"
            ? "Monitoring could not be loaded."
            : "error" in result && result.error
              ? result.error
              : "Monitoring belum dapat dimuat."
        );
      }

      setData(result);
      setLastUpdated(new Date());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : tr(
              "Monitoring belum dapat dimuat.",
              "Monitoring could not be loaded."
            )
      );
    } finally {
      setLoading(false);
    }
  }, [language, router, tr]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadMonitoring();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [loadMonitoring]);

  const chartMaximum = useMemo(
    () =>
      Math.max(
        1,
        ...(data?.days || []).map((day) => day.events)
      ),
    [data]
  );

  const number = new Intl.NumberFormat(
    tr("id-ID", "en-US")
  );
  const currency = new Intl.NumberFormat(
    tr("id-ID", "en-US"),
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }
  );
  const idrCurrency = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

  return (
    <main className="fitmate-app-page min-h-screen bg-slate-50 px-4 pb-16 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-green-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-xl text-white">
                  <span className="text-xs font-bold">FM</span>
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-green-600">
                    FitMate Admin
                  </p>
                  <h1 className="text-2xl font-black sm:text-3xl">
                    {tr(
                      "Pusat Monitoring",
                      "Monitoring Center"
                    )}
                  </h1>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                {tr(
                  "Ringkasan aplikasi, penggunaan AI, dan biaya.",
                  "App health, AI usage, and cost summary."
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <AdminNavigation />
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {tr("Buka aplikasi", "Open app")}
              </Link>
              <button
                type="button"
                onClick={() => void loadMonitoring()}
                disabled={loading}
                className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {loading
                  ? tr("Memuat…", "Loading…")
                  : tr("Perbarui data", "Refresh data")}
              </button>
            </div>
          </div>

          {lastUpdated && (
            <p className="mt-4 text-xs text-slate-400">
              {tr("Terakhir diperbarui", "Last updated")}:{" "}
              {lastUpdated.toLocaleTimeString(
                tr("id-ID", "en-US"),
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }
              )}{" "}
              WIB
            </p>
          )}
        </header>

        {error && (
          <section
            role="alert"
            className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800"
          >
            <p className="font-black">
              {tr(
                "Monitoring belum aktif",
                "Monitoring is not active yet"
              )}
            </p>
            <p className="mt-2 text-sm leading-6">{error}</p>
            <p className="mt-3 text-xs font-semibold">
              {tr(
                "Periksa migration monitoring dan email admin.",
                "Check the monitoring migration and admin email."
              )}
            </p>
          </section>
        )}

        {data && (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon="!"
                label={tr(
                  "Error hari ini",
                  "Errors today"
                )}
                value={number.format(
                  data.summary.errorsToday
                )}
                note={tr(
                  "Error frontend dan server yang tercatat.",
                  "Recorded frontend and server errors."
                )}
                tone={
                  data.summary.errorsToday > 0
                    ? "rose"
                    : "green"
                }
              />
              <MetricCard
                icon="Model"
                label={tr(
                  "Permintaan model · 7 hari",
                  "Model requests · 7 days"
                )}
                value={number.format(
                  data.summary.aiRequests7d
                )}
                note={`${number.format(
                  data.summary.inputTokens7d +
                    data.summary.outputTokens7d
                )} token`}
                tone="blue"
              />
              <MetricCard
                icon="$"
                label={tr(
                  "Estimasi biaya model",
                  "Estimated model cost"
                )}
                value={
                  data.pricingConfigured
                    ? currency.format(
                        data.summary
                          .estimatedAiCostUsd7d
                      )
                    : "—"
                }
                note={
                  data.pricingConfigured
                    ? tr(
                        "Total estimasi 7 hari.",
                        "Seven-day estimate."
                      )
                    : tr(
                        "Isi tarif token pada environment.",
                        "Configure token rates in the environment."
                      )
                }
                tone="amber"
              />
              <MetricCard
                icon={tr("Aktif", "Live")}
                label={tr(
                  "Pengguna aktif · 7 hari",
                  "Active users · 7 days"
                )}
                value={number.format(
                  data.summary.activeUsers7d
                )}
                note={`${number.format(
                  data.summary.completedWorkouts7d
                )}/${number.format(
                  data.summary.workouts7d
                )} ${tr(
                  "latihan selesai",
                  "workouts completed"
                )}`}
              />
            </section>

            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon="Model"
                label={tr("Premium aktif", "Active Premium")}
                value={number.format(data.summary.activePremiumSubscriptions)}
                note={tr(
                  `${number.format(data.summary.cancelingPremiumSubscriptions)} langganan akan berhenti di akhir periode`,
                  `${number.format(data.summary.cancelingPremiumSubscriptions)} subscriptions end after the current period`
                )}
                tone="amber"
              />
              <MetricCard
                icon="↻"
                label={tr("Estimasi MRR", "Estimated MRR")}
                value={idrCurrency.format(data.summary.estimatedMrrIdr)}
                note={tr("Berdasarkan akses Premium yang masih aktif.", "Based on currently active Premium access.")}
                tone="green"
              />
              <MetricCard
                icon="Rp"
                label={tr("Pendapatan · 30 hari", "Revenue · 30 days")}
                value={idrCurrency.format(data.summary.revenueIdr30d)}
                note={`${number.format(data.summary.successfulPayments30d)} ${tr("pembayaran berhasil", "successful payments")}`}
                tone="blue"
              />
              <MetricCard
                icon="×"
                label={tr("Pembayaran bermasalah", "Payment issues")}
                value={number.format(data.summary.failedPayments30d)}
                note={tr("Gagal atau sedang dicoba ulang dalam 30 hari.", "Failed or retrying during the last 30 days.")}
                tone={data.summary.failedPayments30d > 0 ? "rose" : "green"}
              />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-green-600">
                      {tr(
                        "Aktivitas 7 hari",
                        "Seven-day activity"
                      )}
                    </p>
                    <h2 className="mt-2 text-xl font-black">
                      {tr(
                        "Event dan error",
                        "Events and errors"
                      )}
                    </h2>
                  </div>
                  <div className="flex gap-3 text-[11px] font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" />{tr("Event", "Events")}</span>
                    <span className="inline-flex items-center gap-1.5 text-rose-600"><span className="h-2 w-2 rounded-full bg-rose-500" />{tr("Error", "Errors")}</span>
                  </div>
                </div>

                <div className="mt-7 grid h-56 grid-cols-7 items-end gap-2 sm:gap-4">
                  {data.days.map((day) => {
                    const height = Math.max(
                      4,
                      (day.events / chartMaximum) * 100
                    );
                    const errorHeight =
                      day.events > 0
                        ? Math.max(
                            0,
                            (day.errors / day.events) * 100
                          )
                        : 0;

                    return (
                      <div
                        key={day.date}
                        className="flex h-full flex-col justify-end"
                      >
                        <div className="relative flex flex-1 items-end justify-center">
                          <div
                            className="relative w-full max-w-12 overflow-hidden rounded-t-xl bg-green-200 transition-all"
                            style={{ height: `${height}%` }}
                            title={`${day.events} events · ${day.errors} errors`}
                          >
                            <div
                              className="absolute inset-x-0 bottom-0 bg-rose-500"
                              style={{
                                height: `${errorHeight}%`,
                              }}
                            />
                          </div>
                        </div>
                        <p className="mt-3 text-center text-[10px] font-bold text-slate-400 sm:text-xs">
                          {new Date(
                            `${day.date}T12:00:00+07:00`
                          ).toLocaleDateString(
                            tr("id-ID", "en-US"),
                            {
                              weekday: "short",
                            }
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-green-600">
                  {tr(
                    "Penggunaan hari ini",
                    "Usage today"
                  )}
                </p>
                <h2 className="mt-2 text-xl font-black">
                  Coach
                </h2>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-sm font-black text-blue-900">
                      {tr(
                        "Konsultasi",
                        "Consultations"
                      )}
                    </p>
                    <p className="mt-2 text-3xl font-black text-blue-700">
                      {data.summary.consultationsToday}
                    </p>
                    <p className="mt-1 text-xs text-blue-600">
                      {tr(
                        "Akumulasi seluruh akun",
                        "Across all accounts"
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-sm font-black text-amber-900">
                      {tr(
                        "Scan makanan",
                        "Meal scans"
                      )}
                    </p>
                    <p className="mt-2 text-3xl font-black text-amber-700">
                      {data.summary.mealScansToday}
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      {tr(
                        "Akumulasi seluruh akun",
                        "Across all accounts"
                      )}
                    </p>
                  </div>
                </div>
              </article>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-2">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-rose-600">
                      {tr("Perlu diperiksa", "Needs review")}
                    </p>
                    <h2 className="mt-2 text-xl font-black">
                      {tr(
                        "Error terbaru",
                        "Recent errors"
                      )}
                    </h2>
                  </div>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                    {data.recentErrors.length}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {data.recentErrors.length === 0 ? (
                    <div className="rounded-2xl bg-green-50 p-5 text-sm font-semibold text-green-800">
                      {tr(
                        "Belum ada error dalam tujuh hari terakhir.",
                        "No errors in the last seven days."
                      )}
                    </div>
                  ) : (
                    data.recentErrors.slice(0, 8).map(
                      (event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-black text-rose-900">
                              {event.event_type}
                            </p>
                            <time className="text-[11px] font-semibold text-rose-500">
                              {new Date(
                                event.created_at
                              ).toLocaleString(
                                tr("id-ID", "en-US"),
                                {
                                  timeZone: "Asia/Jakarta",
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </time>
                          </div>
                          <p className="mt-2 break-words text-xs leading-5 text-rose-700">
                            {event.message ||
                              tr(
                                "Tidak ada detail pesan.",
                                "No message detail."
                              )}
                          </p>
                          {event.route && (
                            <p className="mt-2 text-[11px] font-bold text-rose-500">
                              {event.route}
                            </p>
                          )}
                        </div>
                      )
                    )
                  )}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-green-600">
                  {tr(
                    "Dashboard layanan",
                    "Service dashboards"
                  )}
                </p>
                <h2 className="mt-2 text-xl font-black">
                  {tr(
                    "Pemeriksaan lebih detail",
                    "Detailed inspection"
                  )}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {tr(
                    "Gunakan layanan berikut saat membutuhkan log lengkap atau rincian tagihan.",
                    "Use these services when you need full logs or billing details."
                  )}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      key: "vercel",
                      label: "Vercel Logs",
                      icon: "Log",
                    },
                    {
                      key: "supabase",
                      label: "Supabase Logs",
                      icon: "DB",
                    },
                    {
                      key: "openai",
                      label: "OpenAI Usage",
                      icon: "Model",
                    },
                    {
                      key: "sentry",
                      label: "Sentry Issues",
                      icon: "!",
                    },
                  ].map((item) => (
                    <a
                      key={item.key}
                      href={
                        data.externalDashboards[
                          item.key as keyof typeof data.externalDashboards
                        ]
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-2xl border border-slate-200 p-4 transition hover:border-green-300 hover:bg-green-50"
                    >
                      <LiveIcon
                        variant="pop"
                        className="text-lg"
                      >
                        {item.icon}
                      </LiveIcon>
                      <p className="mt-3 text-sm font-black text-slate-800 group-hover:text-green-800">
                        {item.label}
                      </p>
                    </a>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
