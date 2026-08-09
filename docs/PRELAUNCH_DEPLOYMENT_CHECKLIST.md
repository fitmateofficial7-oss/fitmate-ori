# FitMate AI v14 pre-launch deployment checklist

## 1. Database

Run every existing migration in order, then run:

```text
supabase/migrations/202607280008_prelaunch_features.sql
```

This migration adds readiness, per-set logs, adaptive recommendations, measurements, private progress photos, nutrition journals, reminder preferences, and account-deletion support.

## 2. Environment variables

Copy `.env.example` to `.env.local` for local development. On Hostinger, add the same values through the Node.js application's environment-variable settings. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` with a `NEXT_PUBLIC_` prefix.

Required production values include Supabase URL/public key/service-role key, OpenAI API key/model, admin email, AI cost rates, and the public support email.

## 3. Release validation

On a machine with npm registry access:

```bash
npm ci
npm run release:check
```

The release check runs ESLint, TypeScript, import checks, the 1,000-cycle procedural 3D guide audit, UI checks, the 1,000,000+ deterministic guide calibration, and `next build`.

## 4. Real-device checks

Test at minimum:

- Android Chrome and installed PWA
- iPhone Safari for responsive compatibility
- Registration, login, logout, and password reset
- AI plan generation, consultations, and ten separate meal-image scans
- Readiness, injury filtering, per-set logging, offline queue, and reconnection sync
- Measurements and private progress-photo upload/view/delete
- Notification permission and scheduled reminder while the app/PWA is active
- Data export and permanent account deletion
- Admin monitoring and AI cost estimates
- Every exercise guide in portrait and landscape orientation

## 5. Known boundary

This package is the final **web/PWA pre-launch source**, not the signed Android Play Store bundle. Native Health Connect, true background push scheduling, and camera-based pose estimation remain Android/native follow-up work. Automated guide checks reduce software regressions but are not clinical, physiotherapy, or biomechanics certification.
