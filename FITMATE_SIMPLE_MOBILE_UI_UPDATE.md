# FitMate Simple Mobile UI Update — 2026-08-14

## What changed

- Product-wide FitMate app surfaces are flatter, calmer, and more compact.
- Existing bottom/menu navigation is intentionally unchanged.
- Android system back / edge-back gesture now navigates WebView history before the app can close.
- A left-edge pointer fallback is included for native WebViews that do not forward the system gesture cleanly.
- Jogging share controls keep the same capabilities, but advanced layout editing is collapsed under an optional section.
- Jogging **Save card** writes generated images to the Android shared gallery under `Pictures/FitMate` on Android 10+.
- Generated videos use `Movies/FitMate` on Android 10+.
- Web/PWA keeps the existing browser-download fallback.

## Validation

Run:

```bash
npm run audit:simple-mobile
npm run audit:jogging
npm run audit:mobile-ui
npm run audit:i18n
npm run typecheck
npm run build
```

Android compile validation:

```bash
cd android
./gradlew :app:compileDebugJavaWithJavac
```

## Manual Android smoke test

1. Open FitMate and navigate Dashboard → Workout/Plan/Jogging.
2. Use Android's left/right-edge back gesture. The previous FitMate page should open; the app should only close if there is no WebView history.
3. Finish a Jogging session and tap **Simpan kartu**.
4. Open Gallery/Photos and confirm the image exists in the **FitMate** album/folder.
5. Use **Bagikan aktivitas** and confirm Android's native share sheet still opens.
6. Open the bottom menu and confirm its layout/behavior is unchanged.
