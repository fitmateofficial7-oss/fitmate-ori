"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CompanySignature from "@/components/company-signature";
import FitMateBrand from "@/components/fitmate-brand";
import FitMateIcon from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";
import {
  PREMIUM_MONTHLY_PRICE_IDR,
  type BillingStatusResponse,
  type PremiumPaymentMode,
  formatIdr,
} from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

function formatDate(value: string | null, language: "id" | "en") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    dateStyle: "long",
  }).format(date);
}

export default function PremiumPage() {
  const router = useRouter();
  const { language, tr } = useLanguage();
  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PremiumPaymentMode>("qris");
  const [acceptedSubscriptionTerms, setAcceptedSubscriptionTerms] = useState(false);
  const [acceptedRecurringTerms, setAcceptedRecurringTerms] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const checkoutResult = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("checkout");
  }, []);

  const getToken = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error(tr("Sesi berakhir. Silakan login kembali.", "Session expired. Please log in again."));
    }

    return session.access_token;
  }, [tr]);

  const loadBilling = useCallback(async () => {
    const token = await getToken();
    const response = await fetch("/api/billing/status", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = (await response.json()) as BillingStatusResponse & { error?: string };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || tr("Gagal memuat status langganan.", "Unable to load subscription status."));
    }

    setBilling(payload);
    window.dispatchEvent(new Event("fitmate-billing-updated"));
    return payload;
  }, [getToken, tr]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login?redirect=%2Fpremium");
          return;
        }

        const status = await loadBilling();
        if (!active) return;

        if (checkoutResult === "canceled") {
          setNotice(tr("Pembayaran dibatalkan. Tidak ada biaya yang diproses.", "Checkout was canceled. No charge was processed."));
        } else if (checkoutResult === "success" && !status.isPremium) {
          setCheckingPayment(true);
          setNotice(
            tr(
              "Menunggu konfirmasi pembayaran dari Xendit.",
              "Checkout was completed. FitMate is waiting for Xendit's official confirmation."
            )
          );
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : tr("Gagal memuat Premium.", "Unable to load Premium."));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void initialize();
    return () => {
      active = false;
    };
  }, [checkoutResult, loadBilling, router, tr]);

  useEffect(() => {
    if (!checkingPayment) return;

    let stopped = false;
    let attempts = 0;
    const maximumAttempts = 20;

    const check = async () => {
      attempts += 1;
      try {
        const status = await loadBilling();
        if (stopped) return;

        if (status.isPremium) {
          setCheckingPayment(false);
          setNotice(tr("Premium aktif. Semua fitur langganan sudah terbuka.", "Premium is active. Subscription features are now unlocked."));
          window.history.replaceState(null, "", "/premium");
          return;
        }
      } catch {
        // Keep the last visible state and retry. Manual refresh remains available.
      }

      if (!stopped && attempts < maximumAttempts) {
        window.setTimeout(check, 3000);
      } else if (!stopped) {
        setCheckingPayment(false);
        setNotice(
          tr(
            "Pembayaran belum terkonfirmasi. Periksa status lagi.",
            "Payment is not confirmed yet. Check the status again."
          )
        );
      }
    };

    const timer = window.setTimeout(check, 1500);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [checkingPayment, loadBilling, tr]);

  useEffect(() => {
    const storedSubscription = billing?.subscription;
    if (
      !billing?.isPremium &&
      storedSubscription &&
      ["pending", "requires_action"].includes(storedSubscription.status)
    ) {
      setPaymentMode(storedSubscription.paymentMode);
    }
  }, [billing]);

  async function startCheckout() {
    setCheckoutLoading(true);
    setError("");
    setNotice("");

    try {
      const token = await getToken();
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMode,
          acceptSubscriptionTerms: acceptedSubscriptionTerms,
          acceptRecurringTerms:
            paymentMode === "recurring" ? acceptedRecurringTerms : false,
          language,
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        alreadyPremium?: boolean;
        checkoutUrl?: string;
        redirectUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || tr("Gagal membuka pembayaran.", "Unable to open checkout."));
      }

      if (payload.alreadyPremium) {
        await loadBilling();
        setCheckoutLoading(false);
        return;
      }

      if (!payload.checkoutUrl) {
        throw new Error(tr("Tautan pembayaran tidak tersedia.", "Checkout link is unavailable."));
      }

      window.location.assign(payload.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : tr("Gagal membuka pembayaran.", "Unable to open checkout."));
      setCheckoutLoading(false);
    }
  }

  async function refreshStatus() {
    setError("");
    setNotice("");
    setCheckingPayment(true);
    try {
      const status = await loadBilling();
      if (status.isPremium) {
        setCheckingPayment(false);
        setNotice(tr("Premium sudah aktif.", "Premium is active."));
      }
    } catch (refreshError) {
      setCheckingPayment(false);
      setError(refreshError instanceof Error ? refreshError.message : tr("Gagal memeriksa status.", "Unable to check status."));
    }
  }

  async function cancelSubscription() {
    const isPendingQris =
      subscription?.paymentMode === "qris" &&
      ["pending", "requires_action"].includes(subscription.status);
    const confirmed = window.confirm(
      isPendingQris
        ? tr(
            "Batalkan pembayaran QRIS yang belum selesai?",
            "Cancel the unfinished QRIS checkout?"
          )
        : tr(
            "Hentikan perpanjangan? Akses tetap aktif sampai akhir periode.",
            "Stop renewal? Access stays active until the period ends."
          )
    );
    if (!confirmed) return;

    setCanceling(true);
    setError("");
    setNotice("");

    try {
      const token = await getToken();
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as {
        success?: boolean;
        accessUntil?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || tr("Gagal membatalkan langganan.", "Unable to cancel subscription."));
      }

      await loadBilling();
      setNotice(
        payload.accessUntil
          ? tr(
              `Perpanjangan dihentikan. Premium tetap aktif sampai ${formatDate(payload.accessUntil, language)}.`,
              `Renewal stopped. Premium remains active until ${formatDate(payload.accessUntil, language)}.`
            )
          : tr("Langganan yang belum aktif telah dibatalkan.", "The pending subscription was canceled.")
      );
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : tr("Gagal membatalkan langganan.", "Unable to cancel subscription."));
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <main className="fitmate-app-page flex min-h-screen items-center justify-center px-6 text-slate-950 dark:text-white">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm dark:border-white/10 dark:bg-slate-900">
          <p className="font-black">{tr("Memuat Premium…", "Loading Premium…")}</p>
        </div>
      </main>
    );
  }

  const subscription = billing?.subscription;
  const displayedPaymentMode =
    billing?.isPremium && subscription
      ? subscription.paymentMode
      : paymentMode;
  const hasCancelableSubscription = Boolean(
    subscription &&
      (["pending", "requires_action"].includes(subscription.status) ||
        (subscription.accessSource !== "manual" &&
          subscription.paymentMode === "recurring" &&
          ["active", "past_due"].includes(subscription.status)))
  );

  return (
    <main className="fitmate-app-page fitmate-premium-page min-h-screen pb-24 text-slate-950 dark:text-white">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <FitMateBrand href="/dashboard" size="sm" showCompany />
          <div className="flex items-center gap-2">
            <Link
              href="/plan"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            >
              {tr("Rencana", "Plan")}
            </Link>
            <Link
              href="/settings"
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950"
            >
              {tr("Pengaturan", "Settings")}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-2xl sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-200">
                <FitMateIcon name="shield" className="h-4 w-4" />
                FitMate Premium
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
                {tr(
                  "Akses FitMate Premium",
                  "Get full FitMate Premium access"
                )}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-300 sm:text-lg">
                {tr(
                  "10 generate/minggu, 10 konsultasi + 10 scan/hari, Progres, Nutrisi, dan semua panduan gerakan.",
                  "10 plans/week, 10 consultations + 10 scans/day, Progress, Nutrition, and all exercise guides."
                )}
              </p>

              <div className="mt-6 grid gap-3 text-sm font-bold text-slate-200 sm:grid-cols-2">
                {[
                  tr("10 generate program per minggu", "10 workout-plan generations weekly"),
                  tr("10 konsultasi Coach per hari", "10 Coach consultations daily"),
                  tr("10 scan makanan per hari", "10 meal scans daily"),
                  tr("Semua panduan latihan 2D", "All 2D exercise guides"),
                  tr("Progres lengkap", "Complete progress tracking"),
                  tr("Jurnal dan target nutrisi", "Nutrition journal and targets"),
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <FitMateIcon name="check" className="h-4 w-4 shrink-0 text-amber-300" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[1.75rem] border border-white/15 bg-white p-6 text-slate-950 shadow-2xl dark:bg-slate-900 dark:text-white sm:p-8"
              data-testid="premium-pricing-card"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">
                  {tr("Paket bulanan", "Monthly plan")}
                </p>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
                  Premium
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-2">
                <span className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {formatIdr(PREMIUM_MONTHLY_PRICE_IDR)}
                </span>
                <span className="pb-1 font-bold text-slate-500 dark:text-slate-400">
                  /
                  {displayedPaymentMode === "qris"
                    ? tr("30 hari", "30 days")
                    : tr("bulan", "month")}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {displayedPaymentMode === "qris"
                  ? tr(
                      "Bayar sekali lewat QRIS. Akses aktif 30 hari dan diperpanjang manual.",
                      "Pay once with QRIS. Access lasts 30 days and renews manually."
                    )
                  : tr(
                      "Diperpanjang otomatis dan dapat dihentikan kapan saja.",
                      "Renews automatically and can be stopped at any time."
                    )}
              </p>

              {billing?.isPremium ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
                  <p className="flex items-center gap-2 font-semibold"><FitMateIcon name="check" className="h-4 w-4" /> {tr("Premium aktif", "Premium active")}</p>
                  <p className="mt-1 text-sm font-semibold">
                    {subscription?.accessSource === "manual"
                      ? tr(
                          `Akses diberikan oleh admin. Aktif sampai ${formatDate(subscription.currentPeriodEnd, language)}.`,
                          `Access was granted by an administrator. Active until ${formatDate(subscription.currentPeriodEnd, language)}.`
                        )
                      : subscription?.paymentMode === "qris"
                      ? tr(
                          `Pembayaran QRIS sekali bayar. Aktif sampai ${formatDate(subscription.currentPeriodEnd, language)}.`,
                          `One-time QRIS payment. Active until ${formatDate(subscription.currentPeriodEnd, language)}.`
                        )
                      : subscription?.cancelAtPeriodEnd
                      ? tr(
                          `Aktif sampai ${formatDate(subscription.currentPeriodEnd, language)}`,
                          `Active until ${formatDate(subscription.currentPeriodEnd, language)}`
                        )
                      : tr(
                          `Perpanjangan berikutnya ${formatDate(
                            subscription?.nextBillingAt ||
                              subscription?.currentPeriodEnd ||
                              null,
                            language
                          )}`,
                          `Next renewal ${formatDate(
                            subscription?.nextBillingAt ||
                              subscription?.currentPeriodEnd ||
                              null,
                            language
                          )}`
                        )}
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <fieldset>
                    <legend className="mb-3 text-sm font-black text-slate-800 dark:text-slate-100">
                      {tr("Pilih cara pembayaran", "Choose payment type")}
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label
                        className={`cursor-pointer rounded-2xl border p-4 text-left transition ${
                          paymentMode === "qris"
                            ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/15 dark:bg-emerald-400/10"
                            : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2 font-black">
                          <input
                            type="radio"
                            name="premium-payment-mode"
                            value="qris"
                            checked={paymentMode === "qris"}
                            onChange={() => setPaymentMode("qris")}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          QRIS
                        </span>
                        <span className="mt-2 block text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                          {tr(
                            "Sekali bayar • aktif 30 hari • perpanjangan manual",
                            "One-time payment • active 30 days • manual renewal"
                          )}
                        </span>
                      </label>

                      <label
                        className={`cursor-pointer rounded-2xl border p-4 text-left transition ${
                          paymentMode === "recurring"
                            ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/15 dark:bg-amber-400/10"
                            : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2 font-black">
                          <input
                            type="radio"
                            name="premium-payment-mode"
                            value="recurring"
                            checked={paymentMode === "recurring"}
                            onChange={() => setPaymentMode("recurring")}
                            className="h-4 w-4 accent-amber-500"
                          />
                          {tr("Otomatis", "Automatic")}
                        </span>
                        <span className="mt-2 block text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                          {tr(
                            "Kartu/BRI Direct Debit • ditagih tiap bulan",
                            "Cards/BRI Direct Debit • billed monthly"
                          )}
                        </span>
                      </label>
                    </div>
                  </fieldset>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={acceptedSubscriptionTerms}
                      onChange={(event) =>
                        setAcceptedSubscriptionTerms(event.target.checked)
                      }
                      className="mt-1 h-4 w-4 accent-emerald-600"
                    />
                    <span>
                      {tr("Saya telah membaca dan menyetujui", "I have read and agree to the")} {" "}
                      <Link
                        href="/subscription-terms"
                        target="_blank"
                        onClick={(event) => event.stopPropagation()}
                        className="font-black text-emerald-700 underline dark:text-emerald-300"
                      >
                        {tr("Ketentuan Langganan", "Subscription Terms")}
                      </Link>{" "}
                      {tr("serta", "and")} {" "}
                      <Link
                        href="/refund"
                        target="_blank"
                        onClick={(event) => event.stopPropagation()}
                        className="font-black text-emerald-700 underline dark:text-emerald-300"
                      >
                        {tr("Kebijakan Pembatalan & Refund", "Cancellation & Refund Policy")}
                      </Link>
                      .
                    </span>
                  </label>

                  {paymentMode === "recurring" && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={acceptedRecurringTerms}
                        onChange={(event) =>
                          setAcceptedRecurringTerms(event.target.checked)
                        }
                        className="mt-1 h-4 w-4 accent-amber-500"
                      />
                      <span>
                        {tr(
                          `Saya secara khusus mengizinkan tagihan otomatis ${formatIdr(PREMIUM_MONTHLY_PRICE_IDR)} setiap bulan melalui metode pembayaran yang dipilih sampai saya menghentikan perpanjangan.`,
                          `I specifically authorize an automatic ${formatIdr(PREMIUM_MONTHLY_PRICE_IDR)} monthly charge through my selected payment method until I stop renewal.`
                        )}
                      </span>
                    </label>
                  )}
                  <button
                    type="button"
                    data-testid="start-premium-checkout"
                    onClick={startCheckout}
                    disabled={
                      checkoutLoading ||
                      checkingPayment ||
                      !acceptedSubscriptionTerms ||
                      (paymentMode === "recurring" &&
                        !acceptedRecurringTerms)
                    }
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-4 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkoutLoading
                      ? tr("Membuka pembayaran…", "Opening checkout…")
                      : checkingPayment
                        ? tr("Memeriksa pembayaran…", "Checking payment…")
                        : paymentMode === "qris"
                          ? tr("Bayar dengan QRIS", "Pay with QRIS")
                          : tr("Mulai langganan otomatis", "Start automatic subscription")}
                  </button>
                </div>
              )}

              {!billing?.isPremium &&
                subscription?.checkoutUrl &&
                ["pending", "requires_action"].includes(
                  subscription.status
                ) && (
                  <button
                    type="button"
                    onClick={startCheckout}
                    disabled={
                      checkoutLoading ||
                      !acceptedSubscriptionTerms ||
                      (subscription.paymentMode === "recurring" &&
                        !acceptedRecurringTerms)
                    }
                    className="mt-3 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-center font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white"
                  >
                    {subscription.paymentMode === "qris"
                      ? tr("Lanjutkan pembayaran QRIS", "Continue QRIS payment")
                      : tr("Lanjutkan langganan otomatis", "Continue automatic subscription")}
                  </button>
                )}
            </div>
          </div>
        </section>

        {(error || notice) && (
          <section className="mt-5 space-y-3" aria-live="polite">
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 font-semibold text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100">
                {notice}
              </div>
            )}
          </section>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              FitMate Free
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              {tr("Untuk mencoba fitur utama", "Try the core experience")}
            </h2>
            <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li>{tr("2 generate seumur hidup", "2 lifetime generations")}</li>
              <li>{tr("1 konsultasi Coach", "1 Coach consultation")}</li>
              <li>{tr("1 scan makanan", "1 meal scan")}</li>
              <li>{tr("10 panduan gerakan 2D", "10 2D exercise guides")}</li>
              <li className="text-slate-400">{tr("Progres dan Nutrisi terkunci", "Progress and Nutrition locked")}</li>
            </ul>
            <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 dark:bg-white/5 dark:text-slate-200">
              {tr(
                `Generate terpakai: ${billing?.generation.freeUsed ?? 0}/${billing?.generation.freeLimit ?? 2}`,
                `Generations used: ${billing?.generation.freeUsed ?? 0}/${billing?.generation.freeLimit ?? 2}`
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-400/10">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
              FitMate Premium
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              {tr("Akses fitur Premium", "Premium feature access")}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700 dark:text-amber-50">
              {tr(
                "Tidak ada kartu blur atau halaman terkunci selama langganan aktif.",
                "No blurred cards or locked pages while your subscription is active."
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-green-600 dark:text-green-300">
              {tr("Status akun", "Account status")}
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              {billing?.isPremium ? "FitMate Premium" : "FitMate Free"}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {subscription
                ? `${tr("Status", "Status")}: ${subscription.status}`
                : tr(
                    "Belum ada langganan pada akun ini.",
                    "No subscription exists for this account."
                  )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refreshStatus}
                disabled={checkingPayment}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {checkingPayment
                  ? tr("Memeriksa…", "Checking…")
                  : tr("Periksa status", "Check status")}
              </button>
              {hasCancelableSubscription && (
                <button
                  type="button"
                  onClick={cancelSubscription}
                  disabled={canceling}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100"
                >
                  {canceling
                    ? tr("Membatalkan…", "Canceling…")
                    : subscription?.paymentMode === "qris"
                      ? tr("Batalkan pembayaran", "Cancel checkout")
                      : tr("Hentikan perpanjangan", "Stop renewal")}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {tr("Pembayaran", "Billing")}
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                {tr("Riwayat transaksi", "Transaction history")}
              </h2>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {tr(
                "Pembayaran diproses aman melalui Xendit.",
                "Payments are securely processed through Xendit."
              )}
            </p>
          </div>

          {billing?.transactions.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="pb-3">{tr("Tanggal", "Date")}</th>
                    <th className="pb-3">{tr("Status", "Status")}</th>
                    <th className="pb-3">{tr("Jumlah", "Amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {billing.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="py-4 font-semibold text-slate-600 dark:text-slate-300">
                        {formatDate(
                          transaction.paidAt || transaction.createdAt,
                          language
                        )}
                      </td>
                      <td className="py-4 font-black capitalize text-slate-950 dark:text-white">
                        {transaction.status}
                      </td>
                      <td className="py-4 font-semibold text-slate-600 dark:text-slate-300">
                        {transaction.amount === null
                          ? "—"
                          : formatIdr(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {tr(
                "Belum ada transaksi pembayaran.",
                "No payment transactions yet."
              )}
            </p>
          )}
        </section>

        <div className="mt-6 flex flex-wrap gap-3 text-sm font-black">
          <Link href="/subscription-terms" className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            {tr("Ketentuan Langganan", "Subscription Terms")}
          </Link>
          <Link href="/terms" className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            Terms
          </Link>
          <Link href="/privacy" className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            Privacy
          </Link>
          <Link href="/refund" className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            Refund
          </Link>
        </div>

        <CompanySignature className="mt-10" />
      </div>
    </main>
  );
}
