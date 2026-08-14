#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const cap = fs.readFileSync(path.join(root, "capacitor.config.ts"), "utf8");
const html = fs.readFileSync(path.join(root, "native-web", "index.html"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const checks = [
  ["Capacitor tidak memakai server.url", !/\burl\s*:\s*nativeUrl/.test(cap) && !/server\s*:\s*\{[\s\S]*?\burl\s*:/.test(cap)],
  ["webDir = native-web", /webDir:\s*["']native-web["']/.test(cap)],
  ["allowNavigation tersedia", /allowNavigation/.test(cap)],
  ["Native welcome punya Start", /id="startButton"/.test(html)],
  ["Native welcome punya Login", /id="loginButton"/.test(html)],
  ["Native welcome memakai runtime config", /runtime-config\.js/.test(html)],
  ["native:sync menyiapkan welcome", String(pkg.scripts?.["native:sync"] || "").includes("native:prepare-welcome")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);
console.log("\n✅ Native Mobile Welcome V6 siap.");
