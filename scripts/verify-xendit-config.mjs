#!/usr/bin/env node

import nextEnv from "@next/env";

// @next/env is published as CommonJS. Importing its named export directly can
// fail on Node.js 24, so read it from the CommonJS default export instead.
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const secretKey = process.env.XENDIT_SECRET_KEY?.trim();
const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN?.trim();
const appUrl = process.env.FITMATE_APP_URL?.trim();

const failures = [];

if (!secretKey || !/^xnd_(development|production)_/.test(secretKey)) {
  failures.push("XENDIT_SECRET_KEY belum diisi dengan secret API key Xendit yang valid.");
}
if (!webhookToken || webhookToken === "your-xendit-webhook-verification-token") {
  failures.push("XENDIT_WEBHOOK_TOKEN belum diisi dari pengaturan Webhook Xendit.");
}
if (!appUrl) {
  failures.push("FITMATE_APP_URL belum diisi.");
} else {
  try {
    const url = new URL(appUrl);
    if (url.protocol !== "https:") {
      failures.push("FITMATE_APP_URL harus menggunakan HTTPS.");
    }
  } catch {
    failures.push("FITMATE_APP_URL bukan URL yang valid.");
  }
}

if (failures.length > 0) {
  console.error("Konfigurasi Xendit belum siap:\n- " + failures.join("\n- "));
  process.exit(1);
}

const response = await fetch("https://api.xendit.co/recurring/plans?limit=1", {
  headers: {
    authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
    accept: "application/json",
    "api-version": "2026-01-01",
  },
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) {
  let message = `HTTP ${response.status}`;
  try {
    const payload = await response.json();
    message = payload.message || payload.error_code || message;
  } catch {
    // Keep the HTTP status without printing any credentials.
  }

  console.error(
    `Koneksi Xendit gagal: ${message}. Periksa key, izin Money-in, dan aktivasi Subscriptions.`
  );
  process.exit(1);
}

const mode = secretKey.startsWith("xnd_development_") ? "TEST" : "LIVE";
console.log(
  `Koneksi API Xendit berhasil (${mode}). Webhook yang harus didaftarkan: ${appUrl.replace(/\/$/, "")}/api/billing/webhook/xendit`
);
