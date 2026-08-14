#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const requireSdk = process.argv.includes("--sdk");
let failed = false;

function ok(message) { console.log(`✅ ${message}`); }
function warn(message) { console.log(`⚠️ ${message}`); }
function fail(message) { console.error(`❌ ${message}`); failed = true; }

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function parseVersionTuple(value) {
  return String(value || "")
    .split(".")
    .map((part) => Number(part.replace(/\D/g, "")) || 0);
}

function atLeast(value, minimum) {
  const a = parseVersionTuple(value);
  const b = parseVersionTuple(minimum);
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return true;
}

const varsPath = path.join(root, "android", "variables.gradle");
const vars = read(varsPath);
const compileMatch = vars.match(/compileSdkVersion\s*=\s*(\d+)/);
const targetMatch = vars.match(/targetSdkVersion\s*=\s*(\d+)/);

if (!compileMatch) fail("compileSdkVersion tidak ditemukan di android/variables.gradle");
else if (Number(compileMatch[1]) < 36) fail(`compileSdkVersion masih ${compileMatch[1]}; harus 36+.`);
else ok(`compileSdkVersion ${compileMatch[1]}`);

if (!targetMatch) fail("targetSdkVersion tidak ditemukan di android/variables.gradle");
else if (Number(targetMatch[1]) < 36) fail(`targetSdkVersion masih ${targetMatch[1]}; harus 36+.`);
else ok(`targetSdkVersion ${targetMatch[1]}`);

const rootGradle = read(path.join(root, "android", "build.gradle"));
const agpMatch = rootGradle.match(/com\.android\.tools\.build:gradle:([0-9.]+)/);
if (!agpMatch) fail("Versi Android Gradle Plugin tidak ditemukan.");
else if (!atLeast(agpMatch[1], "8.10.0")) fail(`Android Gradle Plugin ${agpMatch[1]} terlalu lama untuk API 36. Gunakan 8.10.0+.`);
else ok(`Android Gradle Plugin ${agpMatch[1]} mendukung API 36`);

const wrapper = read(path.join(root, "android", "gradle", "wrapper", "gradle-wrapper.properties"));
const gradleMatch = wrapper.match(/gradle-([0-9.]+)-(?:all|bin)\.zip/);
if (!gradleMatch) fail("Versi Gradle wrapper tidak ditemukan.");
else if (!atLeast(gradleMatch[1], "8.11.1")) fail(`Gradle ${gradleMatch[1]} terlalu lama untuk AGP 8.10.x. Gunakan 8.11.1+.`);
else ok(`Gradle wrapper ${gradleMatch[1]}`);

function unescapeSdkDir(value) {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\:/g, ":")
    .replace(/\\\\/g, "\\")
    .replace(/\\ /g, " ");
}

function getSdkCandidates() {
  const candidates = [];
  for (const envName of ["ANDROID_SDK_ROOT", "ANDROID_HOME"]) {
    if (process.env[envName]) candidates.push(process.env[envName]);
  }

  const localProps = read(path.join(root, "android", "local.properties"));
  const localMatch = localProps.match(/^sdk\.dir=(.+)$/m);
  if (localMatch) candidates.push(unescapeSdkDir(localMatch[1]));

  if (process.env.LOCALAPPDATA) candidates.push(path.join(process.env.LOCALAPPDATA, "Android", "Sdk"));
  if (process.env.USERPROFILE) candidates.push(path.join(process.env.USERPROFILE, "AppData", "Local", "Android", "Sdk"));

  return [...new Set(candidates.filter(Boolean).map((v) => path.resolve(v)))];
}

if (requireSdk) {
  const sdkRoot = getSdkCandidates().find((candidate) => fs.existsSync(candidate));
  if (!sdkRoot) {
    fail("Android SDK tidak ditemukan. Install Android Studio/SDK lalu jalankan INSTALL-ANDROID-API36.bat.");
  } else {
    ok(`Android SDK: ${sdkRoot}`);
    const androidJar = path.join(sdkRoot, "platforms", "android-36", "android.jar");
    if (!fs.existsSync(androidJar)) {
      fail("Android SDK Platform 36 belum terinstall. Jalankan INSTALL-ANDROID-API36.bat.");
    } else {
      ok("Android SDK Platform 36 terinstall");
    }

    const buildToolsDir = path.join(sdkRoot, "build-tools");
    let build36 = [];
    if (fs.existsSync(buildToolsDir)) {
      build36 = fs.readdirSync(buildToolsDir).filter((name) => /^36\./.test(name));
    }
    if (build36.length) ok(`Android SDK Build-Tools ${build36.sort().at(-1)}`);
    else warn("Build-Tools 36.x belum ditemukan. Android Studio SDK Manager direkomendasikan untuk memasang versi 36.x terbaru.");
  }
}

if (failed) process.exit(1);
console.log("\nFitMate siap menargetkan Android 16 / API 36.");
