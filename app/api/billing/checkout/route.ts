import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getBillingStatus } from "@/lib/billing-server";
import {
  FITMATE_RECURRING_PAYMENT_CONSENT_VERSION,
  FITMATE_SUBSCRIPTION_TERMS_VERSION,
} from "@/lib/legal";
import { createServiceRoleClient, getBearerUser } from "@/lib/server-auth";
import {
  PREMIUM_MONTHLY_PRICE_IDR,
  PREMIUM_PLAN_CODE,
  PREMIUM_PLAN_NAME,
  PREMIUM_QRIS_ACCESS_DAYS,
  getPremiumPaymentMode,
  normalizePremiumPaymentMode,
  type PremiumPaymentMode,
} from "@/lib/subscription";
import {
  cancelXenditSession,
  createXenditPaymentSession,
  createXenditSubscriptionSession,
  deactivateXenditSubscriptionPlan,
  XenditApiError,
} from "@/lib/xendit";
import { createXenditSubscriptionScheduleDates } from "@/lib/xendit-subscription-schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAppUrl(request: NextRequest) {
  const configured =
    process.env.FITMATE_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("FITMATE_APP_URL must be configured in production.");
  }

  const url = new URL(configured || request.nextUrl.origin);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (url.protocol !== "https:" && !isLocal) {
    throw new Error("FITMATE_APP_URL must use HTTPS in production.");
  }

  return url.origin;
}

function cleanCustomerName(value: string) {
  const cleaned = value
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

  return cleaned || "FitMate Member";
}

type CheckoutBody = {
  paymentMode?: PremiumPaymentMode;
  acceptSubscriptionTerms?: boolean;
  acceptRecurringTerms?: boolean;
  language?: "id" | "en";
};

export async function POST(request: NextRequest) {
  const admin = createServiceRoleClient();
  const user = await getBearerUser(request, admin);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please login again." },
      { status: 401 }
    );
  }

  let body: CheckoutBody = {};
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    body = {};
  }

  const paymentMode = normalizePremiumPaymentMode(body.paymentMode);
  const language = body.language === "en" ? "en" : "id";

  if (!paymentMode) {
    return NextResponse.json(
      {
        success: false,
        code: "PAYMENT_MODE_REQUIRED",
        error: "Choose QRIS for 30-day access or automatic monthly renewal.",
      },
      { status: 422 }
    );
  }

  if (body.acceptSubscriptionTerms !== true) {
    return NextResponse.json(
      {
        success: false,
        code: "SUBSCRIPTION_TERMS_REQUIRED",
        error: "Please agree to the Subscription Terms and Refund Policy before checkout.",
      },
      { status: 422 }
    );
  }

  if (paymentMode === "recurring" && body.acceptRecurringTerms !== true) {
    return NextResponse.json(
      {
        success: false,
        code: "BILLING_CONSENT_REQUIRED",
        error: "Please agree to the recurring subscription terms before checkout.",
      },
      { status: 422 }
    );
  }

  let checkoutLockToken: string | null = null;

  try {
    const billingStatus = await getBillingStatus(admin, user.id);

    if (billingStatus.isPremium) {
      return NextResponse.json(
        {
          success: true,
          alreadyPremium: true,
          redirectUrl: "/premium",
          billing: billingStatus,
        },
        { status: 200 }
      );
    }

    const { data: lockData, error: lockError } = await admin.rpc(
      "acquire_billing_checkout_lock",
      {
        p_user_id: user.id,
        p_ttl_seconds: 90,
      }
    );

    if (lockError) {
      throw new Error(`Unable to lock checkout: ${lockError.message}`);
    }

    const lock = (Array.isArray(lockData) ? lockData[0] : lockData) as
      | {
          allowed?: boolean;
          lock_token?: string | null;
          retry_after_seconds?: number;
        }
      | null;

    if (!lock?.allowed || !lock.lock_token) {
      return NextResponse.json(
        {
          success: false,
          code: "CHECKOUT_IN_PROGRESS",
          error: "A checkout request is already being prepared. Please try again shortly.",
          retryAfterSeconds: Math.max(1, Number(lock?.retry_after_seconds || 5)),
        },
        {
          status: 409,
          headers: {
            "retry-after": String(Math.max(1, Number(lock?.retry_after_seconds || 5))),
          },
        }
      );
    }

    checkoutLockToken = lock.lock_token;

    const acceptedAt = new Date().toISOString();
    const consentRows = [
      {
        user_id: user.id,
        consent_type: "subscription_terms",
        document_version: FITMATE_SUBSCRIPTION_TERMS_VERSION,
        accepted_at: acceptedAt,
        metadata: {
          source: "premium_checkout",
          payment_mode: paymentMode,
        },
      },
      ...(paymentMode === "recurring"
        ? [
            {
              user_id: user.id,
              consent_type: "recurring_payment",
              document_version: FITMATE_RECURRING_PAYMENT_CONSENT_VERSION,
              accepted_at: acceptedAt,
              metadata: {
                source: "premium_checkout",
                payment_mode: paymentMode,
                amount: PREMIUM_MONTHLY_PRICE_IDR,
                currency: "IDR",
                interval: "MONTH",
                interval_count: 1,
              },
            },
          ]
        : []),
    ];
    const { error: consentError } = await admin
      .from("user_consents")
      .upsert(consentRows, {
        onConflict: "user_id,consent_type,document_version",
        ignoreDuplicates: true,
      });

    if (consentError) {
      throw new Error(
        `Unable to record billing consent: ${consentError.message}. Run the v14.50 Supabase migration first.`
      );
    }

    // Xendit sessions expire after 30 minutes by default. Reuse only while
    // enough checkout time remains for the customer.
    const pendingCutoff = new Date(Date.now() - 25 * 60 * 1000).toISOString();
    const { data: pendingSubscriptions, error: pendingError } = await admin
      .from("user_subscriptions")
      .select("id, checkout_url, created_at, status, metadata")
      .eq("user_id", user.id)
      .in("status", ["pending", "requires_action"])
      .gte("created_at", pendingCutoff)
      .order("created_at", { ascending: false })
      .limit(10);

    if (pendingError) {
      throw new Error(`Unable to check pending checkout: ${pendingError.message}`);
    }

    const reusableCheckout = (pendingSubscriptions || []).find(
      (item) =>
        Boolean(item.checkout_url) &&
        getPremiumPaymentMode(item.metadata) === paymentMode
    );

    if (reusableCheckout?.checkout_url) {
      return NextResponse.json({
        success: true,
        reused: true,
        checkoutUrl: reusableCheckout.checkout_url,
        paymentMode,
      });
    }

    const appUrl = getAppUrl(request);
    const referenceId = `fitmate-premium-${paymentMode}-${randomUUID()}`;
    const email = user.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Your account does not have a valid email address." },
        { status: 422 }
      );
    }

    if (email.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: "Your email address is too long for the payment provider. Please use an address with at most 50 characters.",
        },
        { status: 422 }
      );
    }

    const emailName = email.split("@")[0] || "FitMate Member";
    const givenNames = cleanCustomerName(
      String(user.user_metadata?.full_name || user.user_metadata?.name || emailName)
    );
    const customerReference = `fm${user.id.replace(/-/g, "")}${referenceId.slice(-8)}`.slice(0, 60);
    const { expiresAt, anchorDate } = createXenditSubscriptionScheduleDates();

    const { data: storedCustomer, error: storedCustomerError } = await admin
      .from("user_subscriptions")
      .select("provider_customer_id")
      .eq("user_id", user.id)
      .not("provider_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (storedCustomerError) {
      throw new Error(`Unable to load the billing customer: ${storedCustomerError.message}`);
    }

    const xenditCustomer = storedCustomer?.provider_customer_id
      ? { customer_id: storedCustomer.provider_customer_id }
      : {
          customer: {
            reference_id: customerReference,
            type: "INDIVIDUAL",
            email,
            individual_detail: {
              given_names: givenNames,
            },
          },
        };

    const returnUrls = {
      success_return_url: `${appUrl}/premium?checkout=success&reference=${encodeURIComponent(referenceId)}`,
      cancel_return_url: `${appUrl}/premium?checkout=canceled&reference=${encodeURIComponent(referenceId)}`,
    };
    const sessionMetadata = {
      fitmate_user_id: user.id,
      plan_code: PREMIUM_PLAN_CODE,
      payment_mode: paymentMode,
      reference_id: referenceId,
      subscription_terms_version: FITMATE_SUBSCRIPTION_TERMS_VERSION,
      recurring_consent_version:
        paymentMode === "recurring"
          ? FITMATE_RECURRING_PAYMENT_CONSENT_VERSION
          : null,
    };

    const session =
      paymentMode === "qris"
        ? await createXenditPaymentSession(
            {
              reference_id: referenceId,
              session_type: "PAY",
              mode: "PAYMENT_LINK",
              amount: PREMIUM_MONTHLY_PRICE_IDR,
              currency: "IDR",
              country: "ID",
              expires_at: expiresAt,
              ...xenditCustomer,
              locale: language,
              notification_channels: ["EMAIL"],
              capture_method: "AUTOMATIC",
              allow_save_payment_method: "DISABLED",
              allowed_payment_channels: ["QRIS"],
              description: language === "en"
                ? `${PREMIUM_PLAN_NAME} - ${PREMIUM_QRIS_ACCESS_DAYS}-day access`
                : `${PREMIUM_PLAN_NAME} - akses ${PREMIUM_QRIS_ACCESS_DAYS} hari`,
              items: [
                {
                  reference_id: `${referenceId}-access`,
                  type: "DIGITAL_SERVICE",
                  name: PREMIUM_PLAN_NAME,
                  category: "FITNESS_MEMBERSHIP",
                  description: language === "en"
                    ? `Access all Premium features for ${PREMIUM_QRIS_ACCESS_DAYS} days`
                    : `Akses semua fitur Premium selama ${PREMIUM_QRIS_ACCESS_DAYS} hari`,
                  net_unit_amount: PREMIUM_MONTHLY_PRICE_IDR,
                  quantity: 1,
                  currency: "IDR",
                },
              ],
              metadata: sessionMetadata,
              ...returnUrls,
            },
            referenceId
          )
        : await createXenditSubscriptionSession(
            {
              reference_id: referenceId,
              session_type: "SUBSCRIPTION",
              mode: "PAYMENT_LINK",
              amount: PREMIUM_MONTHLY_PRICE_IDR,
              currency: "IDR",
              country: "ID",
              expires_at: expiresAt,
              ...xenditCustomer,
              locale: language,
              notification_channels: ["EMAIL"],
              description: language === "en"
                ? `${PREMIUM_PLAN_NAME} - monthly subscription`
                : `${PREMIUM_PLAN_NAME} - langganan bulanan`,
              metadata: sessionMetadata,
              subscription: {
                schedule: {
                  interval: "MONTH",
                  interval_count: 1,
                  anchor_date: anchorDate,
                  retry_interval: "DAY",
                  retry_interval_count: 1,
                  total_retry: 3,
                  failed_attempt_notifications: [1, 2, 3],
                },
                immediate_payment: true,
                failed_cycle_action: "RESUME",
              },
              ...returnUrls,
            },
            referenceId
          );

    if (!session.payment_link_url) {
      throw new Error("Xendit did not return a checkout URL.");
    }

    const { error: insertError } = await admin.from("user_subscriptions").insert({
      user_id: user.id,
      provider: "xendit",
      plan_code: PREMIUM_PLAN_CODE,
      reference_id: referenceId,
      provider_session_id: session.payment_session_id,
      provider_customer_id: session.customer_id || null,
      provider_plan_id: session.recurring_plan_id || null,
      status: "pending",
      provider_status: session.status,
      amount: PREMIUM_MONTHLY_PRICE_IDR,
      currency: "IDR",
      billing_interval: "MONTH",
      interval_count: 1,
      checkout_url: session.payment_link_url,
      metadata: {
        checkout_created_by: "fitmate",
        payment_mode: paymentMode,
        access_days:
          paymentMode === "qris" ? PREMIUM_QRIS_ACCESS_DAYS : null,
        manual_renewal: paymentMode === "qris",
        subscription_terms_version: FITMATE_SUBSCRIPTION_TERMS_VERSION,
        subscription_terms_accepted_at: acceptedAt,
        ...(paymentMode === "recurring"
          ? {
              recurring_terms_version:
                FITMATE_RECURRING_PAYMENT_CONSENT_VERSION,
              recurring_terms_accepted_at: acceptedAt,
            }
          : {}),
      },
    });

    if (insertError) {
      try {
        if (session.recurring_plan_id) {
          await deactivateXenditSubscriptionPlan(session.recurring_plan_id);
        } else if (session.payment_session_id) {
          await cancelXenditSession(session.payment_session_id);
        }
      } catch (cleanupError) {
        console.error(
          "Unable to clean up orphan Xendit checkout:",
          cleanupError
        );
      }

      throw new Error(`Unable to save checkout session: ${insertError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        checkoutUrl: session.payment_link_url,
        referenceId,
        paymentMode,
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error instanceof XenditApiError ? Math.min(502, Math.max(400, error.status)) : 500;
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof XenditApiError
            ? `Payment provider error: ${error.message}`
            : error instanceof Error
              ? error.message
              : "Unable to create Premium checkout.",
      },
      { status }
    );
  } finally {
    if (checkoutLockToken) {
      const { error: releaseError } = await admin.rpc(
        "release_billing_checkout_lock",
        {
          p_user_id: user.id,
          p_lock_token: checkoutLockToken,
        }
      );

      if (releaseError) {
        console.warn("Unable to release checkout lock:", releaseError.message);
      }
    }
  }
}
