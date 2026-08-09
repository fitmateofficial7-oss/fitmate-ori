import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type AdminContext = {
  admin: SupabaseClient;
  user: User;
  email: string;
};

function getAdminEmails() {
  return new Set(
    (process.env.FITMATE_ADMIN_EMAILS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getAdminServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function authenticateAdminRequest(
  request: NextRequest
): Promise<
  | { ok: true; context: AdminContext }
  | { ok: false; status: 401 | 403 | 503; error: string }
> {
  const admin = getAdminServerClient();
  if (!admin) {
    return {
      ok: false,
      status: 503,
      error: "Konfigurasi server admin belum lengkap.",
    };
  }

  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) {
    return { ok: false, status: 401, error: "Sesi login tidak ditemukan." };
  }

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  const email = user?.email?.trim().toLowerCase();
  if (error || !user || !email) {
    return { ok: false, status: 401, error: "Sesi login tidak valid." };
  }

  const adminEmails = getAdminEmails();
  if (adminEmails.size === 0 || !adminEmails.has(email)) {
    return {
      ok: false,
      status: 403,
      error: "Akun ini tidak memiliki akses admin FitMate.",
    };
  }

  return { ok: true, context: { admin, user, email } };
}
