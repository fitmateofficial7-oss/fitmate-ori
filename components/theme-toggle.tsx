"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/language-provider";

type ThemeName = "dark" | "light";

const APP_ROUTES = [
  "/dashboard",
  "/plan",
  "/workout",
  "/exercises",
  "/coach",
  "/progress",
  "/nutrition",
  "/settings",
  "/motivation",
  "/jogging",
  "/premium",
];
const THEME_EVENT = "fitmate-theme-change";

function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  window.dispatchEvent(new Event(THEME_EVENT));
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getThemeSnapshot(): ThemeName {
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

function getServerThemeSnapshot(): ThemeName {
  return "light";
}

export default function ThemeToggle() {
  const pathname = usePathname();
  const { tr } = useLanguage();
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );
  const isAppPage = APP_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );


  if (isAppPage) {
    return null;
  }

  const toggleTheme = () => {
    const nextTheme: ThemeName =
      theme === "dark" ? "light" : "dark";

    applyTheme(nextTheme);
    window.localStorage.setItem(
      "fitmate_theme",
      nextTheme
    );
  };

  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        dark
          ? tr(
              "Gunakan tampilan terang",
              "Use light appearance"
            )
          : tr(
              "Gunakan tampilan gelap",
              "Use dark appearance"
            )
      }
      aria-pressed={dark}
      title={
        dark
          ? tr(
              "Gunakan tampilan terang",
              "Use light appearance"
            )
          : tr(
              "Gunakan tampilan gelap",
              "Use dark appearance"
            )
      }
      className={`fixed left-4 z-50 min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3.5 py-2 text-sm font-black text-slate-700 shadow-xl shadow-slate-300/40 backdrop-blur-xl hover:-translate-y-0.5 hover:border-green-400 hover:text-green-700 ${
        pathname === "/" ? "hidden lg:flex" : "flex"
      } ${
        isAppPage
          ? "bottom-24 sm:bottom-5"
          : "bottom-4 sm:bottom-5"
      }`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700" aria-hidden="true">
        {dark ? "L" : "D"}
      </span>
      <span className="hidden sm:inline">
        {dark
          ? tr("Terang", "Light")
          : tr("Gelap", "Dark")}
      </span>
    </button>
  );
}
