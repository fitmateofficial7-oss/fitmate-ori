"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
} from "react";

import { useLanguage } from "@/components/language-provider";
import AccountPlanBadge from "@/components/account-plan-badge";
import LiveIcon from "@/components/live-icon";

type IconName =
  | "home"
  | "plan"
  | "workout"
  | "jogging"
  | "moves"
  | "progress"
  | "nutrition"
  | "coach"
  | "settings";

type MotionName = "float" | "pulse" | "tick" | "wiggle" | "pop";

type BubbleItem = {
  href: string;
  labelId: string;
  labelEn: string;
  icon: IconName;
  motion: MotionName;
  x: string;
  y: string;
};

const ITEMS: BubbleItem[] = [
  { href: "/dashboard", labelId: "Beranda", labelEn: "Home", icon: "home", motion: "float", x: "0rem", y: "-9.5rem" },
  { href: "/plan", labelId: "Rencana", labelEn: "Plan", icon: "plan", motion: "tick", x: "-5.5rem", y: "-3.1rem" },
  { href: "/workout", labelId: "Latihan", labelEn: "Workout", icon: "workout", motion: "pulse", x: "5.5rem", y: "-3.1rem" },
  { href: "/jogging", labelId: "Jogging", labelEn: "Jogging", icon: "jogging", motion: "float", x: "0rem", y: "-3.1rem" },
  { href: "/exercises", labelId: "Gerakan", labelEn: "Moves", icon: "moves", motion: "pop", x: "8rem", y: "-9.7rem" },
  { href: "/progress", labelId: "Progres", labelEn: "Progress", icon: "progress", motion: "tick", x: "5.5rem", y: "-16.3rem" },
  { href: "/nutrition", labelId: "Nutrisi", labelEn: "Food", icon: "nutrition", motion: "pop", x: "0rem", y: "-16.3rem" },
  { href: "/coach", labelId: "Coach", labelEn: "Coach", icon: "coach", motion: "wiggle", x: "-5.5rem", y: "-16.3rem" },
  { href: "/settings", labelId: "Atur", labelEn: "Settings", icon: "settings", motion: "float", x: "-8rem", y: "-9.7rem" },
];

const APP_ROUTES = ITEMS.map((item) => item.href);

type BubbleSoundKind = "open" | "close" | "select";

let bubbleAudioContext: AudioContext | null = null;

function playBubbleSound(kind: BubbleSoundKind) {
  if (typeof window === "undefined") return;

  try {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextConstructor) return;

    bubbleAudioContext ??= new AudioContextConstructor();
    const context = bubbleAudioContext;

    if (context.state === "suspended") {
      void context.resume();
    }

    const now = context.currentTime;
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const primary = context.createOscillator();
    const shimmer = context.createOscillator();
    const shimmerGain = context.createGain();

    const settings = {
      open: { start: 330, end: 610, duration: 0.21, volume: 0.18 },
      close: { start: 520, end: 250, duration: 0.18, volume: 0.15 },
      select: { start: 430, end: 720, duration: 0.18, volume: 0.17 },
    }[kind];

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2300, now);
    filter.Q.setValueAtTime(0.65, now);

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(settings.volume, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);

    primary.type = "sine";
    primary.frequency.setValueAtTime(settings.start, now);
    primary.frequency.exponentialRampToValueAtTime(
      settings.end,
      now + settings.duration * 0.7
    );

    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(settings.start * 1.95, now + 0.018);
    shimmer.frequency.exponentialRampToValueAtTime(
      settings.end * 1.45,
      now + settings.duration
    );
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.048, now + 0.025);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);

    primary.connect(filter);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(filter);
    filter.connect(master);
    master.connect(context.destination);

    primary.start(now);
    shimmer.start(now + 0.018);
    primary.stop(now + settings.duration + 0.02);
    shimmer.stop(now + settings.duration + 0.025);
  } catch {
    // Audio is an enhancement. Navigation must still work when blocked.
  }
}


type BubbleStyle = CSSProperties & {
  "--bubble-x": string;
  "--bubble-y": string;
  "--bubble-delay": string;
};

function NavigationIcon({ name }: { name: IconName }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-6 w-6",
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...commonProps}>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v11h14V9" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case "plan":
      return (
        <svg {...commonProps}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 3v3h6V3" />
          <path d="m9 12 1.5 1.5L14 10" />
          <path d="M9 17h6" />
        </svg>
      );
    case "workout":
      return (
        <svg {...commonProps}>
          <path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" />
          <path d="M9 9v6M15 9v6" />
        </svg>
      );
    case "jogging":
      return (
        <svg {...commonProps}>
          <circle cx="13" cy="4" r="2" />
          <path d="m10 9 3-2 3 3 3 1" />
          <path d="m11 9-2 5 4 2 2 5" />
          <path d="m9 14-4 2-2 4" />
          <path d="M16 10l-2 4" />
        </svg>
      );
    case "moves":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="5" r="2" />
          <path d="m8 21 2-6-3-3 3-4 4 2 3 4" />
          <path d="m14 10 3-2 2 2" />
          <path d="m12 15 4 2 1 4" />
        </svg>
      );
    case "progress":
      return (
        <svg {...commonProps}>
          <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
          <path d="m3 7 6-4 6 4 6-5" />
        </svg>
      );
    case "nutrition":
      return (
        <svg {...commonProps}>
          <path d="M12 7c-3-3-8-1-8 4 0 5 4 10 8 10s8-5 8-10c0-5-5-7-8-4Z" />
          <path d="M12 7c0-3 2-5 5-5" />
          <path d="M12 7c-1-2-3-3-5-3" />
        </svg>
      );
    case "coach":
      return (
        <svg {...commonProps}>
          <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
          <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
          <path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );
  }
}

function BubbleGlyph({ open }: { open: boolean }) {
  if (open) {
    return (
      <span className="relative block h-8 w-8" aria-hidden="true">
        <span className="absolute left-1/2 top-1/2 h-0.5 w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current" />
        <span className="absolute left-1/2 top-1/2 h-0.5 w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
      </span>
    );
  }

  return (
    <span className="grid h-8 w-8 grid-cols-2 place-items-center gap-1" aria-hidden="true">
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
    </span>
  );
}

export default function FloatingBubbleMenu() {
  const pathname = usePathname();
  const { tr } = useLanguage();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const isAppPage = APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const focusTimer = window.setTimeout(() => {
      const activeLink = navRef.current?.querySelector<HTMLElement>(
        '[aria-current="page"]'
      );
      const firstLink = navRef.current?.querySelector<HTMLElement>("a[href]");
      (activeLink ?? firstLink)?.focus();
    }, 180);

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!isAppPage) return null;

  return (
    <div
      className={`fitmate-bubble-navigation ${open ? "is-open" : ""}`}
      data-testid="fitmate-floating-bubble-menu"
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={tr("Tutup menu", "Close menu")}
        className="fitmate-bubble-navigation__backdrop"
        onClick={() => setOpen(false)}
      />

      <nav
        ref={navRef}
        id="fitmate-floating-bubble-menu"
        aria-label={tr("Navigasi utama FitMate", "FitMate main navigation")}
        aria-hidden={!open}
        className="fitmate-bubble-navigation__cloud"
      >
        {ITEMS.map((item, index) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const style: BubbleStyle = {
            "--bubble-x": item.x,
            "--bubble-y": item.y,
            "--bubble-delay": `${index * 34}ms`,
          };

          return (
            <Link
              key={item.href}
              href={item.href}
              tabIndex={open ? 0 : -1}
              aria-current={active ? "page" : undefined}
              aria-label={tr(item.labelId, item.labelEn)}
              title={tr(item.labelId, item.labelEn)}
              style={style}
              className={`fitmate-bubble-navigation__item ${
                active ? "is-active" : ""
              } ${item.href === "/dashboard" ? "is-center" : ""}`}
              onClick={() => {
                playBubbleSound("select");
                setOpen(false);
              }}
            >
              <span className="fitmate-bubble-navigation__icon">
                <LiveIcon variant={item.motion} active={active || open}>
                  <NavigationIcon name={item.icon} />
                </LiveIcon>
              </span>
              <span className="fitmate-bubble-navigation__label">
                {tr(item.labelId, item.labelEn)}
              </span>
            </Link>
          );
        })}
      </nav>

      <AccountPlanBadge />

      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="fitmate-floating-bubble-menu"
        aria-label={open ? tr("Tutup menu", "Close menu") : tr("Buka menu", "Open menu")}
        className="fitmate-bubble-navigation__trigger"
        onClick={() => {
          const nextOpen = !open;
          playBubbleSound(nextOpen ? "open" : "close");
          setOpen(nextOpen);
        }}
      >
        <span className="fitmate-bubble-navigation__trigger-ring" />
        <BubbleGlyph open={open} />
        <span className="fitmate-bubble-navigation__trigger-label">
          {open ? tr("Tutup", "Close") : tr("Menu", "Menu")}
        </span>
      </button>
    </div>
  );
}
