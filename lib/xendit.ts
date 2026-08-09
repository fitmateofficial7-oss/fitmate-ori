import "server-only";

import { timingSafeEqual } from "node:crypto";

const XENDIT_API_BASE_URL = "https://api.xendit.co";
const XENDIT_RECURRING_API_VERSION = "2026-01-01";

type XenditRequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  apiVersion?: string;
  idempotencyKey?: string;
};

type XenditErrorPayload = {
  error_code?: string;
  message?: string;
  errors?: Array<{ message?: string }>;
};

export class XenditApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "XenditApiError";
    this.status = status;
    this.code = code;
  }
}

function getXenditSecretKey() {
  const key = process.env.XENDIT_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Missing XENDIT_SECRET_KEY environment variable.");
  }
  if (!/^xnd_(development|production)_/.test(key)) {
    throw new Error("XENDIT_SECRET_KEY must be a Xendit secret API key, not a public key.");
  }
  return key;
}

export function getXenditWebhookToken() {
  const token = process.env.XENDIT_WEBHOOK_TOKEN?.trim();
  if (!token) {
    throw new Error("Missing XENDIT_WEBHOOK_TOKEN environment variable.");
  }
  return token;
}

function basicAuthorization() {
  return `Basic ${Buffer.from(`${getXenditSecretKey()}:`).toString("base64")}`;
}

async function xenditRequest<T>(
  path: string,
  options: XenditRequestOptions = {}
): Promise<T> {
  const response = await fetch(`${XENDIT_API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      authorization: basicAuthorization(),
      accept: "application/json",
      "content-type": "application/json",
      ...(options.apiVersion ? { "api-version": options.apiVersion } : {}),
      ...(options.idempotencyKey
        ? { "idempotency-key": options.idempotencyKey }
        : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const errorPayload = (payload || {}) as XenditErrorPayload;
    const firstDetail = errorPayload.errors?.find((item) => item.message)?.message;
    throw new XenditApiError(
      firstDetail ||
        errorPayload.message ||
        `Xendit request failed with HTTP ${response.status}.`,
      response.status,
      errorPayload.error_code || null
    );
  }

  return payload as T;
}

export type XenditPaymentSession = {
  payment_session_id: string;
  reference_id: string;
  customer_id?: string | null;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELED";
  payment_link_url?: string | null;
  payment_token_id?: string | null;
  payment_id?: string | null;
  recurring_plan_id?: string | null;
};

export type XenditSubscriptionSession = XenditPaymentSession;

export async function createXenditPaymentSession(
  payload: Record<string, unknown>,
  idempotencyKey: string
) {
  return xenditRequest<XenditPaymentSession>("/sessions", {
    method: "POST",
    body: payload,
    apiVersion: XENDIT_RECURRING_API_VERSION,
    idempotencyKey,
  });
}

export async function createXenditSubscriptionSession(
  payload: Record<string, unknown>,
  idempotencyKey: string
) {
  return createXenditPaymentSession(payload, idempotencyKey);
}

export async function cancelXenditSession(sessionId: string) {
  return xenditRequest<XenditSubscriptionSession>(
    `/sessions/${encodeURIComponent(sessionId)}/cancel`,
    {
      method: "POST",
      apiVersion: XENDIT_RECURRING_API_VERSION,
    }
  );
}

export async function deactivateXenditSubscriptionPlan(planId: string) {
  return xenditRequest<Record<string, unknown>>(
    `/recurring/plans/${encodeURIComponent(planId)}/deactivate`,
    {
      method: "POST",
      apiVersion: XENDIT_RECURRING_API_VERSION,
    }
  );
}

export function verifyXenditWebhookToken(receivedToken: string | null) {
  if (!receivedToken) return false;

  const expected = Buffer.from(getXenditWebhookToken());
  const received = Buffer.from(receivedToken.trim());

  return expected.length === received.length && timingSafeEqual(expected, received);
}
