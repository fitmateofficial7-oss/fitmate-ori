# FitMate v14.81 — npm install / sharp fix

Problem:
- `npm install` failed inside `node_modules/@capacitor/assets/node_modules/sharp`
- project was using `@capacitor/assets@3.0.5`
- that package depends on `sharp@0.32.6`

Fix:
- removed `@capacitor/assets`
- no asset generation dependency is required during npm install
- Android icon/adaptive-icon/splash resources are prebuilt
- `npm run playstore:branding` copies them into the Android project

Recommended Windows cleanup:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm cache verify
npm install
```

Recommended runtime:
- Node.js 22 LTS for the most conservative Capacitor 8 setup.
