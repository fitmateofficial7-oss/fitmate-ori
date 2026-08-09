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

type BackgroundStartOptions = {
  backgroundMessage?: string;
  backgroundTitle?: string;
  requestPermissions?: boolean;
  stale?: boolean;
  distanceFilter?: number;
  minIntervalMs?: number;
};

type BackgroundGeolocationPlugin = {
  start(
    options: BackgroundStartOptions,
    callback: (
      location?: NativeBackgroundLocationSample,
      error?: NativeBackgroundLocationError
    ) => void
  ): Promise<void>;
  stop(): Promise<void>;
  openSettings(): Promise<void>;
  checkPermissions?: () => Promise<{
    location?: string;
    backgroundLocation?: string;
    notification?: string;
  }>;
  requestPermissions?: (options?: {
    location?: boolean;
    notification?: boolean;
  }) => Promise<{
    location?: string;
    backgroundLocation?: string;
    notification?: string;
  }>;
};

type NativeContext = {
  platform: string;
  plugin: BackgroundGeolocationPlugin;
};

const ACTIVE_TRACKER_ID = "fitmate-capgo-background-location";
let nativeContextPromise: Promise<NativeContext | null> | null = null;

async function getNativeContext(): Promise<NativeContext | null> {
  if (typeof window === "undefined") return null;

  nativeContextPromise ??= (async () => {
    try {
      const [{ Capacitor }, backgroundModule] = await Promise.all([
        import("@capacitor/core"),
        import("@capgo/background-geolocation"),
      ]);

      if (!Capacitor.isNativePlatform()) return null;

      return {
        platform: Capacitor.getPlatform(),
        plugin:
          backgroundModule.BackgroundGeolocation as unknown as BackgroundGeolocationPlugin,
      };
    } catch {
      return null;
    }
  })();

  return nativeContextPromise;
}

export async function isNativeBackgroundLocationAvailable() {
  return Boolean(await getNativeContext());
}

export async function getNativeLocationPlatform() {
  return (await getNativeContext())?.platform ?? null;
}

export async function getNativeLocationPermissionStatus() {
  const context = await getNativeContext();
  if (!context?.plugin.checkPermissions) return null;

  try {
    return await context.plugin.checkPermissions();
  } catch {
    return null;
  }
}

export async function startNativeBackgroundLocation(
  onLocation: (location: NativeBackgroundLocationSample) => void,
  onError: (error: NativeBackgroundLocationError) => void
): Promise<string | null> {
  const context = await getNativeContext();
  if (!context) return null;

  const english =
    typeof window !== "undefined" &&
    window.localStorage.getItem("fitmate_language") === "en";

  // Always stop a previous native tracker before starting a new jogging session.
  try {
    await context.plugin.stop();
  } catch {
    // There may be no active native tracker yet.
  }

  await context.plugin.start(
    {
      backgroundTitle: english
        ? "FitMate Jogging is active"
        : "FitMate Jogging aktif",
      backgroundMessage: english
        ? "FitMate is recording your route. Tap to return."
        : "FitMate sedang merekam rute lari. Ketuk notifikasi untuk kembali.",
      requestPermissions: true,
      stale: false,
      // 3 m keeps the route responsive while filtering small GPS jitter.
      distanceFilter: 3,
      // Prevent excessive callbacks while keeping jogging pace responsive.
      minIntervalMs: 1_500,
    },
    (location, error) => {
      if (error) {
        onError(error);
        return;
      }
      if (location) onLocation(location);
    }
  );

  return ACTIVE_TRACKER_ID;
}

export async function stopNativeBackgroundLocation(_trackerId: string) {
  const context = await getNativeContext();
  if (!context) return;

  try {
    await context.plugin.stop();
  } catch {
    // Stopping an already stopped native tracker is harmless.
  }
}

export async function openNativeLocationSettings() {
  const context = await getNativeContext();
  if (!context) return;
  await context.plugin.openSettings();
}
