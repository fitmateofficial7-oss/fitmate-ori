const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const PACKAGE_NAME = "com.growsia.fitmate";
const VERSION_CODE = 1;
const VERSION_NAME = "1.0.0";

function replaceOrThrow(text, regex, replacement, label) {
  if (!regex.test(text)) {
    throw new Error(`Tidak menemukan ${label} untuk dikonfigurasi.`);
  }
  return text.replace(regex, replacement);
}

const androidDir = path.join(root, "android");
if (!fs.existsSync(androidDir)) {
  console.log("ℹ️ Folder android belum ada.");
  console.log("Jalankan `npm run native:add:android` setelah dependency terpasang.");
  process.exit(0);
}

const gradleCandidates = [
  path.join(androidDir, "app", "build.gradle"),
  path.join(androidDir, "app", "build.gradle.kts"),
];
const gradlePath = gradleCandidates.find(fs.existsSync);

if (!gradlePath) {
  throw new Error("android/app/build.gradle(.kts) tidak ditemukan.");
}

let gradle = fs.readFileSync(gradlePath, "utf8");

if (gradlePath.endsWith(".kts")) {
  gradle = replaceOrThrow(
    gradle,
    /namespace\s*=\s*"[^"]+"/,
    `namespace = "${PACKAGE_NAME}"`,
    "namespace"
  );
  gradle = replaceOrThrow(
    gradle,
    /applicationId\s*=\s*"[^"]+"/,
    `applicationId = "${PACKAGE_NAME}"`,
    "applicationId"
  );
  gradle = replaceOrThrow(
    gradle,
    /versionCode\s*=\s*\d+/,
    `versionCode = ${VERSION_CODE}`,
    "versionCode"
  );
  gradle = replaceOrThrow(
    gradle,
    /versionName\s*=\s*"[^"]+"/,
    `versionName = "${VERSION_NAME}"`,
    "versionName"
  );
} else {
  gradle = replaceOrThrow(
    gradle,
    /namespace\s*(?:=\s*)?["'][^"']+["']/,
    `namespace = "${PACKAGE_NAME}"`,
    "namespace"
  );
  gradle = replaceOrThrow(
    gradle,
    /applicationId\s*(?:=\s*)?["'][^"']+["']/,
    `applicationId = "${PACKAGE_NAME}"`,
    "applicationId"
  );
  gradle = replaceOrThrow(
    gradle,
    /versionCode\s*(?:=\s*)?\d+/,
    `versionCode = ${VERSION_CODE}`,
    "versionCode"
  );
  gradle = replaceOrThrow(
    gradle,
    /versionName\s*(?:=\s*)?["'][^"']+["']/,
    `versionName = "${VERSION_NAME}"`,
    "versionName"
  );
}

fs.writeFileSync(gradlePath, gradle);

console.log("✅ Android release identity configured");
console.log(`   package      : ${PACKAGE_NAME}`);
console.log(`   versionCode  : ${VERSION_CODE}`);
console.log(`   versionName  : ${VERSION_NAME}`);
console.log("");
console.log("Catatan: target SDK tidak dipaksa dari script ini.");
console.log("Project masih memakai Capacitor 7, yang resmi mendukung target SDK 35.");
console.log("Migrasi Capacitor 8 diperlukan untuk target SDK 36.");
