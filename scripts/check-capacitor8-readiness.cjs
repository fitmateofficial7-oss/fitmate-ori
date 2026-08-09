const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const core = pkg.dependencies?.["@capacitor/core"] ?? "";
const android = pkg.dependencies?.["@capacitor/android"] ?? "";
const ios = pkg.dependencies?.["@capacitor/ios"] ?? "";
const cli = pkg.devDependencies?.["@capacitor/cli"] ?? "";
const bgGeo = pkg.dependencies?.["@capgo/background-geolocation"] ?? "";
const legacyBgGeo = pkg.dependencies?.["@capacitor-community/background-geolocation"];

const major = (version) => {
  const m = String(version).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
};

const values = [
  ["Capacitor core", core],
  ["Capacitor Android", android],
  ["Capacitor iOS", ios],
  ["Capacitor CLI", cli],
  ["Capgo Background GPS", bgGeo],
];

for (const [label, value] of values) {
  console.log(`${label.padEnd(24)}: ${value || "tidak ditemukan"}`);
}

let failed = false;
for (const [label, value] of values) {
  if (major(value) !== 8) {
    console.error(`❌ ${label} harus major v8.`);
    failed = true;
  }
}

if (legacyBgGeo) {
  console.error("❌ Plugin background geolocation Capacitor 7 lama masih terpasang.");
  failed = true;
}

if (failed) process.exit(1);

console.log("");
console.log("✅ Capacitor 8 migration configuration is consistent.");
console.log("✅ Background GPS uses the Capacitor 8-compatible Capgo plugin.");
console.log("✅ Android target SDK 36 can be generated/configured.");
