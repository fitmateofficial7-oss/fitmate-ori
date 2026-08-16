const fs = require('fs');
const path = require('path');

const mode = process.argv[2] || 'prepare';
const root = process.cwd();

const candidates = [
  path.join(root, 'android', 'app', 'build.gradle'),
  path.join(root, 'android', 'app', 'build.gradle.kts'),
];
const gradle = candidates.find((p) => fs.existsSync(p));
if (!gradle) {
  console.error('Tidak menemukan android/app/build.gradle atau build.gradle.kts');
  process.exit(1);
}

const backup = gradle + '.fitmate-version-backup';

function parseVersionCode(text) {
  let m = text.match(/versionCode\s+(\d+)/);
  if (m) return Number(m[1]);
  m = text.match(/versionCode\s*=\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseVersionName(text) {
  let m = text.match(/versionName\s+"([^"]+)"/);
  if (m) return m[1];
  m = text.match(/versionName\s*=\s*"([^"]+)"/);
  return m ? m[1] : null;
}

function replaceVersionCode(text, code) {
  if (/versionCode\s+\d+/.test(text)) {
    return text.replace(/versionCode\s+\d+/, `versionCode ${code}`);
  }
  if (/versionCode\s*=\s*\d+/.test(text)) {
    return text.replace(/versionCode\s*=\s*\d+/, `versionCode = ${code}`);
  }
  throw new Error('versionCode tidak ditemukan di file Gradle.');
}

function bumpVersionName(name, code) {
  if (!name) return null;
  if (/^\d+\.\d+\.\d+$/.test(name)) {
    const [major, minor] = name.split('.');
    return `${major}.${minor}.${code}`;
  }
  return name;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceVersionName(text, oldName, newName) {
  if (!oldName || !newName || oldName === newName) return text;
  const old = escapeRegex(oldName);
  const groovy = new RegExp(`versionName\\s+"${old}"`);
  const kotlin = new RegExp(`versionName\\s*=\\s*"${old}"`);
  if (groovy.test(text)) return text.replace(groovy, `versionName "${newName}"`);
  if (kotlin.test(text)) return text.replace(kotlin, `versionName = "${newName}"`);
  return text;
}

if (mode === 'prepare') {
  const text = fs.readFileSync(gradle, 'utf8');
  const oldCode = parseVersionCode(text);
  if (!Number.isInteger(oldCode)) {
    console.error('versionCode tidak ditemukan / tidak valid.');
    process.exit(1);
  }

  const oldName = parseVersionName(text);
  const newCode = oldCode + 1;
  const newName = bumpVersionName(oldName, newCode);

  fs.copyFileSync(gradle, backup);
  let updated = replaceVersionCode(text, newCode);
  updated = replaceVersionName(updated, oldName, newName);
  fs.writeFileSync(gradle, updated, 'utf8');

  console.log(`VERSION_CODE=${newCode}`);
  if (newName) console.log(`VERSION_NAME=${newName}`);
  process.exit(0);
}

if (mode === 'rollback') {
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, gradle);
    fs.unlinkSync(backup);
  }
  process.exit(0);
}

if (mode === 'commit') {
  if (fs.existsSync(backup)) fs.unlinkSync(backup);
  process.exit(0);
}

console.error('Mode tidak dikenal:', mode);
process.exit(1);
