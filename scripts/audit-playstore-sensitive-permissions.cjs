const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const nativeConfig = fs.readFileSync(
  path.join(root, "scripts", "configure-native-background-gps.cjs"),
  "utf8"
);
const nativeLocation = fs.readFileSync(
  path.join(root, "lib", "native-background-location.ts"),
  "utf8"
);
const restTimer = fs.readFileSync(
  path.join(root, "lib", "rest-timer-notifications.ts"),
  "utf8"
);

const checks = [
  [
    nativeLocation.includes("@capgo/background-geolocation"),
    "Background GPS uses Capacitor 8-compatible plugin",
  ],
  [
    nativeConfig.includes("FOREGROUND_SERVICE_LOCATION"),
    "Location foreground-service permission is configured",
  ],
  [
    !nativeConfig.includes('const permissions = [\n    "android.permission.ACCESS_BACKGROUND_LOCATION"'),
    "ACCESS_BACKGROUND_LOCATION is not requested",
  ],
  [
    !nativeConfig.includes('const permissions = [\n    "android.permission.SCHEDULE_EXACT_ALARM"'),
    "SCHEDULE_EXACT_ALARM is not requested",
  ],
  [
    !restTimer.includes("allowWhileIdle: true"),
    "Rest timer does not require exact-alarm special access",
  ],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);

console.log("\nPlay Store sensitive-permission audit: PASS");
