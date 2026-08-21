"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AccountPlanBadge from "@/components/account-plan-badge";
import FitMateIcon, { type FitMateIconName } from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";

type NavItem = {
  href: string;
  labelId: string;
  labelEn: string;
  icon: FitMateIconName;
};

const ITEMS: NavItem[] = [
  { href: "/dashboard", labelId: "Beranda", labelEn: "Home", icon: "activity" },
  { href: "/plan", labelId: "Rencana", labelEn: "Plan", icon: "list" },
  { href: "/workout", labelId: "Latihan", labelEn: "Workout", icon: "dumbbell" },
  { href: "/jogging", labelId: "Jogging", labelEn: "Jogging", icon: "run" },
  { href: "/exercises", labelId: "Gerakan", labelEn: "Exercises", icon: "play" },
  { href: "/progress", labelId: "Progres", labelEn: "Progress", icon: "chart" },
  { href: "/nutrition", labelId: "Nutrisi", labelEn: "Nutrition", icon: "food" },
  { href: "/coach", labelId: "Coach", labelEn: "Coach", icon: "coach" },
  { href: "/settings", labelId: "Pengaturan", labelEn: "Settings", icon: "settings" },
];

const QUICK_ROUTES = ["/dashboard", "/workout", "/jogging", "/coach"];
const APP_ROUTES = ITEMS.map((item) => item.href);

type BubbleSoundKind = "open" | "close" | "select";
let bubbleAudioContext: AudioContext | null = null;

async function getBubbleAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) return null;

  if (!bubbleAudioContext || bubbleAudioContext.state === "closed") {
    bubbleAudioContext = new AudioContextConstructor();
  }

  if (bubbleAudioContext.state === "suspended") {
    await bubbleAudioContext.resume();
  }

  return bubbleAudioContext;
}

async function playBubbleSound(kind: BubbleSoundKind) {
  try {
    const context = await getBubbleAudioContext();
    if (!context || context.state !== "running") return;

    const now = context.currentTime + 0.004;
    const tones = {
      open: [520, 760, 0.095],
      close: [610, 330, 0.085],
      select: [470, 690, 0.075],
    } as const;
    const [start, end, duration] = tones[kind];

    // Main rounded "bubble" tone.
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);

    // A very short higher harmonic makes the tap audible on phone speakers
    // without turning the menu sound into a notification beep.
    const popOscillator = context.createOscillator();
    const popGain = context.createGain();
    popOscillator.type = "sine";
    popOscillator.frequency.setValueAtTime(start * 1.8, now);
    popOscillator.frequency.exponentialRampToValueAtTime(
      Math.max(240, end * 1.18),
      now + duration * 0.7
    );
    popGain.gain.setValueAtTime(0.0001, now);
    popGain.gain.exponentialRampToValueAtTime(0.022, now + 0.004);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.72);
    popOscillator.connect(popGain);
    popGain.connect(context.destination);

    oscillator.start(now);
    popOscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    popOscillator.stop(now + duration + 0.02);
  } catch {
    // Navigation should never depend on audio support.
  }
}

export default function FloatingBubbleMenu() {
  const pathname = usePathname();
  const { language, setLanguage, tr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const isAppPage = APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const quickItems = useMemo(
    () =>
      QUICK_ROUTES.map((route) => ITEMS.find((item) => item.href === route)).filter(
        Boolean
      ) as NavItem[],
    []
  );

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!isAppPage) return null;

  const toggleTheme = () => {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    document.documentElement.style.colorScheme = nextDark ? "dark" : "light";
    window.localStorage.setItem("fitmate_theme", nextDark ? "dark" : "light");
    window.dispatchEvent(new Event("fitmate-theme-change"));
  };

  const closeMenu = () => {
    void playBubbleSound("close");
    setOpen(false);
  };

  return (
    <div
      className={`fitmate-mobile-navigation ${open ? "is-open" : ""}`}
      data-testid="fitmate-floating-bubble-menu"
    >
      <button
        type="button"
        aria-label={tr("Tutup menu", "Close menu")}
        tabIndex={open ? 0 : -1}
        className="fitmate-mobile-navigation__backdrop"
        onClick={closeMenu}
      />

      <nav
        id="fitmate-bubble-sheet"
        className="fitmate-mobile-menu"
        aria-label={tr("Menu FitMate", "FitMate menu")}
        aria-hidden={!open}
      >
        <div className="fitmate-mobile-menu__handle" aria-hidden="true" />
        <div className="fitmate-mobile-menu__header">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">FitMate</p>
            <p className="text-xs text-slate-400">{tr("Pilih fitur", "Choose a feature")}</p>
          </div>
          <button type="button" onClick={closeMenu} className="fitmate-mobile-menu__close" aria-label={tr("Tutup", "Close")}>
            <FitMateIcon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="fitmate-mobile-menu__status-row">
          <AccountPlanBadge />
          <div className="fitmate-mobile-menu__preferences">
            <button type="button" onClick={() => { void playBubbleSound("select"); toggleTheme(); }} className="fitmate-mobile-menu__preference">
              {dark ? tr("Terang", "Light") : tr("Gelap", "Dark")}
            </button>
            <div className="fitmate-mobile-menu__language" aria-label={tr("Bahasa", "Language")}>
              <button type="button" className={language === "id" ? "is-active" : ""} onClick={() => { void playBubbleSound("select"); setLanguage("id"); }}>ID</button>
              <button type="button" className={language === "en" ? "is-active" : ""} onClick={() => { void playBubbleSound("select"); setLanguage("en"); }}>EN</button>
            </div>
          </div>
        </div>

        <div className="fitmate-mobile-menu__grid">
          {ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`fitmate-mobile-menu__item ${active ? "is-active" : ""}`}
                onClick={() => {
                  void playBubbleSound("select");
                  setOpen(false);
                }}
              >
                <span className="fitmate-mobile-menu__icon">
                  <FitMateIcon name={item.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="truncate">{tr(item.labelId, item.labelEn)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="fitmate-mobile-dock" aria-label={tr("Navigasi utama", "Main navigation")}>
        {quickItems.slice(0, 2).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`fitmate-mobile-dock__item ${active ? "is-active" : ""}`} onClick={() => void playBubbleSound("select")}>
              <span className="fitmate-mobile-dock__icon"><FitMateIcon name={item.icon} className="h-[18px] w-[18px]" /></span>
              <span>{tr(item.labelId, item.labelEn)}</span>
            </Link>
          );
        })}

        <button
          type="button"
          aria-expanded={open}
          aria-controls="fitmate-bubble-sheet"
          aria-label={open ? tr("Tutup menu", "Close menu") : tr("Buka menu", "Open menu")}
          className={`fitmate-mobile-dock__bubble ${open ? "is-open" : ""}`}
          onClick={() => {
            const next = !open;
            void playBubbleSound(next ? "open" : "close");
            setOpen(next);
          }}
        >
          <span className="fitmate-mobile-dock__bubble-icon">
            <FitMateIcon name={open ? "x" : "list"} className="h-6 w-6" />
          </span>
          <span>{open ? tr("Tutup", "Close") : tr("Menu", "Menu")}</span>
        </button>

        {quickItems.slice(2, 4).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`fitmate-mobile-dock__item ${active ? "is-active" : ""}`} onClick={() => void playBubbleSound("select")}>
              <span className="fitmate-mobile-dock__icon"><FitMateIcon name={item.icon} className="h-[18px] w-[18px]" /></span>
              <span>{tr(item.labelId, item.labelEn)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
