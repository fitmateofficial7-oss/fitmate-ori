"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLanguage } from "@/components/language-provider";
import LiveIcon from "@/components/live-icon";

type RestTimerProps = {
  initialSeconds?: number;
  exerciseName?: string;
  autoStart?: boolean;
};

export function parseRestSeconds(value: string | null | undefined) {
  if (!value) {
    return 60;
  }

  const numbers =
    value.match(/\d+/g)?.map(Number).filter(Number.isFinite) ||
    [];

  if (numbers.length === 0) {
    return 60;
  }

  const seconds =
    value.toLowerCase().includes("min")
      ? Math.max(...numbers) * 60
      : Math.max(...numbers);

  return Math.min(Math.max(seconds, 15), 600);
}

function createTimerAudioContext() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    return new AudioContextClass();
  } catch {
    return null;
  }
}

function playTimerAlarm(context: AudioContext) {
  const masterGain = context.createGain();
  const oscillators: OscillatorNode[] = [];
  const startAt = context.currentTime + 0.04;
  const beepTimes = [
    0,
    0.22,
    0.44,
    1.08,
    1.3,
    1.52,
    2.16,
    2.38,
    2.6,
  ];

  masterGain.gain.setValueAtTime(0.42, startAt);
  masterGain.connect(context.destination);

  beepTimes.forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const beepStart = startAt + offset;
    const beepEnd = beepStart + 0.15;

    oscillator.type = index % 3 === 2 ? "square" : "sine";
    oscillator.frequency.setValueAtTime(
      index % 2 === 0 ? 880 : 1_120,
      beepStart
    );
    envelope.gain.setValueAtTime(0.0001, beepStart);
    envelope.gain.exponentialRampToValueAtTime(
      index % 3 === 2 ? 0.72 : 0.9,
      beepStart + 0.015
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      beepEnd
    );
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
        // The scheduled oscillator may already be stopped.
      }
    });
    masterGain.disconnect();
  };
}

function vibrateRestFinished() {
  try {
    navigator.vibrate?.([
      280,
      120,
      280,
      120,
      280,
      500,
      280,
      120,
      280,
    ]);
  } catch {
    // Vibration support is optional.
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainder
  ).padStart(2, "0")}`;
}

export default function RestTimer({
  initialSeconds = 60,
  exerciseName,
  autoStart = false,
}: RestTimerProps) {
  const { tr } = useLanguage();
  const safeInitial = Math.min(
    Math.max(Math.round(initialSeconds), 15),
    600
  );
  const [duration, setDuration] = useState(safeInitial);
  const [remaining, setRemaining] = useState(safeInitial);
  const [running, setRunning] = useState(autoStart);
  const [expanded, setExpanded] = useState(autoStart);
  const [alarmActive, setAlarmActive] = useState(false);
  const announcedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopAlarmRef = useRef<(() => void) | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);
  const alarmAutoStopRef = useRef<number | null>(null);

  const stopAlarmSound = useCallback(() => {
    if (alarmIntervalRef.current !== null) {
      window.clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }

    if (alarmAutoStopRef.current !== null) {
      window.clearTimeout(alarmAutoStopRef.current);
      alarmAutoStopRef.current = null;
    }

    stopAlarmRef.current?.();
    stopAlarmRef.current = null;
    navigator.vibrate?.(0);
  }, []);

  useEffect(() => {
    if (!running || remaining <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [remaining, running]);

  useEffect(() => {
    if (
      remaining !== 0 ||
      announcedRef.current
    ) {
      return;
    }

    announcedRef.current = true;
    const context =
      audioContextRef.current ?? createTimerAudioContext();
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
        alarmIntervalRef.current = window.setInterval(
          ring,
          3_000
        );
        alarmAutoStopRef.current = window.setTimeout(
          stopAlarmSound,
          20_000
        );
      });
    } else {
      vibrateRestFinished();
    }

    const stateTimeout = window.setTimeout(() => {
      setRunning(false);
      setAlarmActive(true);
      setExpanded(true);
    }, 0);

    return () => {
      window.clearTimeout(stateTimeout);
    };
  }, [remaining, stopAlarmSound]);

  useEffect(() => {
    return () => {
      stopAlarmSound();
      void audioContextRef.current?.close();
    };
  }, [stopAlarmSound]);

  const progress = useMemo(
    () =>
      duration > 0
        ? Math.max(
            0,
            Math.min(1, remaining / duration)
          )
        : 0,
    [duration, remaining]
  );
  const circumference = 2 * Math.PI * 50;
  const dashOffset =
    circumference * (1 - progress);

  const dismissAlarm = () => {
    stopAlarmSound();
    setAlarmActive(false);
  };

  const prepareSound = () => {
    const context =
      audioContextRef.current ?? createTimerAudioContext();
    audioContextRef.current = context;
    void context?.resume();
  };

  const setPreset = (seconds: number) => {
    prepareSound();
    dismissAlarm();
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(false);
    announcedRef.current = false;
  };

  const adjust = (amount: number) => {
    prepareSound();
    dismissAlarm();
    const next = Math.min(
      Math.max(remaining + amount, 0),
      600
    );
    setRemaining(next);
    setDuration((value) => Math.max(value, next, 15));
    announcedRef.current = false;
  };

  const reset = () => {
    prepareSound();
    dismissAlarm();
    setRemaining(duration);
    setRunning(false);
    announcedRef.current = false;
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:border-green-400 sm:bottom-6 sm:right-6"
        aria-label={tr(
          "Buka timer istirahat",
          "Open rest timer"
        )}
      >
        <LiveIcon
          variant="tick"
          active={running}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-xl text-white"
        >
          ⏱
        </LiveIcon>
        <span className="hidden sm:block">
          <span className="block text-xs font-bold text-slate-500">
            {tr("Timer istirahat", "Rest timer")}
          </span>
          <span className="font-black">
            {formatTime(remaining)}
          </span>
        </span>
      </button>
    );
  }

  return (
    <aside
      aria-label={tr("Timer istirahat", "Rest timer")}
      className="fixed bottom-24 left-1/2 z-50 w-[calc(100%_-_2rem)] max-w-[370px] -translate-x-1/2 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-green-700">
            {tr("Timer istirahat", "Rest timer")}
          </p>
          <p className="mt-1 max-w-56 truncate text-sm font-bold">
            {exerciseName ||
              tr("Timer istirahat", "Rest timer")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          aria-label={tr(
            "Minimalkan timer",
            "Minimize timer"
          )}
        >
          −
        </button>
      </div>

      <div className="bg-slate-50 p-5 dark:bg-slate-900/70 sm:p-6">
        {alarmActive && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3"
          >
            <p className="font-black text-amber-900">
              <LiveIcon
                variant="wiggle"
                active
                className="mr-2"
              >
                🔔
              </LiveIcon>
              {tr("Istirahat selesai", "Rest complete")}
            </p>
            <p className="mt-1 text-xs text-amber-800">
              {tr(
                "Alarm berbunyi berulang hingga dimatikan, maksimal 20 detik.",
                "The alarm repeats until dismissed, for up to 20 seconds."
              )}
            </p>
            <button
              type="button"
              onClick={dismissAlarm}
              className="mt-3 w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-400"
            >
              {tr("Matikan alarm", "Dismiss alarm")}
            </button>
          </div>
        )}

        <div className="relative mx-auto h-44 w-44" aria-live="polite">
          <svg
            viewBox="0 0 120 120"
            className="absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="rgba(100,116,139,.16)"
              strokeWidth="9"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="url(#restTimerGradient)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient
                id="restTimerGradient"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop stopColor="#4ade80" />
                <stop offset="1" stopColor="#16a34a" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-[1.15rem] flex flex-col items-center justify-center rounded-full bg-white/95 text-center shadow-inner dark:bg-slate-950/90">
            <p className="text-[2rem] font-black leading-none tracking-[-0.04em] tabular-nums">
              {formatTime(remaining)}
            </p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              {remaining === 0
                ? tr("Selesai", "Complete")
                : running
                  ? tr("Berjalan", "Running")
                  : tr("Dijeda", "Paused")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {[30, 60, 90].map((seconds) => (
            <button
              type="button"
              key={seconds}
              onClick={() => setPreset(seconds)}
              className={`h-12 rounded-xl px-3 text-sm font-black transition ${
                duration === seconds
                  ? "bg-green-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-green-400"
              }`}
            >
              {seconds} {tr("dtk", "sec")}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_1.55fr_1fr] gap-2.5">
          <button
            type="button"
            onClick={() => adjust(-15)}
            className="h-12 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 hover:border-green-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            −15s
          </button>
          <button
            type="button"
            onClick={() => {
              prepareSound();
              dismissAlarm();
              if (remaining === 0) {
                setRemaining(duration);
                announcedRef.current = false;
              }
              setRunning((value) => !value);
            }}
            className="h-12 rounded-xl bg-green-600 text-sm font-black text-white hover:bg-green-700"
          >
            {running
              ? tr("Jeda", "Pause")
              : remaining === 0
                ? tr("Ulangi", "Restart")
                : tr("Mulai", "Start")}
          </button>
          <button
            type="button"
            onClick={() => adjust(15)}
            className="h-12 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 hover:border-green-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            +15s
          </button>
        </div>

        <button
          type="button"
          onClick={reset}
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          {tr("Atur ulang timer", "Reset timer")}
        </button>
      </div>
    </aside>
  );
}
