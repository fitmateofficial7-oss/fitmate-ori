# Package lock refresh required

This Play Store migration updates FitMate from Capacitor 7 to Capacitor 8 and replaces the old background-geolocation plugin.

The previous `package-lock.json` was intentionally removed because it still pinned Capacitor 7 packages.

On the development machine, run:

```bash
npm install
```

This will create a fresh `package-lock.json` containing the Capacitor 8 dependency tree.

Then run:

```bash
npm run playstore:capacitor8:check
npm run playstore:policy-audit
npm run audit:jogging
npm run audit:timer
```

Do not restore the old lock file from v14.78 because it references the old Capacitor 7 background-location stack.
