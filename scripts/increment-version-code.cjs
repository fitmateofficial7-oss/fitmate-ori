#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const mode = process.argv[2] || "prepare";
const root = path.resolve(__dirname, "..");
const gradle = path.join(root, "android", "app", "build.gradle");
const backup = `${gradle}.fitmate-version-backup`;

if (!fs.existsSync(gradle)) {
  console.error("android/app/build.gradle tidak ditemukan.");
  process.exit(1);
}

function parseVersionCode(text) {
  const match = text.match(/versionCode\s+(\d+)/) || text.match(/versionCode\s*=\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function replaceVersionCode(text, value) {
  if (/versionCode\s+\d+/.test(text)) return text.replace(/versionCode\s+\d+/, `versionCode ${value}`);
  if (/versionCode\s*=\s*\d+/.test(text)) return text.replace(/versionCode\s*=\s*\d+/, `versionCode = ${value}`);
  throw new Error("versionCode tidak ditemukan.");
}

function suggestedMonotonicCode() {
  // Menit sejak 2020-01-01 + offset. Saat ini hanya beberapa juta,
  // jauh di bawah batas versionCode Google Play 2.1 miliar.
  const minutesSince2020 = Math.floor((Date.now() - Date.UTC(2020, 0, 1)) / 60000);
  return 100000 + Math.max(0, minutesSince2020);
}

if (mode === "prepare") {
  const text = fs.readFileSync(gradle, "utf8");
  const oldCode = parseVersionCode(text);
  if (!Number.isInteger(oldCode) || oldCode < 1) {
    console.error("versionCode tidak ditemukan atau tidak valid.");
    process.exit(1);
  }

  const newCode = Math.max(oldCode + 1, suggestedMonotonicCode());
  if (newCode > 2100000000) {
    console.error(`versionCode ${newCode} melewati batas Google Play.`);
    process.exit(1);
  }

  fs.copyFileSync(gradle, backup);
  fs.writeFileSync(gradle, replaceVersionCode(text, newCode), "utf8");
  console.log(`VERSION_CODE=${newCode}`);
  process.exit(0);
}

if (mode === "rollback") {
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, gradle);
    fs.unlinkSync(backup);
  }
  process.exit(0);
}

if (mode === "commit") {
  if (fs.existsSync(backup)) fs.unlinkSync(backup);
  process.exit(0);
}

console.error(`Mode tidak dikenal: ${mode}`);
process.exit(1);
