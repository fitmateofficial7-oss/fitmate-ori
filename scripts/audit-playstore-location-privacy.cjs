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
assert(manifest.includes("android.permission.ACCESS_BACKGROUND_LOCATION"), "Android declares background location");
assert(manifest.includes("android.permission.FOREGROUND_SERVICE_LOCATION"), "Android declares location foreground service");

assert(privacy.includes('heading: "Data lokasi dan lokasi latar belakang"'), "Indonesian Privacy Policy has a dedicated location section");
assert(privacy.includes('heading: "Location data and background location"'), "English Privacy Policy has a dedicated location section");
assert(privacy.includes("data lokasi presisi (GPS)"), "Indonesian policy discloses precise GPS collection");
assert(privacy.includes("precise location (GPS) data"), "English policy discloses precise GPS collection");
assert(privacy.includes("aplikasi diminimalkan, layar dimatikan"), "Indonesian policy discloses background use");
assert(privacy.includes("app is minimized, the screen is off"), "English policy discloses background use");
assert(privacy.includes("tidak dijual dan tidak digunakan untuk iklan"), "Indonesian policy discloses no sale/ad use");
assert(privacy.includes("is not sold and is not used for advertising"), "English policy discloses no sale/ad use");
assert(privacy.includes("dapat disinkronkan ke database FitMate"), "Indonesian policy discloses route synchronization");
assert(privacy.includes("may be synchronized to FitMate's database"), "English policy discloses route synchronization");
assert(legal.includes('FITMATE_PRIVACY_VERSION = "2026-08-14"'), "Privacy Policy effective date is updated");

assert(jogging.includes('aria-labelledby="fitmate-location-disclosure-title"'), "Jogging has a prominent in-app disclosure dialog");
assert(jogging.includes("FitMate mengumpulkan data lokasi presisi (GPS)"), "Disclosure names precise location collection");
assert(jogging.includes("aplikasi diminimalkan, layar mati"), "Disclosure states background use");
assert(jogging.includes('href="/privacy"'), "Disclosure links to Privacy Policy");
assert(jogging.includes('requestLocationAwareAction("start")'), "Start button goes through disclosure gate");
assert(jogging.includes('requestLocationAwareAction("resume")'), "Resume button goes through disclosure gate");
assert(jogging.includes("locationDisclosureAcceptedRef.current = true"), "Permission request is gated by explicit user continuation");
assert(jogging.includes("dismissLocationDisclosure"), "User can decline before permission request");
assert(jogging.includes("await isNativeBackgroundLocationAvailable()"), "Disclosure gate verifies native background-location context");

const startButtonDirect = /onClick=\{beginStartSession\}|onClick=\{\(\)\s*=>\s*(?:void\s+)?beginStartSession\(/.test(jogging);
assert(!startButtonDirect, "UI does not bypass the location disclosure gate for starting");

assert(nativeLocation.includes("requestPermissions: true"), "Native background plugin requests permission only inside native start flow");
assert(nativeLocation.includes("backgroundTitle:"), "Native tracking shows a notification title");
assert(nativeLocation.includes("backgroundMessage:"), "Native tracking shows a notification message");

if (process.exitCode) process.exit(process.exitCode);
console.log(JSON.stringify({
  status: "PASS",
  policy: "precise + background location disclosed",
  disclosure: "shown before native permission request",
  androidPermissions: ["coarse", "fine", "background", "foreground-service-location"]
}, null, 2));
