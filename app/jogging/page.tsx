"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import FitMateBrand from "@/components/fitmate-brand";
import FitMateIcon from "@/components/fitmate-icon";
import JoggingRouteMap from "@/components/jogging-route-map";
import { useLanguage } from "@/components/language-provider";
import {
  calculateJoggingStats,
  compactRoutePoints,
  formatDuration,
  formatPace,
  isUsableJoggingPoint,
  type JoggingRoutePoint,
  type JoggingStats,
} from "@/lib/jogging";
import {
  createJoggingShareCard,
  createJoggingShareVideo,
  DEFAULT_JOGGING_SHARE_LAYOUT,
  type JoggingShareLayout,
} from "@/lib/jogging-share";
import {
  getNativeLocationPlatform,
  isNativeBackgroundLocationAvailable,
  openNativeLocationSettings,
  startNativeBackgroundLocation,
  stopNativeBackgroundLocation,
  type NativeBackgroundLocationError,
  type NativeBackgroundLocationSample,
} from "@/lib/native-background-location";
import { supabase } from "@/lib/supabase";

type TrackingStatus = "idle" | "tracking" | "paused" | "finished";
type ShareMode = "track" | "media";
type ShareMediaKind = "image" | "video";
type ShareDragTarget = "metrics" | "route" | "brand" | "details";

type JoggingSession = {
  id: string;
  user_id: string;
  title: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  distance_meters: number;
  average_pace_seconds_per_km: number | null;
  average_speed_kmh: number;
  calories_kcal: number;
  elevation_gain_meters: number;
  weight_kg: number;
  route_points: JoggingRoutePoint[];
  created_at?: string;
};

type DraftSession = {
  startedAt: number;
  elapsedMs: number;
  weightKg: number;
  points: JoggingRoutePoint[];
};

type FitMateWakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<FitMateWakeLockSentinel>;
  };
};

const DRAFT_KEY_PREFIX = "fitmate_jogging_draft_";
const HISTORY_KEY_PREFIX = "fitmate_jogging_history_";

function suggestedTitle(language: "id" | "en") {
  const hour = new Date().getHours();
  if (language === "en") {
    if (hour < 10) return "Morning Jog";
    if (hour < 15) return "Midday Jog";
    if (hour < 19) return "Evening Jog";
    return "Night Jog";
  }
  if (hour < 10) return "Jogging Pagi";
  if (hour < 15) return "Jogging Siang";
  if (hour < 19) return "Jogging Sore";
  return "Jogging Malam";
}

function sessionDateLabel(value: string, language: "id" | "en") {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function localizeJoggingTitle(value: string, language: "id" | "en") {
  const titles: Record<string, [string, string]> = {
    "jogging pagi": ["Jogging Pagi", "Morning Jog"],
    "morning jog": ["Jogging Pagi", "Morning Jog"],
    "jogging siang": ["Jogging Siang", "Midday Jog"],
    "midday jog": ["Jogging Siang", "Midday Jog"],
    "jogging sore": ["Jogging Sore", "Evening Jog"],
    "evening jog": ["Jogging Sore", "Evening Jog"],
    "jogging malam": ["Jogging Malam", "Night Jog"],
    "night jog": ["Jogging Malam", "Night Jog"],
  };
  const pair = titles[value.trim().toLowerCase()];
  return pair ? (language === "id" ? pair[0] : pair[1]) : value;
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function localHistoryKey(userId: string) {
  return `${HISTORY_KEY_PREFIX}${userId}`;
}

function readLocalHistory(userId: string) {
  try {
    const value = localStorage.getItem(localHistoryKey(userId));
    return value ? (JSON.parse(value) as JoggingSession[]) : [];
  } catch {
    return [];
  }
}

function writeLocalHistory(userId: string, sessions: JoggingSession[]) {
  try {
    localStorage.setItem(
      localHistoryKey(userId),
      JSON.stringify(sessions.slice(0, 30))
    );
  } catch {
    // Local persistence is a fallback; tracking must remain usable.
  }
}

function mergeSessions(
  primary: JoggingSession[],
  secondary: JoggingSession[]
) {
  const map = new Map<string, JoggingSession>();
  for (const session of [...primary, ...secondary]) {
    map.set(session.id, session);
  }
  return [...map.values()]
    .sort(
      (left, right) =>
        new Date(right.started_at).getTime() -
        new Date(left.started_at).getTime()
    )
    .slice(0, 30);
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4 dark:border-white/10 dark:bg-slate-900">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
        {label}
      </p>
      <p className="mt-1.5 truncate text-xl font-black tracking-tight text-slate-950 sm:mt-2 sm:text-2xl dark:text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

function clampShareValue(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getShareLayerScale(
  layout: JoggingShareLayout,
  target: ShareDragTarget
) {
  if (target === "metrics") return layout.metricsScale;
  if (target === "route") return layout.routeScale;
  if (target === "brand") return layout.brandScale;
  return layout.detailsScale;
}

function updateShareLayerScale(
  layout: JoggingShareLayout,
  target: ShareDragTarget,
  scale: number
): JoggingShareLayout {
  const safeScale = clampShareValue(scale, target === "route" ? 0.45 : 0.5, target === "route" ? 2 : 1.8);
  if (target === "metrics") return { ...layout, metricsScale: safeScale };
  if (target === "route") return { ...layout, routeScale: safeScale };
  if (target === "brand") return { ...layout, brandScale: safeScale };
  return { ...layout, detailsScale: safeScale };
}

function ShareRoutePreview({ points }: { points: JoggingRoutePoint[] }) {
  const { tr } = useLanguage();
  const route = useMemo(() => {
    if (points.length < 2) return "";
    const latitudes = points.map((point) => point.latitude);
    const longitudes = points.map((point) => point.longitude);
    const minimumLatitude = Math.min(...latitudes);
    const maximumLatitude = Math.max(...latitudes);
    const minimumLongitude = Math.min(...longitudes);
    const maximumLongitude = Math.max(...longitudes);
    const latitudeSpan = Math.max(0.00001, maximumLatitude - minimumLatitude);
    const longitudeSpan = Math.max(0.00001, maximumLongitude - minimumLongitude);
    const padding = 7;
    const usable = 100 - padding * 2;
    const scale = Math.min(usable / longitudeSpan, usable / latitudeSpan);
    const width = longitudeSpan * scale;
    const height = latitudeSpan * scale;
    const offsetX = (100 - width) / 2;
    const offsetY = (100 - height) / 2;
    return points
      .map((point) => {
        const x = offsetX + (point.longitude - minimumLongitude) * scale;
        const y = offsetY + (maximumLatitude - point.latitude) * scale;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  const routePoints = route.split(" ");
  const start = routePoints[0]?.split(",").map(Number);
  const finish = routePoints.at(-1)?.split(",").map(Number);

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full overflow-visible drop-shadow-[0_8px_14px_rgba(56,242,141,0.45)]"
      aria-label={tr("Preview rute jogging", "Jogging route preview")}
    >
      {route ? (
        <>
          <polyline
            points={route}
            fill="none"
            stroke="rgba(255,255,255,.94)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={route}
            fill="none"
            stroke="#38f28d"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {start && (
            <circle
              cx={start[0]}
              cy={start[1]}
              r="2.7"
              fill="#38f28d"
              stroke="#06110b"
              strokeWidth="1"
            />
          )}
          {finish && (
            <circle
              cx={finish[0]}
              cy={finish[1]}
              r="3"
              fill="white"
              stroke="#06110b"
              strokeWidth="1"
            />
          )}
        </>
      ) : (
        <text
          x="50"
          y="52"
          textAnchor="middle"
          fill="rgba(255,255,255,.82)"
          fontSize="6"
          fontWeight="800"
        >
          {tr("Rute GPS belum tersedia", "GPS route not available yet")}
        </text>
      )}
    </svg>
  );
}

export default function JoggingPage() {
  const router = useRouter();
  const { language, tr } = useLanguage();
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [points, setPoints] = useState<JoggingRoutePoint[]>([]);
  const [weightKg, setWeightKg] = useState(70);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [gpsMessage, setGpsMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [history, setHistory] = useState<JoggingSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [finishedSession, setFinishedSession] =
    useState<JoggingSession | null>(null);
  const [shareMode, setShareMode] = useState<ShareMode>("track");
  const [shareMediaFile, setShareMediaFile] = useState<File | null>(null);
  const [shareMediaUrl, setShareMediaUrl] = useState<string | null>(null);
  const [shareMediaKind, setShareMediaKind] = useState<ShareMediaKind | null>(null);
  const [shareLayout, setShareLayout] = useState<JoggingShareLayout>(
    DEFAULT_JOGGING_SHARE_LAYOUT
  );
  const [shareDragTarget, setShareDragTarget] = useState<ShareDragTarget | null>(null);
  const [selectedShareLayer, setSelectedShareLayer] =
    useState<ShareDragTarget>("metrics");
  const [shareBusy, setShareBusy] = useState(false);
  const [nativeBackgroundReady, setNativeBackgroundReady] = useState(false);
  const [nativePlatform, setNativePlatform] = useState<string | null>(null);
  const [showLocationDisclosure, setShowLocationDisclosure] = useState(false);

  const pointsRef = useRef<JoggingRoutePoint[]>([]);
  const statusRef = useRef<TrackingStatus>("idle");
  const watchIdRef = useRef<number | null>(null);
  const nativeWatchIdRef = useRef<string | null>(null);
  const gpsProviderRef = useRef<"web" | "native" | null>(null);
  const elapsedBeforeMsRef = useRef(0);
  const activeSegmentStartedAtRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const wakeLockRef = useRef<FitMateWakeLockSentinel | null>(null);
  const sharePreviewRef = useRef<HTMLDivElement | null>(null);
  const shareDragOffsetRef = useRef({ x: 0, y: 0 });

  const durationSeconds = Math.floor(elapsedMilliseconds / 1000);
  const stats = useMemo(
    () => calculateJoggingStats(points, durationSeconds, weightKg),
    [durationSeconds, points, weightKg]
  );

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      isNativeBackgroundLocationAvailable(),
      getNativeLocationPlatform(),
    ]).then(([available, platform]) => {
      if (cancelled) return;
      setNativeBackgroundReady(available);
      setNativePlatform(platform);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (statusRef.current === "tracking") {
        const activeStarted = activeSegmentStartedAtRef.current;
        setElapsedMilliseconds(
          elapsedBeforeMsRef.current +
            (activeStarted ? Math.max(0, Date.now() - activeStarted) : 0)
        );
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, []);

  const requestScreenWakeLock = useCallback(async () => {
    const wakeLockNavigator = navigator as NavigatorWithWakeLock;
    if (!wakeLockNavigator.wakeLock || document.visibilityState !== "visible") {
      return;
    }

    try {
      if (!wakeLockRef.current || wakeLockRef.current.released) {
        wakeLockRef.current = await wakeLockNavigator.wakeLock.request("screen");
      }
    } catch {
      // Wake lock is a best-effort enhancement. GPS tracking must still work.
    }
  }, []);

  const releaseScreenWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    if (!sentinel || sentinel.released) {
      return;
    }
    try {
      await sentinel.release();
    } catch {
      // The browser may already have revoked the lock.
    }
  }, []);

  const stopGpsWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const nativeWatcherId = nativeWatchIdRef.current;
    nativeWatchIdRef.current = null;
    gpsProviderRef.current = null;
    if (nativeWatcherId) {
      void stopNativeBackgroundLocation(nativeWatcherId);
    }
  }, []);

  const acceptGpsSample = useCallback(
    ({
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
    }: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude: number | null;
      speed: number | null;
    }) => {
      if (statusRef.current !== "tracking") {
        return;
      }

      const now = Date.now();
      const activeTimestamp =
        elapsedBeforeMsRef.current +
        (activeSegmentStartedAtRef.current
          ? now - activeSegmentStartedAtRef.current
          : 0);
      const point: JoggingRoutePoint = {
        latitude,
        longitude,
        accuracy,
        altitude,
        speed:
          speed !== null && Number.isFinite(speed)
            ? speed
            : null,
        timestamp: activeTimestamp,
      };
      const previous = pointsRef.current[pointsRef.current.length - 1];

      if (!isUsableJoggingPoint(point, previous)) {
        if (point.accuracy > 80) {
          setGpsMessage(
            tr(
              `Menunggu GPS lebih akurat (${Math.round(point.accuracy)} m)…`,
              `Waiting for better GPS accuracy (${Math.round(point.accuracy)} m)…`
            )
          );
        }
        return;
      }

      if (
        previous &&
        Math.abs(point.timestamp - previous.timestamp) < 750
      ) {
        return;
      }

      const next = [...pointsRef.current, point];
      pointsRef.current = next;
      setPoints(next);
      setGpsMessage(
        gpsProviderRef.current === "native"
          ? tr(
              `Background GPS aktif · akurasi ±${Math.round(point.accuracy)} m`,
              `Background GPS active · accuracy ±${Math.round(point.accuracy)} m`
            )
          : tr(
              `GPS aktif · akurasi ±${Math.round(point.accuracy)} m`,
              `GPS active · accuracy ±${Math.round(point.accuracy)} m`
            )
      );

      // Persist each accepted fix as well as the regular timer. This is useful
      // when mobile operating systems throttle timers while the app is hidden.
      if (userId) {
        const draft: DraftSession = {
          startedAt: startedAtRef.current ?? now,
          elapsedMs: activeTimestamp,
          weightKg,
          points: compactRoutePoints(next),
        };
        try {
          localStorage.setItem(
            `${DRAFT_KEY_PREFIX}${userId}`,
            JSON.stringify(draft)
          );
        } catch {
          // Native tracking must continue even when storage is unavailable.
        }
      }
    },
    [tr, userId, weightKg]
  );

  const acceptPosition = useCallback(
    (position: GeolocationPosition) => {
      acceptGpsSample({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
      });
    },
    [acceptGpsSample]
  );

  const acceptNativePosition = useCallback(
    (location: NativeBackgroundLocationSample) => {
      acceptGpsSample({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
      });
    },
    [acceptGpsSample]
  );

  const handleNativeGpsError = useCallback(
    (error: NativeBackgroundLocationError) => {
      const denied = error.code === "NOT_AUTHORIZED";
      setGpsMessage(
        denied
          ? tr(
              "Aktifkan lokasi latar belakang di pengaturan.",
              "Background location permission is not granted. Open FitMate location settings."
            )
          : error.message ||
              tr(
                "Background GPS mengalami kendala. FitMate mencoba GPS web.",
                "Background GPS had a problem. FitMate is trying web GPS."
              )
      );
    },
    [tr]
  );

  const startGpsWatch = useCallback(async () => {
    stopGpsWatch();

    try {
      const nativeWatcherId = await startNativeBackgroundLocation(
        acceptNativePosition,
        handleNativeGpsError
      );
      if (nativeWatcherId) {
        nativeWatchIdRef.current = nativeWatcherId;
        gpsProviderRef.current = "native";
        setNativeBackgroundReady(true);
        setGpsMessage(
          tr(
            "Background GPS aktif · rute tetap direkam saat layar mati",
            "Background GPS active · route continues when the screen is off"
          )
        );
        return true;
      }
    } catch {
      // Continue with the browser fallback below.
    }

    if (!("geolocation" in navigator)) {
      setGpsMessage(
        tr(
          "Perangkat ini tidak menyediakan GPS.",
          "This device does not provide GPS."
        )
      );
      return false;
    }

    gpsProviderRef.current = "web";
    navigator.geolocation.getCurrentPosition(
      acceptPosition,
      () => {
        // watchPosition below remains active and will retry continuously.
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      }
    );
    watchIdRef.current = navigator.geolocation.watchPosition(
      acceptPosition,
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? tr(
                "Izin lokasi ditolak. Aktifkan izin lokasi untuk FitMate.",
                "Location permission was denied. Enable location access for FitMate."
              )
            : error.code === error.POSITION_UNAVAILABLE
              ? tr(
                  "Lokasi belum tersedia. Coba pindah ke area terbuka.",
                  "Location is unavailable. Try moving to an open area."
                )
              : tr(
                  "GPS terlalu lama merespons. Coba mulai ulang.",
                  "GPS took too long to respond. Try starting again."
                );
        setGpsMessage(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 2_000,
      }
    );
    return true;
  }, [
    acceptNativePosition,
    acceptPosition,
    handleNativeGpsError,
    stopGpsWatch,
    tr,
  ]);

  const loadHistory = useCallback(async (resolvedUserId: string) => {
    setHistoryLoading(true);
    const local = readLocalHistory(resolvedUserId);
    const result = await supabase
      .from("jogging_sessions")
      .select("*")
      .eq("user_id", resolvedUserId)
      .order("started_at", { ascending: false })
      .limit(30);

    const remote = result.error
      ? []
      : ((result.data || []) as JoggingSession[]);
    setHistory(mergeSessions(remote, local));
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?redirect=%2Fjogging");
        return;
      }

      if (cancelled) return;
      setUserId(user.id);

      const profile = await supabase
        .from("fitness_profiles")
        .select("weight")
        .eq("user_id", user.id)
        .maybeSingle();
      const profileWeight = Number(profile.data?.weight);
      if (Number.isFinite(profileWeight) && profileWeight > 0) {
        setWeightKg(profileWeight);
      }

      const draftRaw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${user.id}`);
      if (draftRaw) {
        try {
          const draft = JSON.parse(draftRaw) as DraftSession;
          if (draft.points.length > 0) {
            pointsRef.current = draft.points;
            setPoints(draft.points);
            elapsedBeforeMsRef.current = draft.elapsedMs;
            setElapsedMilliseconds(draft.elapsedMs);
            startedAtRef.current = draft.startedAt;
            setWeightKg(draft.weightKg || profileWeight || 70);
            setStatus("paused");
            setGpsMessage(
              tr(
                "Sesi sebelumnya dipulihkan dalam keadaan jeda.",
                "Your previous session was restored in paused state."
              )
            );
          }
        } catch {
          localStorage.removeItem(`${DRAFT_KEY_PREFIX}${user.id}`);
        }
      }

      await loadHistory(user.id);
    };

    void initialize();
    return () => {
      cancelled = true;
      stopGpsWatch();
      void releaseScreenWakeLock();
    };
  }, [loadHistory, releaseScreenWakeLock, router, stopGpsWatch, tr]);

  useEffect(() => {
    if (!userId) return;
    const draftKey = `${DRAFT_KEY_PREFIX}${userId}`;

    if (status === "idle" || status === "finished") {
      localStorage.removeItem(draftKey);
      return;
    }

    const persistDraft = () => {
      const activeStarted = activeSegmentStartedAtRef.current;
      const elapsedMs =
        elapsedBeforeMsRef.current +
        (activeStarted ? Math.max(0, Date.now() - activeStarted) : 0);
      const draft: DraftSession = {
        startedAt: startedAtRef.current ?? Date.now(),
        elapsedMs,
        weightKg,
        points: compactRoutePoints(pointsRef.current),
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        // Continue tracking even when storage is full or unavailable.
      }
    };

    const interval = window.setInterval(persistDraft, 5_000);
    return () => window.clearInterval(interval);
  }, [status, userId, weightKg]);

  useEffect(() => {
    const persistImmediately = () => {
      if (!userId || statusRef.current === "idle" || statusRef.current === "finished") {
        return;
      }
      const activeStarted = activeSegmentStartedAtRef.current;
      const elapsedMs =
        elapsedBeforeMsRef.current +
        (activeStarted ? Math.max(0, Date.now() - activeStarted) : 0);
      const draft: DraftSession = {
        startedAt: startedAtRef.current ?? Date.now(),
        elapsedMs,
        weightKg,
        points: compactRoutePoints(pointsRef.current),
      };
      try {
        localStorage.setItem(
          `${DRAFT_KEY_PREFIX}${userId}`,
          JSON.stringify(draft)
        );
      } catch {
        // Continue the active session even when persistence is unavailable.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && statusRef.current === "tracking") {
        void requestScreenWakeLock();
      } else {
        persistImmediately();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", persistImmediately);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", persistImmediately);
    };
  }, [requestScreenWakeLock, userId, weightKg]);

  useEffect(() => {
    if (!shareMediaFile) {
      setShareMediaUrl(null);
      setShareMediaKind(null);
      return;
    }
    const url = URL.createObjectURL(shareMediaFile);
    setShareMediaUrl(url);
    setShareMediaKind(
      shareMediaFile.type.startsWith("video/") ? "video" : "image"
    );
    return () => URL.revokeObjectURL(url);
  }, [shareMediaFile]);

  const resetSession = useCallback(() => {
    stopGpsWatch();
    void releaseScreenWakeLock();
    statusRef.current = "idle";
    pointsRef.current = [];
    setPoints([]);
    elapsedBeforeMsRef.current = 0;
    setElapsedMilliseconds(0);
    activeSegmentStartedAtRef.current = null;
    startedAtRef.current = null;
    setStatus("idle");
    setFinishedSession(null);
    setSaveMessage("");
    setGpsMessage("");
    setShareMediaFile(null);
    setShareMode("track");
    setShareLayout(DEFAULT_JOGGING_SHARE_LAYOUT);
  }, [releaseScreenWakeLock, stopGpsWatch]);

  const startSession = useCallback(async () => {
    const now = Date.now();
    pointsRef.current = [];
    setPoints([]);
    elapsedBeforeMsRef.current = 0;
    activeSegmentStartedAtRef.current = now;
    startedAtRef.current = now;
    setFinishedSession(null);
    setSaveMessage("");
    statusRef.current = "tracking";
    setStatus("tracking");
    setElapsedMilliseconds(0);
    void requestScreenWakeLock();
    setGpsMessage(
      tr("Menghubungkan GPS…", "Connecting to GPS…")
    );
    const gpsStarted = await startGpsWatch();
    if (!gpsStarted) {
      activeSegmentStartedAtRef.current = null;
      statusRef.current = "idle";
      setStatus("idle");
      void releaseScreenWakeLock();
    }
  }, [releaseScreenWakeLock, requestScreenWakeLock, startGpsWatch, tr]);

  const startSessionWithDisclosure = useCallback(async () => {
    if (nativeBackgroundReady) {
      const accepted =
        typeof window !== "undefined" &&
        window.localStorage.getItem(
          "fitmate_jogging_location_disclosure_v1"
        ) === "accepted";
      if (!accepted) {
        setShowLocationDisclosure(true);
        return;
      }
    }
    await startSession();
  }, [nativeBackgroundReady, startSession]);

  const acceptLocationDisclosure = useCallback(async () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "fitmate_jogging_location_disclosure_v1",
        "accepted"
      );
    }
    setShowLocationDisclosure(false);
    await startSession();
  }, [startSession]);

  const pauseSession = useCallback(() => {
    if (activeSegmentStartedAtRef.current) {
      elapsedBeforeMsRef.current +=
        Date.now() - activeSegmentStartedAtRef.current;
    }
    activeSegmentStartedAtRef.current = null;
    stopGpsWatch();
    void releaseScreenWakeLock();
    statusRef.current = "paused";
    setStatus("paused");
    setElapsedMilliseconds(elapsedBeforeMsRef.current);
  }, [releaseScreenWakeLock, stopGpsWatch]);

  const resumeSession = useCallback(async () => {
    activeSegmentStartedAtRef.current = Date.now();
    statusRef.current = "tracking";
    setStatus("tracking");
    setElapsedMilliseconds(elapsedBeforeMsRef.current);
    void requestScreenWakeLock();
    const gpsStarted = await startGpsWatch();
    if (!gpsStarted) {
      activeSegmentStartedAtRef.current = null;
      statusRef.current = "paused";
      setStatus("paused");
      void releaseScreenWakeLock();
    }
  }, [releaseScreenWakeLock, requestScreenWakeLock, startGpsWatch]);

  const persistSession = useCallback(
    async (session: JoggingSession) => {
      const local = mergeSessions(
        [session],
        readLocalHistory(session.user_id)
      );
      writeLocalHistory(session.user_id, local);
      setHistory((current) => mergeSessions([session], current));

      const payload = {
        ...session,
        route_points: compactRoutePoints(session.route_points),
      };
      const result = await supabase
        .from("jogging_sessions")
        .upsert(payload, { onConflict: "id" });

      if (result.error) {
        setSaveMessage(
          tr(
            "Aktivitas tersimpan lokal. Sinkronisasi belum aktif.",
            "Activity saved locally. Sync is not ready."
          )
        );
      } else {
        setSaveMessage(
          tr(
            "Aktivitas tersimpan dan tersinkron.",
            "Activity saved and synced."
          )
        );
      }
    },
    [tr]
  );

  const finishSession = useCallback(async () => {
    if (activeSegmentStartedAtRef.current) {
      elapsedBeforeMsRef.current +=
        Date.now() - activeSegmentStartedAtRef.current;
    }
    activeSegmentStartedAtRef.current = null;
    stopGpsWatch();
    void releaseScreenWakeLock();
    const endedAt = Date.now();
    const elapsedSeconds = Math.max(
      1,
      Math.floor(elapsedBeforeMsRef.current / 1000)
    );
    const finalPoints = compactRoutePoints(pointsRef.current);
    const finalStats = calculateJoggingStats(
      finalPoints,
      elapsedSeconds,
      weightKg
    );
    const session: JoggingSession = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: suggestedTitle(language),
      started_at: new Date(
        startedAtRef.current ?? endedAt
      ).toISOString(),
      ended_at: new Date(endedAt).toISOString(),
      duration_seconds: elapsedSeconds,
      distance_meters: finalStats.distanceMeters,
      average_pace_seconds_per_km:
        finalStats.averagePaceSecondsPerKm,
      average_speed_kmh: finalStats.averageSpeedKmh,
      calories_kcal: finalStats.caloriesKcal,
      elevation_gain_meters: finalStats.elevationGainMeters,
      weight_kg: weightKg,
      route_points: finalPoints,
      created_at: new Date().toISOString(),
    };

    setElapsedMilliseconds(elapsedBeforeMsRef.current);
    setPoints(finalPoints);
    pointsRef.current = finalPoints;
    statusRef.current = "finished";
    setStatus("finished");
    setFinishedSession(session);
    setSaving(true);
    await persistSession(session);
    setSaving(false);
  }, [language, persistSession, releaseScreenWakeLock, stopGpsWatch, userId, weightKg]);

  const finishedStats: JoggingStats | null = useMemo(() => {
    if (!finishedSession) return null;
    return calculateJoggingStats(
      finishedSession.route_points,
      finishedSession.duration_seconds,
      finishedSession.weight_kg
    );
  }, [finishedSession]);

  const updateShareLayerPosition = useCallback(
    (target: ShareDragTarget, clientX: number, clientY: number) => {
      const host = sharePreviewRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const x =
        ((clientX - rect.left - shareDragOffsetRef.current.x) / rect.width) *
        100;
      const y =
        ((clientY - rect.top - shareDragOffsetRef.current.y) / rect.height) *
        100;
      const safeX = clampShareValue(x, 2, 98);
      const safeY = clampShareValue(y, 2, 98);

      setShareLayout((current) => {
        if (target === "metrics") {
          return { ...current, metricsX: safeX, metricsY: safeY };
        }
        if (target === "route") {
          return { ...current, routeX: safeX, routeY: safeY };
        }
        if (target === "brand") {
          return { ...current, brandX: safeX, brandY: safeY };
        }
        return { ...current, detailsX: safeX, detailsY: safeY };
      });
    },
    []
  );

  const beginShareDrag = useCallback(
    (target: ShareDragTarget, event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const host = sharePreviewRef.current;
      if (!host) return;

      const rect = host.getBoundingClientRect();
      const current = shareLayout;
      const x =
        target === "metrics"
          ? current.metricsX
          : target === "route"
            ? current.routeX
            : target === "brand"
              ? current.brandX
              : current.detailsX;
      const y =
        target === "metrics"
          ? current.metricsY
          : target === "route"
            ? current.routeY
            : target === "brand"
              ? current.brandY
              : current.detailsY;

      shareDragOffsetRef.current = {
        x: event.clientX - (rect.left + (x / 100) * rect.width),
        y: event.clientY - (rect.top + (y / 100) * rect.height),
      };
      host.setPointerCapture(event.pointerId);
      setSelectedShareLayer(target);
      setShareDragTarget(target);
    },
    [shareLayout]
  );

  const selectedShareScale = getShareLayerScale(
    shareLayout,
    selectedShareLayer
  );

  const setSelectedShareScale = useCallback(
    (scale: number) => {
      setShareLayout((current) =>
        updateShareLayerScale(current, selectedShareLayer, scale)
      );
    },
    [selectedShareLayer]
  );

  const exportSession = useCallback(
    async (share: boolean) => {
      if (!finishedSession || !finishedStats) return;
      if (shareMode === "media" && !shareMediaUrl) {
        setSaveMessage(
          tr(
            "Pilih foto atau video terlebih dahulu, atau gunakan mode Track.",
            "Choose a photo or video first, or use Track mode."
          )
        );
        return;
      }

      setShareBusy(true);
      setSaveMessage(
        shareMode === "media" && shareMediaKind === "video"
          ? tr(
              "Sedang membuat video share. Video dibatasi maksimal 60 detik…",
              "Creating the share video. Video is limited to 60 seconds…"
            )
          : tr("Membuat kartu share…", "Creating share card…")
      );

      try {
        const baseOptions = {
          title: localizeJoggingTitle(finishedSession.title, language),
          dateLabel: sessionDateLabel(finishedSession.started_at, language),
          stats: finishedStats,
          points: finishedSession.route_points,
          mediaUrl: shareMode === "media" ? shareMediaUrl : null,
          layout: shareLayout,
          language,
        };

        let blob: Blob;
        let extension: "png" | "mp4" | "webm" = "png";
        let mimeType = "image/png";

        if (
          shareMode === "media" &&
          shareMediaKind === "video" &&
          shareMediaUrl
        ) {
          const videoResult = await createJoggingShareVideo({
            ...baseOptions,
            mediaUrl: shareMediaUrl,
          });
          blob = videoResult.blob;
          extension = videoResult.extension;
          mimeType = videoResult.mimeType;
        } else {
          blob = await createJoggingShareCard(baseOptions);
        }

        const fileName = `fitmate-jogging-${finishedSession.started_at.slice(
          0,
          10
        )}.${extension}`;
        const file = new File([blob], fileName, { type: mimeType });

        if (
          share &&
          navigator.share &&
          (!navigator.canShare || navigator.canShare({ files: [file] }))
        ) {
          await navigator.share({
            title: localizeJoggingTitle(finishedSession.title, language),
            text: tr(
              `Jogging ${(finishedStats.distanceMeters / 1000).toFixed(
                2
              )} km bersama FitMate`,
              `${(finishedStats.distanceMeters / 1000).toFixed(
                2
              )} km jogging with FitMate`
            ),
            files: [file],
          });
          setSaveMessage(
            tr("Aktivitas siap dibagikan.", "Activity is ready to share.")
          );
        } else {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = fileName;
          anchor.rel = "noopener";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          setSaveMessage(
            tr("File share berhasil diunduh.", "Share file downloaded.")
          );
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          const unsupported =
            error instanceof Error && error.message === "VIDEO_EXPORT_UNSUPPORTED";
          setSaveMessage(
            unsupported
              ? tr(
                  "Ekspor video belum didukung. Gunakan foto atau aplikasi FitMate.",
                  "Video export is not supported. Use a photo or the FitMate app."
                )
              : tr(
                  "Gagal membuat file aktivitas. Coba lagi.",
                  "Unable to create the activity file. Try again."
                )
          );
        }
      } finally {
        setShareBusy(false);
      }
    },
    [
      finishedSession,
      finishedStats,
      shareLayout,
      shareMediaKind,
      shareMediaUrl,
      shareMode,
      language,
      tr,
    ]
  );

  const selectHistory = useCallback((session: JoggingSession) => {
    setFinishedSession(session);
    setPoints(session.route_points || []);
    pointsRef.current = session.route_points || [];
    elapsedBeforeMsRef.current = session.duration_seconds * 1000;
    setElapsedMilliseconds(session.duration_seconds * 1000);
    activeSegmentStartedAtRef.current = null;
    startedAtRef.current = new Date(session.started_at).getTime();
    setWeightKg(session.weight_kg || 70);
    setStatus("finished");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const activeStats = finishedStats ?? stats;

  return (
    <main className="fitmate-app-page min-h-screen scroll-pb-40 bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.24),transparent_34%),linear-gradient(180deg,#f8fffb,#eefbf3_45%,#f8fafc)] pb-44 text-slate-950 sm:pb-36 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_32%),linear-gradient(180deg,#06110c,#081810_55%,#020617)] dark:text-white">
      {showLocationDisclosure && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-lg rounded-[28px] border border-emerald-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-emerald-400/20 dark:bg-slate-950 dark:text-white sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl dark:bg-emerald-400/10">
              📍
            </div>
            <h2 className="mt-4 text-xl font-black">
              {tr("Lokasi untuk merekam jogging", "Location for jogging tracking")}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
              {tr(
                "Saat kamu memulai sesi jogging, FitMate menggunakan lokasi presisi untuk menghitung rute, jarak, pace, dan kecepatan. Selama sesi masih aktif, pencatatan dapat terus berjalan saat aplikasi diminimalkan atau layar mati dan Android akan menampilkan notifikasi jogging yang aktif.",
                "When you start a jogging session, FitMate uses precise location to calculate route, distance, pace, and speed. While the session is active, tracking can continue when the app is minimized or the screen is off, and Android will show an active jogging notification."
              )}
            </p>
            <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-100">
              {tr(
                "Lokasi hanya digunakan untuk sesi jogging yang kamu mulai sendiri. Tekan Jeda atau Selesai untuk menghentikan pencatatan.",
                "Location is used only for the jogging session you start yourself. Tap Pause or Finish to stop tracking."
              )}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLocationDisclosure(false)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:text-slate-200"
              >
                {tr("Nanti", "Not now")}
              </button>
              <button
                type="button"
                onClick={() => void acceptLocationDisclosure()}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20"
              >
                {tr("Lanjutkan", "Continue")}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-white/88 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <FitMateBrand href="/dashboard" size="sm" showCompany />
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            {tr("Gratis untuk semua akun", "Free for every account")}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6 lg:pb-10">
        <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-950 via-teal-800 to-emerald-600 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
                FitMate Jogging
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                {tr(
                  "Rekam rute, pace, jarak, dan kalori",
                  "Track your route, pace, distance, and calories"
                )}
              </h1>
              <p className="mt-4 max-w-2xl font-semibold leading-7 text-emerald-50/85">
                {tr(
                  "Rekam rute, pace, jarak, dan aktivitas lari dari HP.",
                  "Track your route, then create a share card."
                )}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-3xl bg-white/10 p-3 backdrop-blur lg:grid-cols-2 lg:gap-3 lg:p-4">
              <div className="rounded-2xl bg-white/10 p-3 lg:p-4">
                <FitMateIcon name="location" className="h-5 w-5" />
                <p className="mt-1 text-xs font-black sm:text-sm lg:mt-2 lg:text-base">Live GPS</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 lg:p-4">
                <FitMateIcon name="energy" className="h-5 w-5" />
                <p className="mt-1 text-xs font-black sm:text-sm lg:mt-2 lg:text-base">Pace & km</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 lg:p-4">
                <FitMateIcon name="activity" className="h-5 w-5" />
                <p className="mt-1 text-xs font-black sm:text-sm lg:mt-2 lg:text-base">{tr("Kalori", "Calories")}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 lg:p-4">
                <FitMateIcon name="share" className="h-5 w-5" />
                <p className="mt-1 text-xs font-black sm:text-sm lg:mt-2 lg:text-base">Share card</p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-lg shadow-emerald-950/5 dark:border-white/10 dark:bg-slate-950">
          <JoggingRouteMap
            points={points}
            showTiles={points.length > 0}
            className="h-[270px] w-full sm:h-[380px] lg:h-[430px]"
          />

          <div className="space-y-5 p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                label={tr("Jarak", "Distance")}
                value={`${(activeStats.distanceMeters / 1000).toFixed(2)} km`}
              />
              <MetricCard
                label={tr("Waktu", "Time")}
                value={formatDuration(activeStats.durationSeconds)}
              />
              <MetricCard
                label="Pace"
                value={`${formatPace(
                  activeStats.averagePaceSecondsPerKm
                )} /km`}
              />
              <MetricCard
                label={tr("Pace saat ini", "Current pace")}
                value={`${formatPace(
                  activeStats.currentPaceSecondsPerKm
                )} /km`}
              />
              <MetricCard
                label={tr("Kalori", "Calories")}
                value={`${Math.round(activeStats.caloriesKcal)} kcal`}
                hint={tr("Estimasi", "Estimate")}
              />
              <MetricCard
                label={tr("Kecepatan", "Speed")}
                value={`${activeStats.averageSpeedKmh.toFixed(1)} km/j`}
              />
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5 sm:rounded-3xl sm:p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-slate-900 dark:text-white">
                    {gpsMessage ||
                      tr(
                        "GPS belum dimulai",
                        "GPS has not started"
                      )}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                      nativeBackgroundReady
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
                    }`}
                  >
                    {nativeBackgroundReady
                      ? `${nativePlatform ?? "Native"} · Background ready`
                      : tr("Mode web", "Web mode")}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {nativeBackgroundReady
                    ? tr(
                        "Rute tetap direkam saat layar mati. Force-stop menghentikan sesi.",
                        "Tracking continues with the screen off. Force-stop ends the session."
                      )
                    : tr(
                        "Rute diperbarui otomatis.",
                        "The route updates automatically."
                      )}
                </p>
                {nativeBackgroundReady && (
                  <button
                    type="button"
                    onClick={() => void openNativeLocationSettings()}
                    className="mt-2 text-xs font-black text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300"
                  >
                    {tr("Buka pengaturan izin lokasi", "Open location permission settings")}
                  </button>
                )}
              </div>
              <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 font-bold shadow-sm dark:bg-slate-900">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {tr("Berat", "Weight")}
                </span>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="0.1"
                  value={weightKg}
                  disabled={status === "tracking"}
                  onChange={(event) =>
                    setWeightKg(numberValue(event.target.value, 70))
                  }
                  className="w-20 rounded-xl border border-slate-200 bg-transparent px-2 py-1 text-right font-black outline-none dark:border-white/10"
                />
                <span className="text-sm">kg</span>
              </label>
            </div>

            <div className="sticky bottom-24 z-30 grid gap-3 rounded-3xl border border-white/70 bg-white/94 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:static sm:grid-cols-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none lg:grid-cols-4 dark:border-white/10 dark:bg-slate-950/92 sm:dark:bg-transparent">
              {status === "idle" && (
                <button
                  type="button"
                  onClick={() => void startSessionWithDisclosure()}
                  className="rounded-2xl bg-emerald-600 px-6 py-4 font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 sm:col-span-2 lg:col-span-4"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <FitMateIcon name="play" className="h-5 w-5" />
                    {nativeBackgroundReady
                      ? tr("Mulai jogging background", "Start background jogging")
                      : tr("Mulai jogging", "Start jogging")}
                  </span>
                </button>
              )}
              {status === "tracking" && (
                <>
                  <button
                    type="button"
                    onClick={pauseSession}
                    className="rounded-2xl bg-amber-400 px-6 py-4 font-black text-slate-950"
                  >
                    <span className="inline-flex items-center justify-center gap-2"><FitMateIcon name="pause" className="h-5 w-5" />{tr("Jeda", "Pause")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void finishSession()}
                    className="rounded-2xl bg-rose-600 px-6 py-4 font-black text-white"
                  >
                    <span className="inline-flex items-center justify-center gap-2"><FitMateIcon name="stop" className="h-5 w-5" />{tr("Selesai", "Finish")}</span>
                  </button>
                </>
              )}
              {status === "paused" && (
                <>
                  <button
                    type="button"
                    onClick={resumeSession}
                    className="rounded-2xl bg-emerald-600 px-6 py-4 font-black text-white"
                  >
                    <span className="inline-flex items-center justify-center gap-2"><FitMateIcon name="play" className="h-5 w-5" />{tr("Lanjutkan", "Resume")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void finishSession()}
                    className="rounded-2xl bg-rose-600 px-6 py-4 font-black text-white"
                  >
                    <span className="inline-flex items-center justify-center gap-2"><FitMateIcon name="stop" className="h-5 w-5" />{tr("Selesai", "Finish")}</span>
                  </button>
                </>
              )}
              {status === "finished" && (
                <>
                  <button
                    type="button"
                    onClick={resetSession}
                    className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  >
                    {tr("Aktivitas baru", "New activity")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportSession(false)}
                    disabled={shareBusy}
                    className="rounded-2xl bg-slate-950 px-6 py-4 font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
                  >
                    ↓ {tr("Download kartu", "Download card")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportSession(true)}
                    disabled={shareBusy}
                    className="rounded-2xl bg-emerald-600 px-6 py-4 font-black text-white disabled:opacity-60 sm:col-span-2"
                  >
                    {tr("Bagikan aktivitas", "Share activity")}
                  </button>
                </>
              )}
            </div>

            {(saving || saveMessage) && (
              <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                {saving
                  ? tr("Menyimpan aktivitas…", "Saving activity…")
                  : saveMessage}
              </p>
            )}
          </div>
        </section>

        {finishedSession && finishedStats && (
          <section className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:gap-6">
            <div className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-slate-950 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                {tr("Editor share FitMate", "FitMate share editor")}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {tr(
                  "Buat Story dari track, foto, atau video",
                  "Create a Story from your track, photo, or video"
                )}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                {tr(
                  "Pilih, ubah ukuran, lalu tarik elemen ke posisi yang diinginkan.",
                  "Select, resize, and drag elements on the preview."
                )}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShareMode("track")}
                  className={`rounded-2xl px-4 py-3 font-black ${
                    shareMode === "track"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                  }`}
                >
                  Track FitMate
                </button>
                <button
                  type="button"
                  onClick={() => setShareMode("media")}
                  className={`rounded-2xl px-4 py-3 font-black ${
                    shareMode === "media"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                  }`}
                >
                  {tr("Foto / Video", "Photo / Video")}
                </button>
              </div>

              {shareMode === "media" && (
                <label className="mt-4 block cursor-pointer rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-5 text-center transition hover:border-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    className="sr-only"
                    onChange={(event) =>
                      setShareMediaFile(event.target.files?.[0] ?? null)
                    }
                  />
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><FitMateIcon name="video" className="h-5 w-5" /></span>
                  <p className="mt-2 font-black">
                    {shareMediaFile
                      ? shareMediaFile.name
                      : tr(
                          "Pilih foto atau video jogging",
                          "Choose a jogging photo or video"
                        )}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {tr(
                      "Format Story 9:16. Video ekspor maksimal 60 detik.",
                      "9:16 Story format. Exported video is limited to 60 seconds."
                    )}
                  </p>
                </label>
              )}

              <div className="mt-5 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {tr("Atur elemen", "Edit element")}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {tr(
                        "Pilih elemen, ubah ukuran, lalu tarik langsung pada preview",
                        "Select an element, resize it, then drag it directly on the preview"
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShareLayout(DEFAULT_JOGGING_SHARE_LAYOUT);
                      setSelectedShareLayer("metrics");
                    }}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black dark:border-white/10 dark:bg-slate-900"
                  >
                    {tr("Reset semua", "Reset all")}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: "metrics", icon: "123", label: tr("Statistik", "Statistics") },
                    { key: "route", icon: "R", label: tr("Garis rute", "Route line") },
                    { key: "brand", icon: "F", label: "Logo FitMate" },
                    { key: "details", icon: "D", label: tr("Detail bawah", "Bottom details") },
                  ] as const).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedShareLayer(item.key)}
                      className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-black transition ${
                        selectedShareLayer === item.key
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                          : "bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"
                      }`}
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-black/10 text-xs">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-black">
                      {tr("Ukuran elemen terpilih", "Selected element size")}
                    </p>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                      {Math.round(selectedShareScale * 100)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedShareScale(selectedShareScale - 0.05)}
                      className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-xl font-black dark:border-white/10"
                      aria-label={tr("Perkecil elemen", "Make element smaller")}
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min={selectedShareLayer === "route" ? 0.45 : 0.5}
                      max={selectedShareLayer === "route" ? 2 : 1.8}
                      step="0.05"
                      value={selectedShareScale}
                      onChange={(event) =>
                        setSelectedShareScale(Number(event.target.value))
                      }
                      className="w-full accent-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedShareScale(selectedShareScale + 0.05)}
                      className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-xl font-black dark:border-white/10"
                      aria-label={tr("Perbesar elemen", "Make element larger")}
                    >
                    </button>
                  </div>
                </div>

                <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {tr(
                    "Posisi dan ukuran hasil akan mengikuti preview.",
                    "The exported result follows the preview."
                  )}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void exportSession(false)}
                  disabled={shareBusy}
                  className="rounded-2xl bg-slate-950 px-5 py-4 font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
                >
                  ↓ {shareBusy ? tr("Memproses…", "Processing…") : tr("Download", "Download")}
                </button>
                <button
                  type="button"
                  onClick={() => void exportSession(true)}
                  disabled={shareBusy}
                  className="rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white shadow-lg shadow-emerald-600/20 disabled:opacity-60"
                >
                  {tr("Bagikan Story", "Share Story")}
                </button>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[440px] lg:max-w-none">
              <div
                ref={sharePreviewRef}
                onPointerMove={(event) => {
                  if (shareDragTarget) {
                    updateShareLayerPosition(
                      shareDragTarget,
                      event.clientX,
                      event.clientY
                    );
                  }
                }}
                onPointerUp={(event) => {
                  setShareDragTarget(null);
                  if (sharePreviewRef.current?.hasPointerCapture(event.pointerId)) {
                    sharePreviewRef.current.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={() => setShareDragTarget(null)}
                className="relative aspect-[9/16] w-full touch-none select-none overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(56,242,141,.34),transparent_35%),linear-gradient(160deg,#03110a,#0a6a3d_60%,#020806)] shadow-2xl ring-1 ring-black/10"
              >
                {shareMode === "media" && shareMediaUrl && shareMediaKind === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shareMediaUrl}
                    alt={tr("Background share jogging", "Jogging share background")}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {shareMode === "media" && shareMediaUrl && shareMediaKind === "video" && (
                  <video
                    src={shareMediaUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/85" />
                <div className="pointer-events-none absolute inset-4 rounded-[1.5rem] border border-white/20" />

                <button
                  type="button"
                  aria-label={tr("Geser statistik", "Move statistics")}
                  onPointerDown={(event) => beginShareDrag("metrics", event)}
                  onClick={() => setSelectedShareLayer("metrics")}
                  className={`absolute z-20 w-[72%] cursor-grab rounded-2xl border p-2 text-center text-white transition active:cursor-grabbing ${
                    selectedShareLayer === "metrics"
                      ? "border-[#38f28d] bg-black/10 shadow-[0_0_0_2px_rgba(56,242,141,.2)]"
                      : "border-transparent"
                  }`}
                  style={{
                    left: `${shareLayout.metricsX}%`,
                    top: `${shareLayout.metricsY}%`,
                    transform: `translate(-50%, -50%) scale(${shareLayout.metricsScale})`,
                    transformOrigin: "center center",
                  }}
                >
                  {[
                    ["DISTANCE", `${(finishedStats.distanceMeters / 1000).toFixed(2)} km`],
                    ["PACE", `${formatPace(finishedStats.averagePaceSecondsPerKm)} /km`],
                    ["TIME", formatDuration(finishedStats.durationSeconds)],
                  ].map(([label, value], index) => (
                    <div key={label} className="leading-none">
                      <p className="text-[9px] font-black tracking-[0.26em] text-white/80 sm:text-[11px]">
                        {label}
                      </p>
                      <p className="mt-1 text-2xl font-black drop-shadow-lg sm:text-3xl">
                        {value}
                      </p>
                      {index < 2 && (
                        <span className="mx-auto my-2 block h-1 w-5 rounded-full bg-[#38f28d]" />
                      )}
                    </div>
                  ))}
                </button>

                <button
                  type="button"
                  aria-label={tr("Geser garis rute", "Move route line")}
                  onPointerDown={(event) => beginShareDrag("route", event)}
                  onClick={() => setSelectedShareLayer("route")}
                  className={`absolute z-20 h-[25%] w-[46%] cursor-grab rounded-2xl border p-1 transition active:cursor-grabbing ${
                    selectedShareLayer === "route"
                      ? "border-[#38f28d] bg-black/10 shadow-[0_0_0_2px_rgba(56,242,141,.2)]"
                      : "border-transparent"
                  }`}
                  style={{
                    left: `${shareLayout.routeX}%`,
                    top: `${shareLayout.routeY}%`,
                    transform: `translate(-50%, -50%) scale(${shareLayout.routeScale})`,
                    transformOrigin: "center center",
                  }}
                >
                  <ShareRoutePreview points={finishedSession.route_points} />
                </button>

                <button
                  type="button"
                  aria-label={tr("Geser logo FitMate", "Move FitMate logo")}
                  onPointerDown={(event) => beginShareDrag("brand", event)}
                  onClick={() => setSelectedShareLayer("brand")}
                  className={`absolute z-20 cursor-grab rounded-2xl border px-3 py-2 transition active:cursor-grabbing ${
                    selectedShareLayer === "brand"
                      ? "border-[#38f28d] bg-black/10 shadow-[0_0_0_2px_rgba(56,242,141,.2)]"
                      : "border-transparent"
                  }`}
                  style={{
                    left: `${shareLayout.brandX}%`,
                    top: `${shareLayout.brandY}%`,
                    transform: `translate(-50%, -50%) scale(${shareLayout.brandScale})`,
                    transformOrigin: "center center",
                  }}
                >
                  <FitMateBrand
                    size="sm"
                    showCompany={false}
                    inverse
                    className="drop-shadow-lg"
                  />
                  <p className="mt-1 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.18em] text-[#b9ffd7]">
                    Move better every day
                  </p>
                </button>

                <button
                  type="button"
                  aria-label={tr("Geser detail aktivitas", "Move activity details")}
                  onPointerDown={(event) => beginShareDrag("details", event)}
                  onClick={() => setSelectedShareLayer("details")}
                  className={`absolute z-20 flex w-[88%] cursor-grab items-center justify-between rounded-2xl border px-3 py-2 text-[8px] font-black tracking-[0.12em] text-white/70 transition active:cursor-grabbing sm:text-[10px] ${
                    selectedShareLayer === "details"
                      ? "border-[#38f28d] bg-black/10 shadow-[0_0_0_2px_rgba(56,242,141,.2)]"
                      : "border-transparent"
                  }`}
                  style={{
                    left: `${shareLayout.detailsX}%`,
                    top: `${shareLayout.detailsY}%`,
                    transform: `translate(-50%, -50%) scale(${shareLayout.detailsScale})`,
                    transformOrigin: "center center",
                  }}
                >
                  <span>{Math.round(finishedStats.caloriesKcal)} KCAL</span>
                  <span>{finishedStats.averageSpeedKmh.toFixed(1)} {language === "id" ? "KM/J" : "KM/H"}</span>
                  <span>{Math.round(finishedStats.elevationGainMeters)} M ELEV</span>
                </button>

                <div className="pointer-events-none absolute left-6 top-6 h-8 w-8 border-l-2 border-t-2 border-white/70" />
                <div className="pointer-events-none absolute right-6 top-6 h-8 w-8 border-r-2 border-t-2 border-white/70" />
                <div className="pointer-events-none absolute bottom-6 left-6 h-8 w-8 border-b-2 border-l-2 border-white/70" />
                <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 border-b-2 border-r-2 border-white/70" />
              </div>
              <p className="mt-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                {tr(
                  "Pilih elemen, ubah ukuran, lalu tarik posisinya",
                  "Select, resize, then drag the element"
                )}
              </p>
            </div>
          </section>
        )}

        {activeStats.splits.length > 0 && (
          <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:p-6">
            <h2 className="text-2xl font-black">
              {tr("Split per kilometer", "Kilometer splits")}
            </h2>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-white/10">
              {activeStats.splits.map((split) => (
                <div
                  key={split.kilometer}
                  className="flex items-center justify-between py-3 font-bold"
                >
                  <span>KM {split.kilometer}</span>
                  <span className="text-emerald-600 dark:text-emerald-300">
                    {formatPace(split.paceSecondsPerKm)} /km
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
                {tr("Riwayat gratis", "Free history")}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {tr("Aktivitas jogging kamu", "Your jogging activities")}
              </h2>
            </div>
            <Link
              href="/progress"
              className="text-sm font-black text-emerald-700 dark:text-emerald-300"
            >
              {tr("Lihat progres lainnya", "See more progress")}
            </Link>
          </div>

          {historyLoading ? (
            <p className="mt-5 font-semibold text-slate-500">
              {tr("Memuat riwayat…", "Loading history…")}
            </p>
          ) : history.length === 0 ? (
            <div className="mt-5 rounded-3xl bg-slate-50 p-6 text-center dark:bg-white/5">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600"><FitMateIcon name="run" className="h-5 w-5" /></span>
              <p className="mt-1 text-xs font-black sm:text-sm lg:mt-2 lg:text-base">
                {tr(
                  "Belum ada aktivitas jogging",
                  "No jogging activities yet"
                )}
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {history.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => selectHistory(session)}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 text-left transition hover:border-emerald-300 dark:border-white/10 dark:bg-white/5"
                >
                  <JoggingRouteMap
                    points={session.route_points || []}
                    showTiles={false}
                    className="h-40 sm:h-44"
                  />
                  <div className="p-4">
                    <p className="font-black">{localizeJoggingTitle(session.title, language)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {sessionDateLabel(session.started_at, language)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm font-black">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                        {(session.distance_meters / 1000).toFixed(2)} km
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 dark:bg-white/10">
                        {formatDuration(session.duration_seconds)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 dark:bg-white/10">
                        {Math.round(session.calories_kcal)} kcal
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-black">
            {tr("Catatan keamanan dan privasi", "Safety and privacy note")}
          </p>
          <p className="mt-1">
            {tr(
              "Fokus pada jalan. Bagikan rute GPS dengan hati-hati. Kalori hanya estimasi.",
              "Stay focused on the road. Share GPS routes carefully. Calories are estimates."
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
