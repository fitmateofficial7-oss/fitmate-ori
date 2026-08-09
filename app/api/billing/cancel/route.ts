import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient, getBearerUser } from "@/lib/server-auth";
import { cancelSubscriptionForUser } from "@/lib/subscription-management";
import { XenditApiError } from "@/lib/xendit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const admin = createServiceRoleClient();
  const user = await getBearerUser(request, admin);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please login again." },
      { status: 401 }
    );
  }

  try {
    const result = await cancelSubscriptionForUser(admin, user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof XenditApiError
            ? `Payment provider error: ${error.message}`
            : error instanceof Error
              ? error.message
              : "Unable to cancel subscription.",
      },
      { status: error instanceof XenditApiError ? 502 : 500 }
    );
  }
}
