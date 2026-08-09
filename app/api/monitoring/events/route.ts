import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { recordMonitoringEvent } from "@/lib/server-monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EventSchema = z.object({
  eventType: z.string().trim().min(1).max(100),
  severity: z
    .enum(["info", "warning", "error"])
    .optional(),
  route: z.string().trim().max(240).optional(),
  message: z.string().trim().max(2_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function config() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey };
}

export async function POST(request: NextRequest) {
  const serverConfig = config();

  if (!serverConfig) {
    return NextResponse.json(
      {
        success: false,
        error: "Monitoring is not configured.",
      },
      { status: 503 }
    );
  }

  const authorization =
    request.headers.get("authorization");
  const token = authorization
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const admin = createClient(
    serverConfig.supabaseUrl,
    serverConfig.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON." },
      { status: 400 }
    );
  }

  const parsed = EventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid monitoring event.",
      },
      { status: 400 }
    );
  }

  const stored = await recordMonitoringEvent({
    source: "browser",
    eventType: parsed.data.eventType,
    severity: parsed.data.severity,
    userId: user.id,
    route: parsed.data.route,
    message: parsed.data.message,
    metadata: parsed.data.metadata,
  });

  return NextResponse.json(
    { success: stored },
    { status: stored ? 201 : 503 }
  );
}
