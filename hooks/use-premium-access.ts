"use client";

import { useCallback, useEffect, useState } from "react";

import type { BillingStatusResponse } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

type PremiumAccessState = {
  billing: BillingStatusResponse | null;
  isPremium: boolean;
  loading: boolean;
  error: string;
  refresh: () => Promise<BillingStatusResponse | null>;
};

export function usePremiumAccess(): PremiumAccessState {
  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setBilling(null);
        setError("AUTH_REQUIRED");
        return null;
      }

      const response = await fetch("/api/billing/status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | BillingStatusResponse
        | { success?: false; error?: string };

      if (!response.ok || payload.success !== true) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Unable to load Premium access."
        );
      }

      setBilling(payload);
      return payload;
    } catch (accessError) {
      setBilling(null);
      setError(
        accessError instanceof Error
          ? accessError.message
          : "Unable to load Premium access."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    billing,
    isPremium: Boolean(billing?.isPremium),
    loading,
    error,
    refresh,
  };
}
