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

  nativeContextPromise ??= (async () => {
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

  return nativeContextPromise;
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

  await requestAndroidNotificationPermission(context.platform);

  const english =
    typeof window !== "undefined" &&
    window.localStorage.getItem("fitmate_language") === "en";

  return context.plugin.addWatcher(
    {
      backgroundTitle: english ? "FitMate Jogging is active" : "FitMate Jogging aktif",
      backgroundMessage: english
        ? "FitMate is recording your route. Tap to return."
        : "FitMate sedang merekam rute lari. Ketuk notifikasi untuk kembali.",
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
