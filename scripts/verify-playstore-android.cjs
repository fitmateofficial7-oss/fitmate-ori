const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const EXPECTED = {
  packageName: "com.growsia.fitmate",
  versionCode: 1,
  versionName: "1.0.0",
  minSdk: 24,
  compileSdk: 36,
  targetSdk: 36,
};

const androidDir = path.join(root, "android");
if (!fs.existsSync(androidDir)) {
  console.log("ℹ️ Android project belum dibuat.");
  console.log("   Package/version/SDK release sudah disiapkan dan akan diterapkan oleh `npm run native:add:android`.");
  process.exit(0);
}

const gradlePath = [
  path.join(androidDir, "app", "build.gradle"),
  path.join(androidDir, "app", "build.gradle.kts"),
].find(fs.existsSync);

if (!gradlePath) {
  console.error("❌ build.gradle Android tidak ditemukan.");
  process.exit(1);
}

const text = fs.readFileSync(gradlePath, "utf8");
const readString = (name) => {
  const m = text.match(new RegExp(name + "\\s*(?:=\\s*)?[\"']([^\"']+)[\"']"));
  return m?.[1] ?? null;
};
const readNumber = (name) => {
  const m = text.match(new RegExp(name + "\\s*(?:=\\s*)?(\\d+)"));
  return m ? Number(m[1]) : null;
};

const actual = {
  namespace: readString("namespace"),
  applicationId: readString("applicationId"),
  versionCode: readNumber("versionCode"),
  versionName: readString("versionName"),
};

let failed = false;
function check(ok, message) {
  if (ok) console.log("✅ " + message);
  else {
    console.error("❌ " + message);
    failed = true;
  }
}

check(actual.namespace === EXPECTED.packageName, `namespace = ${EXPECTED.packageName}`);
check(actual.applicationId === EXPECTED.packageName, `applicationId = ${EXPECTED.packageName}`);
check(actual.versionCode === EXPECTED.versionCode, `versionCode = ${EXPECTED.versionCode}`);
check(actual.versionName === EXPECTED.versionName, `versionName = ${EXPECTED.versionName}`);

const variablesPath = path.join(androidDir, "variables.gradle");
if (fs.existsSync(variablesPath)) {
  const variables = fs.readFileSync(variablesPath, "utf8");
  const readVariable = (name) => {
    const match = variables.match(new RegExp(name + "\\s*=\\s*(\\d+)"));
    return match ? Number(match[1]) : null;
  };
  check(readVariable("minSdkVersion") === EXPECTED.minSdk, `minSdkVersion = ${EXPECTED.minSdk}`);
  check(readVariable("compileSdkVersion") === EXPECTED.compileSdk, `compileSdkVersion = ${EXPECTED.compileSdk}`);
  check(readVariable("targetSdkVersion") === EXPECTED.targetSdk, `targetSdkVersion = ${EXPECTED.targetSdk}`);
}

if (failed) process.exit(1);
console.log("\nAndroid FitMate siap untuk release pertama dengan target SDK 36.");
