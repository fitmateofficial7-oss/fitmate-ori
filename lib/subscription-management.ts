import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getPremiumPaymentMode } from "@/lib/subscription";
import { cancelXenditSession, deactivateXenditSubscriptionPlan } from "@/lib/xendit";

type SubscriptionForCancellation = {
  id: string;
  status: string;
  provider_plan_id: string | null;
  provider_session_id: string | null;
  current_period_end: string | null;
  metadata: Record<string, unknown> | null;
};

export async function cancelSubscriptionForUser(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("user_subscriptions")
    .select("id, status, provider_plan_id, provider_session_id, current_period_end, metadata")
    .eq("user_id", userId)
    .in("status", ["pending", "requires_action", "active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load subscription: ${error.message}`);
  }

  const subscription = (data || null) as SubscriptionForCancellation | null;
  if (!subscription) {
    return { canceled: false, reason: "NO_ACTIVE_SUBSCRIPTION" } as const;
  }

  const wasActive = subscription.status === "active" || subscription.status === "past_due";
  const paymentMode = getPremiumPaymentMode(subscription.metadata);

  if (subscription.provider_plan_id) {
    await deactivateXenditSubscriptionPlan(subscription.provider_plan_id);
  } else if (
    subscription.provider_session_id &&
    !(paymentMode === "qris" && wasActive)
  ) {
    await cancelXenditSession(subscription.provider_session_id);
  }

  const now = new Date();
  const periodEnd = wasActive
    ? subscription.current_period_end || now.toISOString()
    : now.toISOString();

  const { error: updateError } = await admin
    .from("user_subscriptions")
    .update({
      status: "canceled",
      provider_status: "INACTIVE",
      cancel_at_period_end: wasActive,
      canceled_at: now.toISOString(),
      current_period_end: periodEnd,
      next_billing_at: null,
    })
    .eq("id", subscription.id)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Subscription was stopped at Xendit but local state could not be updated: ${updateError.message}`);
  }

  return {
    canceled: true,
    accessUntil: wasActive ? periodEnd : null,
  } as const;
}
