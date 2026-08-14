#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function loadEnvFiles() {
  const mode = process.env.NODE_ENV === "development" ? "development" : "production";
  const files = [`.env.${mode}.local`, ".env.local", `.env.${mode}`, ".env"];

  for (const fileName of files) {
    const filePath = path.join(root, fileName);
    if (!fs.existsSync(filePath)) continue;

    for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;

      let value = rawValue.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

loadEnvFiles();

const raw = [
  process.env.CAPACITOR_SERVER_URL,
  process.env.FITMATE_APP_URL,
  process.env.NEXT_PUBLIC_APP_URL,
]
  .map((value) => value && value.trim())
  .find(Boolean);

if (!raw) {
  console.error("❌ URL FitMate belum dikonfigurasi untuk native welcome.");
  process.exit(1);
}

let url;
try {
  url = new URL(raw);
} catch {
  console.error(`❌ URL FitMate tidak valid: ${raw}`);
  process.exit(1);
}

const baseUrl = url.toString().replace(/\/$/, "");

const target = path.join(root, "native-web", "runtime-config.js");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(
  target,
  `window.FITMATE_NATIVE_CONFIG = ${JSON.stringify({
    baseUrl,
    registerUrl: `${baseUrl}/register`,
    loginUrl: `${baseUrl}/login`,
    dashboardUrl: `${baseUrl}/dashboard`,
  })};\n`,
  "utf8"
);

console.log("✅ Native welcome prepared:", target);
console.log("✅ Start ->", `${baseUrl}/register`);
console.log("✅ Login ->", `${baseUrl}/login`);
