"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

type ClientEvent = {
  eventType: string;
  severity?: "info" | "warning" | "error";
  message?: string;
  metadata?: Record<string, unknown>;
};

const recentFingerprints = new Map<string, number>();

function safeErrorMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "Unknown client error";
  }
}

export async function reportClientEvent(
  event: ClientEvent
) {
  try {
    const fingerprint = [
      event.eventType,
      event.message || "",
      window.location.pathname,
    ].join("|");
    const now = Date.now();
    const previous = recentFingerprints.get(fingerprint);

    if (previous && now - previous < 30_000) {
      return;
    }

    recentFingerprints.set(fingerprint, now);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return;
    }

    await fetch("/api/monitoring/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...event,
        route: window.location.pathname,
        metadata: {
          ...event.metadata,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          online: navigator.onLine,
        },
      }),
      keepalive: true,
    });
  } catch {
    // Monitoring is intentionally silent and never blocks the app.
  }
}

export default function ClientMonitoring() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      void reportClientEvent({
        eventType: "client_error",
        severity: "error",
        message:
          event.message ||
          safeErrorMessage(event.error),
        metadata: {
          filename: event.filename || null,
          line: event.lineno || null,
          column: event.colno || null,
        },
      });
    };

    const handleRejection = (
      event: PromiseRejectionEvent
    ) => {
      void reportClientEvent({
        eventType: "unhandled_rejection",
        severity: "error",
        message: safeErrorMessage(event.reason),
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener(
      "unhandledrejection",
      handleRejection
    );

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleRejection
      );
    };
  }, []);

  return null;
}
