const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const nav = fs.readFileSync(path.join(root, "components/floating-bubble-menu.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
const pages = [
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/plan/page.tsx",
  "app/workout/page.tsx",
  "app/jogging/page.tsx",
  "app/exercises/page.tsx",
  "app/progress/page.tsx",
  "app/nutrition/page.tsx",
  "app/coach/page.tsx",
  "app/settings/page.tsx",
  "app/premium/page.tsx",
  "app/motivation/page.tsx",
  "app/onboarding/page.tsx",
  "app/login/page.tsx",
  "app/register/page.tsx",
];

const checks = [
  [nav.includes("fitmate-mobile-dock__bubble"), "center bubble menu is present"],
  [nav.includes('QUICK_ROUTES = ["/dashboard", "/workout", "/jogging", "/coach"]'), "four mobile quick actions are present"],
  [css.includes("grid-template-columns: 1fr 1fr 4.25rem 1fr 1fr"), "mobile dock reserves a center bubble"],
  [css.includes("@media (max-width: 640px)"), "mobile breakpoint is defined"],
  [css.includes("fitmate-rest-timer-panel"), "timer is positioned for mobile navigation"],
];

const trPattern = /tr\(\s*(["'])(.*?)\1\s*,\s*(["'])(.*?)\3\s*\)/gs;
const longCopy = [];
for (const rel of pages) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  for (const match of text.matchAll(trPattern)) {
    const id = match[2].replace(/\s+/g, " ").trim();
    const en = match[4].replace(/\s+/g, " ").trim();

    // Google Play Prominent Disclosure intentionally needs complete, explicit copy.
    // Do not treat those policy-required location paragraphs as everyday UI verbosity.
    const isRequiredLocationDisclosure =
      rel === "app/jogging/page.tsx" &&
      (/lokasi|location/i.test(id) || /lokasi|location/i.test(en)) &&
      (/background|latar belakang|iklan|advertising|sinkron|synchron/i.test(id + " " + en));

    if (!isRequiredLocationDisclosure && (id.length > 150 || en.length > 150)) {
      longCopy.push({ rel, id, en });
    }
  }
}
checks.push([longCopy.length === 0, `no oversized everyday UI copy (${longCopy.length} found)`]);

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}
if (longCopy.length) console.log(JSON.stringify(longCopy, null, 2));
if (failed) process.exit(1);
