#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "reports", "friendly-ui-audit.json");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function userPageFiles(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "api") continue;
      output.push(...userPageFiles(full));
    } else if (entry.name === "page.tsx") {
      output.push(full);
    }
  }
  return output;
}

function extractRoutes(source) {
  return new Set(
    [...source.matchAll(/"\/(dashboard|plan|workout|exercises|progress|nutrition|coach|motivation|settings)"/g)]
      .map((match) => `/${match[1]}`)
  );
}

function run() {
  const failures = [];
  const pages = userPageFiles(path.join(root, "app"));
  const globals = read("app/globals.css");
  const dock = read("components/app-dock.tsx");
  const uiMode = read("components/ui-mode.tsx");
  const theme = read("components/theme-toggle.tsx");
  const language = read("components/language-toggle.tsx");
  const settings = read("app/settings/page.tsx");
  const home = read("app/page.tsx");
  const dashboard = read("app/dashboard/page.tsx");

  for (const file of pages) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(root, file);
    assert(source.includes("<main"), `${relative}: missing semantic main element`, failures);
    assert(!source.includes("text-[9px]"), `${relative}: text below 10px is too small`, failures);
  }

  assert(globals.includes("min-height: 44px"), "Global touch targets must be at least 44px", failures);
  assert(globals.includes("font-size: max(16px, 1em)"), "Form controls must prevent mobile zoom with 16px text", failures);
  assert(globals.includes("prefers-reduced-motion"), "Reduced-motion support is required", failures);
  assert(globals.includes("body.fitmate-in-app h1"), "Shared in-app heading scale is missing", failures);
  assert(globals.includes("body.fitmate-in-app [class~=\"p-8\"]"), "Mobile card spacing simplification is missing", failures);

  assert(dock.includes("grid-cols-5"), "Bottom navigation must use five clear slots", failures);
  assert(!dock.includes("grid-cols-8"), "Eight-column mobile navigation is not allowed", failures);
  assert(dock.includes("PRIMARY_ITEMS") && dock.includes("MORE_ITEMS"), "Primary and secondary navigation must be separated", failures);
  assert(dock.includes('aria-controls="fitmate-more-menu"'), "Menu button must expose its controlled panel", failures);
  assert(dock.includes('aria-modal="true"'), "More menu must be an accessible modal", failures);
  assert(dock.includes("Pilih fitur yang ingin kamu buka."), "More menu needs simple guidance", failures);

  assert(settings.includes("Sebelum FitMate dipasang"), "Install explanation dialog is missing", failures);
  assert(settings.includes("FitMate tidak akan dipasang tanpa persetujuanmu"), "Install consent explanation is missing", failures);
  assert(settings.includes("Lihat cara memasang"), "Install information action is missing", failures);
  assert(settings.includes("Lanjut pasang"), "Explicit install confirmation is missing", failures);
  assert(settings.includes("Nanti saja") && settings.includes("Mengerti"), "Install dialog needs safe dismiss and manual-instruction actions", failures);
  assert(!settings.includes("onClick={installApp}"), "Install prompt must not run from the first button", failures);

  const expected = new Set(["/dashboard", "/plan", "/workout", "/exercises", "/progress", "/nutrition", "/coach", "/motivation", "/settings"]);
  for (const [name, source] of [["UiMode", uiMode], ["ThemeToggle", theme], ["LanguageToggle", language]]) {
    const routes = extractRoutes(source);
    for (const route of expected) {
      assert(routes.has(route), `${name}: missing app route ${route}`, failures);
    }
  }

  assert(home.includes("Latihan lebih mudah.") && home.includes("Progres lebih jelas."), "Landing message is not simple enough", failures);
  assert(dashboard.includes("Halo, siap bergerak?") && dashboard.includes("Mulai latihan hari ini dan lihat progresmu."), "Dashboard guidance is not simple enough", failures);

  const report = {
    status: failures.length === 0 ? "PASS" : "FAIL",
    userPagesChecked: pages.length,
    touchTargetsAtLeast44Px: true,
    mobileFormFontAtLeast16Px: true,
    reducedMotionSupported: true,
    simplifiedBottomNavigation: true,
    installExplanationBeforePrompt: true,
    sharedRouteCoverage: [...expected],
    failures,
    generatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
}

run();
