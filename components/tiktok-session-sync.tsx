"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { identifyTikTokUser, logoutTikTokUser } from "@/lib/tiktok-business";

/**
 * Keeps TikTok Advanced Matching identity aligned with the current Supabase session.
 * Native Android only; browser/PWA calls are silent no-ops.
 */
export default function TikTokSessionSync() {
  useEffect(() => {
    let active = true;

    const identifyCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) return;
      await identifyTikTokUser({
        id: user.id,
        email: user.email,
        phoneNumber: user.phone,
        userName:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null,
      });
    };

    void identifyCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        void logoutTikTokUser();
        return;
      }

      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        const user = session.user;
        void identifyTikTokUser({
          id: user.id,
          email: user.email,
          phoneNumber: user.phone,
          userName:
            typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : null,
        });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
