"use client";

import { Capacitor } from "@capacitor/core";

const REST_TIMER_NOTIFICATION_ID = 731001;
const REST_TIMER_CHANNEL_ID = "fitmate-rest-timer";
const REST_TIMER_ACTION_TYPE = "fitmate-rest-timer-actions";
export const REST_TIMER_STOP_ACTION = "stop-rest-timer";
export const REST_TIMER_STOP_EVENT = "fitmate-rest-timer-stop";
export const REST_TIMER_STORAGE_KEY = "fitmate_rest_timer_v3";
function notificationCopy() {
  const english = typeof window !== "undefined" && window.localStorage.getItem("fitmate_language") === "en";
  return english
    ? {
        stop: "Stop",
        channelName: "FitMate Timer",
        channelDescription: "Alarm when rest time ends",
        title: "Rest time is over",
        nextSet: "Continue to the next set.",
      }
    : {
        stop: "Matikan",
        channelName: "Timer FitMate",
        channelDescription: "Alarm saat waktu istirahat selesai",
        title: "Waktu istirahat selesai",
        nextSet: "Lanjut ke set berikutnya.",
      };
}


async function getLocalNotifications() {
  if (!Capacitor.isNativePlatform()) return null;
  const module = await import("@capacitor/local-notifications");
  return module.LocalNotifications;
}

export async function prepareRestTimerNotifications() {
  try {
    const LocalNotifications = await getLocalNotifications();
    if (!LocalNotifications) return false;

    let permission = await LocalNotifications.checkPermissions();
    if (permission.display === "prompt" || permission.display === "prompt-with-rationale") {
      permission = await LocalNotifications.requestPermissions();
    }
    if (permission.display !== "granted") return false;

    const copy = notificationCopy();
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: REST_TIMER_ACTION_TYPE,
          actions: [{ id: REST_TIMER_STOP_ACTION, title: copy.stop }],
        },
      ],
    });

    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: REST_TIMER_CHANNEL_ID,
        name: copy.channelName,
        description: copy.channelDescription,
        importance: 5,
        visibility: 1,
        vibration: true,
      });
    }

    return true;
  } catch {
    return false;
  }
}

export async function scheduleRestTimerNotification(
  endsAt: number,
  exerciseName?: string
) {
  try {
    const LocalNotifications = await getLocalNotifications();
    if (!LocalNotifications) return false;
    const ready = await prepareRestTimerNotifications();
    if (!ready) return false;

    await LocalNotifications.cancel({
      notifications: [{ id: REST_TIMER_NOTIFICATION_ID }],
    });

    const copy = notificationCopy();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_TIMER_NOTIFICATION_ID,
          title: copy.title,
          body: exerciseName
            ? `${exerciseName} · ${copy.nextSet}`
            : copy.nextSet,
          channelId:
            Capacitor.getPlatform() === "android"
              ? REST_TIMER_CHANNEL_ID
              : undefined,
          sound: "default",
          schedule: {
            at: new Date(endsAt),
            allowWhileIdle: true,
          },
          actionTypeId: REST_TIMER_ACTION_TYPE,
          extra: {
            type: "fitmate_rest_timer",
            endsAt,
          },
          ongoing: Capacitor.getPlatform() === "android",
          autoCancel: false,
        },
      ],
    });

    return true;
  } catch {
    return false;
  }
}

export async function cancelRestTimerNotification() {
  try {
    const LocalNotifications = await getLocalNotifications();
    if (!LocalNotifications) return;
    await LocalNotifications.cancel({
      notifications: [{ id: REST_TIMER_NOTIFICATION_ID }],
    });
  } catch {
    // Native notifications are an enhancement; the timer itself still works.
  }
}

export async function clearRestTimerDeliveredNotification() {
  try {
    const LocalNotifications = await getLocalNotifications();
    if (!LocalNotifications) return;
    const delivered = await LocalNotifications.getDeliveredNotifications();
    const own = delivered.notifications.filter(
      (notification) => notification.id === REST_TIMER_NOTIFICATION_ID
    );
    if (own.length) {
      await LocalNotifications.removeDeliveredNotifications({ notifications: own });
    }
  } catch {
    // Ignore cleanup failures.
  }
}

export function notifyRestTimerOnWeb(exerciseName?: string) {
  if (typeof window === "undefined" || Capacitor.isNativePlatform()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const copy = notificationCopy();
    new Notification(copy.title, {
      body: exerciseName
        ? `${exerciseName} · ${copy.nextSet}`
        : copy.nextSet,
      tag: "fitmate-rest-timer",
      requireInteraction: true,
    });
  } catch {
    // Some browsers expose Notification but still block construction.
  }
}

export async function prepareWebRestTimerNotifications() {
  if (typeof window === "undefined" || Capacitor.isNativePlatform()) return;
  if (!("Notification" in window) || Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    // Optional on browsers that do not support notification prompts here.
  }
}
