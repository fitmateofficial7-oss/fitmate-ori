import "server-only";

import { createClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export function getServerSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server configuration is incomplete.");
  }

  return { supabaseUrl, serviceRoleKey };
}

export function createServiceRoleClient() {
  const config = getServerSupabaseConfig();

  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getBearerUser(
  request: NextRequest,
  admin = createServiceRoleClient()
): Promise<User | null> {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  return error ? null : user;
}
