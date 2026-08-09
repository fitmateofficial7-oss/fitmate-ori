import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateAdminRequest(request);

  if (!auth.ok) {
    return NextResponse.json(
      { success: false, isAdmin: false, error: auth.error },
      { status: auth.status }
    );
  }

  return NextResponse.json({
    success: true,
    isAdmin: true,
    email: auth.context.email,
  });
}
