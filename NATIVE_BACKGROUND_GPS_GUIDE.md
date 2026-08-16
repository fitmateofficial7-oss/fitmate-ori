# FitMate Native Background GPS Setup

FitMate v14.40 includes a native background-location bridge for the Jogging feature. The web/PWA fallback remains available, but Android and iOS builds can now use a native watcher while the app is minimized or the screen is locked.

## Included implementation

- Capacitor 7 configuration in `capacitor.config.ts`.
- `@capacitor-community/background-geolocation` integration.
- Android 13+ notification permission request through `@capacitor/local-notifications`.
- Persistent Android notification text: **FitMate Jogging aktif**.
- iOS background location keys and usage descriptions.
- Automatic fallback to browser `navigator.geolocation` when the app is not running as a native Capacitor application.
- Route draft persistence after every accepted GPS point.
- Pause, resume, finish, and reset operations stop/restart the correct native watcher.

## 1. Install dependencies

```bash
npm install
```

The first install updates `package-lock.json` with the newly added Capacitor packages.

## 2. Set the hosted FitMate URL

This project uses Next.js server routes, authentication, and Supabase integration, so the native shell should load the deployed HTTPS website.

Add to `.env` before running Capacitor commands:

```env
CAPACITOR_SERVER_URL=https://your-fitmate-domain.com
```

Do not use the placeholder in production.

## 3. Generate Android

```bash
npm run native:add:android
npm run native:sync
npm run native:open:android
```

`native:add:android` automatically runs `scripts/configure-native-background-gps.cjs`, which applies:

- `ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_LOCATION`
- `POST_NOTIFICATIONS`
- GPS hardware declaration
- FitMate notification channel name and color

Test on a real Android device. Start jogging while FitMate is visible, grant precise location and notification access, press Home, and lock the screen. A persistent FitMate Jogging notification should remain visible.

## 4. Generate iOS

Requires macOS and Xcode.

```bash
npm run native:add:ios
npm run native:sync
npm run native:open:ios
```

The configuration script adds:

- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`
- `UIBackgroundModes` with `location`

In Xcode, confirm **Signing & Capabilities → Background Modes → Location updates** is enabled before archive/release testing.

## Runtime behavior

- **Browser/PWA:** uses browser GPS and Screen Wake Lock. Keep FitMate open for reliable tracking.
- **Android/iOS native app:** uses the native background watcher and can continue while minimized or while the screen is off, subject to OS permissions and battery restrictions.
- **Pause / Finish:** removes the native watcher and stops background location use.
- **Force-stop / force-quit:** tracking must not be promised. The user should reopen FitMate and resume or start another session.

## Google Play and App Store review

Location is sensitive data. The store listing and in-app permission explanation should clearly state that background location is used only during a user-started jogging session to draw the route, calculate distance/pace, and restore the activity.


## Google Play note — 2026-08-16
FitMate starts its Android location foreground service only from the visible Jogging screen after a user action. The app therefore does not declare `ACCESS_BACKGROUND_LOCATION`. Active Jogging can continue while the app is minimized or the screen is off through the foreground service and its ongoing notification. Do not re-add `ACCESS_BACKGROUND_LOCATION` unless the product later needs to start or obtain location from a truly background state and Google Play approval has been obtained.
