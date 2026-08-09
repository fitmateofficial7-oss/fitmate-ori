const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const capacitorCore = pkg.dependencies?.["@capacitor/core"] ?? "";
const capacitorAndroid = pkg.dependencies?.["@capacitor/android"] ?? "";
const bgGeo = pkg.dependencies?.["@capacitor-community/background-geolocation"] ?? "";

const major = (version) => {
  const m = String(version).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
};

const capMajor = Math.max(major(capacitorCore), major(capacitorAndroid));

console.log(`Capacitor core    : ${capacitorCore || "tidak ditemukan"}`);
console.log(`Capacitor Android : ${capacitorAndroid || "tidak ditemukan"}`);
console.log(`Background GPS    : ${bgGeo || "tidak ditemukan"}`);

if (capMajor >= 8) {
  console.log("✅ Capacitor 8+ terdeteksi. Target SDK 36 dapat disiapkan sesuai dukungan resmi Capacitor 8.");
  process.exit(0);
}

console.log("");
console.log("⚠️  Capacitor 7 masih digunakan.");
console.log("    Capacitor 7 resmi mendukung target SDK 35.");
console.log("    Untuk Play Store setelah 31 Agustus 2026, FitMate perlu target SDK 36 / Capacitor 8.");
console.log("");
console.log("⚠️  Jangan upgrade otomatis dulu:");
console.log("    @capacitor-community/background-geolocation v1.2.26 secara resmi mencantumkan dukungan sampai Capacitor v7.");
console.log("    Plugin background GPS harus diputuskan/migrasikan terlebih dahulu agar fitur jogging tidak rusak.");
