"use client";

import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import LiveIcon from "@/components/live-icon";

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
];

export default function LanguageToggle() {
  const pathname = usePathname();
  const { language, setLanguage, tr } = useLanguage();
  const isAppPage = APP_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );
  const isWorkoutPage =
    pathname === "/workout" ||
    pathname.startsWith("/workout/");

  return (
    <label
      className={`fixed right-4 z-50 flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-sm font-black text-slate-700 shadow-xl shadow-slate-300/40 backdrop-blur-xl ${
        isWorkoutPage
          ? "top-20"
          : isAppPage
          ? "bottom-24 sm:bottom-5"
          : "bottom-4 sm:bottom-5"
      }`}
    >
      <LiveIcon variant="float" active>
        🌐
      </LiveIcon>
      <span className="sr-only">
        {tr("Pilih bahasa", "Choose language")}
      </span>
      <select
        value={language}
        onChange={(event) =>
          setLanguage(
            event.target.value === "en" ? "en" : "id"
          )
        }
        aria-label={tr("Pilih bahasa", "Choose language")}
        className="fitmate-language-select cursor-pointer appearance-none border-0 bg-transparent pr-1 text-sm font-black text-slate-700 outline-none"
      >
        <option value="id">ID</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
