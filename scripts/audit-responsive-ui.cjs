#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const dock = read("components/app-dock.tsx");
const routeShell = read("components/route-shell.tsx");
const layout = read("app/layout.tsx");
const styles = read("app/globals.css");
const themeToggle = read("components/theme-toggle.tsx");
const languageToggle = read("components/language-toggle.tsx");

const protectedRoutes = [
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

for (const route of protectedRoutes) {
  assert(routeShell.includes(`"${route}"`), `RouteShell is missing ${route}.`);
}

assert(
  layout.includes("<RouteShell>{children}</RouteShell>"),
  "Root layout must wrap every page with RouteShell."
);
assert(
  dock.includes('className="grid grid-cols-5 items-end gap-1 md:hidden"'),
  "Mobile navigation must use four primary links and one centered bubble action."
);
assert(
  dock.includes("fitmate-bubble-menu") && dock.includes("BUBBLE_POSITIONS"),
  "Mobile navigation must expose secondary features through the compact bubble menu."
);
assert(
  dock.includes('role="menu"') && dock.includes('role="menuitem"'),
  "The compact mobile bubble menu must use accessible menu semantics."
);
assert(
  !dock.includes('aria-modal="true"') && !dock.includes("bg-slate-950/35"),
  "The mobile bubble menu must not use a full-screen blocking modal or dark overlay."
);
assert(
  dock.includes("env(safe-area-inset-bottom)"),
  "Mobile navigation must account for smartphone safe areas."
);
assert(
  dock.includes("setTheme") && dock.includes("setLanguage"),
  "Theme and language controls must remain available inside the app menu."
);
assert(
  (themeToggle.includes("if (isAppPage) return null") ||
    themeToggle.includes("if (!mounted || isAppPage) return null")) &&
    (languageToggle.includes("if (isAppPage) return null") ||
      languageToggle.includes("if (!mounted || isAppPage) return null")),
  "Floating public-page controls must not overlap the in-app dock."
);
assert(
  styles.includes("min-width: 320px") &&
    styles.includes("overflow-x: hidden") &&
    styles.includes("100dvh"),
  "Global styles must protect 320px mobile layouts and dynamic viewport height."
);
assert(
  styles.includes("@media (max-width: 767px)") &&
    styles.includes("overflow-x: auto") &&
    styles.includes("font-size: max(16px, 1em)"),
  "Mobile styles must include responsive spacing, table scrolling, and iOS-safe form text sizing."
);
assert(
  styles.includes("prefers-reduced-motion"),
  "Reduced-motion accessibility support must remain enabled."
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      protectedRoutes: protectedRoutes.length,
      mobilePrimaryLinks: 4,
      centeredBubbleAction: true,
      secondaryBubbleMenu: true,
      fullScreenOverlay: false,
      safeAreaSupport: true,
      minSupportedWidth: 320,
      responsiveTables: true,
      accessibleMenu: true,
      themeAndLanguageRetained: true,
      reducedMotionRetained: true,
    },
    null,
    2
  )
);
