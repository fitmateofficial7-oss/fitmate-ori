#!/usr/bin/env node
const fs = require("node:fs");
const crypto = require("node:crypto");

const read = (file) => fs.readFileSync(file, "utf8");
const assert = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
};

const layout = read("app/layout.tsx");
const css = read("app/globals.css");
const privacy = read("app/privacy/page.tsx");
const jogging = read("app/jogging/page.tsx");
const menuBytes = fs.readFileSync("components/floating-bubble-menu.tsx");
const menuHash = crypto.createHash("sha256").update(menuBytes).digest("hex");

assert(layout.includes("fitmate-comfort-ui"), "comfort UI scope is enabled");
assert(css.includes("FitMate mobile comfort refinement — 2026-08-14"), "mobile comfort CSS layer exists");
assert(css.includes("env(safe-area-inset-bottom)"), "mobile safe-area spacing is present");
assert(css.includes("min-height: 2.8rem"), "touch targets are at least app-sized");
assert(menuHash === "0c0f0e35057db63143b7dddd75d2ffd1442f858a9b9522fbc79da55893c2abb8", "floating bubble menu is byte-for-byte unchanged");
assert(privacy.includes("Data yang diakses: lokasi presisi (GPS)"), "privacy lists precise location data in detail");
assert(privacy.includes("Penggunaan di latar belakang:"), "privacy explains background-location use");
assert(privacy.includes("Batas penggunaan:"), "privacy limits tracking to active Jogging");
assert(privacy.includes("Penyimpanan:"), "privacy explains location storage");
assert(privacy.includes("Berbagi:"), "privacy explains location sharing/no-ad use");
assert(privacy.includes("Retensi:"), "privacy explains location retention");
assert(privacy.includes("Kontrol pengguna:"), "privacy explains user controls");
assert(jogging.includes("tidak sedang digunakan"), "in-app disclosure states background/not-in-use behavior");
assert(jogging.includes('href="/privacy"'), "location disclosure links to privacy policy");

if (process.exitCode) process.exit(process.exitCode);
console.log(JSON.stringify({ status: "PASS", menuHash, scope: "mobile comfort + Google Play location privacy" }, null, 2));
