const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const PACKAGE_NAME = "com.growsia.fitmate";
const VERSION_CODE = 1;
const VERSION_NAME = "1.0.0";
const MIN_SDK = 24;
const COMPILE_SDK = 36;
const TARGET_SDK = 36;

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

const gradlePath = [
  path.join(androidDir, "app", "build.gradle"),
  path.join(androidDir, "app", "build.gradle.kts"),
].find(fs.existsSync);

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

const variablesPath = path.join(androidDir, "variables.gradle");
if (fs.existsSync(variablesPath)) {
  let variables = fs.readFileSync(variablesPath, "utf8");
  const replacements = [
    [/minSdkVersion\s*=\s*\d+/, `minSdkVersion = ${MIN_SDK}`],
    [/compileSdkVersion\s*=\s*\d+/, `compileSdkVersion = ${COMPILE_SDK}`],
    [/targetSdkVersion\s*=\s*\d+/, `targetSdkVersion = ${TARGET_SDK}`],
  ];
  for (const [regex, replacement] of replacements) {
    if (regex.test(variables)) variables = variables.replace(regex, replacement);
  }
  fs.writeFileSync(variablesPath, variables);
}

console.log("✅ Android Play Store configuration applied");
console.log(`   package      : ${PACKAGE_NAME}`);
console.log(`   versionCode  : ${VERSION_CODE}`);
console.log(`   versionName  : ${VERSION_NAME}`);
console.log(`   minSdk       : ${MIN_SDK}`);
console.log(`   compileSdk   : ${COMPILE_SDK}`);
console.log(`   targetSdk    : ${TARGET_SDK}`);
