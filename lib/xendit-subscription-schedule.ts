const JAKARTA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const XENDIT_SESSION_DURATION_MS = 30 * 60 * 1000;
const MAX_XENDIT_MONTHLY_ANCHOR_DAY = 28;

export type XenditSubscriptionScheduleDates = {
  expiresAt: string;
  anchorDate: string;
};

/**
 * Creates a short-lived checkout expiry and the next monthly billing anchor.
 * Xendit requires the anchor to be on/after the session expiry and limits a
 * monthly anchor to day 28. Jakarta has a fixed UTC+7 offset (no DST).
 */
export function createXenditSubscriptionScheduleDates(
  now = new Date()
): XenditSubscriptionScheduleDates {
  if (Number.isNaN(now.getTime())) {
    throw new Error("A valid date is required for the Xendit subscription schedule.");
  }

  const expiresAt = new Date(now.getTime() + XENDIT_SESSION_DURATION_MS);
  const jakartaNow = new Date(now.getTime() + JAKARTA_UTC_OFFSET_MS);

  const targetMonth = new Date(
    Date.UTC(
      jakartaNow.getUTCFullYear(),
      jakartaNow.getUTCMonth() + 1,
      1
    )
  );
  const anchorDay = Math.min(
    jakartaNow.getUTCDate(),
    MAX_XENDIT_MONTHLY_ANCHOR_DAY
  );
  const anchorDate = new Date(
    Date.UTC(
      targetMonth.getUTCFullYear(),
      targetMonth.getUTCMonth(),
      anchorDay,
      jakartaNow.getUTCHours(),
      jakartaNow.getUTCMinutes(),
      jakartaNow.getUTCSeconds()
    ) - JAKARTA_UTC_OFFSET_MS
  );

  if (anchorDate.getTime() < expiresAt.getTime()) {
    throw new Error("Xendit subscription anchor must not precede session expiry.");
  }

  return {
    expiresAt: expiresAt.toISOString(),
    anchorDate: anchorDate.toISOString(),
  };
}
