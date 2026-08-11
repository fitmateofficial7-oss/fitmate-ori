
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
let failed = false;

function ok(msg) { console.log(`✅ ${msg}`); }
function info(msg) { console.log(`ℹ️ ${msg}`); }
function warn(msg) { console.log(`⚠️ ${msg}`); }

const requiredAssets = [
  ["assets/icon-only.png", 1024],
  ["assets/icon-foreground.png", 1024],
  ["assets/icon-background.png", 1024],
  ["assets/splash.png", 2732],
  ["assets/splash-dark.png", 2732],
];

for (const [rel] of requiredAssets) {
  const full = path.join(root, rel);
  if (fs.existsSync(full)) ok(rel);
  else {
    console.error(`❌ Missing: ${rel}`);
    failed = true;
  }
}

const gradle = path.join(root, "android", "app", "build.gradle");
if (fs.existsSync(gradle)) {
  const text = fs.readFileSync(gradle, "utf8");

  const appId = text.match(/applicationId\s+["']([^"']+)["']/);
  const versionCode = text.match(/versionCode\s+(\d+)/);
  const versionName = text.match(/versionName\s+["']([^"']+)["']/);

  if (appId?.[1] === "com.growsia.fitmate") ok("applicationId com.growsia.fitmate");
  else if (appId) {
    console.error(`❌ applicationId salah: ${appId[1]}`);
    failed = true;
  } else warn("applicationId tidak ditemukan.");

  if (versionCode) {
    if (Number(versionCode[1]) >= 1) ok(`versionCode ${versionCode[1]}`);
    else {
      console.error("❌ versionCode harus >= 1.");
      failed = true;
    }
  } else warn("versionCode tidak ditemukan.");

  if (versionName) ok(`versionName ${versionName[1]}`);
  else warn("versionName tidak ditemukan.");
} else {
  info("Full Android project belum ada di ZIP ini. Jalankan verifikasi dari project lokal E:\\fitmate yang sudah memiliki folder android.");
}

const vars = path.join(root, "android", "variables.gradle");
if (fs.existsSync(vars)) {
  const text = fs.readFileSync(vars, "utf8");
  const target = text.match(/targetSdkVersion\s*=\s*(\d+)/);
  const compile = text.match(/compileSdkVersion\s*=\s*(\d+)/);
  if (target) {
    const n = Number(target[1]);
    if (n >= 36) ok(`targetSdkVersion ${n}`);
    else warn(`targetSdkVersion masih ${n}. Untuk rilis baru menjelang kebijakan 31 Agustus 2026, siapkan target API 36.`);
  }
  if (compile) info(`compileSdkVersion ${compile[1]}`);
}

if (failed) process.exit(1);
console.log("\nFitMate Android release preparation check selesai.");
