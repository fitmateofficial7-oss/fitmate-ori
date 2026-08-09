import "server-only";

import { createClient } from "@supabase/supabase-js";

export type MonitoringSeverity =
  | "info"
  | "warning"
  | "error";

export type MonitoringEventInput = {
  source: string;
  eventType: string;
  severity?: MonitoringSeverity;
  userId?: string | null;
  route?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
  durationMs?: number | null;
  aiModel?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCostUsd?: number | null;
};

type OpenAIUsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
} | null | undefined;

function optionalAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function safeNumber(value: unknown) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function configuredRate(name: string) {
  const value = Number(process.env[name]);

  return Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function estimateAiCostUsd(
  usage: OpenAIUsageLike
) {
  const inputRate = configuredRate(
    "FITMATE_AI_INPUT_USD_PER_1M"
  );
  const outputRate = configuredRate(
    "FITMATE_AI_OUTPUT_USD_PER_1M"
  );

  if (
    inputRate === null ||
    outputRate === null ||
    !usage
  ) {
    return null;
  }

  const inputTokens =
    safeNumber(usage.input_tokens) || 0;
  const outputTokens =
    safeNumber(usage.output_tokens) || 0;

  return (
    (inputTokens / 1_000_000) * inputRate +
    (outputTokens / 1_000_000) * outputRate
  );
}

export async function recordMonitoringEvent(
  input: MonitoringEventInput
) {
  const admin = optionalAdminClient();

  if (!admin) {
    return false;
  }

  const { error } = await admin
    .from("app_events")
    .insert({
      user_id: input.userId || null,
      source: input.source.slice(0, 80),
      event_type: input.eventType.slice(0, 100),
      severity: input.severity || "info",
      route: input.route?.slice(0, 240) || null,
      message: input.message?.slice(0, 2_000) || null,
      metadata: input.metadata || {},
      duration_ms: safeNumber(input.durationMs),
      ai_model: input.aiModel?.slice(0, 120) || null,
      input_tokens: safeNumber(input.inputTokens),
      output_tokens: safeNumber(input.outputTokens),
      estimated_cost_usd: safeNumber(
        input.estimatedCostUsd
      ),
    });

  if (error) {
    // Monitoring must never break the user-facing request.
    console.warn(
      "FitMate monitoring event could not be stored:",
      error.message
    );
    return false;
  }

  return true;
}

export async function recordAiMonitoringEvent({
  source,
  eventType,
  userId,
  route,
  model,
  usage,
  durationMs,
  metadata,
}: {
  source: string;
  eventType: string;
  userId?: string | null;
  route: string;
  model: string;
  usage: OpenAIUsageLike;
  durationMs: number;
  metadata?: Record<string, unknown>;
}) {
  return recordMonitoringEvent({
    source,
    eventType,
    severity: "info",
    userId,
    route,
    message: "AI request completed.",
    metadata: {
      ...metadata,
      total_tokens:
        safeNumber(usage?.total_tokens) || null,
    },
    durationMs,
    aiModel: model,
    inputTokens:
      safeNumber(usage?.input_tokens) || null,
    outputTokens:
      safeNumber(usage?.output_tokens) || null,
    estimatedCostUsd: estimateAiCostUsd(usage),
  });
}
