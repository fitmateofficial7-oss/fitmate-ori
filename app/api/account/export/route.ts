import { NextRequest, NextResponse } from "next/server";

import {
  createServiceRoleClient,
  getBearerUser,
} from "@/lib/server-auth";
import { recordMonitoringEvent } from "@/lib/server-monitoring";
import { createStoredZip } from "@/lib/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_TABLES = [
  "fitness_profiles",
  "workout_plans",
  "workout_sessions",
  "workout_exercise_logs",
  "workout_set_logs",
  "weight_logs",
  "readiness_logs",
  "adaptive_recommendations",
  "body_measurements",
  "progress_photos",
  "jogging_sessions",
  "coach_messages",
  "nutrition_analyses",
  "nutrition_entries",
  "nutrition_targets",
  "reminder_preferences",
  "user_subscriptions",
  "billing_transactions",
  "plan_generation_usage",
  "workout_plan_versions",
  "user_consents",
  "ai_feature_usage_lifetime",
  "ai_feature_usage_daily",
] as const;

export async function GET(request: NextRequest) {
  const admin = createServiceRoleClient();
  const user = await getBearerUser(request, admin);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const results = await Promise.all(
    USER_TABLES.map(async (table) => {
      const { data, error } = await admin
        .from(table)
        .select("*")
        .eq("user_id", user.id)
        .limit(10_000);

      return {
        table,
        data: data || [],
        error: error?.message || null,
      };
    })
  );

  const exportData = Object.fromEntries(
    results.map((result) => [result.table, result.data])
  );
  const warnings = results
    .filter((result) => result.error)
    .map((result) => `${result.table}: ${result.error}`);

  const zipEntries: Array<{
    name: string;
    data: Uint8Array | Buffer | string;
    modifiedAt?: Date;
  }> = [];
  const progressPhotos = (exportData.progress_photos || []) as Array<{
    id?: string;
    storage_path?: string;
    created_at?: string;
    [key: string]: unknown;
  }>;
  const MAX_PHOTOS = 500;
  const MAX_TOTAL_PHOTO_BYTES = 100 * 1024 * 1024;
  let totalPhotoBytes = 0;
  let exportedPhotoCount = 0;

  for (const [index, photo] of progressPhotos.slice(0, MAX_PHOTOS).entries()) {
    const storagePath = photo.storage_path;
    if (!storagePath) continue;

    const { data: photoBlob, error: photoError } = await admin.storage
      .from("progress-photos")
      .download(storagePath);

    if (photoError || !photoBlob) {
      warnings.push(
        `progress photo ${storagePath}: ${photoError?.message || "file is unavailable"}`
      );
      continue;
    }

    const bytes = Buffer.from(await photoBlob.arrayBuffer());
    if (totalPhotoBytes + bytes.length > MAX_TOTAL_PHOTO_BYTES) {
      warnings.push(
        "Progress-photo export stopped after reaching the 100 MB safety limit."
      );
      break;
    }

    const originalName = storagePath.split("/").pop() || `photo-${index + 1}.jpg`;
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const idPrefix = String(photo.id || index + 1).replace(/[^a-zA-Z0-9_-]/g, "");
    const createdAt = photo.created_at ? new Date(photo.created_at) : undefined;

    zipEntries.push({
      name: `progress-photos/${idPrefix}-${safeName}`,
      data: bytes,
      modifiedAt:
        createdAt && Number.isFinite(createdAt.getTime()) ? createdAt : undefined,
    });
    totalPhotoBytes += bytes.length;
    exportedPhotoCount += 1;
  }

  if (progressPhotos.length > MAX_PHOTOS) {
    warnings.push(
      `Only the first ${MAX_PHOTOS} progress photos were included in this export.`
    );
  }

  const exportedAt = new Date().toISOString();
  const manifest = {
    exported_at: exportedAt,
    manifest_content_type: "application/json",
    user: {
      id: user.id,
      email: user.email || null,
      created_at: user.created_at,
    },
    export_summary: {
      progress_photos_in_database: progressPhotos.length,
      progress_photo_files_included: exportedPhotoCount,
      progress_photo_bytes_included: totalPhotoBytes,
    },
    data: exportData,
    warnings,
  };

  zipEntries.unshift({
    name: "fitmate-data.json",
    data: JSON.stringify(manifest, null, 2),
    modifiedAt: new Date(exportedAt),
  });

  const archive = createStoredZip(zipEntries);

  void recordMonitoringEvent({
    source: "account",
    eventType: "data_exported",
    userId: user.id,
    route: "/api/account/export",
    metadata: {
      warnings,
      progressPhotoFiles: exportedPhotoCount,
      archiveBytes: archive.length,
    },
  });

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="fitmate-data-${exportedAt.slice(0, 10)}.zip"`,
      "content-length": String(archive.length),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
