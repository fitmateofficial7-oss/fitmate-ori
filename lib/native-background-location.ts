"use client";

export type NativeBackgroundLocationSample = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  time: number;
  simulated?: boolean;
};

export type NativeBackgroundLocationError = {
  code?: string;
  message?: string;
};

type BackgroundWatcherOptions = {
  backgroundMessage?: string;
  backgroundTitle?: string;
  requestPermissions?: boolean;
  stale?: boolean;
  distanceFilter?: number;
};

type BackgroundGeolocationPlugin = {
  addWatcher(
    options: BackgroundWatcherOptions,
    callback: (
      location?: NativeBackgroundLocationSample,
      error?: NativeBackgroundLocationError
    ) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
};

type NativeContext = {
  platform: string;
  plugin: BackgroundGeolocationPlugin;
};

let nativeContextPromise: Promise<NativeContext | null> | null = null;

async function getNativeContext(): Promise<NativeContext | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!nativeContextPromise) {
    nativeContextPromise = (async () => {
      try {
        const { Capacitor, registerPlugin } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) {
          return null;
        }

        return {
          platform: Capacitor.getPlatform(),
          plugin: registerPlugin<BackgroundGeolocationPlugin>(
            "BackgroundGeolocation"
          ),
        };
      } catch {
        return null;
      }
    })();
  }

  const context = await nativeContextPromise;
  // Do not permanently cache a transient initialization failure. This avoids a
  // case where the first probe reports "web mode" and the next call silently
  // falls back to navigator.geolocation, which could bypass native expectations.
  if (!context) {
    nativeContextPromise = null;
  }
  return context;
}

async function requestAndroidNotificationPermission(platform: string) {
  if (platform !== "android") {
    return;
  }

  try {
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );
    const current = await LocalNotifications.checkPermissions();
    if (current.display !== "granted") {
      await LocalNotifications.requestPermissions();
    }
  } catch {
    // The location plugin will still attempt to start. Android versions below
    // 13 do not require the notification runtime permission.
  }
}

export async function isNativeBackgroundLocationAvailable() {
  return Boolean(await getNativeContext());
}

export async function getNativeLocationPlatform() {
  return (await getNativeContext())?.platform ?? null;
}

export async function startNativeBackgroundLocation(
  onLocation: (location: NativeBackgroundLocationSample) => void,
  onError: (error: NativeBackgroundLocationError) => void
): Promise<string | null> {
  const context = await getNativeContext();
  if (!context) {
    return null;
  }

  const english =
    typeof window !== "undefined" &&
    window.localStorage.getItem("fitmate_language") === "en";

  // IMPORTANT FOR GOOGLE PLAY:
  // addWatcher() is the call that may trigger Android's LOCATION runtime prompt.
  // It must happen immediately after FitMate's in-app location disclosure.
  // Do not request notification permission before this call.
  const watcherId = await context.plugin.addWatcher(
    {
      backgroundTitle: english ? "FitMate Jogging is active" : "FitMate Jogging aktif",
      backgroundMessage: english
        ? "FitMate is recording your active Jogging route. Tap to return."
        : "FitMate sedang merekam rute Jogging aktif. Ketuk untuk kembali.",
      requestPermissions: true,
      stale: false,
      // Three metres keeps the route responsive while reducing GPS noise and
      // battery drain compared with requesting every raw fix.
      distanceFilter: 3,
    },
    (location, error) => {
      if (error) {
        onError(error);
        return;
      }
      if (location) {
        onLocation(location);
      }
    }
  );

  // Android 13+ may need POST_NOTIFICATIONS so the foreground-service
  // tracking notification is visible. Request it only AFTER the location
  // permission flow, so Google's required disclosure directly precedes the
  // location runtime prompt. The location foreground service itself is what
  // keeps an active, user-started Jogging session tracking while minimized.
  void requestAndroidNotificationPermission(context.platform);

  return watcherId;
}

export async function stopNativeBackgroundLocation(watcherId: string) {
  const context = await getNativeContext();
  if (!context) {
    return;
  }

  try {
    await context.plugin.removeWatcher({ id: watcherId });
  } catch {
    // Removing an already stopped native watcher should be harmless.
  }
}

export async function openNativeLocationSettings() {
  const context = await getNativeContext();
  if (!context) {
    return;
  }
  await context.plugin.openSettings();
}
