# FitMate Native Background GPS Guide

Current Play Store preparation uses:

- Capacitor 8
- `@capgo/background-geolocation`
- Android user-started LOCATION foreground service
- visible persistent jogging notification while tracking
- no Android `ACCESS_BACKGROUND_LOCATION` permission

## Why this architecture

FitMate only starts route tracking after the user explicitly starts a jogging session. On Android, the active jogging session continues through a location foreground service while the app is minimized or the screen is off.

This keeps the permission scope smaller than requesting unrestricted Android background-location access.

## Android setup

After installing dependencies:

```bash
npm run native:add:android
npm run native:sync
npm run playstore:android:verify
```

The native configuration script ensures these permissions are present:

- `ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_LOCATION`
- `POST_NOTIFICATIONS`

It intentionally removes:

- `ACCESS_BACKGROUND_LOCATION`
- `SCHEDULE_EXACT_ALARM`
- `USE_EXACT_ALARM`

## Required device test

Test jogging on a physical Android device with the screen off before any Play Store upload. Source-code checks cannot prove OEM-specific background behavior.
