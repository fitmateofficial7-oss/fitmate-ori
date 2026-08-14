# FitMate Play Store Location Privacy Fix — 2026-08-14

This update aligns FitMate's privacy disclosure with the implemented GPS Jogging feature.

## Changes
- Expanded `/privacy` with a dedicated precise-location and background-location section in Indonesian and English.
- Explicitly documents GPS coordinate/route collection, purposes, active-session background use, local/Supabase storage, sharing behavior, user controls, and no advertising/sale use.
- Updated the Privacy Policy effective date to `2026-08-14`.
- Added an in-app prominent location disclosure before the native Android background geolocation plugin can request location permission.
- The disclosure explains that tracking can continue while the app is minimized, the screen is off, or the app is not actively visible.
- Users can choose **Not now** without triggering the Android location permission request.
- Added a direct link from the disclosure to `/privacy`.
- Existing Android permissions for coarse, fine, and background location are retained because the native Jogging implementation actively uses background GPS during a user-started session.

## Play Console reminder
The Data safety and background-location declarations in Play Console must match this implementation: precise location is used for app functionality (GPS Jogging), and background location is limited to an active user-started Jogging session.
