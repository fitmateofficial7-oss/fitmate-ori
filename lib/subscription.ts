export const FREE_LIFETIME_GENERATION_LIMIT = 2;
export const PREMIUM_WEEKLY_GENERATION_LIMIT = 10;
export const PREMIUM_MONTHLY_PRICE_IDR = 49_000;
export const PREMIUM_PLAN_CODE = "premium_monthly" as const;
export const PREMIUM_PLAN_NAME = "FitMate Premium";
export const PREMIUM_QRIS_ACCESS_DAYS = 30;

const JAKARTA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getJakartaWeekWindow(now = new Date()) {
  if (Number.isNaN(now.getTime())) {
    throw new Error("A valid date is required to calculate the quota window.");
  }

  // Asia/Jakarta is UTC+7 and does not observe daylight saving time. Moving
  // the clock forward lets UTC date methods describe Jakarta wall time.
  const jakartaClock = new Date(now.getTime() + JAKARTA_UTC_OFFSET_MS);
  const daysSinceMonday = (jakartaClock.getUTCDay() + 6) % 7;
  const localMondayAsUtc = Date.UTC(
    jakartaClock.getUTCFullYear(),
    jakartaClock.getUTCMonth(),
    jakartaClock.getUTCDate() - daysSinceMonday
  );
  const start = new Date(localMondayAsUtc - JAKARTA_UTC_OFFSET_MS);
  const end = new Date(start.getTime() + WEEK_MS);
  const key = new Date(start.getTime() + JAKARTA_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 10);

  return { start, end, key };
}

export type PremiumPaymentMode = "qris" | "recurring";

export function normalizePremiumPaymentMode(
  value: unknown
): PremiumPaymentMode | null {
  return value === "qris" || value === "recurring" ? value : null;
}

export function getPremiumPaymentMode(metadata: unknown): PremiumPaymentMode {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const storedMode = normalizePremiumPaymentMode(
      (metadata as Record<string, unknown>).payment_mode
    );
    if (storedMode) return storedMode;
  }

  // Semua checkout sebelum dukungan QRIS adalah langganan otomatis.
  return "recurring";
}

export function createQrisAccessPeriod(paidAt: Date) {
  if (Number.isNaN(paidAt.getTime())) {
    throw new Error("A valid payment date is required for QRIS access.");
  }

  const start = new Date(paidAt);
  const end = new Date(
    start.getTime() + PREMIUM_QRIS_ACCESS_DAYS * 24 * 60 * 60 * 1000
  );

  return { start, end };
}

export type SubscriptionStatus =
  | "free"
  | "pending"
  | "requires_action"
  | "active"
  | "past_due"
  | "canceled"
  | "inactive"
  | "expired"
  | "failed";

export type BillingStatusResponse = {
  success: true;
  plan: "free" | "premium";
  isPremium: boolean;
  subscription: null | {
    id: string;
    status: SubscriptionStatus;
    amount: number;
    currency: "IDR";
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    nextBillingAt: string | null;
    cancelAtPeriodEnd: boolean;
    checkoutUrl: string | null;
    paymentMode: PremiumPaymentMode;
  };
  generation: {
    freeUsed: number;
    freeLimit: number;
    freeRemaining: number;
    totalGenerated: number;
    premiumWeeklyUsed: number;
    premiumWeeklyLimit: number;
    premiumWeeklyRemaining: number;
    premiumWeeklyResetsAt: string;
    canGenerate: boolean;
  };
  transactions: Array<{
    id: string;
    status: "pending" | "succeeded" | "retrying" | "failed" | "canceled" | "refunded";
    amount: number | null;
    currency: "IDR";
    paidAt: string | null;
    createdAt: string;
    failureCode: string | null;
  }>;
};

export function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
