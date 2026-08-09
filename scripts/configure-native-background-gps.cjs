#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function addBefore(content, marker, addition) {
  if (content.includes(addition.trim())) return content;
  const index = content.indexOf(marker);
  if (index < 0) return content;
  return `${content.slice(0, index)}${addition}${content.slice(index)}`;
}

function removePermission(content, permission) {
  const escaped = permission.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.replace(
    new RegExp(
      `\\s*<uses-permission\\s+android:name=["']${escaped}["']\\s*/>\\s*`,
      "g"
    ),
    "\n"
  );
}

function configureAndroid() {
  const manifestPath = path.join(
    root,
    "android/app/src/main/AndroidManifest.xml"
  );
  let manifest = read(manifestPath);
  if (!manifest) {
    console.log("Android project not generated yet; skipping manifest patch.");
    return false;
  }

  // FitMate jogging starts location tracking only after a deliberate user tap.
  // It runs as a visible LOCATION foreground service. ACCESS_BACKGROUND_LOCATION
  // is intentionally omitted to keep the permission scope minimal for Play Store.
  const permissions = [
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_LOCATION",
    "android.permission.POST_NOTIFICATIONS",
  ];

  manifest = removePermission(
    manifest,
    "android.permission.ACCESS_BACKGROUND_LOCATION"
  );
  manifest = removePermission(
    manifest,
    "android.permission.SCHEDULE_EXACT_ALARM"
  );
  manifest = removePermission(
    manifest,
    "android.permission.USE_EXACT_ALARM"
  );

  for (const permission of permissions) {
    if (!manifest.includes(permission)) {
      manifest = addBefore(
        manifest,
        "<application",
        `    <uses-permission android:name="${permission}" />\n\n    `
      );
    }
  }

  if (!manifest.includes("android.hardware.location.gps")) {
    manifest = addBefore(
      manifest,
      "<application",
      '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n\n    '
    );
  }

  write(manifestPath, manifest);

  const stringsPath = path.join(
    root,
    "android/app/src/main/res/values/strings.xml"
  );
  let strings = read(stringsPath);
  if (strings) {
    const values = [
      [
        "capacitor_background_geolocation_notification_channel_name",
        "FitMate Jogging",
      ],
      [
        "capacitor_background_geolocation_notification_color",
        "#14B8A6",
      ],
    ];

    for (const [name, value] of values) {
      if (!strings.includes(`name="${name}"`)) {
        strings = strings.replace(
          "</resources>",
          `    <string name="${name}">${value}</string>\n</resources>`
        );
      }
    }
    write(stringsPath, strings);
  }

  console.log("Android foreground-location configuration applied.");
  console.log("ACCESS_BACKGROUND_LOCATION intentionally omitted.");
  console.log("Exact-alarm permissions intentionally omitted.");
  return true;
}

function configureIos() {
  const plistPath = path.join(root, "ios/App/App/Info.plist");
  let plist = read(plistPath);
  if (!plist) {
    console.log("iOS project not generated yet; skipping Info.plist patch.");
    return false;
  }

  const entries = [
    [
      "NSLocationWhenInUseUsageDescription",
      "FitMate membutuhkan lokasi untuk merekam rute jogging kamu.",
    ],
    [
      "NSLocationAlwaysAndWhenInUseUsageDescription",
      "FitMate membutuhkan lokasi saat layar mati agar rute jogging tetap direkam selama sesi aktif.",
    ],
  ];

  for (const [key, value] of entries) {
    if (!plist.includes(`<key>${key}</key>`)) {
      plist = plist.replace(
        "</dict>",
        `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>`
      );
    }
  }

  if (!plist.includes("<string>location</string>")) {
    plist = plist.replace(
      "</dict>",
      "\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>location</string>\n\t</array>\n</dict>"
    );
  }

  write(plistPath, plist);
  console.log("iOS background-GPS configuration applied.");
  return true;
}

const android = configureAndroid();
const ios = configureIos();

console.log(
  JSON.stringify(
    {
      status: android || ios ? "CONFIGURED" : "WAITING_FOR_NATIVE_PROJECTS",
      android,
      ios,
      androidBackgroundLocationPermission: false,
      exactAlarmPermission: false,
    },
    null,
    2
  )
);
