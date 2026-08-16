# FitMate Google Play Location Rejection Fix — 2026-08-16

## What was fixed
- Removed `android.permission.ACCESS_BACKGROUND_LOCATION` from the Android app manifest.
- Updated the native configuration script so future `npm run native:sync` does not add the restricted permission again.
- Kept `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `FOREGROUND_SERVICE`, and `FOREGROUND_SERVICE_LOCATION`.
- Jogging still uses the background-geolocation plugin's Android location foreground service, started only while the Jogging screen is visible and after the user taps Start/Resume.
- Reworded the in-app disclosure so the first visible sentence directly states that FitMate collects location data for Jogging route/distance/pace/speed even when the app is closed or not in use.
- Changed the affirmative action to `Setuju & Lanjutkan / Agree & Continue`.
- Moved Android 13+ notification permission so it is requested after the native location permission flow; the location runtime prompt now directly follows the FitMate disclosure.
- Updated the Privacy Policy effective date to 2026-08-16.

## Why ACCESS_BACKGROUND_LOCATION was removed
FitMate's Jogging tracking is initiated by the user while the activity is visible and continues through a location foreground service with an ongoing notification. This is different from starting location collection from a truly background state. The restricted Play permission is therefore not needed for the implemented user-started Jogging flow.

## Before uploading to Play Console
1. Run `npm ci`.
2. Run `npm run audit:playstore-location`.
3. Run `npm run typecheck`.
4. Run `npm run native:sync`.
5. Re-open `android/app/src/main/AndroidManifest.xml` and confirm `ACCESS_BACKGROUND_LOCATION` is absent.
6. Build a NEW AAB with a higher versionCode. Do not upload one of the old AAB files from the original ZIP.
7. In Play Console, update the Background Location permission declaration because the new artifact no longer requests `ACCESS_BACKGROUND_LOCATION`.
8. Check every active testing/production track. Old active APK/AAB artifacts that still request background location can keep the policy issue active.

## Reviewer flow to record if Google asks for disclosure evidence
Open FitMate -> Jogging -> Start -> FitMate location disclosure -> Agree & Continue -> Android location runtime permission -> allow -> show active Jogging -> minimize/lock screen -> show ongoing FitMate Jogging notification -> return to FitMate and show route continued.
