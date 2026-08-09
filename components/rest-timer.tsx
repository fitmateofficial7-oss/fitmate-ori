"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLanguage } from "@/components/language-provider";
import FitMateIcon from "@/components/fitmate-icon";
import LiveIcon from "@/components/live-icon";
import {
  cancelRestTimerNotification,
  clearRestTimerDeliveredNotification,
  notifyRestTimerOnWeb,
  prepareRestTimerNotifications,
  prepareWebRestTimerNotifications,
  scheduleRestTimerNotification,
  REST_TIMER_STORAGE_KEY,
  REST_TIMER_STOP_EVENT,
} from "@/lib/rest-timer-notifications";

type RestTimerProps = {
  initialSeconds?: number;
  exerciseName?: string;
  autoStart?: boolean;
};

type StoredRestTimer = {
  duration: number;
  remaining: number;
  running: boolean;
  endsAt: number | null;
  exerciseName?: string;
};

export function parseRestSeconds(value: string | null | undefined) {
  if (!value) return 60;
  const numbers = value.match(/\d+/g)?.map(Number).filter(Number.isFinite) || [];
  if (!numbers.length) return 60;
  const seconds = value.toLowerCase().includes("min")
    ? Math.max(...numbers) * 60
    : Math.max(...numbers);
  return Math.min(Math.max(seconds, 15), 600);
}

function createTimerAudioContext() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    return AudioContextClass ? new AudioContextClass() : null;
  } catch {
    return null;
  }
}

function playTimerAlarm(context: AudioContext) {
  const masterGain = context.createGain();
  const oscillators: OscillatorNode[] = [];
  const startAt = context.currentTime + 0.03;
  const beepTimes = [0, 0.22, 0.44, 1.08, 1.3, 1.52];

  masterGain.gain.setValueAtTime(0.38, startAt);
  masterGain.connect(context.destination);

  beepTimes.forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const beepStart = startAt + offset;
    const beepEnd = beepStart + 0.14;
    oscillator.type = index % 3 === 2 ? "square" : "sine";
    oscillator.frequency.setValueAtTime(index % 2 === 0 ? 880 : 1120, beepStart);
    envelope.gain.setValueAtTime(0.0001, beepStart);
    envelope.gain.exponentialRampToValueAtTime(0.82, beepStart + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, beepEnd);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(beepStart);
    oscillator.stop(beepEnd + 0.02);
    oscillators.push(oscillator);
  });

  return () => {
    oscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // Already stopped.
      }
    });
    try {
      masterGain.disconnect();
    } catch {
      // Already disconnected.
    }
  };
}

function vibrateRestFinished() {
  try {
    navigator.vibrate?.([280, 120, 280, 120, 280, 500, 280]);
  } catch {
    // Optional browser capability.
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function readStoredTimer(): StoredRestTimer | null {
  try {
    const raw = window.localStorage.getItem(REST_TIMER_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredRestTimer;
    if (!Number.isFinite(stored.duration) || stored.duration < 15) return null;
    return stored;
  } catch {
    return null;
  }
}

export default function RestTimer({
  initialSeconds = 60,
  exerciseName,
  autoStart = false,
}: RestTimerProps) {
  const { tr } = useLanguage();
  const safeInitial = Math.min(Math.max(Math.round(initialSeconds), 15), 600);
  const [duration, setDuration] = useState(safeInitial);
  const [remaining, setRemaining] = useState(safeInitial);
  const [running, setRunning] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(autoStart);
  const [alarmActive, setAlarmActive] = useState(false);
  const hydratedRef = useRef(false);
  const announcedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopAlarmRef = useRef<(() => void) | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  const stopAlarmSound = useCallback(() => {
    if (alarmIntervalRef.current !== null) {
      window.clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    stopAlarmRef.current?.();
    stopAlarmRef.current = null;
    try {
      navigator.vibrate?.(0);
    } catch {
      // Optional browser capability.
    }
  }, []);

  const prepareSound = useCallback(() => {
    const context = audioContextRef.current ?? createTimerAudioContext();
    audioContextRef.current = context;
    void context?.resume();
    void prepareRestTimerNotifications();
    void prepareWebRestTimerNotifications();
  }, []);

  const persist = useCallback(
    (next?: Partial<StoredRestTimer>) => {
      try {
        const value: StoredRestTimer = {
          duration,
          remaining,
          running,
          endsAt,
          exerciseName,
          ...next,
        };
        window.localStorage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify(value));
      } catch {
        // Storage is optional.
      }
    },
    [duration, endsAt, exerciseName, remaining, running]
  );

  const finishTimer = useCallback(() => {
    if (announcedRef.current) return;
    announcedRef.current = true;
    setRemaining(0);
    setRunning(false);
    setEndsAt(null);
    setAlarmActive(true);
    setExpanded(true);
    persist({ remaining: 0, running: false, endsAt: null });
    notifyRestTimerOnWeb(exerciseName);

    const context = audioContextRef.current ?? createTimerAudioContext();
    audioContextRef.current = context;
    if (context) {
      void context.resume().then(() => {
        stopAlarmSound();
        const ring = () => {
          stopAlarmRef.current?.();
          stopAlarmRef.current = playTimerAlarm(context);
          vibrateRestFinished();
        };
        ring();
        // Keep ringing while the FitMate screen is active until the user stops it.
        alarmIntervalRef.current = window.setInterval(ring, 2_700);
      });
    } else {
      vibrateRestFinished();
    }
  }, [exerciseName, persist, stopAlarmSound]);

  const startTimer = useCallback(
    (seconds = remaining) => {
      prepareSound();
      stopAlarmSound();
      setAlarmActive(false);
      void clearRestTimerDeliveredNotification();
      const safeSeconds = Math.max(1, seconds || duration);
      const target = Date.now() + safeSeconds * 1000;
      announcedRef.current = false;
      setRemaining(safeSeconds);
      setRunning(true);
      setEndsAt(target);
      setExpanded(true);
      persist({ remaining: safeSeconds, running: true, endsAt: target });
      void scheduleRestTimerNotification(target, exerciseName);
    },
    [duration, exerciseName, persist, prepareSound, remaining, stopAlarmSound]
  );

  const pauseTimer = useCallback(() => {
    const nextRemaining = endsAt
      ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      : remaining;
    setRemaining(nextRemaining);
    setRunning(false);
    setEndsAt(null);
    persist({ remaining: nextRemaining, running: false, endsAt: null });
    void cancelRestTimerNotification();
  }, [endsAt, persist, remaining]);

  const dismissAlarm = useCallback(() => {
    stopAlarmSound();
    setAlarmActive(false);
    void cancelRestTimerNotification();
    void clearRestTimerDeliveredNotification();
  }, [stopAlarmSound]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (autoStart) {
      setDuration(safeInitial);
      setRemaining(safeInitial);
      window.setTimeout(() => startTimer(safeInitial), 0);
      return;
    }

    const stored = readStoredTimer();
    if (!stored) return;

    const storedDuration = Math.min(Math.max(Math.round(stored.duration), 15), 600);
    setDuration(storedDuration);

    if (stored.running && stored.endsAt) {
      const nextRemaining = Math.max(0, Math.ceil((stored.endsAt - Date.now()) / 1000));
      setRemaining(nextRemaining);
      if (nextRemaining > 0) {
        setRunning(true);
        setEndsAt(stored.endsAt);
      } else {
        window.setTimeout(finishTimer, 0);
      }
    } else {
      setRemaining(Math.min(Math.max(Math.round(stored.remaining || storedDuration), 0), 600));
    }
  }, [autoStart, finishTimer, safeInitial, startTimer]);

  useEffect(() => {
    if (!running || !endsAt) return;

    const sync = () => {
      const next = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(next);
      if (next <= 0) finishTimer();
    };

    sync();
    const intervalId = window.setInterval(sync, 500);
    const handleVisibility = () => {
      if (!document.hidden) sync();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [endsAt, finishTimer, running]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    persist();
  }, [duration, endsAt, persist, remaining, running]);

  useEffect(() => {
    const handleExternalStop = () => {
      stopAlarmSound();
      announcedRef.current = true;
      setAlarmActive(false);
      setRunning(false);
      setEndsAt(null);
      setRemaining(0);
    };
    window.addEventListener(REST_TIMER_STOP_EVENT, handleExternalStop);
    return () => window.removeEventListener(REST_TIMER_STOP_EVENT, handleExternalStop);
  }, [stopAlarmSound]);

  useEffect(() => {
    return () => {
      stopAlarmSound();
      void audioContextRef.current?.close();
    };
  }, [stopAlarmSound]);

  const progress = useMemo(
    () => (duration > 0 ? Math.max(0, Math.min(1, remaining / duration)) : 0),
    [duration, remaining]
  );
  const circumference = 2 * Math.PI * 50;
  const dashOffset = circumference * (1 - progress);

  const setPreset = (seconds: number) => {
    prepareSound();
    dismissAlarm();
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(false);
    setEndsAt(null);
    announcedRef.current = false;
    persist({ duration: seconds, remaining: seconds, running: false, endsAt: null });
    void cancelRestTimerNotification();
  };

  const adjust = (amount: number) => {
    prepareSound();
    dismissAlarm();
    const base = running && endsAt
      ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      : remaining;
    const next = Math.min(Math.max(base + amount, 0), 600);
    const nextDuration = Math.max(duration, next, 15);
    setRemaining(next);
    setDuration(nextDuration);
    announcedRef.current = false;

    if (running && next > 0) {
      const target = Date.now() + next * 1000;
      setEndsAt(target);
      persist({ duration: nextDuration, remaining: next, running: true, endsAt: target });
      void scheduleRestTimerNotification(target, exerciseName);
    } else {
      setRunning(false);
      setEndsAt(null);
      persist({ duration: nextDuration, remaining: next, running: false, endsAt: null });
      void cancelRestTimerNotification();
      if (next === 0) finishTimer();
    }
  };

  const reset = () => {
    prepareSound();
    dismissAlarm();
    setRemaining(duration);
    setRunning(false);
    setEndsAt(null);
    announcedRef.current = false;
    persist({ remaining: duration, running: false, endsAt: null });
    void cancelRestTimerNotification();
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fitmate-rest-timer-mini"
        aria-label={tr("Buka timer", "Open timer")}
      >
        <LiveIcon variant="tick" active={running} className="fitmate-rest-timer-mini__icon">
          <FitMateIcon name="timer" className="h-5 w-5" />
        </LiveIcon>
        <span className="font-bold tabular-nums">{formatTime(remaining)}</span>
      </button>
    );
  }

  return (
    <aside aria-label={tr("Timer istirahat", "Rest timer")} className="fitmate-rest-timer-panel">
      <div className="fitmate-rest-timer-panel__header">
        <div className="min-w-0">
          <p className="text-xs font-bold text-green-700">{tr("Timer", "Timer")}</p>
          <p className="truncate text-sm font-semibold">{exerciseName || tr("Istirahat", "Rest")}</p>
        </div>
        <button type="button" onClick={() => setExpanded(false)} className="fitmate-rest-timer-panel__minimize" aria-label={tr("Minimalkan", "Minimize")}>−</button>
      </div>

      <div className="p-4 sm:p-5">
        {alarmActive && (
          <div role="alert" aria-live="assertive" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-100">{tr("Istirahat selesai", "Rest complete")}</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">{tr("Lanjut ke set berikutnya.", "Continue to the next set.")}</p>
              </div>
              <button type="button" onClick={dismissAlarm} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950">
                {tr("Matikan", "Stop")}
              </button>
            </div>
          </div>
        )}

        <div className="relative mx-auto h-40 w-40" aria-live="polite">
          <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(100,116,139,.14)" strokeWidth="8" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#16a34a" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-all duration-300" />
          </svg>
          <div className="absolute inset-[1.1rem] flex flex-col items-center justify-center rounded-full bg-white text-center dark:bg-slate-950">
            <p className="text-[2rem] font-bold leading-none tracking-tight tabular-nums">{formatTime(remaining)}</p>
            <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
              {remaining === 0 ? tr("Selesai", "Done") : running ? tr("Berjalan", "Running") : tr("Jeda", "Paused")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[30, 60, 90].map((seconds) => (
            <button type="button" key={seconds} onClick={() => setPreset(seconds)} className={`h-10 rounded-xl text-sm font-semibold ${duration === seconds ? "bg-green-600 text-white" : "border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"}`}>
              {seconds}s
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-[1fr_1.4fr_1fr] gap-2">
          <button type="button" onClick={() => adjust(-15)} className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">−15s</button>
          <button
            type="button"
            onClick={() => {
              if (alarmActive) {
                dismissAlarm();
                return;
              }
              if (running) pauseTimer();
              else startTimer(remaining === 0 ? duration : remaining);
            }}
            className="h-11 rounded-xl bg-green-600 text-sm font-bold text-white"
          >
            {alarmActive ? tr("Matikan", "Stop") : running ? tr("Jeda", "Pause") : remaining === 0 ? tr("Ulangi", "Restart") : tr("Mulai", "Start")}
          </button>
          <button type="button" onClick={() => adjust(15)} className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">+15s</button>
        </div>

        <button type="button" onClick={reset} className="mt-2 w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-white">
          {tr("Reset", "Reset")}
        </button>
      </div>
    </aside>
  );
}
