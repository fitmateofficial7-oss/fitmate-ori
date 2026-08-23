"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import type { BillingStatusResponse } from "@/lib/subscription";
import { PREMIUM_MONTHLY_PRICE_IDR, PREMIUM_PLAN_CODE, PREMIUM_PLAN_NAME } from "@/lib/subscription";

export const TIKTOK_STANDARD_EVENTS = {
  ACHIEVE_LEVEL: "ACHIEVE_LEVEL",
  ADD_PAYMENT_INFO: "ADD_PAYMENT_INFO",
  COMPLETE_TUTORIAL: "COMPLETE_TUTORIAL",
  CREATE_GROUP: "CREATE_GROUP",
  CREATE_ROLE: "CREATE_ROLE",
  GENERATE_LEAD: "GENERATE_LEAD",
  IN_APP_AD_CLICK: "IN_APP_AD_CLICK",
  IN_APP_AD_IMPR: "IN_APP_AD_IMPR",
  INSTALL_APP: "INSTALL_APP",
  JOIN_GROUP: "JOIN_GROUP",
  LAUNCH_APP: "LAUNCH_APP",
  LOAN_APPLICATION: "LOAN_APPLICATION",
  LOAN_APPROVAL: "LOAN_APPROVAL",
  LOAN_DISBURSAL: "LOAN_DISBURSAL",
  LOGIN: "LOGIN",
  RATE: "RATE",
  REGISTRATION: "REGISTRATION",
  SEARCH: "SEARCH",
  SPEND_CREDITS: "SPEND_CREDITS",
  START_TRIAL: "START_TRIAL",
  SUBSCRIBE: "SUBSCRIBE",
  UNLOCK_ACHIEVEMENT: "UNLOCK_ACHIEVEMENT",
} as const;

export type TikTokStandardEvent =
  (typeof TIKTOK_STANDARD_EVENTS)[keyof typeof TIKTOK_STANDARD_EVENTS];

export type TikTokCommerceEvent =
  | "CHECKOUT"
  | "PURCHASE"
  | "ADD_TO_WISHLIST"
  | "ADD_TO_CART"
  | "VIEW_CONTENT";

type NativeResult = {
  success?: boolean;
  configured?: boolean;
  initialized?: boolean;
  reason?: string | null;
};

type TikTokBusinessNativePlugin = {
  status(): Promise<NativeResult>;
  identify(options: {
    externalId: string;
    externalUserName?: string;
    phoneNumber?: string;
    email?: string;
  }): Promise<NativeResult>;
  refreshIdentity(options: {
    externalId: string;
    externalUserName?: string;
    phoneNumber?: string;
    email?: string;
  }): Promise<NativeResult>;
  logout(): Promise<NativeResult>;
  trackStandardEvent(options: {
    eventName: TikTokStandardEvent;
    eventId?: string;
  }): Promise<NativeResult>;
  trackCommerceEvent(options: {
    eventName: TikTokCommerceEvent;
    eventId?: string;
    description?: string;
    currency?: "IDR" | string;
    value?: number;
    contentId?: string;
    contentCategory?: string;
    brand?: string;
    price?: number;
    quantity?: number;
    contentName?: string;
    contentType?: string;
  }): Promise<NativeResult>;
};

const TikTokBusiness = registerPlugin<TikTokBusinessNativePlugin>("TikTokBusiness");

function canUseNativeTikTok() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

async function safeNativeCall<T>(operation: () => Promise<T>): Promise<T | null> {
  if (!canUseNativeTikTok()) return null;

  try {
    return await operation();
  } catch (error) {
    // TikTok tracking must never interrupt FitMate's primary workout/auth/payment flows.
    console.warn("FitMate TikTok tracking skipped:", error);
    return null;
  }
}

export async function getTikTokSdkStatus() {
  return safeNativeCall(() => TikTokBusiness.status());
}

export async function identifyTikTokUser(user: {
  id: string;
  email?: string | null;
  userName?: string | null;
  phoneNumber?: string | null;
}) {
  return safeNativeCall(() =>
    TikTokBusiness.identify({
      externalId: user.id,
      ...(user.userName ? { externalUserName: user.userName } : {}),
      ...(user.phoneNumber ? { phoneNumber: user.phoneNumber } : {}),
      ...(user.email ? { email: user.email } : {}),
    })
  );
}

/** TikTok recommends logout -> identify whenever known user information changes. */
export async function refreshTikTokIdentity(user: {
  id: string;
  email?: string | null;
  userName?: string | null;
  phoneNumber?: string | null;
}) {
  return safeNativeCall(() =>
    TikTokBusiness.refreshIdentity({
      externalId: user.id,
      ...(user.userName ? { externalUserName: user.userName } : {}),
      ...(user.phoneNumber ? { phoneNumber: user.phoneNumber } : {}),
      ...(user.email ? { email: user.email } : {}),
    })
  );
}

export async function logoutTikTokUser() {
  return safeNativeCall(() => TikTokBusiness.logout());
}

export async function trackTikTokEvent(
  eventName: TikTokStandardEvent,
  eventId?: string
) {
  return safeNativeCall(() =>
    TikTokBusiness.trackStandardEvent({
      eventName,
      ...(eventId ? { eventId } : {}),
    })
  );
}

export async function trackTikTokCommerceEvent(options: {
  eventName: TikTokCommerceEvent;
  eventId?: string;
  description?: string;
  currency?: "IDR" | string;
  value?: number;
  contentId?: string;
  contentCategory?: string;
  brand?: string;
  price?: number;
  quantity?: number;
  contentName?: string;
  contentType?: string;
}) {
  return safeNativeCall(() =>
    TikTokBusiness.trackCommerceEvent({
      currency: "IDR",
      ...options,
    })
  );
}

export async function trackTikTokPremiumCheckout(paymentMode: string) {
  return trackTikTokCommerceEvent({
    eventName: "CHECKOUT",
    description: `FitMate Premium checkout (${paymentMode})`,
    currency: "IDR",
    value: PREMIUM_MONTHLY_PRICE_IDR,
    contentId: PREMIUM_PLAN_CODE,
    contentCategory: "fitness_subscription",
    brand: "FitMate by Growsia",
    price: PREMIUM_MONTHLY_PRICE_IDR,
    quantity: 1,
    contentName: PREMIUM_PLAN_NAME,
    contentType: "subscription",
  });
}

/**
 * Sends Purchase + Subscribe once a provider-confirmed premium transaction exists.
 * The successful transaction id is reused as TikTok eventId for deduplication.
 */
export async function trackTikTokPremiumConversion(status: BillingStatusResponse) {
  if (!status.isPremium || !status.subscription) return;
  if (status.subscription.accessSource === "manual") return;

  const succeeded = status.transactions.find((item) => item.status === "succeeded");
  const eventId = succeeded?.id || status.subscription.id;
  const value = succeeded?.amount ?? status.subscription.amount ?? PREMIUM_MONTHLY_PRICE_IDR;

  await trackTikTokCommerceEvent({
    eventName: "PURCHASE",
    eventId,
    description: "FitMate Premium payment confirmed",
    currency: "IDR",
    value,
    contentId: PREMIUM_PLAN_CODE,
    contentCategory: "fitness_subscription",
    brand: "FitMate by Growsia",
    price: value,
    quantity: 1,
    contentName: PREMIUM_PLAN_NAME,
    contentType: "subscription",
  });

  await trackTikTokEvent(TIKTOK_STANDARD_EVENTS.SUBSCRIBE, `subscribe:${eventId}`);
}

export async function trackTikTokExerciseView(exercise: {
  id: string | number;
  slug: string;
  name: string;
  category: string;
}) {
  return trackTikTokCommerceEvent({
    eventName: "VIEW_CONTENT",
    contentId: String(exercise.id || exercise.slug),
    contentCategory: exercise.category,
    brand: "FitMate by Growsia",
    contentName: exercise.name,
    contentType: "exercise",
  });
}

export async function trackTikTokExerciseWishlist(exercise: {
  id: string | number;
  slug: string;
  name: string;
  category: string;
}) {
  return trackTikTokCommerceEvent({
    eventName: "ADD_TO_WISHLIST",
    contentId: String(exercise.id || exercise.slug),
    contentCategory: exercise.category,
    brand: "FitMate by Growsia",
    contentName: exercise.name,
    contentType: "exercise",
  });
}
