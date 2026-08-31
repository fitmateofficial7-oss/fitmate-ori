# FitMate v14.92 — Password Reset Cross-Browser Fix

- Reset links no longer depend on a verifier saved in the requesting browser.
- The email may be opened in another browser, email WebView, or another device.
- Both browser Supabase clients now use the same implicit authentication flow.
- Hash-token links and legacy code links remain supported by the reset page.
- The misleading same-browser instruction has been removed.

The production reset URL, such as
`https://fitmate.growsia.id/reset-password`, must remain allowed in the
Supabase Auth Redirect URLs.
