const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const APP_NAME = "FitMate AI";
const PACKAGE_NAME = "com.growsia.fitmate";
const SPLASH_BG = "#F6FCF8";
const SPLASH_BG_DARK = "#031A12";

function exists(p) {
  return fs.existsSync(p);
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}
function write(p, value) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, value);
}
function setString(xml, name, value) {
  const regex = new RegExp(`<string\\s+name=["']${name}["'][^>]*>[^<]*<\\/string>`);
  if (regex.test(xml)) {
    return xml.replace(regex, `<string name="${name}">${value}</string>`);
  }
  return xml.replace("</resources>", `    <string name="${name}">${value}</string>\n</resources>`);
}

const android = path.join(root, "android");
if (!exists(android)) {
  console.log("ℹ️ Android project belum dibuat. Branding source sudah siap di folder assets/.");
  console.log("Jalankan `npm run native:add:android` setelah Android Studio/SDK siap.");
  process.exit(0);
}

const stringsPath = path.join(android, "app/src/main/res/values/strings.xml");
if (exists(stringsPath)) {
  let xml = read(stringsPath);
  xml = setString(xml, "app_name", APP_NAME);
  xml = setString(xml, "title_activity_main", APP_NAME);
  xml = setString(xml, "package_name", PACKAGE_NAME);
  xml = setString(xml, "custom_url_scheme", PACKAGE_NAME);
  write(stringsPath, xml);
}

const colorsPath = path.join(android, "app/src/main/res/values/colors.xml");
let colors = exists(colorsPath) ? read(colorsPath) : "<resources>\n</resources>\n";
const colorEntries = [
  ["fitmate_splash_background", SPLASH_BG],
  ["fitmate_brand_green", "#16A34A"],
  ["fitmate_deep_green", "#031A12"],
];
for (const [name, value] of colorEntries) {
  const regex = new RegExp(`<color\\s+name=["']${name}["'][^>]*>[^<]*<\\/color>`);
  if (regex.test(colors)) {
    colors = colors.replace(regex, `<color name="${name}">${value}</color>`);
  } else {
    colors = colors.replace("</resources>", `    <color name="${name}">${value}</color>\n</resources>`);
  }
}
write(colorsPath, colors);

const nightColorsPath = path.join(android, "app/src/main/res/values-night/colors.xml");
let nightColors = exists(nightColorsPath) ? read(nightColorsPath) : "<resources>\n</resources>\n";
const nightRegex = /<color\s+name=["']fitmate_splash_background["'][^>]*>[^<]*<\/color>/;
if (nightRegex.test(nightColors)) {
  nightColors = nightColors.replace(
    nightRegex,
    `<color name="fitmate_splash_background">${SPLASH_BG_DARK}</color>`
  );
} else {
  nightColors = nightColors.replace(
    "</resources>",
    `    <color name="fitmate_splash_background">${SPLASH_BG_DARK}</color>\n</resources>`
  );
}
write(nightColorsPath, nightColors);

// Android 13+ themed icon source.
// @capacitor/assets generates the adaptive icon XML. We add a monochrome layer
// when possible so Android can theme FitMate cleanly.
const monoSource = path.join(root, "assets/icon-monochrome.png");
const drawableDir = path.join(android, "app/src/main/res/drawable-nodpi");
const monoTarget = path.join(drawableDir, "ic_launcher_monochrome.png");
if (exists(monoSource)) {
  fs.mkdirSync(drawableDir, { recursive: true });
  fs.copyFileSync(monoSource, monoTarget);
}

const adaptiveCandidates = [
  path.join(android, "app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml"),
  path.join(android, "app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml"),
];
for (const file of adaptiveCandidates) {
  if (!exists(file)) continue;
  let xml = read(file);
  if (!xml.includes("<monochrome")) {
    xml = xml.replace(
      "</adaptive-icon>",
      '    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n</adaptive-icon>'
    );
    write(file, xml);
  }
}

console.log("✅ Android branding applied");
console.log(`   app label : ${APP_NAME}`);
console.log(`   package   : ${PACKAGE_NAME}`);
console.log("   adaptive icon + themed monochrome source prepared");
console.log("   splash light/dark source prepared");
