const fs = require("fs");
const path = require("path");

const EXPECTED_PACKAGE = "com.growsia.fitmate";
const root = path.resolve(__dirname, "..");
const capacitorConfig = path.join(root, "capacitor.config.ts");

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(capacitorConfig)) {
  fail("capacitor.config.ts tidak ditemukan.");
  process.exit();
}

const capacitorText = fs.readFileSync(capacitorConfig, "utf8");
const match = capacitorText.match(/appId:\s*["']([^"']+)["']/);

if (!match) {
  fail("appId tidak ditemukan di capacitor.config.ts.");
  process.exit();
}

if (match[1] !== EXPECTED_PACKAGE) {
  fail(`Package name berubah. Diharapkan ${EXPECTED_PACKAGE}, ditemukan ${match[1]}.`);
} else {
  console.log(`✅ Capacitor appId: ${EXPECTED_PACKAGE}`);
}

const androidGradle = path.join(root, "android", "app", "build.gradle");
const androidGradleKts = path.join(root, "android", "app", "build.gradle.kts");
const gradleFile = fs.existsSync(androidGradle)
  ? androidGradle
  : fs.existsSync(androidGradleKts)
    ? androidGradleKts
    : null;

if (!gradleFile) {
  console.log("ℹ️ Folder Android belum dibuat. Jalankan `npm run native:add:android` setelah dependency terpasang.");
} else {
  const gradleText = fs.readFileSync(gradleFile, "utf8");
  const applicationId = gradleText.match(/applicationId\s*[= ]\s*["']([^"']+)["']/);
  const namespace = gradleText.match(/namespace\s*[= ]\s*["']([^"']+)["']/);

  if (applicationId && applicationId[1] !== EXPECTED_PACKAGE) {
    fail(`Android applicationId tidak cocok: ${applicationId[1]}`);
  }
  if (namespace && namespace[1] !== EXPECTED_PACKAGE) {
    fail(`Android namespace tidak cocok: ${namespace[1]}`);
  }

  if (!process.exitCode) {
    console.log("✅ Android package configuration cocok.");
  }
}

if (!process.exitCode) {
  console.log("\nPackage name FitMate siap: " + EXPECTED_PACKAGE);
  console.log("Jangan ganti package name setelah aplikasi pertama kali dipublikasikan ke Google Play.");
}
