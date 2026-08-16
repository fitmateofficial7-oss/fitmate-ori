const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${message}`);
  }
};

const manifest = read("android/app/src/main/AndroidManifest.xml");
const privacy = read("app/privacy/page.tsx");
const jogging = read("app/jogging/page.tsx");
const nativeLocation = read("lib/native-background-location.ts");
const legal = read("lib/legal.ts");

assert(manifest.includes("android.permission.ACCESS_COARSE_LOCATION"), "Android declares coarse location");
assert(manifest.includes("android.permission.ACCESS_FINE_LOCATION"), "Android declares precise location");
assert(!manifest.includes("android.permission.ACCESS_BACKGROUND_LOCATION"), "Android does not request restricted ACCESS_BACKGROUND_LOCATION");
assert(manifest.includes("android.permission.FOREGROUND_SERVICE_LOCATION"), "Android declares location foreground service");

assert(privacy.includes('heading: "Data lokasi dan lokasi latar belakang"'), "Indonesian Privacy Policy has a dedicated location section");
assert(privacy.includes('heading: "Location data and background location"'), "English Privacy Policy has a dedicated location section");
assert(privacy.includes("data lokasi presisi (GPS)"), "Indonesian policy discloses precise GPS collection");
assert(privacy.includes("precise location (GPS) data"), "English policy discloses precise GPS collection");
assert(privacy.includes("aplikasi diminimalkan atau layar dimatikan"), "Indonesian policy discloses background use");
assert(privacy.includes("app is minimized or the screen is off"), "English policy discloses background use");
assert(privacy.includes("tidak dijual dan tidak digunakan untuk iklan"), "Indonesian policy discloses no sale/ad use");
assert(privacy.includes("is not sold and is not used for advertising"), "English policy discloses no sale/ad use");
assert(privacy.includes("dapat disinkronkan ke database FitMate"), "Indonesian policy discloses route synchronization");
assert(privacy.includes("may be synchronized to FitMate's database"), "English policy discloses route synchronization");
assert(legal.includes('FITMATE_PRIVACY_VERSION = "2026-08-16"'), "Privacy Policy effective date is updated");

assert(jogging.includes('aria-labelledby="fitmate-location-disclosure-title"'), "Jogging has a prominent in-app disclosure dialog");
assert(jogging.includes("FitMate mengumpulkan data lokasi untuk mengaktifkan pelacakan rute Jogging"), "Disclosure clearly names location collection and Jogging feature");
assert(jogging.includes("bahkan saat aplikasi ditutup atau tidak digunakan"), "Indonesian disclosure uses Google-recommended closed/not-in-use wording");
assert(jogging.includes("even when the app is closed or not in use"), "English disclosure uses Google-recommended closed/not-in-use wording");
assert(jogging.includes('href="/privacy"'), "Disclosure links to Privacy Policy");
assert(jogging.includes('requestLocationAwareAction("start")'), "Start button goes through disclosure gate");
assert(jogging.includes('requestLocationAwareAction("resume")'), "Resume button goes through disclosure gate");
assert(jogging.includes("locationDisclosureAcceptedRef.current = true"), "Permission request is gated by explicit user continuation");
assert(jogging.includes("Setuju & Lanjutkan"), "Disclosure requires affirmative Agree & Continue action");
assert(jogging.includes("dismissLocationDisclosure"), "User can decline before permission request");
assert(jogging.includes("await isNativeBackgroundLocationAvailable()"), "Disclosure gate verifies native background-location context");

const startButtonDirect = /onClick=\{beginStartSession\}|onClick=\{\(\)\s*=>\s*(?:void\s+)?beginStartSession\(/.test(jogging);
assert(!startButtonDirect, "UI does not bypass the location disclosure gate for starting");

assert(nativeLocation.includes("requestPermissions: true"), "Native location plugin requests permission only inside user-started native flow");
const nativeStart = nativeLocation.slice(nativeLocation.indexOf("export async function startNativeBackgroundLocation"));
assert(nativeStart.indexOf("context.plugin.addWatcher") >= 0, "Native start flow contains addWatcher");
assert(nativeStart.indexOf("context.plugin.addWatcher") < nativeStart.lastIndexOf("requestAndroidNotificationPermission(context.platform)"), "Location permission flow occurs before notification runtime permission");
assert(nativeLocation.includes("backgroundTitle:"), "Native tracking shows a notification title");
assert(nativeLocation.includes("backgroundMessage:"), "Native tracking shows a notification message");

if (process.exitCode) process.exit(process.exitCode);
console.log(JSON.stringify({
  status: "PASS",
  policy: "foreground-service jogging location with no restricted background-location permission",
  disclosure: "shown before native location permission request",
  androidPermissions: ["coarse", "fine", "foreground-service-location"]
}, null, 2));
