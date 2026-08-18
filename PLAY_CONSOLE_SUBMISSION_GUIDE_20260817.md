# FitMate — Google Play Prominent Disclosure Submission Guide

**App:** FitMate  
**Package:** `com.growsia.fitmate`  
**Fix version:** `2026-08-17-prominent-disclosure-v3`

## 1. What changed

The Jogging location flow now always follows this sequence:

1. User opens **Jogging**.
2. User taps **Mulai / Start** or **Lanjutkan / Resume**.
3. FitMate displays its own **Penggunaan Data Lokasi / Location Data Use** disclosure.
4. The disclosure states the precise GPS data accessed/collected, why it is used,
   background/minimized/screen-off behavior, storage/synchronization, advertising/sale
   behavior, and user-initiated route sharing.
5. The user must tap **Setuju & Izinkan Lokasi / Agree & Allow Location**.
6. Only then may FitMate trigger Android/browser location permission and start GPS.
7. **Tidak Setuju / Don't Agree** closes the disclosure without starting GPS or requesting
   location permission.

The gate is unconditional: it protects both the native Android location provider and the
browser geolocation fallback.

## 2. Android permission model in this source

Source manifest uses:

- `ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_LOCATION`
- `POST_NOTIFICATIONS`

It intentionally does **not** declare `ACCESS_BACKGROUND_LOCATION`.

During an active Jogging session, the Capacitor background-geolocation watcher uses an
Android location foreground service and an ongoing notification so tracking can continue
while the app is minimized or the screen is off. Tracking is user-started and is stopped
when the activity is ended or the app is force-stopped.

## 3. Deploy web production BEFORE building the AAB

FitMate's Android shell opens the live FitMate HTTPS web application after the native
welcome screen. Therefore an AAB can still show an old disclosure if the web deployment is
old.

Deploy this source first, then verify:

`https://YOUR-FITMATE-DOMAIN/fitmate-release.json`

Expected values include:

```json
{
  "app": "FitMate",
  "packageName": "com.growsia.fitmate",
  "locationDisclosureVersion": "2026-08-17-prominent-disclosure-v3",
  "locationModel": "user-started-jogging-foreground-service",
  "accessBackgroundLocationDeclared": false
}
```

`BUILD-PLAYSTORE-AAB.bat` now performs this verification automatically and refuses to build
against a stale live deployment.

## 4. Build the Play Store artifact

Run only:

`BUILD-PLAYSTORE-AAB.bat`

The builder performs, among other existing checks:

- Java 21 validation;
- package validation;
- remote production disclosure-marker validation;
- static location/privacy audit;
- API 36 verification;
- native sync;
- source-manifest background-location check;
- `bundleRelease`;
- post-build merged-manifest check to ensure `ACCESS_BACKGROUND_LOCATION` was not added by
  a dependency;
- automatic higher `versionCode`.

Do not upload an AAB generated before this fix.

## 5. Reviewer test flow — record this exact sequence

Use a clean install or clear the app data before recording.

### Test A — location service ON

1. Open FitMate.
2. Sign in.
3. Open **Jogging**.
4. Tap **Mulai / Start**.
5. Show the FitMate **Penggunaan Data Lokasi** disclosure in full.
6. First demonstrate **Tidak Setuju** and show that no Android location prompt appears.
7. Tap **Mulai** again.
8. Tap **Setuju & Izinkan Lokasi**.
9. Show that the Android location permission appears only after this affirmative action.
10. Allow location.
11. Start the Jogging activity and show GPS status/routing.
12. Minimize FitMate or turn the screen off briefly.
13. Show the persistent FitMate Jogging/background-location notification.
14. Return to FitMate and show that the active session continued.
15. End Jogging and show tracking stops.

### Test B — device Location/GPS OFF

1. Turn device Location/GPS OFF.
2. Open FitMate -> Jogging -> **Mulai**.
3. Confirm the FitMate prominent disclosure appears **before** any Android dialog asking to
   enable device location.
4. Tap **Setuju & Izinkan Lokasi**.
5. Only after that may Android show the device-location/permission UI.

This second test directly covers the failure mode shown in Google's rejection evidence.

## 6. Play Console checklist

Before resubmitting:

- Upload only the new AAB with a higher `versionCode`.
- Check all active tracks (internal, closed, open, production) for older active artifacts
  if Play Console still reports a permission/policy state caused by an old bundle.
- Make the Data safety answers match the actual current app and Privacy Policy. FitMate's
  Jogging feature handles precise location and may synchronize saved route data to the
  FitMate account for activity history.
- Keep the public Privacy Policy URL current and reachable, and ensure the in-app Privacy
  Policy matches the deployed behavior.
- If Play Console still shows a Background Location declaration tied to an older artifact,
  re-check the currently active artifacts before changing declarations.

## 7. Text for Google's policy specialist form

Use this description if support asks you to describe the issue/fix:

> FitMate uses precise location only for the user-initiated Jogging feature. Before any
> Android or browser location permission is requested, FitMate now displays a dedicated
> in-app Prominent Disclosure explaining that precise GPS data is accessed and collected to
> record the route and calculate distance, pace, and speed; that access continues during an
> active Jogging session while the app is in the background, minimized, or the screen is
> off; how route data may be stored/synchronized for Jogging history; and how sharing works.
> The user must tap “Agree & Allow Location” before location access can start, and choosing
> “Don't Agree” does not request permission or start GPS. On Android, active-session tracking
> uses a location foreground service with an ongoing notification. The current app manifest
> does not declare ACCESS_BACKGROUND_LOCATION.

## 8. Evidence screenshots to attach if requested

Attach screenshots showing:

1. Full FitMate **Penggunaan Data Lokasi** modal.
2. The **Tidak Setuju** and **Setuju & Izinkan Lokasi** buttons visible.
3. Android location runtime permission appearing after consent.
4. Active Jogging screen.
5. Persistent Android FitMate tracking notification while minimized.
6. Optional: the live `/fitmate-release.json` marker showing the current disclosure version.

## 9. Important note

The old Android dialog saying **Tidak ada akses lokasi / Aktifkan lokasi** is a device/plugin
location UI. It may still legitimately appear when device location is disabled, but only
**after** the user has first seen FitMate's prominent disclosure and affirmatively allowed
FitMate to proceed.
