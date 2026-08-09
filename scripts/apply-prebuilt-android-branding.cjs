\
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const template = path.join(root, "playstore", "android-res-template");
const androidRes = path.join(root, "android", "app", "src", "main", "res");

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(path.join(root, "android"))) {
  console.log("ℹ️ Folder Android belum ada.");
  console.log("Branding prebuilt sudah siap dan akan diterapkan setelah `npm run native:add:android`.");
  process.exit(0);
}

if (!fs.existsSync(template)) {
  console.error("❌ Template branding Android tidak ditemukan.");
  process.exit(1);
}

copyDir(template, androidRes);

// App label/package strings.
const stringsPath = path.join(androidRes, "values", "strings.xml");
if (fs.existsSync(stringsPath)) {
  let xml = fs.readFileSync(stringsPath, "utf8");
  const setString = (name, value) => {
    const regex = new RegExp(`<string\\s+name=["']${name}["'][^>]*>[^<]*<\\/string>`);
    if (regex.test(xml)) {
      xml = xml.replace(regex, `<string name="${name}">${value}</string>`);
    } else {
      xml = xml.replace("</resources>", `    <string name="${name}">${value}</string>\n</resources>`);
    }
  };
  setString("app_name", "FitMate AI");
  setString("title_activity_main", "FitMate AI");
  setString("package_name", "com.growsia.fitmate");
  setString("custom_url_scheme", "com.growsia.fitmate");
  fs.writeFileSync(stringsPath, xml);
}

console.log("✅ Prebuilt FitMate Android branding applied without @capacitor/assets/sharp.");
