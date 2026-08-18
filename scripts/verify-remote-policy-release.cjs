#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const dns = require("node:dns");
const http = require("node:http");
const https = require("node:https");
const { execFileSync } = require("node:child_process");

const EXPECTED_DISCLOSURE_VERSION = "2026-08-17-prominent-disclosure-v3";
const DEFAULT_PRODUCTION_URL = "https://fitmate.growsia.id";
const REQUEST_HEADERS = {
  accept: "application/json,text/plain,*/*",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FitMateReleaseVerifier/6.0",
};

// Banyak Windows/ISP memiliki route IPv6 yang terpasang tetapi tidak benar-benar
// dapat menjangkau internet. Utamakan IPv4 agar Node tidak berhenti dengan
// error generik `fetch failed` padahal browser/curl masih bisa membuka domain.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

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

function fail(message, details = []) {
  console.error("\n❌ REMOTE POLICY RELEASE BELUM SIAP\n");
  console.error(message);
  for (const detail of details.filter(Boolean)) console.error(`   ${detail}`);
  console.error(
    "\nPemeriksaan ini sengaja menjaga agar AAB tidak membuka UI/policy lama saat direview Google Play.\n" +
      "Buka URL marker berikut di browser untuk pengecekan manual:\n" +
      `  ${DEFAULT_PRODUCTION_URL}/fitmate-release.json\n`
  );
  process.exit(1);
}

function validateMarker(data) {
  if (!data || typeof data !== "object") {
    fail("fitmate-release.json di server bukan object JSON yang valid.");
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
}

function parseJson(text, source) {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`${source} mengembalikan data yang bukan JSON valid: ${error.message}`);
  }
}

async function fetchWithNode(endpoint) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      redirect: "follow",
      headers: REQUEST_HEADERS,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseJson(await response.text(), "Node fetch");
  } finally {
    clearTimeout(timeout);
  }
}

function getViaNativeHttp(endpoint, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error("terlalu banyak redirect"));
  return new Promise((resolve, reject) => {
    const transport = endpoint.protocol === "http:" ? http : https;
    const req = transport.get(
      endpoint,
      {
        family: 4,
        headers: REQUEST_HEADERS,
        timeout: 20000,
      },
      (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
          res.resume();
          let next;
          try {
            next = new URL(res.headers.location, endpoint);
          } catch (error) {
            reject(new Error(`redirect URL tidak valid: ${error.message}`));
            return;
          }
          getViaNativeHttp(next, redirectCount + 1).then(resolve, reject);
          return;
        }
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
          if (body.length > 1024 * 1024) req.destroy(new Error("response terlalu besar"));
        });
        res.on("end", () => {
          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}`));
            return;
          }
          try {
            resolve(parseJson(body, "Node HTTPS IPv4"));
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout 20 detik")));
    req.on("error", reject);
  });
}

function fetchWithCurl(endpoint) {
  const command = process.platform === "win32" ? "curl.exe" : "curl";
  const args = [
    "--silent",
    "--show-error",
    "--fail",
    "--location",
    "--ipv4",
    "--retry",
    "2",
    "--retry-delay",
    "1",
    "--connect-timeout",
    "10",
    "--max-time",
    "30",
    "--header",
    "Cache-Control: no-cache",
    "--header",
    "Accept: application/json,text/plain,*/*",
    "--user-agent",
    REQUEST_HEADERS["user-agent"],
    endpoint.toString(),
  ];
  const text = execFileSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 35000,
  });
  return parseJson(text, "curl");
}

function shortError(error) {
  const code = error?.cause?.code || error?.code;
  const cause = error?.cause?.message;
  return [error?.message || String(error), code && `code=${code}`, cause && cause !== error?.message ? cause : ""]
    .filter(Boolean)
    .join(" | ");
}

async function main() {
  loadEnvFiles();
  const raw =
    [process.env.CAPACITOR_SERVER_URL, process.env.FITMATE_APP_URL, process.env.NEXT_PUBLIC_APP_URL]
      .map((value) => value && value.trim())
      .find(Boolean) || DEFAULT_PRODUCTION_URL;

  let endpoint;
  try {
    endpoint = new URL("/fitmate-release.json", raw);
    endpoint.searchParams.set("t", Date.now().toString());
  } catch {
    fail(`URL FitMate tidak valid: ${raw}`);
  }

  console.log(`ℹ️  Memeriksa: ${endpoint.origin}${endpoint.pathname}`);
  const errors = [];
  let data;

  if (process.env.FITMATE_FORCE_CURL_VERIFY !== "1") {
    try {
      data = await fetchWithNode(endpoint);
      console.log("✅ Remote marker terbaca via Node fetch.");
    } catch (error) {
      errors.push(`Node fetch: ${shortError(error)}`);
      console.log("⚠️  Node fetch gagal, mencoba koneksi HTTPS IPv4...");
    }
  }

  if (!data && process.env.FITMATE_FORCE_CURL_VERIFY !== "1") {
    try {
      data = await getViaNativeHttp(endpoint);
      console.log("✅ Remote marker terbaca via Node HTTPS IPv4.");
    } catch (error) {
      errors.push(`Node HTTPS IPv4: ${shortError(error)}`);
      console.log("⚠️  HTTPS IPv4 gagal, mencoba curl Windows...");
    }
  }

  if (!data) {
    try {
      data = fetchWithCurl(endpoint);
      console.log("✅ Remote marker terbaca via curl IPv4.");
    } catch (error) {
      const stderr = error?.stderr ? String(error.stderr).trim() : "";
      errors.push(`curl IPv4: ${shortError(error)}${stderr ? ` | ${stderr}` : ""}`);
    }
  }

  if (!data) {
    fail(
      "Server FitMate tidak dapat diverifikasi dari komputer ini. Ini berbeda dengan 'server versi lama'.",
      errors
    );
  }

  validateMarker(data);
  console.log("✅ Remote FitMate policy release sudah sesuai.");
  console.log(`✅ Location disclosure: ${EXPECTED_DISCLOSURE_VERSION}`);
  console.log("✅ ACCESS_BACKGROUND_LOCATION marker: false");
  console.log("✅ Aman melanjutkan build AAB dari sisi sinkronisasi UI remote.");
}

main().catch((error) => fail(shortError(error)));
