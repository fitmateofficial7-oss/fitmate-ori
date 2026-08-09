# FitMate v14.79 – Play Store Stage 3

This release prepares FitMate for Android 16 / Google Play requirements.

## Completed
- Capacitor 8 migration in source configuration
- Android target SDK 36 preparation
- background GPS migrated to `@capgo/background-geolocation`
- old Capacitor community background-location plugin removed
- Android background-location permission intentionally avoided
- jogging now shows a clear first-use location disclosure
- exact-alarm special access removed from the rest timer path
- Play Store sensitive-permission audit added
- Android package remains `com.growsia.fitmate`
- release remains `versionCode 1` / `versionName 1.0.0`

## Validation performed
- package-name audit: PASS
- Capacitor 8 readiness audit: PASS
- sensitive-permission audit: PASS
- jogging source audit: PASS
- rest-timer audit: PASS

## Important
The stale Capacitor 7 `package-lock.json` was removed because the current execution environment cannot resolve the new Capacitor 8 packages from its internal npm mirror. Run `npm install` on the development machine to generate a fresh lockfile before building Android.

Physical Android testing is still required for background GPS behavior.
