import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { addOneMonth } from "@/lib/billing-server";
import { createServiceRoleClient } from "@/lib/server-auth";
import {
  PREMIUM_MONTHLY_PRICE_IDR,
  createQrisAccessPeriod,
  getPremiumPaymentMode,
} from "@/lib/subscription";
import {
  deactivateXenditSubscriptionPlan,
  verifyXenditWebhookToken,
} from "@/lib/xendit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type SubscriptionRow = {
  id: string;
  user_id: string;
  reference_id: string;
  provider_plan_id: string | null;
  provider_session_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  last_payment_at: string | null;
  metadata: Record<string, unknown> | null;
};

type WebhookEventRow = {
  id: string;
  processed: boolean;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

const FITMATE_CHECKOUT_REFERENCE =
  /^(fitmate-premium-(?:(?:qris|recurring)-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:_|$)/i;

function canonicalFitMateReference(value: unknown) {
  const reference = stringValue(value);
  return reference?.match(FITMATE_CHECKOUT_REFERENCE)?.[1] || null;
}

function referenceCandidates(...values: unknown[]) {
  const candidates = new Set<string>();

  for (const value of values) {
    const reference = stringValue(value);
    if (!reference) continue;
    candidates.add(reference);

    const canonicalReference = canonicalFitMateReference(reference);
    if (canonicalReference) candidates.add(canonicalReference);
  }

  return [...candidates];
}

function dateValue(...values: unknown[]) {
  const value = stringValue(...values);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function attemptDetails(data: JsonRecord) {
  return Array.isArray(data.attempt_details)
    ? data.attempt_details.map(record)
    : [];
}

function latestAttempt(data: JsonRecord, preferredStatus?: string) {
  const attempts = attemptDetails(data);
  const status = preferredStatus?.toUpperCase();

  if (status) {
    const matching = [...attempts]
      .reverse()
      .find((attempt) => String(attempt.status || "").toUpperCase() === status);
    if (matching) return matching;
  }

  return attempts.at(-1) || {};
}

function normalizeEventName(value: unknown) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/_/g, ".")
    .replace("recurring.cycle", "recurring.cycle")
    .replace("recurring.plan.activation", "recurring.plan.activated")
    .replace("recurring.plan.inactivation", "recurring.plan.inactivated");
}

function stableEventId(request: NextRequest, payload: JsonRecord, rawBody: string) {
  const explicit =
    request.headers.get("webhook-id") ||
    request.headers.get("x-webhook-id") ||
    request.headers.get("x-callback-id");
  if (explicit) return explicit;

  const data = record(payload.data);
  const eventMaterial = [
    normalizeEventName(payload.event),
    stringValue(data.id, data.payment_id, data.payment_session_id, data.reference_id),
    stringValue(data.status),
    stringValue(payload.created, data.created, data.updated),
    rawBody,
  ].join("|");

  return createHash("sha256").update(eventMaterial).digest("hex");
}

async function findSubscription(
  admin: ReturnType<typeof createServiceRoleClient>,
  data: JsonRecord
): Promise<SubscriptionRow | null> {
  const plan = record(data.plan);
  const planId = stringValue(
    data.plan_id,
    data.recurring_plan_id,
    record(data.recurring_plan).id,
    plan.id,
    data.id && String(data.id).startsWith("repl_") ? data.id : null
  );
  const sessionId = stringValue(data.payment_session_id, data.session_id);
  const payment = record(data.payment);
  const paymentRequest = record(data.payment_request);
  const capture = record(data.capture);
  const metadata = record(data.metadata);
  const references = referenceCandidates(
    data.reference_id,
    data.payment_reference_id,
    payment.reference_id,
    paymentRequest.reference_id,
    capture.reference_id,
    plan.reference_id,
    metadata.reference_id
  );

  const attempts: Array<["provider_plan_id" | "provider_session_id" | "reference_id", string | null]> = [
    ["provider_plan_id", planId],
    ["provider_session_id", sessionId],
    ...references.map((reference): ["reference_id", string] => ["reference_id", reference]),
  ];

  for (const [column, value] of attempts) {
    if (!value) continue;
    const { data: found, error } = await admin
      .from("user_subscriptions")
      .select(
        "id, user_id, reference_id, provider_plan_id, provider_session_id, status, current_period_end, cancel_at_period_end, last_payment_at, metadata"
      )
      .eq(column, value)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Unable to match subscription: ${error.message}`);
    if (found) return found as SubscriptionRow;
  }

  const paymentId = stringValue(
    data.payment_id,
    record(data.payment).id,
    record(data.capture).payment_id,
    latestAttempt(data, "SUCCEEDED").payment_id,
    latestAttempt(data).payment_id
  );
  if (paymentId) {
    const { data: transaction, error: transactionError } = await admin
      .from("billing_transactions")
      .select("subscription_id")
      .eq("provider", "xendit")
      .eq("provider_payment_id", paymentId)
      .limit(1)
      .maybeSingle();

    if (transactionError) {
      throw new Error(`Unable to match payment transaction: ${transactionError.message}`);
    }

    if (transaction?.subscription_id) {
      const { data: found, error } = await admin
        .from("user_subscriptions")
        .select(
          "id, user_id, reference_id, provider_plan_id, provider_session_id, status, current_period_end, cancel_at_period_end, last_payment_at, metadata"
        )
        .eq("id", transaction.subscription_id)
        .maybeSingle();

      if (error) throw new Error(`Unable to load payment subscription: ${error.message}`);
      if (found) return found as SubscriptionRow;
    }
  }

  return null;
}

function cyclePeriod(data: JsonRecord) {
  const start =
    dateValue(
      data.period_start,
      data.cycle_start,
      data.scheduled_timestamp,
      data.paid_at,
      data.created
    ) || new Date();
  const end =
    dateValue(data.period_end, data.cycle_end, data.next_billing_at) || addOneMonth(start);
  return { start, end };
}

export async function POST(request: NextRequest) {
  const receivedToken = request.headers.get("x-callback-token");

  try {
    if (!verifyXenditWebhookToken(receivedToken)) {
      return NextResponse.json({ success: false, error: "Invalid webhook token." }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Webhook is not configured." },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  let payload: JsonRecord;

  try {
    payload = record(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const eventType = normalizeEventName(payload.event);
  const providerEventId = stableEventId(request, payload, rawBody);

  const { data: insertedEventRow, error: eventInsertError } = await admin
    .from("billing_webhook_events")
    .insert({
      provider: "xendit",
      provider_event_id: providerEventId,
      event_type: eventType,
      signature_valid: true,
      payload,
    })
    .select("id, processed")
    .single();

  let eventRow = (insertedEventRow || null) as WebhookEventRow | null;

  if (eventInsertError) {
    if (eventInsertError.code === "23505") {
      const { data: existingEvent, error: existingEventError } = await admin
        .from("billing_webhook_events")
        .select("id, processed")
        .eq("provider", "xendit")
        .eq("provider_event_id", providerEventId)
        .maybeSingle();

      if (existingEventError || !existingEvent) {
        return NextResponse.json(
          {
            success: false,
            error: existingEventError?.message || "Unable to reload duplicate webhook.",
          },
          { status: 500 }
        );
      }

      eventRow = existingEvent as WebhookEventRow;
      if (eventRow.processed) {
        return NextResponse.json({ success: true, duplicate: true });
      }
    } else {
      return NextResponse.json(
        { success: false, error: `Unable to record webhook: ${eventInsertError.message}` },
        { status: 500 }
      );
    }
  }

  if (!eventRow) {
    return NextResponse.json(
      { success: false, error: "Unable to initialize webhook processing." },
      { status: 500 }
    );
  }

  try {
    const data = record(payload.data);
    const subscription = await findSubscription(admin, data);

    if (!subscription) {
      const message = "No local subscription matched this Xendit webhook.";
      const { error: unmatchedUpdateError } = await admin
        .from("billing_webhook_events")
        .update({ processing_error: message, processed_at: new Date().toISOString() })
        .eq("id", eventRow.id);

      if (unmatchedUpdateError) {
        throw new Error(`Unable to record unmatched webhook: ${unmatchedUpdateError.message}`);
      }

      const fitMateReference = referenceCandidates(
        data.reference_id,
        data.payment_reference_id,
        record(data.payment).reference_id,
        record(data.payment_request).reference_id,
        record(data.capture).reference_id,
        record(data.plan).reference_id,
        record(data.metadata).reference_id
      ).find((reference) => canonicalFitMateReference(reference));

      // A real FitMate checkout must not be silently acknowledged when its
      // local row is temporarily unavailable. Xendit retries non-2xx webhook
      // responses, giving the database and operator a chance to recover it.
      if (fitMateReference) {
        throw new Error(`${message} Reference: ${fitMateReference}`);
      }

      // Dashboard "Test and save" uses a synthetic object that cannot match a
      // checkout created by FitMate. The callback token and payload have
      // already been validated and the event is persisted for reconciliation,
      // so acknowledge it without granting Premium access.
      return NextResponse.json({
        success: true,
        acknowledged: true,
        processed: false,
        message,
      });
    }

    const plan = record(data.plan);
    const providerPlanId = stringValue(
      data.plan_id,
      data.recurring_plan_id,
      plan.id,
      data.id && String(data.id).startsWith("repl_") ? data.id : null
    );
    const providerSessionId = stringValue(data.payment_session_id, data.session_id);
    const providerCustomerId = stringValue(data.customer_id, plan.customer_id);
    const providerStatus = stringValue(
      data.status,
      record(data.payment).status,
      record(data.capture).status,
      plan.status
    );
    const succeededAttempt = latestAttempt(data, "SUCCEEDED");
    const mostRecentAttempt = latestAttempt(data);
    const paymentId = stringValue(
      data.payment_id,
      record(data.payment).id,
      record(data.capture).payment_id,
      succeededAttempt.payment_id,
      mostRecentAttempt.payment_id
    );
    const cycleId = stringValue(
      data.cycle_id,
      data.recurring_cycle_id,
      data.id && String(data.id).startsWith("recy_") ? data.id : null
    );
    const failureCode = stringValue(
      data.failure_code,
      data.error_code,
      mostRecentAttempt.failure_code
    );
    const amount =
      numberValue(
        data.amount,
        data.request_amount,
        data.capture_amount,
        record(data.payment).amount,
        record(data.payment).request_amount,
        record(data.payment_request).amount,
        record(data.payment_request).request_amount,
        record(data.capture).amount,
        succeededAttempt.amount,
        succeededAttempt.request_amount,
        mostRecentAttempt.amount,
        plan.amount
      ) ?? PREMIUM_MONTHLY_PRICE_IDR;
    const currency = (
      stringValue(
        data.currency,
        record(data.payment).currency,
        record(data.payment_request).currency,
        record(data.capture).currency,
        plan.currency
      ) || "IDR"
    ).toUpperCase();
    const now = new Date();
    const paymentMode = getPremiumPaymentMode(subscription.metadata);
    const isVerifiedQrisSessionCompletion =
      paymentMode === "qris" &&
      eventType.includes("payment.session.completed") &&
      String(providerStatus || "").toUpperCase() === "COMPLETED" &&
      Boolean(paymentId);

    const baseUpdate: JsonRecord = {};

    if (providerPlanId || subscription.provider_plan_id) {
      baseUpdate.provider_plan_id = providerPlanId || subscription.provider_plan_id;
    }
    if (providerSessionId || subscription.provider_session_id) {
      baseUpdate.provider_session_id = providerSessionId || subscription.provider_session_id;
    }
    if (providerCustomerId) baseUpdate.provider_customer_id = providerCustomerId;
    if (providerStatus) baseUpdate.provider_status = providerStatus;
    if (failureCode) baseUpdate.failure_code = failureCode;

    if (eventType.includes("recurring.plan.activated")) {
      Object.assign(baseUpdate, {
        status: ["active", "past_due", "canceled"].includes(subscription.status)
          ? subscription.status
          : "pending",
        activated_at: now.toISOString(),
      });
    } else if (
      eventType.includes("recurring.cycle.succeeded") ||
      eventType.includes("recurring.cycle.success") ||
      eventType.includes("payment.capture") ||
      eventType.includes("payment.succeeded") ||
      eventType.includes("capture.succeeded") ||
      eventType.includes("capture.success") ||
      isVerifiedQrisSessionCompletion
    ) {
      if (Math.round(amount) !== PREMIUM_MONTHLY_PRICE_IDR || currency !== "IDR") {
        throw new Error(
          `Payment amount mismatch: expected IDR ${PREMIUM_MONTHLY_PRICE_IDR}, received ${currency} ${Math.round(amount)}.`
        );
      }

      const paidAt =
        dateValue(data.paid_at, succeededAttempt.created, data.created, payload.created) ||
        now;
      const period =
        paymentMode === "qris"
          ? createQrisAccessPeriod(paidAt)
          : cyclePeriod(data);
      Object.assign(baseUpdate, {
        status:
          paymentMode === "qris"
            ? "active"
            : subscription.status === "canceled"
              ? "canceled"
              : "active",
        activated_at: now.toISOString(),
        last_payment_at: paidAt.toISOString(),
        last_payment_id: paymentId,
        current_period_start: period.start.toISOString(),
        current_period_end: period.end.toISOString(),
        next_billing_at:
          paymentMode === "qris" || subscription.status === "canceled"
            ? null
            : period.end.toISOString(),
        cancel_at_period_end: paymentMode === "qris",
        checkout_url: null,
        failure_code: null,
      });

      const transactionPayload = {
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        provider: "xendit",
        provider_cycle_id: cycleId,
        provider_payment_id: paymentId,
        reference_id: subscription.reference_id,
        status: "succeeded",
        amount: Math.round(amount),
        currency,
        period_start: period.start.toISOString(),
        period_end: period.end.toISOString(),
        paid_at: paidAt.toISOString(),
        metadata: { event_type: eventType, payment_mode: paymentMode },
      };

      const conflictColumn = cycleId
        ? "provider,provider_cycle_id"
        : paymentId
          ? "provider,provider_payment_id"
          : null;

      if (conflictColumn) {
        const { error: transactionError } = await admin
          .from("billing_transactions")
          .upsert(transactionPayload, { onConflict: conflictColumn });
        if (transactionError) throw new Error(`Unable to save payment transaction: ${transactionError.message}`);
      } else {
        const { error: transactionError } = await admin.from("billing_transactions").insert(transactionPayload);
        if (transactionError) throw new Error(`Unable to save payment transaction: ${transactionError.message}`);
      }
    } else if (
      eventType.includes("recurring.cycle.retrying") ||
      eventType.includes("recurring.cycle.failed") ||
      eventType.includes("payment.failure") ||
      eventType.includes("payment.failed") ||
      eventType.includes("capture.failed") ||
      eventType.includes("capture.failure")
    ) {
      const failureOccurredAt =
        dateValue(data.updated, data.created, payload.created) || now;
      const lastPaidAt = subscription.last_payment_at
        ? new Date(subscription.last_payment_at)
        : null;
      const isStaleFailure =
        lastPaidAt && failureOccurredAt.getTime() <= lastPaidAt.getTime();

      if (!isStaleFailure && subscription.status !== "canceled") {
        Object.assign(baseUpdate, {
          status:
            paymentMode === "qris"
              ? subscription.status === "active"
                ? "active"
                : "requires_action"
              : "past_due",
        });
      }

      const transactionStatus = eventType.includes("retrying") ? "retrying" : "failed";
      const { error: transactionError } = await admin.from("billing_transactions").insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        provider: "xendit",
        provider_cycle_id: cycleId,
        provider_payment_id: paymentId,
        reference_id: subscription.reference_id,
        status: transactionStatus,
        amount: Math.round(amount),
        currency,
        failure_code: failureCode,
        metadata: { event_type: eventType, payment_mode: paymentMode },
      });
      if (transactionError && transactionError.code !== "23505") {
        throw new Error(`Unable to save failed transaction: ${transactionError.message}`);
      }
    } else if (eventType.includes("refund.succeeded")) {
      if (!paymentId) {
        throw new Error("Refund webhook does not include a payment ID.");
      }

      const { error: refundUpdateError } = await admin
        .from("billing_transactions")
        .update({
          status: "refunded",
          metadata: {
            event_type: eventType,
            refund_id: stringValue(data.id),
            refund_amount: Math.round(amount),
            refund_reason: stringValue(data.reason),
          },
        })
        .eq("provider", "xendit")
        .eq("provider_payment_id", paymentId);

      if (refundUpdateError) {
        throw new Error(`Unable to record refund: ${refundUpdateError.message}`);
      }

      if (subscription.provider_plan_id) {
        await deactivateXenditSubscriptionPlan(subscription.provider_plan_id);
      }

      Object.assign(baseUpdate, {
        status: "canceled",
        provider_status: "INACTIVE",
        cancel_at_period_end: false,
        canceled_at: now.toISOString(),
        current_period_end: now.toISOString(),
        next_billing_at: null,
        checkout_url: null,
        failure_code: null,
      });
    } else if (eventType.includes("refund.failed")) {
      baseUpdate.failure_code = failureCode || "REFUND_FAILED";
    } else if (eventType.includes("recurring.plan.inactivated")) {
      Object.assign(baseUpdate, {
        status: subscription.cancel_at_period_end ? "canceled" : "inactive",
        next_billing_at: null,
      });
    } else if (eventType.includes("payment.session.expired")) {
      Object.assign(baseUpdate, {
        status: ["active", "past_due", "canceled"].includes(subscription.status)
          ? subscription.status
          : "expired",
        checkout_url: null,
      });
    } else if (eventType.includes("payment.session.completed")) {
      Object.assign(baseUpdate, {
        status: ["active", "past_due", "canceled"].includes(subscription.status)
          ? subscription.status
          : "pending",
        checkout_url: null,
      });
    }

    const { error: updateError } = await admin
      .from("user_subscriptions")
      .update(baseUpdate)
      .eq("id", subscription.id);

    if (updateError) {
      throw new Error(`Unable to synchronize subscription: ${updateError.message}`);
    }

    await admin
      .from("billing_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString(), processing_error: null })
      .eq("id", eventRow.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";

    await admin
      .from("billing_webhook_events")
      .update({ processing_error: message, processed_at: new Date().toISOString() })
      .eq("id", eventRow.id);

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
