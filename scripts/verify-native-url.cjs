#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

function loadNativeEnvFiles() {
  const mode = process.env.NODE_ENV === "development" ? "development" : "production";
  const files = [`.env.${mode}.local`, ".env.local", `.env.${mode}`, ".env"];
  for (const fileName of files) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;
    for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      let value = rawValue.trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

loadNativeEnvFiles();

const DEFAULT_PRODUCTION_URL = "https://fitmate.growsia.id";

const raw = [
  process.env.CAPACITOR_SERVER_URL,
  process.env.FITMATE_APP_URL,
  process.env.NEXT_PUBLIC_APP_URL,
]
  .map((value) => value && value.trim())
  .find(Boolean) || DEFAULT_PRODUCTION_URL;

function fail(message) {
  console.error("\n❌ FitMate Native URL belum siap.\n");
  console.error(message);
  console.error(
    "\nProduction default: https://fitmate.growsia.id\n" +
      "Opsional: isi CAPACITOR_SERVER_URL / FITMATE_APP_URL / NEXT_PUBLIC_APP_URL untuk override staging/development.\n"
  );
  process.exit(1);
}

let url;
try {
  url = new URL(raw);
} catch {
  fail(`URL tidak valid: ${raw}`);
}

if (url.protocol !== "https:" && url.protocol !== "http:") {
  fail("URL harus memakai http:// atau https://.");
}

const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
if (localHosts.has(url.hostname) && process.env.CAPACITOR_ALLOW_LOCAL_SERVER !== "1") {
  fail(
    `${url.origin} adalah alamat lokal. APK di HP tidak dapat memakai localhost milik komputer. Gunakan URL HTTPS publik/staging.`
  );
}

if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
  fail("Build production harus memakai URL HTTPS.");
}

const normalizedUrl = url.toString().replace(/\/$/, "");
const usingDefault = ![process.env.CAPACITOR_SERVER_URL, process.env.FITMATE_APP_URL, process.env.NEXT_PUBLIC_APP_URL].some((value) => value && value.trim());
console.log("✅ FitMate Native URL:", normalizedUrl);
if (usingDefault) {
  console.log("✅ URL production default dipakai: https://fitmate.growsia.id");
  console.log("ℹ️  Env tetap dapat meng-override URL ini untuk staging/development.");
}
console.log("✅ Android akan membuka Native Mobile Welcome lokal terlebih dahulu.");
console.log("✅ Setelah Start/Login, aplikasi akan membuka FitMate HTTPS di WebView.");
