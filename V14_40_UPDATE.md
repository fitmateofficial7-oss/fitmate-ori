# FitMate v14.40 – Native Background GPS Integration

## Added
- Capacitor 7 native app configuration.
- Native background GPS bridge using `@capacitor-community/background-geolocation`.
- Android persistent jogging notification and notification permission request.
- Android background/foreground location permission configuration helper.
- iOS Core Location background-mode configuration helper.
- Automatic web GPS fallback outside Android/iOS native builds.
- Native-mode status indicator and location-settings shortcut in the Jogging UI.
- Route draft persistence after each accepted background GPS point.
- Native scripts for adding, syncing, configuring, and opening Android/iOS projects.

## Behavior
- Native Android/iOS: route tracking can continue while minimized or with the screen off, subject to granted permissions and OS battery policies.
- Web/PWA: existing browser GPS and screen wake lock remain active.
- Pause, finish, and reset stop the active native watcher.
- Force-stop/force-quit is not guaranteed to keep tracking.

## Validation
- Jogging audit: PASS
- Native background GPS audit checks: PASS
- Import/syntax audit: PASS
- UI audit: PASS
- Exercise motion audit: PASS
