#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const EXPECTED_DISCLOSURE_VERSION = "2026-08-17-prominent-disclosure-v3";

function loadEnvFiles() {
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

function fail(message) {
  console.error("\n❌ REMOTE POLICY RELEASE BELUM SIAP\n");
  console.error(message);
  console.error(
    "\nDeploy source FitMate terbaru ke server web terlebih dahulu. " +
      "AAB sengaja tidak boleh dibuild jika server yang dibuka Android masih memakai UI/policy lama.\n"
  );
  process.exit(1);
}

async function main() {
  loadEnvFiles();
  const raw = [
    process.env.CAPACITOR_SERVER_URL,
    process.env.FITMATE_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .map((value) => value && value.trim())
    .find(Boolean);

  if (!raw) fail("URL FitMate belum dikonfigurasi.");

  let endpoint;
  try {
    endpoint = new URL("/fitmate-release.json", raw);
    endpoint.searchParams.set("t", Date.now().toString());
  } catch {
    fail(`URL FitMate tidak valid: ${raw}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(endpoint, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    fail(`Tidak dapat memeriksa server FitMate: ${error?.message || error}`);
  }
  clearTimeout(timeout);

  if (!response.ok) {
    fail(`Server mengembalikan HTTP ${response.status} untuk fitmate-release.json.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    fail("fitmate-release.json di server bukan JSON yang valid.");
  }

  if (data.packageName !== "com.growsia.fitmate") {
    fail(`Package marker server tidak cocok: ${data.packageName || "kosong"}`);
  }
  if (data.locationDisclosureVersion !== EXPECTED_DISCLOSURE_VERSION) {
    fail(
      `Disclosure server masih versi ${data.locationDisclosureVersion || "lama/tidak ada"}; ` +
        `harus ${EXPECTED_DISCLOSURE_VERSION}.`
    );
  }
  if (data.accessBackgroundLocationDeclared !== false) {
    fail("Marker server tidak menyatakan ACCESS_BACKGROUND_LOCATION = false.");
  }

  console.log("✅ Remote FitMate policy release sudah sesuai.");
  console.log(`✅ Location disclosure: ${EXPECTED_DISCLOSURE_VERSION}`);
  console.log("✅ Aman melanjutkan build AAB dari sisi sinkronisasi UI remote.");
}

main().catch((error) => fail(error?.stack || error));
