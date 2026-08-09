"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const APP_PREFIXES = [
  "/dashboard",
  "/plan",
  "/workout",
  "/exercises",
  "/progress",
  "/nutrition",
  "/coach",
  "/motivation",
  "/settings",
];

export default function UiMode() {
  const pathname = usePathname();

  useEffect(() => {
    const inApp = APP_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    document.body.classList.toggle("fitmate-in-app", inApp);
    const main = document.querySelector("main");
    if (main) main.id = "fitmate-main";

    return () => {
      document.body.classList.remove("fitmate-in-app");
      if (main?.id === "fitmate-main") main.removeAttribute("id");
    };
  }, [pathname]);

  return null;
}
