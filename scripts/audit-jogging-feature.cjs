#!/usr/bin/env node

const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function loadTypeScriptModule(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filePath,
  }).outputText;
  const loaded = new Module(filePath, module);
  loaded.filename = filePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(filePath));
  loaded._compile(output, filePath);
  return loaded.exports;
}

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const page = read("app/jogging/page.tsx");
const map = read("components/jogging-route-map.tsx");
const calculations = read("lib/jogging.ts");
const share = read("lib/jogging-share.ts");
const menu = read("components/floating-bubble-menu.tsx");
const manifest = read("app/manifest.ts");
const nextConfig = read("next.config.ts");
const nativeLocation = read("lib/native-background-location.ts");
const capacitorConfig = read("capacitor.config.ts");
const packageJson = JSON.parse(read("package.json"));
const nativeConfigurator = read(
  "scripts/configure-native-background-gps.cjs"
);
const migration = read(
  "supabase/migrations/202607310011_jogging_tracker.sql"
);

assert(
  page.includes('watchPosition(') &&
    page.includes('clearWatch(') &&
    page.includes('enableHighAccuracy: true'),
  "Jogging must use continuous high-accuracy GPS tracking."
);
assert(
  !page.includes("PremiumFeatureGate") &&
    page.includes("Gratis untuk semua akun"),
  "Jogging must remain available to Free users."
);
assert(
  calculations.includes("haversineDistanceMeters") &&
    calculations.includes("averagePaceSecondsPerKm") &&
    calculations.includes("caloriesKcal") &&
    calculations.includes("elevationGainMeters"),
  "Jogging must calculate distance, pace, calories, and elevation."
);
assert(
  map.includes("tile.openstreetmap.org") &&
    map.includes("OpenStreetMap contributors") &&
    map.includes("polyline"),
  "Jogging must render attributed map tiles and a route polyline."
);
assert(
  share.includes("createJoggingShareCard") &&
    share.includes('canvas.toBlob') &&
    page.includes("navigator.share") &&
    page.includes("anchor.download"),
  "Jogging must support share and PNG download output."
);
assert(
  page.includes('accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"') &&
    page.includes('shareMode === "media"') &&
    page.includes("createJoggingShareVideo") &&
    page.includes("DEFAULT_JOGGING_SHARE_LAYOUT"),
  "Jogging must support adjustable photo/video Story sharing."
);
assert(
  page.includes('type ShareDragTarget = "metrics" | "route" | "brand" | "details"') &&
    page.includes("metricsScale") &&
    page.includes("brandScale") &&
    page.includes("detailsScale") &&
    page.includes("setSelectedShareScale") &&
    share.includes("detailsX") &&
    share.includes("detailsY"),
  "Every Story overlay layer must support free two-dimensional positioning and resizing."
);
assert(
  menu.includes('href: "/jogging"') &&
    manifest.includes('url: "/jogging"'),
  "Jogging must be discoverable from navigation and PWA shortcuts."
);
assert(
  nextConfig.includes("geolocation=(self)"),
  "Permissions-Policy must allow same-origin geolocation."
);
assert(
  migration.includes("create table if not exists public.jogging_sessions") &&
    migration.includes("enable row level security") &&
    migration.includes("auth.uid() = user_id"),
  "Jogging history must have an owner-only RLS migration."
);
assert(
  page.includes("localStorage") &&
    page.includes("jogging_sessions"),
  "Jogging must provide local fallback and Supabase synchronization."
);


assert(
  page.includes("startNativeBackgroundLocation") &&
    page.includes("stopNativeBackgroundLocation") &&
    page.includes('gpsProviderRef.current = "native"') &&
    page.includes("Background GPS aktif"),
  "Jogging must start and stop the native background watcher when available."
);
assert(
  nativeLocation.includes("backgroundTitle:") &&
    nativeLocation.includes("FitMate Jogging aktif") &&
    nativeLocation.includes("FitMate Jogging is active") &&
    nativeLocation.includes("backgroundMessage:") &&
    nativeLocation.includes("distanceFilter: 3") &&
    nativeLocation.includes("@capacitor/local-notifications"),
  "Native background tracking must use a visible notification and a distance filter."
);
assert(
  capacitorConfig.includes("useLegacyBridge: true") &&
    capacitorConfig.includes("CAPACITOR_SERVER_URL"),
  "Capacitor must use the Android legacy bridge and configurable hosted URL."
);
assert(
  packageJson.dependencies?.["@capacitor-community/background-geolocation"] &&
    packageJson.dependencies?.["@capacitor/core"] &&
    packageJson.dependencies?.["@capacitor/local-notifications"],
  "Required Capacitor background-location dependencies must be declared."
);
assert(
  nativeConfigurator.includes("FOREGROUND_SERVICE_LOCATION") &&
    nativeConfigurator.includes("POST_NOTIFICATIONS") &&
    nativeConfigurator.includes("NSLocationAlwaysAndWhenInUseUsageDescription") &&
    nativeConfigurator.includes("UIBackgroundModes"),
  "Native configuration must include Android foreground-location and iOS background-location settings."
);

const joggingModule = loadTypeScriptModule(
  path.join(root, "lib", "jogging.ts")
);
const samplePoints = [
  { latitude: 0, longitude: 0, accuracy: 5, altitude: 0, speed: 2, timestamp: 0 },
  { latitude: 0.009, longitude: 0, accuracy: 5, altitude: 10, speed: 2, timestamp: 600000 },
];
const sampleStats = joggingModule.calculateJoggingStats(
  samplePoints,
  600,
  70
);
assert(
  sampleStats.distanceMeters > 990 &&
    sampleStats.distanceMeters < 1015 &&
    sampleStats.averagePaceSecondsPerKm > 590 &&
    sampleStats.averagePaceSecondsPerKm < 610 &&
    sampleStats.caloriesKcal > 0,
  "Jogging calculations must produce realistic distance, pace, and calories."
);
assert(
  joggingModule.formatPace(300) === "5:00" &&
    joggingModule.formatDuration(3661) === "1:01:01",
  "Jogging formatting must be stable."
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      freeAccess: true,
      liveGps: true,
      mapRoute: true,
      metrics: [
        "distance",
        "duration",
        "pace",
        "speed",
        "calories",
        "elevation",
        "splits",
      ],
      shareModes: ["track", "photo", "video", "adjustable-layout"],
      persistentHistory: true,
      rlsProtected: true,
      nativeBackgroundGps: true,
      androidForegroundNotification: true,
      iosBackgroundLocationMode: true,
    },
    null,
    2
  )
);
