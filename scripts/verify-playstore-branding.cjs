const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const expected = {
  appName: "FitMate AI",
  packageName: "com.growsia.fitmate",
};

const requiredSources = [
  ["assets/icon-only.png", 1024, 1024],
  ["assets/icon-foreground.png", 1024, 1024],
  ["assets/icon-background.png", 1024, 1024],
  ["assets/icon-monochrome.png", 1024, 1024],
  ["assets/splash.png", 2732, 2732],
  ["assets/splash-dark.png", 2732, 2732],
  ["public/icons/icon-192.png", 192, 192],
  ["public/icons/icon-512.png", 512, 512],
  ["public/icons/icon-maskable-192.png", 192, 192],
  ["public/icons/icon-maskable-512.png", 512, 512],
  ["playstore/branding/playstore-icon-512.png", 512, 512],
];

let failed = false;
function pass(label) {
  console.log("✅ " + label);
}
function fail(label) {
  console.error("❌ " + label);
  failed = true;
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

for (const [rel] of requiredSources) {
  exists(rel) ? pass(rel) : fail(rel + " missing");
}

const cap = fs.readFileSync(path.join(root, "capacitor.config.ts"), "utf8");
cap.includes(`appId: "${expected.packageName}"`)
  ? pass("Capacitor package name")
  : fail("Capacitor package name");
cap.includes(`appName: "${expected.appName}"`)
  ? pass("Capacitor app name")
  : fail("Capacitor app name");

const manifest = fs.readFileSync(path.join(root, "app/manifest.ts"), "utf8");
manifest.includes("/icons/icon-maskable-192.png") &&
manifest.includes("/icons/icon-maskable-512.png")
  ? pass("PWA maskable icons")
  : fail("PWA maskable icons");

const android = path.join(root, "android");
if (!fs.existsSync(android)) {
  console.log("ℹ️ Android project belum dibuat; prebuilt resources siap di playstore/android-res-template.");
} else {
  const strings = path.join(android, "app/src/main/res/values/strings.xml");
  if (fs.existsSync(strings)) {
    const text = fs.readFileSync(strings, "utf8");
    text.includes(`<string name="app_name">${expected.appName}</string>`)
      ? pass("Android app label")
      : fail("Android app label");
  } else {
    fail("Android strings.xml missing");
  }

  const launcher = path.join(android, "app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml");
  exists(path.relative(root, launcher)) ? pass("Android adaptive launcher XML") : fail("Android adaptive launcher XML");
}

if (failed) process.exit(1);
console.log("\nFitMate Stage 4 branding verification: PASS");
