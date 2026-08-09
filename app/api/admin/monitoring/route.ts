import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkoutSessionMonitorRow = {
  user_id: string | null;
  status: string;
  created_at: string;
};

type CoachMessageMonitorRow = {
  user_id: string | null;
  mode: string;
  role: string;
  created_at: string;
};

type SubscriptionMonitorRow = {
  user_id: string;
  status: string;
  amount: number | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type BillingTransactionMonitorRow = {
  status: string;
  amount: number | null;
  created_at: string;
};

type AppEventRow = {
  id: number;
  user_id: string | null;
  source: string;
  event_type: string;
  severity: "info" | "warning" | "error";
  route: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  duration_ms: number | null;
  ai_model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number | null;
  created_at: string;
};

function dayKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(
    typeof value === "string" ? new Date(value) : value
  );
}

function serverConfig() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const adminEmails = new Set(
    (process.env.FITMATE_ADMIN_EMAILS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    adminEmails,
  };
}

export async function GET(request: NextRequest) {
  const config = serverConfig();

  if (!config) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Server monitoring configuration is incomplete.",
      },
      { status: 503 }
    );
  }

  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const admin = createClient(
    config.supabaseUrl,
    config.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  const email = user?.email?.trim().toLowerCase();

  if (authError || !user || !email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  if (
    config.adminEmails.size === 0 ||
    !config.adminEmails.has(email)
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "This account is not allowed to view FitMate monitoring.",
      },
      { status: 403 }
    );
  }

  const now = new Date();
  const since = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1_000
  ).toISOString();
  const billingSince = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1_000
  ).toISOString();
  const today = dayKey(now);
  const [
    eventsResult,
    sessionsResult,
    coachResult,
    subscriptionsResult,
    transactionsResult,
  ] = await Promise.all([
    admin
      .from("app_events")
      .select(
        "id, user_id, source, event_type, severity, route, message, metadata, duration_ms, ai_model, input_tokens, output_tokens, estimated_cost_usd, created_at"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1_000),
    admin
      .from("workout_sessions")
      .select("user_id, status, created_at")
      .gte("created_at", since),
    admin
      .from("coach_messages")
      .select("user_id, mode, role, created_at")
      .eq("role", "user")
      .gte("created_at", since),
    admin
      .from("user_subscriptions")
      .select("user_id, status, amount, current_period_end, cancel_at_period_end"),
    admin
      .from("billing_transactions")
      .select("status, amount, created_at")
      .gte("created_at", billingSince),
  ]);

  if (eventsResult.error) {
    return NextResponse.json(
      {
        success: false,
        migrationPending: true,
        error:
          "Monitoring database is not ready. Run migration 202607270007_monitoring.sql.",
      },
      { status: 503 }
    );
  }

  if (subscriptionsResult.error || transactionsResult.error) {
    return NextResponse.json(
      {
        success: false,
        migrationPending: true,
        error:
          "Subscription monitoring is not ready. Apply migrations 202607300009 through 202607300012.",
      },
      { status: 503 }
    );
  }

  const events =
    (eventsResult.data || []) as AppEventRow[];
  const sessions = (sessionsResult.data || []) as WorkoutSessionMonitorRow[];
  const coachMessages = (coachResult.data || []) as CoachMessageMonitorRow[];
  const subscriptions = (subscriptionsResult.data || []) as SubscriptionMonitorRow[];
  const billingTransactions = (transactionsResult.data || []) as BillingTransactionMonitorRow[];
  const activePremiumSubscriptions = subscriptions.filter((subscription) => {
    if (!["active", "canceled"].includes(subscription.status)) return false;
    if (!subscription.current_period_end) return false;
    const periodEnd = new Date(subscription.current_period_end);
    return Number.isFinite(periodEnd.getTime()) && periodEnd.getTime() > now.getTime();
  });
  const successfulPayments30d = billingTransactions.filter(
    (transaction) => transaction.status === "succeeded"
  );
  const failedPayments30d = billingTransactions.filter((transaction) =>
    ["failed", "retrying"].includes(transaction.status)
  );
  const revenueIdr30d = successfulPayments30d.reduce(
    (total, transaction) => total + Math.max(0, Number(transaction.amount || 0)),
    0
  );
  const estimatedMrrIdr = activePremiumSubscriptions.reduce(
    (total, subscription) => total + Math.max(0, Number(subscription.amount || 0)),
    0
  );
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      now.getTime() -
        (6 - index) * 24 * 60 * 60 * 1_000
    );
    const key = dayKey(date);
    const dayEvents = events.filter(
      (event) => dayKey(event.created_at) === key
    );

    return {
      date: key,
      events: dayEvents.length,
      errors: dayEvents.filter(
        (event) => event.severity === "error"
      ).length,
      aiRequests: dayEvents.filter(
        (event) => event.ai_model
      ).length,
      estimatedCostUsd: dayEvents.reduce(
        (total, event) =>
          total + (event.estimated_cost_usd || 0),
        0
      ),
    };
  });
  const todayEvents = events.filter(
    (event) => dayKey(event.created_at) === today
  );
  const aiEvents = events.filter(
    (event) => event.ai_model
  );
  const durations = events
    .map((event) => event.duration_ms)
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value)
    );
  const activeUsers = new Set([
    ...events.map((event) => event.user_id),
    ...sessions.map((session) => session.user_id),
    ...coachMessages.map((message) => message.user_id),
  ]);
  activeUsers.delete(null);

  return NextResponse.json({
    success: true,
    generatedAt: now.toISOString(),
    range: {
      from: since,
      to: now.toISOString(),
      timezone: "Asia/Jakarta",
    },
    summary: {
      eventsToday: todayEvents.length,
      errorsToday: todayEvents.filter(
        (event) => event.severity === "error"
      ).length,
      aiRequests7d: aiEvents.length,
      estimatedAiCostUsd7d: aiEvents.reduce(
        (total, event) =>
          total + (event.estimated_cost_usd || 0),
        0
      ),
      inputTokens7d: aiEvents.reduce(
        (total, event) =>
          total + (event.input_tokens || 0),
        0
      ),
      outputTokens7d: aiEvents.reduce(
        (total, event) =>
          total + (event.output_tokens || 0),
        0
      ),
      activeUsers7d: activeUsers.size,
      workouts7d: sessions.length,
      completedWorkouts7d: sessions.filter(
        (session) => session.status === "completed"
      ).length,
      consultationsToday: coachMessages.filter(
        (message) =>
          dayKey(message.created_at) === today &&
          message.mode === "chat"
      ).length,
      mealScansToday: coachMessages.filter(
        (message) =>
          dayKey(message.created_at) === today &&
          message.mode === "nutrition"
      ).length,
      activePremiumSubscriptions: activePremiumSubscriptions.length,
      cancelingPremiumSubscriptions: activePremiumSubscriptions.filter(
        (subscription) => subscription.cancel_at_period_end
      ).length,
      successfulPayments30d: successfulPayments30d.length,
      failedPayments30d: failedPayments30d.length,
      revenueIdr30d,
      estimatedMrrIdr,
      averageDurationMs:
        durations.length > 0
          ? Math.round(
              durations.reduce(
                (total, value) => total + value,
                0
              ) / durations.length
            )
          : 0,
    },
    pricingConfigured:
      Number.isFinite(
        Number(
          process.env.FITMATE_AI_INPUT_USD_PER_1M
        )
      ) &&
      Number.isFinite(
        Number(
          process.env.FITMATE_AI_OUTPUT_USD_PER_1M
        )
      ),
    days,
    recentErrors: events
      .filter((event) => event.severity === "error")
      .slice(0, 20),
    recentEvents: events.slice(0, 30),
    externalDashboards: {
      hostinger: "https://hpanel.hostinger.com/",
      supabase: "https://supabase.com/dashboard",
      openai: "https://platform.openai.com/usage",
      sentry: "https://sentry.io/",
    },
  });
}
