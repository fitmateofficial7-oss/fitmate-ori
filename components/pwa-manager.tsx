"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

const OFFLINE_QUEUE_KEY = "fitmate_offline_mutations";

export type OfflineMutation = {
  id: string;
  table: string;
  operation: "insert" | "upsert" | "update";
  payload: Record<string, unknown>;
  filters?: Record<string, string | number | boolean>;
  createdAt: string;
};

export function queueOfflineMutation(mutation: Omit<OfflineMutation, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const current = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]") as OfflineMutation[];
  current.push({
    ...mutation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current.slice(-500)));
  window.dispatchEvent(new Event("fitmate-offline-queue-changed"));
}

export function getOfflineQueue() {
  if (typeof window === "undefined") return [] as OfflineMutation[];
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]") as OfflineMutation[];
  } catch {
    return [] as OfflineMutation[];
  }
}

export function clearOfflineMutation(id: string) {
  const next = getOfflineQueue().filter((item) => item.id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
}

export default function PwaManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    const hadController = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    };

    const activateWaitingWorker = (registration: ServiceWorkerRegistration) => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        activateWaitingWorker(registration);
        await registration.update();

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              registration.waiting?.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch (error) {
        console.warn("Service worker registration failed:", error);
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );
    void register();

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  }, []);

  useEffect(() => {
    const syncQueue = async () => {
      if (!navigator.onLine) return;
      const queue = getOfflineQueue();

      for (const item of queue) {
        try {
          let query;
          if (item.operation === "insert") {
            query = supabase.from(item.table).insert(item.payload);
          } else if (item.operation === "upsert") {
            const onConflict = item.table === "workout_set_logs"
              ? "workout_exercise_log_id,set_number"
              : undefined;
            query = supabase.from(item.table).upsert(item.payload, { onConflict });
          } else {
            let updateQuery = supabase.from(item.table).update(item.payload);
            for (const [key, value] of Object.entries(item.filters || {})) {
              updateQuery = updateQuery.eq(key, value);
            }
            query = updateQuery;
          }

          const { error } = await query;
          if (!error) clearOfflineMutation(item.id);
        } catch (error) {
          console.warn("Offline mutation sync failed:", error);
        }
      }
    };

    window.addEventListener("online", syncQueue);
    void syncQueue();
    return () => window.removeEventListener("online", syncQueue);
  }, []);

  useEffect(() => {
    const checkWorkoutReminder = async () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("reminder_preferences")
        .select("enabled, workout_days, workout_time, timezone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data?.enabled) return;
      const timezone = data.timezone || "Asia/Jakarta";
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const value = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value || "";
      const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
      const weekday = weekdayMap[value("weekday")];
      const workoutDays = Array.isArray(data.workout_days) ? data.workout_days : [];
      if (!workoutDays.includes(weekday)) return;

      const currentTime = `${value("hour")}:${value("minute")}`;
      const workoutTime = String(data.workout_time || "18:00").slice(0, 5);
      if (currentTime < workoutTime) return;

      const date = `${value("year")}-${value("month")}-${value("day")}`;
      const reminderKey = `fitmate_workout_reminder_${user.id}_${date}`;
      if (localStorage.getItem(reminderKey)) return;

      const registration = await navigator.serviceWorker.ready;
      const english = window.localStorage.getItem("fitmate_language") === "en";
      await registration.showNotification(
        english ? "Time to train with FitMate" : "Waktunya latihan bersama FitMate",
        {
        body: english
          ? "Open today’s workout, check your readiness, and log each set."
          : "Buka latihan hari ini, cek kesiapan, lalu catat setiap set.",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: "/workout" },
        tag: `fitmate-workout-${date}`,
        }
      );
      localStorage.setItem(reminderKey, new Date().toISOString());
    };

    const interval = window.setInterval(() => void checkWorkoutReminder(), 60_000);
    void checkWorkoutReminder();
    return () => window.clearInterval(interval);
  }, []);

  return null;
}
