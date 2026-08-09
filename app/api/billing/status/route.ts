import { NextRequest, NextResponse } from "next/server";

import { getBillingStatus } from "@/lib/billing-server";
import { createServiceRoleClient, getBearerUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = createServiceRoleClient();
    const user = await getBearerUser(request, admin);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please login again." },
        { status: 401 }
      );
    }

    const status = await getBillingStatus(admin, user.id);
    return NextResponse.json(status, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to load billing status.",
      },
      { status: 500 }
    );
  }
}
