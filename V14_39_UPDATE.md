# FitMate v14.39 – Live Route Line & Background Tracking Readiness

- Added immediate high-accuracy starting-point acquisition when the user taps Start Jogging.
- Continued live GPS updates with `watchPosition` and a route polyline that grows along the path traveled.
- Added a LIVE FitMate marker for the most recent position while tracking or paused.
- Added best-effort Screen Wake Lock support during active jogging sessions.
- Reacquires wake lock when returning to the visible page.
- Persists the active route when the page becomes hidden or the app is backgrounded.
- Added `screen-wake-lock=(self)` to the Permissions-Policy header.
- Added `NATIVE_BACKGROUND_GPS_GUIDE.md` describing the native Android/iOS requirements for screen-off and background tracking.
- Jogging, import, and UI audits pass.
