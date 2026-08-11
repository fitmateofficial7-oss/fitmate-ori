const fs = require("fs");
const path = require("path");

const projectRoot = process.argv[2];
if (!projectRoot) {
  console.error("Project root belum diberikan.");
  process.exit(1);
}

const gradlePath = path.join(projectRoot, "android", "app", "build.gradle");
if (!fs.existsSync(gradlePath)) {
  console.error("android/app/build.gradle tidak ditemukan:", gradlePath);
  process.exit(1);
}

let text = fs.readFileSync(gradlePath, "utf8");
const backupPath = gradlePath + ".before-fitmate-signing.bak";
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(gradlePath, backupPath);
}

const loader = `def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

`;

if (!text.includes('keystorePropertiesFile = rootProject.file("keystore.properties")')) {
  const androidIndex = text.indexOf("android {");
  if (androidIndex < 0) {
    console.error("Block android { tidak ditemukan.");
    process.exit(1);
  }
  text = text.slice(0, androidIndex) + loader + text.slice(androidIndex);
}

if (!text.includes("signingConfigs {") || !text.includes("keystoreProperties['keyAlias']")) {
  text = text.replace(
    /android\s*\{/,
    `android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }`
  );
}

if (!/release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.release/.test(text)) {
  const releasePattern = /(buildTypes\s*\{[\s\S]*?release\s*\{)/;
  if (!releasePattern.test(text)) {
    console.error("buildTypes { release { tidak ditemukan.");
    process.exit(1);
  }
  text = text.replace(releasePattern, `$1
            signingConfig signingConfigs.release`);
}

fs.writeFileSync(gradlePath, text);
console.log("✅ Android release signing berhasil dikonfigurasi.");
console.log("Backup:", backupPath);
