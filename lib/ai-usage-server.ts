import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getBillingStatus,
  isMissingSupabaseObject,
} from "@/lib/billing-server";

export type AiFeature = "chat" | "nutrition";
export type AiPlan = "free" | "premium";

export type AiFeatureUsage = {
  used: number;
  limit: number;
  remaining: number;
  period: "lifetime" | "day";
  resets_at: string | null;
};

export type AiUsageStatus = {
  plan: AiPlan;
  isPremium: boolean;
  chat: AiFeatureUsage;
  nutrition: AiFeatureUsage;
  resets_at: string | null;
};

type ReserveRow = {
  allowed: boolean;
  reservation_id: string | null;
  plan: AiPlan;
  used: number;
  usage_limit: number;
  remaining: number;
  resets_at: string | null;
  reason: string | null;
};

type FinalizeRow = {
  plan: AiPlan;
  feature: AiFeature;
  used: number;
  usage_limit: number;
  remaining: number;
  resets_at: string | null;
};

function jakartaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function nextJakartaResetIso() {
  const date = jakartaDate();
  return new Date(`${date}T17:00:00.000Z`).toISOString();
}

function normalizeCount(value: unknown, maximum: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(maximum, Math.trunc(number)));
}

export async function getAiUsageStatus(
  admin: SupabaseClient,
  userId: string
): Promise<AiUsageStatus> {
  const billing = await getBillingStatus(admin, userId);

  if (billing.isPremium) {
    const today = jakartaDate();
    const { data, error } = await admin
      .from("ai_feature_usage_daily")
      .select("premium_chat_successes, premium_nutrition_successes")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (error && !isMissingSupabaseObject(error)) {
      throw new Error(`Unable to load Premium AI usage: ${error.message}`);
    }

    const row = (error ? {} : data || {}) as {
      premium_chat_successes?: number;
      premium_nutrition_successes?: number;
    };
    const reset = nextJakartaResetIso();
    const chatUsed = normalizeCount(row.premium_chat_successes, 10);
    const nutritionUsed = normalizeCount(row.premium_nutrition_successes, 10);

    return {
      plan: "premium",
      isPremium: true,
      chat: {
        used: chatUsed,
        limit: 10,
        remaining: Math.max(0, 10 - chatUsed),
        period: "day",
        resets_at: reset,
      },
      nutrition: {
        used: nutritionUsed,
        limit: 10,
        remaining: Math.max(0, 10 - nutritionUsed),
        period: "day",
        resets_at: reset,
      },
      resets_at: reset,
    };
  }

  const { data, error } = await admin
    .from("ai_feature_usage_lifetime")
    .select("free_chat_successes, free_nutrition_successes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && !isMissingSupabaseObject(error)) {
    throw new Error(`Unable to load Free AI usage: ${error.message}`);
  }

  const row = (error ? {} : data || {}) as {
    free_chat_successes?: number;
    free_nutrition_successes?: number;
  };
  const chatUsed = normalizeCount(row.free_chat_successes, 1);
  const nutritionUsed = normalizeCount(row.free_nutrition_successes, 1);

  return {
    plan: "free",
    isPremium: false,
    chat: {
      used: chatUsed,
      limit: 1,
      remaining: Math.max(0, 1 - chatUsed),
      period: "lifetime",
      resets_at: null,
    },
    nutrition: {
      used: nutritionUsed,
      limit: 1,
      remaining: Math.max(0, 1 - nutritionUsed),
      period: "lifetime",
      resets_at: null,
    },
    resets_at: null,
  };
}

export async function reserveAiUsage(
  admin: SupabaseClient,
  userId: string,
  feature: AiFeature
): Promise<ReserveRow> {
  const { data, error } = await admin.rpc("reserve_ai_feature_usage", {
    p_user_id: userId,
    p_feature: feature,
  });

  if (error) {
    throw new Error(`Unable to reserve AI usage: ${error.message}`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as ReserveRow | null;
  if (!row) {
    throw new Error("AI usage reservation returned no result.");
  }

  return row;
}

export async function finalizeAiUsage(
  admin: SupabaseClient,
  reservationId: string
): Promise<FinalizeRow> {
  const { data, error } = await admin.rpc("finalize_ai_feature_usage", {
    p_reservation_id: reservationId,
  });

  if (error) {
    throw new Error(`Unable to finalize AI usage: ${error.message}`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as FinalizeRow | null;
  if (!row) {
    throw new Error("AI usage finalization returned no result.");
  }

  return row;
}

export async function releaseAiUsage(
  admin: SupabaseClient,
  reservationId: string | null
) {
  if (!reservationId) return;

  const { error } = await admin.rpc("release_ai_feature_usage", {
    p_reservation_id: reservationId,
  });

  if (error) {
    console.warn("Unable to release AI usage reservation:", error.message);
  }
}
