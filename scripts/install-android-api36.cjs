#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}
function unescapeSdkDir(value) {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/\\:/g, ":").replace(/\\\\/g, "\\").replace(/\\ /g, " ");
}
function sdkCandidates() {
  const values = [];
  if (process.env.ANDROID_SDK_ROOT) values.push(process.env.ANDROID_SDK_ROOT);
  if (process.env.ANDROID_HOME) values.push(process.env.ANDROID_HOME);
  const props = read(path.join(root, "android", "local.properties"));
  const match = props.match(/^sdk\.dir=(.+)$/m);
  if (match) values.push(unescapeSdkDir(match[1]));
  if (process.env.LOCALAPPDATA) values.push(path.join(process.env.LOCALAPPDATA, "Android", "Sdk"));
  if (process.env.USERPROFILE) values.push(path.join(process.env.USERPROFILE, "AppData", "Local", "Android", "Sdk"));
  return [...new Set(values.filter(Boolean).map((v) => path.resolve(v)))];
}

const sdkRoot = sdkCandidates().find((p) => fs.existsSync(p));
if (!sdkRoot) {
  console.error("❌ Android SDK tidak ditemukan.");
  console.error("Buka Android Studio > SDK Manager dan install Android SDK terlebih dahulu.");
  process.exit(1);
}
console.log(`✅ Android SDK: ${sdkRoot}`);

const candidates = [
  path.join(sdkRoot, "cmdline-tools", "latest", "bin", "sdkmanager.bat"),
  path.join(sdkRoot, "cmdline-tools", "bin", "sdkmanager.bat"),
  path.join(sdkRoot, "tools", "bin", "sdkmanager.bat"),
  path.join(sdkRoot, "cmdline-tools", "latest", "bin", "sdkmanager"),
  path.join(sdkRoot, "cmdline-tools", "bin", "sdkmanager"),
  path.join(sdkRoot, "tools", "bin", "sdkmanager"),
];

let sdkmanager = candidates.find((p) => fs.existsSync(p));
if (!sdkmanager) {
  const cmdlineRoot = path.join(sdkRoot, "cmdline-tools");
  if (fs.existsSync(cmdlineRoot)) {
    const versions = fs.readdirSync(cmdlineRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(cmdlineRoot, e.name, "bin", process.platform === "win32" ? "sdkmanager.bat" : "sdkmanager"));
    sdkmanager = versions.find((p) => fs.existsSync(p));
  }
}

if (!sdkmanager) {
  console.error("❌ sdkmanager tidak ditemukan.");
  console.error("Di Android Studio > SDK Manager > SDK Tools, install 'Android SDK Command-line Tools (latest)'.");
  process.exit(1);
}

const env = { ...process.env, ANDROID_SDK_ROOT: sdkRoot, ANDROID_HOME: sdkRoot };
const acceptInput = "y\r\n".repeat(300);

function runSdkManager(args, label) {
  console.log(`\n${label}\n`);
  const result = spawnSync(sdkmanager, args, {
    input: acceptInput,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
    env,
  });
  if (result.error) {
    console.error(`❌ Gagal menjalankan sdkmanager: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`✅ sdkmanager: ${sdkmanager}`);
runSdkManager([`--sdk_root=${sdkRoot}`, "--licenses"], "Menerima Android SDK licenses...");
runSdkManager(
  [`--sdk_root=${sdkRoot}`, "platforms;android-36", "build-tools;36.0.0", "platform-tools"],
  "Menginstall Android SDK Platform 36, Build-Tools 36.0.0, dan Platform-Tools..."
);

const androidJar = path.join(sdkRoot, "platforms", "android-36", "android.jar");
const buildTools = path.join(sdkRoot, "build-tools", "36.0.0");
const platformTools = path.join(sdkRoot, "platform-tools");
if (!fs.existsSync(androidJar) || !fs.existsSync(buildTools) || !fs.existsSync(platformTools)) {
  console.error("❌ Instalasi sdkmanager selesai tetapi komponen API 36 belum lengkap.");
  console.error(`   android.jar: ${fs.existsSync(androidJar) ? "OK" : "MISSING"}`);
  console.error(`   build-tools 36.0.0: ${fs.existsSync(buildTools) ? "OK" : "MISSING"}`);
  console.error(`   platform-tools: ${fs.existsSync(platformTools) ? "OK" : "MISSING"}`);
  process.exit(1);
}

console.log("\n✅ Android API 36 berhasil dipasang.");
