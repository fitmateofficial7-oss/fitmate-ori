"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

import {
  cancelRestTimerNotification,
  clearRestTimerDeliveredNotification,
  prepareRestTimerNotifications,
  REST_TIMER_STOP_ACTION,
  REST_TIMER_STOP_EVENT,
  REST_TIMER_STORAGE_KEY,
} from "@/lib/rest-timer-notifications";

export default function RestTimerNotificationManager() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let removeActionListener: (() => Promise<void>) | null = null;

    void (async () => {
      await prepareRestTimerNotifications();
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const handle = await LocalNotifications.addListener(
        "localNotificationActionPerformed",
        async ({ actionId }) => {
          if (actionId !== REST_TIMER_STOP_ACTION) return;
          try {
            window.localStorage.removeItem(REST_TIMER_STORAGE_KEY);
          } catch {
            // Storage is optional.
          }
          await cancelRestTimerNotification();
          await clearRestTimerDeliveredNotification();
          window.dispatchEvent(new Event(REST_TIMER_STOP_EVENT));
        }
      );
      if (disposed) await handle.remove();
      else removeActionListener = handle.remove;
    })();

    return () => {
      disposed = true;
      void removeActionListener?.();
    };
  }, []);

  return null;
}
