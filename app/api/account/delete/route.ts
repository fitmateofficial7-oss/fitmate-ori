import { NextRequest, NextResponse } from "next/server";

import {
  createServiceRoleClient,
  getBearerUser,
} from "@/lib/server-auth";
import { recordMonitoringEvent } from "@/lib/server-monitoring";
import { cancelSubscriptionForUser } from "@/lib/subscription-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const admin = createServiceRoleClient();
  const user = await getBearerUser(request, admin);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const payload = (await request.json().catch(() => ({}))) as {
    confirmation?: string;
    reason?: string;
  };

  if (payload.confirmation !== "HAPUS AKUN") {
    return NextResponse.json(
      {
        success: false,
        error: "Type HAPUS AKUN exactly to confirm deletion.",
      },
      { status: 400 }
    );
  }

  await admin.from("account_deletion_requests").insert({
    user_id: user.id,
    email: user.email || null,
    reason: payload.reason?.slice(0, 1_000) || null,
    status: "processing",
  });

  try {
    // A provider-side recurring plan must be stopped before deleting the local
    // user, otherwise the customer could continue to be charged after their
    // account and billing records have been removed.
    await cancelSubscriptionForUser(admin, user.id);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `Account deletion was stopped because the subscription could not be canceled: ${error.message}`
            : "Account deletion was stopped because the subscription could not be canceled.",
      },
      { status: 502 }
    );
  }

  const { data: objects } = await admin.storage
    .from("progress-photos")
    .list(user.id, { limit: 1_000 });

  if (objects && objects.length > 0) {
    await admin.storage
      .from("progress-photos")
      .remove(objects.map((object) => `${user.id}/${object.name}`));
  }

  void recordMonitoringEvent({
    source: "account",
    eventType: "account_deleted",
    severity: "warning",
    userId: user.id,
    route: "/api/account/delete",
    message: "User requested permanent account deletion.",
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Unable to delete account: ${error.message}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
