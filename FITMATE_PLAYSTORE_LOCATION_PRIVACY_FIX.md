# FitMate Play Store Location Privacy Fix — 2026-08-16

This revision supersedes the earlier 2026-08-14 location-permission approach.

## Final Android approach
- FitMate does **not** declare `ACCESS_BACKGROUND_LOCATION`.
- Jogging is started by the user from the visible Jogging screen.
- Android tracking continues during that active session through a location foreground service and ongoing notification.
- The app keeps `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `FOREGROUND_SERVICE`, and `FOREGROUND_SERVICE_LOCATION`.
- The in-app disclosure appears before Android's location runtime permission prompt.
- Android 13+ notification permission is requested only after the location permission flow.

## Google Play upload
Build a brand-new AAB with a higher versionCode. Do not upload an older AAB that still contains `ACCESS_BACKGROUND_LOCATION`. Also review every active Play Console track so an older active artifact does not keep the restricted permission present.
