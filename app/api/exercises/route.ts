import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { recordMonitoringEvent } from "@/lib/server-monitoring";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!supabasePublicKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  );
}

const supabase =
  createClient(
    supabaseUrl,
    supabasePublicKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

export async function GET() {
  try {
    const {
      data,
      error,
    } =
      await supabase
        .from("exercises")
        .select("*")
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        });

    if (error) {
      console.error(
        "GET EXERCISES ERROR:",
        error
      );

      await recordMonitoringEvent({
        source: "exercises",
        eventType: "exercise_library_failed",
        severity: "error",
        route: "/api/exercises",
        message: error.message,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        exercises: data || [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error(
      "EXERCISES API ERROR:",
      error
    );

    await recordMonitoringEvent({
      source: "exercises",
      eventType: "exercise_library_failed",
      severity: "error",
      route: "/api/exercises",
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch exercises.",
    });

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to fetch exercises.",
      },
      {
        status: 500,
      }
    );
  }
}
