import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionRow = {
  id: string;
  user_id: string;
  status: string;
  amount: number;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function hasAccess(row: SubscriptionRow, now = Date.now()) {
  if (!["active", "past_due", "canceled"].includes(row.status)) return false;
  if (!row.current_period_end) return false;
  const end = new Date(row.current_period_end).getTime();
  return Number.isFinite(end) && end > now;
}

function isManual(row: SubscriptionRow) {
  const metadata = row.metadata || {};
  return (
    metadata.source === "admin_manual" ||
    metadata.granted_manually === true ||
    metadata.subscription_source === "manual"
  );
}

function normalizeDays(value: unknown) {
  const days = Math.round(Number(value));
  if (!Number.isFinite(days) || days < 1 || days > 730) return null;
  return days;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { admin } = auth.context;
  const search = (request.nextUrl.searchParams.get("q") || "")
    .trim()
    .toLowerCase();
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
  const perPage = 100;

  // Supabase Auth does not expose auth.users through the normal REST schema.
  // Fetch a bounded user set with the service-role Admin API, then merge billing state.
  const users: User[] = [];
  let authPage = 1;
  const maxPages = search ? 10 : 1;

  while (authPage <= maxPages) {
    const result = await admin.auth.admin.listUsers({ page: authPage, perPage });
    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 }
      );
    }

    users.push(...result.data.users);
    if (result.data.users.length < perPage || !search) break;
    authPage += 1;
  }

  const filtered = users.filter((user) => {
    if (!search) return true;
    const email = (user.email || "").toLowerCase();
    const fullName = String(
      user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        ""
    ).toLowerCase();
    return email.includes(search) || fullName.includes(search) || user.id.includes(search);
  });

  const pageUsers = search
    ? filtered.slice((page - 1) * perPage, page * perPage)
    : filtered;
  const userIds = pageUsers.map((user) => user.id);

  let subscriptions: SubscriptionRow[] = [];
  if (userIds.length > 0) {
    const result = await admin
      .from("user_subscriptions")
      .select(
        "id, user_id, status, amount, current_period_start, current_period_end, cancel_at_period_end, metadata, created_at"
      )
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 }
      );
    }
    subscriptions = (result.data || []) as SubscriptionRow[];
  }

  const now = Date.now();
  const items = pageUsers.map((user) => {
    const userSubscriptions = subscriptions.filter((item) => item.user_id === user.id);
    const active =
      userSubscriptions.find((item) => hasAccess(item, now)) ||
      userSubscriptions[0] ||
      null;
    const manual = active ? isManual(active) : false;

    return {
      id: user.id,
      email: user.email || "",
      name: String(
        user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          ""
      ),
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at || null,
      isPremium: Boolean(active && hasAccess(active, now)),
      subscription: active
        ? {
            id: active.id,
            status: active.status,
            amount: Number(active.amount || 0),
            currentPeriodStart: active.current_period_start,
            currentPeriodEnd: active.current_period_end,
            cancelAtPeriodEnd: Boolean(active.cancel_at_period_end),
            source: manual ? "manual" : "xendit",
          }
        : null,
    };
  });

  return NextResponse.json({
    success: true,
    users: items,
    page,
    perPage,
    hasMore: !search && pageUsers.length === perPage,
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { admin, email: adminEmail } = auth.context;
  const body = (await request.json().catch(() => null)) as
    | { userId?: string; action?: string; days?: number }
    | null;
  const userId = body?.userId?.trim();
  const action = body?.action;

  if (!userId || !["grant", "extend", "revoke"].includes(action || "")) {
    return NextResponse.json(
      { success: false, error: "Permintaan admin tidak valid." },
      { status: 400 }
    );
  }

  const { data: targetResult, error: targetError } =
    await admin.auth.admin.getUserById(userId);
  if (targetError || !targetResult.user) {
    return NextResponse.json(
      { success: false, error: "User tidak ditemukan." },
      { status: 404 }
    );
  }

  const { data: subscriptionRows, error: subscriptionError } = await admin
    .from("user_subscriptions")
    .select(
      "id, user_id, status, amount, current_period_start, current_period_end, cancel_at_period_end, metadata, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (subscriptionError) {
    return NextResponse.json(
      { success: false, error: subscriptionError.message },
      { status: 500 }
    );
  }

  const rows = (subscriptionRows || []) as SubscriptionRow[];
  const activePaid = rows.find((row) => hasAccess(row) && !isManual(row));
  const activeManual = rows.find((row) => hasAccess(row) && isManual(row));

  if (action === "revoke") {
    if (!activeManual) {
      return NextResponse.json(
        {
          success: false,
          error: activePaid
            ? "Akun ini memakai Premium berbayar. Langganan Xendit tidak dicabut dari menu Premium manual."
            : "Tidak ada Premium manual aktif pada akun ini.",
        },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const metadata = {
      ...(activeManual.metadata || {}),
      revoked_manually: true,
      revoked_by: adminEmail,
      revoked_at: nowIso,
    };
    const { error } = await admin
      .from("user_subscriptions")
      .update({
        status: "canceled",
        current_period_end: nowIso,
        next_billing_at: null,
        cancel_at_period_end: false,
        canceled_at: nowIso,
        metadata,
        updated_at: nowIso,
      })
      .eq("id", activeManual.id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Premium manual berhasil dicabut." });
  }

  const days = normalizeDays(body?.days);
  if (!days) {
    return NextResponse.json(
      { success: false, error: "Durasi Premium harus antara 1 sampai 730 hari." },
      { status: 400 }
    );
  }

  if (activePaid) {
    return NextResponse.json(
      {
        success: false,
        error: "Akun ini sudah memiliki Premium berbayar yang aktif.",
      },
      { status: 409 }
    );
  }

  const now = new Date();
  if (activeManual) {
    const previousEnd = activeManual.current_period_end
      ? new Date(activeManual.current_period_end)
      : now;
    const base = previousEnd.getTime() > now.getTime() ? previousEnd : now;
    const nextEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    const metadata = {
      ...(activeManual.metadata || {}),
      source: "admin_manual",
      subscription_source: "manual",
      granted_manually: true,
      last_extended_by: adminEmail,
      last_extended_at: now.toISOString(),
      last_extension_days: days,
    };

    const { error } = await admin
      .from("user_subscriptions")
      .update({
        status: "active",
        current_period_end: nextEnd.toISOString(),
        cancel_at_period_end: false,
        canceled_at: null,
        metadata,
        updated_at: now.toISOString(),
      })
      .eq("id", activeManual.id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Premium manual diperpanjang ${days} hari.`,
      currentPeriodEnd: nextEnd.toISOString(),
    });
  }

  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const referenceId = `manual-${userId.slice(0, 8)}-${crypto.randomUUID()}`;
  const metadata = {
    source: "admin_manual",
    subscription_source: "manual",
    payment_mode: "qris",
    granted_manually: true,
    granted_by: adminEmail,
    granted_at: now.toISOString(),
    granted_days: days,
  };

  const { error } = await admin.from("user_subscriptions").insert({
    user_id: userId,
    provider: "xendit",
    plan_code: "premium_monthly",
    reference_id: referenceId,
    status: "active",
    provider_status: "MANUAL_ADMIN",
    amount: 0,
    currency: "IDR",
    billing_interval: "MONTH",
    interval_count: 1,
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
    next_billing_at: null,
    cancel_at_period_end: false,
    activated_at: now.toISOString(),
    metadata,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Premium manual aktif selama ${days} hari.`,
    currentPeriodEnd: end.toISOString(),
  });
}
