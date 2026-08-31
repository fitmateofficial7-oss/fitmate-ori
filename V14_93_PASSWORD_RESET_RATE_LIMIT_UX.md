# FitMate v14.93 — Password Reset Rate-Limit UX

- Replaces raw Supabase `email rate limit exceeded` text with a clear message.
- Adds a 60-second resend countdown.
- Disables the resend button during the cooldown.
- Prevents accidental repeated password-reset requests.
- Keeps the v14.92 cross-browser recovery fix.

For production, configure Custom SMTP in Supabase. The built-in Supabase email
provider is intended for testing and currently permits only a very small number
of authentication emails per hour.
