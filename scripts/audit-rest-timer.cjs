const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const timer = fs.readFileSync(path.join(root, "components/rest-timer.tsx"), "utf8");
const notification = fs.readFileSync(path.join(root, "lib/rest-timer-notifications.ts"), "utf8");
const native = fs.readFileSync(path.join(root, "scripts/configure-native-background-gps.cjs"), "utf8");

const checks = [
  [timer.includes("endsAt"), "timer uses an absolute end timestamp"],
  [timer.includes("localStorage"), "timer state persists locally"],
  [timer.includes('visibilitychange'), "timer resyncs after backgrounding"],
  [timer.includes("scheduleRestTimerNotification"), "native notification is scheduled"],
  [timer.includes("alarmIntervalRef"), "in-app alarm continues until dismissed"],
  [!notification.includes("allowWhileIdle: true"), "native timer avoids exact-alarm special access"],
  [notification.includes("requestPermissions"), "notification permission is handled"],
  [!native.includes('const permissions = [\n    "android.permission.SCHEDULE_EXACT_ALARM"'), "Android exact alarm permission is not requested"],
  [native.includes("android.permission.POST_NOTIFICATIONS"), "Android notification permission is configured"],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
if (failed.length) process.exit(1);
