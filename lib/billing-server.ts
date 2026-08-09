import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FREE_LIFETIME_GENERATION_LIMIT,
  PREMIUM_WEEKLY_GENERATION_LIMIT,
  getJakartaWeekWindow,
  getPremiumPaymentMode,
  type BillingStatusResponse,
  type SubscriptionStatus,
} from "@/lib/subscription";

type SubscriptionRow = {
  id: string;
  status: Exclude<SubscriptionStatus, "free">;
  amount: number;
  currency: "IDR";
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_at: string | null;
  cancel_at_period_end: boolean;
  checkout_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type GenerationUsageRow = {
  free_successful_generations: number;
  total_successful_generations: number;
  premium_week_start: string | null;
  premium_week_successful_generations: number | null;
};

type BillingTransactionRow = {
  id: string;
  status: "pending" | "succeeded" | "retrying" | "failed" | "canceled" | "refunded";
  amount: number | null;
  currency: "IDR";
  paid_at: string | null;
  created_at: string;
  failure_code: string | null;
};

type SupabaseSchemaError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function isMissingSupabaseObject(error: SupabaseSchemaError | null | undefined) {
  if (!error) return false;

  const code = String(error.code || "").toUpperCase();
  const message = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    ["PGRST202", "PGRST204", "PGRST205", "42P01", "42883"].includes(code) ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("could not find the function") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export function hasPremiumAccess(subscription: SubscriptionRow | null, now = new Date()) {
  if (!subscription) return false;

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const periodIsValid = Boolean(
    periodEnd &&
      Number.isFinite(periodEnd.getTime()) &&
      periodEnd.getTime() > now.getTime()
  );

  if (["active", "past_due"].includes(subscription.status)) return periodIsValid;
  if (subscription.status === "canceled") return Boolean(periodEnd && periodIsValid);
  return false;
}

export async function getBillingStatus(
  admin: SupabaseClient,
  userId: string
): Promise<BillingStatusResponse> {
  const [subscriptionResult, usageResult, transactionsResult] = await Promise.all([
    admin
      .from("user_subscriptions")
      .select(
        "id, status, amount, currency, current_period_start, current_period_end, next_billing_at, cancel_at_period_end, checkout_url, metadata, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("plan_generation_usage")
      .select(
        "free_successful_generations, total_successful_generations, premium_week_start, premium_week_successful_generations"
      )
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("billing_transactions")
      .select("id, status, amount, currency, paid_at, created_at, failure_code")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (subscriptionResult.error && !isMissingSupabaseObject(subscriptionResult.error)) {
    throw new Error(`Unable to load subscription: ${subscriptionResult.error.message}`);
  }
  if (usageResult.error && !isMissingSupabaseObject(usageResult.error)) {
    throw new Error(`Unable to load generation usage: ${usageResult.error.message}`);
  }
  if (transactionsResult.error && !isMissingSupabaseObject(transactionsResult.error)) {
    throw new Error(`Unable to load billing transactions: ${transactionsResult.error.message}`);
  }

  // A fresh/local Supabase project may not have the Premium migrations yet.
  // Keep the UI usable as a Free account instead of returning HTTP 500.
  // Checkout and persistent quota enforcement still require FITMATE_PREMIUM_SETUP.sql.
  const subscriptions = (
    subscriptionResult.error ? [] : subscriptionResult.data || []
  ) as SubscriptionRow[];
  const subscription =
    subscriptions.find((item) => hasPremiumAccess(item)) ||
    subscriptions.find((item) =>
      ["pending", "requires_action", "past_due"].includes(item.status)
    ) ||
    subscriptions[0] ||
    null;
  const usage = (
    usageResult.error ? null : usageResult.data || null
  ) as GenerationUsageRow | null;
  const freeUsed = Math.max(
    0,
    Math.min(FREE_LIFETIME_GENERATION_LIMIT, Number(usage?.free_successful_generations || 0))
  );
  const isPremium = hasPremiumAccess(subscription);
  const premiumWeek = getJakartaWeekWindow();
  const premiumWeeklyUsed =
    usage?.premium_week_start === premiumWeek.key
      ? Math.max(
          0,
          Math.min(
            PREMIUM_WEEKLY_GENERATION_LIMIT,
            Number(usage.premium_week_successful_generations || 0)
          )
        )
      : 0;

  return {
    success: true,
    plan: isPremium ? "premium" : "free",
    isPremium,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          amount: Number(subscription.amount),
          currency: subscription.currency,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          nextBillingAt: subscription.next_billing_at,
          cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
          checkoutUrl: subscription.checkout_url,
          paymentMode: getPremiumPaymentMode(subscription.metadata),
          accessSource:
            subscription.metadata?.source === "admin_manual" ||
            subscription.metadata?.granted_manually === true ||
            subscription.metadata?.subscription_source === "manual"
              ? "manual"
              : "xendit",
        }
      : null,
    generation: {
      freeUsed,
      freeLimit: FREE_LIFETIME_GENERATION_LIMIT,
      freeRemaining: Math.max(0, FREE_LIFETIME_GENERATION_LIMIT - freeUsed),
      totalGenerated: Math.max(0, Number(usage?.total_successful_generations || 0)),
      premiumWeeklyUsed,
      premiumWeeklyLimit: PREMIUM_WEEKLY_GENERATION_LIMIT,
      premiumWeeklyRemaining: Math.max(
        0,
        PREMIUM_WEEKLY_GENERATION_LIMIT - premiumWeeklyUsed
      ),
      premiumWeeklyResetsAt: premiumWeek.end.toISOString(),
      canGenerate: isPremium
        ? premiumWeeklyUsed < PREMIUM_WEEKLY_GENERATION_LIMIT
        : freeUsed < FREE_LIFETIME_GENERATION_LIMIT,
    },
    transactions: ((
      transactionsResult.error ? [] : transactionsResult.data || []
    ) as BillingTransactionRow[]).map(
      (transaction) => ({
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount === null ? null : Number(transaction.amount),
        currency: transaction.currency,
        paidAt: transaction.paid_at,
        createdAt: transaction.created_at,
        failureCode: transaction.failure_code,
      })
    ),
  };
}

export function addOneMonth(date: Date) {
  const next = new Date(date);
  const originalDay = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const daysInNextMonth = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
  ).getUTCDate();
  next.setUTCDate(Math.min(originalDay, daysInNextMonth));
  return next;
}
