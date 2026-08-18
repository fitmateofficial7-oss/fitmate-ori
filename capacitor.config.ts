import type { CapacitorConfig } from "@capacitor/cli";
import fs from "node:fs";
import path from "node:path";

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

loadNativeEnvFiles();

const DEFAULT_PRODUCTION_URL = "https://fitmate.growsia.id";

function resolveRemoteAppUrl() {
  const configured = [
    process.env.CAPACITOR_SERVER_URL,
    process.env.FITMATE_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .map((value) => value?.trim())
    .find(Boolean) ?? DEFAULT_PRODUCTION_URL;


  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(`URL FitMate tidak valid: ${configured}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("URL FitMate harus memakai http:// atau https://.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
  if (localHosts.has(url.hostname) && process.env.CAPACITOR_ALLOW_LOCAL_SERVER !== "1") {
    throw new Error(
      `${url.origin} adalah alamat lokal. Gunakan URL staging/production yang bisa dibuka dari HP.`
    );
  }

  return url;
}

const remoteUrl = resolveRemoteAppUrl();

const config: CapacitorConfig = {
  appId: "com.growsia.fitmate",
  appName: "FitMate AI",
  webDir: "native-web",

  android: {
    useLegacyBridge: true,
  },

  // IMPORTANT:
  // No server.url here. Android now opens the bundled native welcome screen first.
  // After the user taps Start/Login, navigation continues inside the WebView to
  // the real FitMate HTTPS application.
  server: {
    cleartext: remoteUrl.protocol === "http:",
    allowNavigation: [remoteUrl.hostname],
  },
};

export default config;
