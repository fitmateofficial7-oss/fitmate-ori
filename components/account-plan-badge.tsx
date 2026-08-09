"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import type { BillingStatusResponse } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

export default function AccountPlanBadge() {
  const { tr } = useLanguage();
  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);
  const [visible, setVisible] = useState(false);

  const loadStatus = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setVisible(false);
      setBilling(null);
      return;
    }

    try {
      const response = await fetch("/api/billing/status", {
        headers: { authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as BillingStatusResponse;

      if (!response.ok || !payload.success) {
        throw new Error("Unable to load account plan.");
      }

      setBilling(payload);
      setVisible(true);
    } catch {
      // Never guess FREE when status cannot be verified. Hiding the badge is
      // safer than showing an incorrect account plan during a network outage.
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();

    const intervalId = window.setInterval(() => void loadStatus(), 60_000);
    const handleRefresh = () => void loadStatus();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadStatus();
    };
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setVisible(false);
        setBilling(null);
        return;
      }

      window.setTimeout(() => void loadStatus(), 0);
    });

    window.addEventListener("fitmate-billing-updated", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("fitmate-billing-updated", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
      authListener.subscription.unsubscribe();
    };
  }, [loadStatus]);

  if (!visible || !billing) return null;

  const premium = billing.isPremium;
  const label = premium ? "PREMIUM" : "FREE";
  const description = premium
    ? tr("Akun Premium aktif", "Premium account active")
    : tr("Akun paket Free", "Free plan account");

  return (
    <Link
      href="/premium"
      data-testid="account-plan-badge"
      aria-label={`${description}. ${tr("Buka detail paket", "Open plan details")}`}
      title={`${description} · ${tr("Klik untuk melihat detail", "Click for details")}`}
      className={`fitmate-account-plan-badge ${
        premium ? "is-premium" : "is-free"
      }`}
    >
      <span aria-hidden="true">{premium ? "✦" : "●"}</span>
      <span>{label}</span>
    </Link>
  );
}
