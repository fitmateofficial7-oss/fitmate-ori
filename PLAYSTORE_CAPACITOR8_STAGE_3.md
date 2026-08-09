# FitMate — Play Store Stage 3
## Capacitor 8 + Android 16 + Background GPS Migration

Status: **source preparation completed**

## Dependency migration

Migrated:
- `@capacitor/core` → 8.5.0
- `@capacitor/android` → 8.5.0
- `@capacitor/ios` → 8.5.0
- `@capacitor/cli` → 8.5.0
- `@capacitor/local-notifications` → 8.2.1
- old `@capacitor-community/background-geolocation` removed
- new `@capgo/background-geolocation` → 8.4.0

## Android release configuration

- package: `com.growsia.fitmate`
- versionCode: `1`
- versionName: `1.0.0`
- minSdk: `24`
- compileSdk: `36`
- targetSdk: `36`

## Jogging background GPS

The jogging adapter now uses the Capacitor-8-compatible Capgo plugin.

Android intentionally uses a **user-started LOCATION foreground service** and does **not** request `ACCESS_BACKGROUND_LOCATION`.

Flow:
1. User taps Start Jogging.
2. FitMate shows a clear location-use disclosure before the first native session.
3. User continues and Android requests the needed foreground location / notification permissions.
4. An ongoing jogging notification remains visible while tracking is active.
5. Pause / Finish stops native tracking.

This keeps permission scope smaller and avoids requesting Android's separate background-location permission.

## Exact alarm cleanup

FitMate no longer forces exact-alarm special access for the rest timer:
- `allowWhileIdle` removed from local notification scheduling.
- `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` are removed by native configuration.
- Timer state still uses an absolute end timestamp and resynchronizes when the app becomes visible again.

## Commands

```bash
npm install
npm run playstore:capacitor8:check
npm run playstore:policy-audit
npm run audit:jogging
npm run audit:timer
npm run playstore:preflight
```

If Android has not been generated:

```bash
npm run native:add:android
npm run native:sync
npm run playstore:android:verify
npm run native:open:android
```

## Physical Android QA required before upload

A source-level audit cannot prove background GPS behavior. Test this on a real Android device:
1. Start a jogging session while FitMate is visible.
2. Grant requested location and notification permissions.
3. Run/walk for 10–15 minutes.
4. Turn the screen off for several minutes.
5. Reopen FitMate and confirm route points continued.
6. Pause and confirm the persistent jogging notification stops.
7. Resume and confirm tracking restarts.
8. Finish and confirm no location service remains active.


## Stage 4

Branding assets are prepared in `PLAYSTORE_STAGE_4_BRANDING.md`.
