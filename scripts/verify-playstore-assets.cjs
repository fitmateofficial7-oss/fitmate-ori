const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const required = [
  "android/app/src/main/res/mipmap-mdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-hdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml",
  "android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png",
  "playstore-assets/fitmate-playstore-icon-512.png"
];
let ok = true;
for (const rel of required) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    ok = false;
    console.error(`❌ Missing: ${rel}`);
  } else {
    console.log(`✅ ${rel}`);
  }
}
if (!ok) process.exit(1);
console.log("\nPlay Store icon assets siap dipakai.");
