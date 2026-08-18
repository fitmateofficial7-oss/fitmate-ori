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

const EXPECTED_DISCLOSURE_VERSION = "2026-08-17-prominent-disclosure-v3";
const manifest = read("android/app/src/main/AndroidManifest.xml");
const privacy = read("app/privacy/page.tsx");
const jogging = read("app/jogging/page.tsx");
const nativeLocation = read("lib/native-background-location.ts");
const legal = read("lib/legal.ts");
const release = JSON.parse(read("public/fitmate-release.json"));
const aabBuild = read("BUILD-PLAYSTORE-AAB.bat");
const remoteVerifier = read("scripts/verify-remote-policy-release.cjs");
const mergedVerifier = read("scripts/verify-merged-android-permissions.cjs");

// Android permission scope: active user-started Jogging uses a location FGS,
// not the restricted ACCESS_BACKGROUND_LOCATION permission.
assert(manifest.includes("android.permission.ACCESS_COARSE_LOCATION"), "Android declares coarse location");
assert(manifest.includes("android.permission.ACCESS_FINE_LOCATION"), "Android declares precise location");
assert(!manifest.includes("android.permission.ACCESS_BACKGROUND_LOCATION"), "Android does not request restricted ACCESS_BACKGROUND_LOCATION");
assert(manifest.includes("android.permission.FOREGROUND_SERVICE"), "Android declares foreground service");
assert(manifest.includes("android.permission.FOREGROUND_SERVICE_LOCATION"), "Android declares location foreground service");

// Privacy policy must match the actual route storage/sync behavior.
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
assert(legal.includes('FITMATE_PRIVACY_VERSION = "2026-08-17"'), "Privacy Policy effective date is updated");
assert(legal.includes(`FITMATE_LOCATION_DISCLOSURE_VERSION = "${EXPECTED_DISCLOSURE_VERSION}"`), "Disclosure version constant is updated");

// Prominent disclosure: explicit data type, use, background scenario, storage/sync,
// sharing behavior, and affirmative action before ANY provider is started.
assert(jogging.includes('aria-labelledby="fitmate-location-disclosure-title"'), "Jogging has a prominent in-app disclosure dialog");
assert(jogging.includes('aria-describedby="fitmate-location-disclosure-description"'), "Disclosure is associated with its explanatory text");
assert(jogging.includes("Penggunaan Data Lokasi"), "Disclosure title explicitly names location data");
assert(jogging.includes("FitMate mengakses dan mengumpulkan data lokasi presisi (GPS)"), "Disclosure names precise GPS access and collection");
assert(jogging.includes("merekam rute serta menghitung jarak, pace, dan kecepatan"), "Disclosure states the Jogging purpose");
assert(jogging.includes("berjalan di latar belakang (background), diminimalkan, atau layar mati"), "Disclosure states background/minimized/screen-off access");
assert(jogging.includes("disinkronkan ke akun FitMate"), "Disclosure states account synchronization");
assert(jogging.includes("Data lokasi tidak dijual dan tidak digunakan untuk iklan"), "Disclosure states no sale or advertising use");
assert(jogging.includes("Rute hanya dibagikan kepada pihak lain jika kamu sendiri memilih fitur Bagikan"), "Disclosure explains user-initiated sharing");
assert(jogging.includes("Setuju & Izinkan Lokasi"), "Disclosure requires a clear affirmative location action");
assert(jogging.includes("Tidak Setuju"), "Disclosure provides an explicit decline action");
assert(jogging.includes("max-h-[calc(100dvh-1.5rem)]"), "Disclosure fits small mobile screens");
assert(jogging.includes("overflow-y-auto"), "Disclosure remains scrollable on small mobile screens");
assert(jogging.includes('href="/privacy"'), "Disclosure links to Privacy Policy without relying on it");
assert(jogging.includes('requestLocationAwareAction("start")'), "Start button goes through disclosure gate");
assert(jogging.includes('requestLocationAwareAction("resume")'), "Resume button goes through disclosure gate");
assert(!jogging.includes("locationDisclosureAcceptedRef"), "No cached consent bypass can skip the disclosure gate");
assert(!jogging.includes("nativeAvailable && !locationDisclosureAcceptedRef"), "Disclosure is not conditional on native plugin availability");
assert(!jogging.includes("Aktifkan lokasi latar belakang di pengaturan"), "UI no longer claims restricted background-location permission is required");
assert(!jogging.includes("Buka pengaturan izin lokasi"), "No pre-consent shortcut sends users directly to location settings");

const gateStart = jogging.indexOf("const requestLocationAwareAction");
const gateEnd = jogging.indexOf("const confirmLocationDisclosure", gateStart);
const gateBody = jogging.slice(gateStart, gateEnd);
assert(gateStart >= 0 && gateBody.includes("setPendingLocationAction(action)"), "Disclosure gate always opens the in-app dialog");
assert(!gateBody.includes("beginStartSession") && !gateBody.includes("beginResumeSession"), "Disclosure gate cannot directly start location access");

const confirmStart = jogging.indexOf("const confirmLocationDisclosure");
const confirmEnd = jogging.indexOf("const dismissLocationDisclosure", confirmStart);
const confirmBody = jogging.slice(confirmStart, confirmEnd);
assert(confirmBody.includes("beginStartSession") && confirmBody.includes("beginResumeSession"), "Only affirmative confirmation continues into GPS start/resume");

const startButtonDirect = /onClick=\{beginStartSession\}|onClick=\{\(\)\s*=>\s*(?:void\s+)?beginStartSession\(/.test(jogging);
const resumeButtonDirect = /onClick=\{beginResumeSession\}|onClick=\{\(\)\s*=>\s*(?:void\s+)?beginResumeSession\(/.test(jogging);
assert(!startButtonDirect, "UI does not bypass disclosure for starting");
assert(!resumeButtonDirect, "UI does not bypass disclosure for resuming");

const startGpsIndex = jogging.indexOf("const startGpsWatch");
const firstWebGeoRequest = Math.min(
  ...["navigator.geolocation.getCurrentPosition", "navigator.geolocation.watchPosition"]
    .map((needle) => jogging.indexOf(needle))
    .filter((index) => index >= 0)
);
assert(startGpsIndex >= 0 && firstWebGeoRequest > startGpsIndex, "Browser geolocation requests exist only inside the disclosure-protected GPS start path");
assert(jogging.includes("const nativeAvailable = await isNativeBackgroundLocationAvailable()"), "GPS start resolves native provider after consent");
assert(jogging.includes("return false;\n    }\n\n    // Browser-only fallback"), "Native failure does not trigger a second browser permission request");

// Native permission ordering.
assert(nativeLocation.includes("requestPermissions: true"), "Native plugin requests location permission only when watcher is started");
const nativeStart = nativeLocation.slice(nativeLocation.indexOf("export async function startNativeBackgroundLocation"));
assert(nativeStart.indexOf("context.plugin.addWatcher") >= 0, "Native start flow contains addWatcher");
assert(nativeStart.indexOf("context.plugin.addWatcher") < nativeStart.lastIndexOf("requestAndroidNotificationPermission(context.platform)"), "Location permission flow precedes notification runtime permission");
assert(nativeLocation.includes("nativeContextPromise = null"), "Transient native initialization failures are retryable");
assert(nativeLocation.includes("backgroundTitle:"), "Native tracking shows an ongoing notification title");
assert(nativeLocation.includes("backgroundMessage:"), "Native tracking shows an ongoing notification message");

// Remote-shell deployment guard. The Android shell opens the live FitMate web app,
// so building an AAB against a stale production deployment must fail.
assert(release.packageName === "com.growsia.fitmate", "Release marker package name is correct");
assert(release.locationDisclosureVersion === EXPECTED_DISCLOSURE_VERSION, "Release marker contains the current disclosure version");
assert(release.accessBackgroundLocationDeclared === false, "Release marker states ACCESS_BACKGROUND_LOCATION is absent");
assert(remoteVerifier.includes(EXPECTED_DISCLOSURE_VERSION), "Remote verifier expects the current disclosure version");
assert(aabBuild.includes("npm run verify:remote-policy"), "Play Store AAB build verifies the live web disclosure version");
assert(aabBuild.includes("npm run verify:merged-android-permissions"), "Play Store AAB build verifies Gradle merged permissions");
assert(mergedVerifier.includes("ACCESS_BACKGROUND_LOCATION"), "Merged-manifest verifier blocks restricted background location");

if (process.exitCode) process.exit(process.exitCode);
console.log(JSON.stringify({
  status: "PASS",
  disclosureVersion: EXPECTED_DISCLOSURE_VERSION,
  policy: "prominent disclosure before all location providers; user-started location foreground service; no ACCESS_BACKGROUND_LOCATION",
  androidPermissions: ["coarse", "fine", "foreground-service-location"],
  remoteDeploymentGuard: true
}, null, 2));
