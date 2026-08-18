#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(process.cwd(), "android", "app", "build", "intermediates");

function walk(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, result);
    else if (entry.isFile() && entry.name === "AndroidManifest.xml") result.push(full);
  }
  return result;
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const manifests = walk(root);
if (!manifests.length) {
  fail("Merged AndroidManifest hasil Gradle tidak ditemukan. Jalankan setelah bundleRelease/processReleaseManifest.");
}

let inspected = 0;
let hasFine = false;
let hasForegroundLocation = false;
for (const file of manifests) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (!content.includes("<manifest")) continue;
  inspected += 1;
  if (content.includes("android.permission.ACCESS_BACKGROUND_LOCATION")) {
    fail(`ACCESS_BACKGROUND_LOCATION muncul di merged manifest: ${path.relative(process.cwd(), file)}`);
  }
  if (content.includes("android.permission.ACCESS_FINE_LOCATION")) hasFine = true;
  if (content.includes("android.permission.FOREGROUND_SERVICE_LOCATION")) hasForegroundLocation = true;
}

if (!inspected) fail("Tidak ada merged manifest XML yang dapat dibaca.");
if (!hasFine) fail("ACCESS_FINE_LOCATION tidak ditemukan pada merged manifest hasil build.");
if (!hasForegroundLocation) fail("FOREGROUND_SERVICE_LOCATION tidak ditemukan pada merged manifest hasil build.");

console.log(`PASS ${inspected} merged manifest diperiksa.`);
console.log("PASS ACCESS_BACKGROUND_LOCATION tidak ada di hasil merge Gradle.");
console.log("PASS ACCESS_FINE_LOCATION ada.");
console.log("PASS FOREGROUND_SERVICE_LOCATION ada.");
