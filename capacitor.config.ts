import type { CapacitorConfig } from "@capacitor/cli";

const remoteUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.growsia.fitmate",
  appName: "FitMate AI",
  webDir: "native-web",
  android: {
    // Required by the selected background-geolocation plugin so Android
    // location callbacks are not halted after several minutes in background.
    useLegacyBridge: true,
  },
  ...(remoteUrl
    ? {
        server: {
          url: remoteUrl,
          cleartext: remoteUrl.startsWith("http://"),
          allowNavigation: [new URL(remoteUrl).hostname],
        },
      }
    : {}),
};

export default config;
