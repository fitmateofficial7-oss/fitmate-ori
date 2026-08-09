# FitMate AI

FitMate AI is a personalized fitness application built with Next.js, Supabase,
and the OpenAI API. Users can create a fitness profile, generate a seven-day
workout plan, complete workouts, browse exercise guidance, track weight, and
review progress. The app also includes an authenticated AI coach, photo-based
meal nutrition estimates, and an automatic rest timer. The exercise library
includes lightweight procedural 3D exercise animations with synchronized equipment for
29 exercises. The responsive interface includes a saved light/dark theme and
start-to-finish movement previews on every exercise card. Navigation, theme,
language, timer, landing-page, and motivation icons use subtle motion that
reacts to active and hover states while respecting the device's reduced-motion
setting. Generated workouts also offer equipment-aware substitutions restricted
to the same target-muscle group, optional per-exercise load recording, and a
Dashboard strength-progress chart. Users can switch the
interface and AI responses between Indonesian and English; canonical exercise
names always remain in English so plans, logs, guides, and 3D presets continue
to match reliably. A bilingual Mood Booster page adds lighthearted motivation
for lazy, tired, and ready-to-train moments.

## Requirements

- Node.js 20 or newer
- A Supabase project
- An OpenAI API key

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and replace every placeholder.

3. Open the Supabase SQL Editor and run:

   - `supabase/migrations/202607270001_fitmate_schema.sql`
   - `supabase/migrations/202607270002_exercise_3d_guides.sql`
   - `supabase/migrations/202607270003_ai_coach_and_nutrition.sql`
   - `supabase/migrations/202607270004_expanded_exercise_library.sql`
   - `supabase/migrations/202607270005_additional_exercise_variations.sql`
   - `supabase/migrations/202607270006_exercise_load_progress.sql`
   - `supabase/migrations/202607270007_monitoring.sql`
   - `supabase/migrations/202607280008_prelaunch_features.sql`
   - `supabase/seed.sql` (optional, but recommended for exercise guides)

4. Start the application:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes* | Browser-safe legacy anon key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes* | Browser-safe publishable key |
| `NEXT_PUBLIC_APP_URL` | Recommended | Stable public FitMate URL used by email verification and password reset redirects |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only database access for plan generation |
| `OPENAI_API_KEY` | Yes | Server-only OpenAI API access |
| `OPENAI_MODEL` | No | Default model used by workout generation and the AI coach; defaults to `gpt-5.6` |
| `OPENAI_PLAN_MODEL` | No | Optional model override for structured workout-plan generation |
| `OPENAI_FALLBACK_MODEL` | No | Fallback used only when the primary workout model is unavailable; defaults to `gpt-4.1-mini` |
| `OPENAI_COACH_MODEL` | No | Optional model override for text consultations |
| `OPENAI_VISION_MODEL` | No | Optional model override for meal photo analysis |
| `FITMATE_ADMIN_EMAILS` | Yes for monitoring | Comma-separated account emails allowed to open `/admin/monitoring` |
| `NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL` | Yes before public launch | Public support address shown on Privacy Policy and Delete Account pages |
| `FITMATE_AI_INPUT_USD_PER_1M` | No | Current input-token price used for the monitoring cost estimate |
| `FITMATE_AI_OUTPUT_USD_PER_1M` | No | Current output-token price used for the monitoring cost estimate |

\*Configure one of the two public Supabase keys.

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` in client code.
If your account cannot access the default model, set the relevant model
variable to a multimodal Responses API model available in your OpenAI project.

## Password recovery

The Login page includes **Forgot password?**. Supabase sends a recovery email,
the user creates a new password at `/reset-password`, and the app returns to
Login with a success message. Passwords require at least eight characters,
including a letter and a number.

Set `NEXT_PUBLIC_APP_URL` to a stable base URL whenever verification or reset
emails can be opened outside the browser running `npm run dev`. Do not keep an
expired ngrok URL here. Examples:

- local-only testing: `NEXT_PUBLIC_APP_URL=http://localhost:3000`;
- staging: `NEXT_PUBLIC_APP_URL=https://your-staging-domain`;
- production: `NEXT_PUBLIC_APP_URL=https://your-production-domain`.

Add the matching URLs in **Supabase → Authentication → URL Configuration →
Redirect URLs**. At minimum, configure both auth routes for every environment:

- `http://localhost:3000/auth/callback`;
- `http://localhost:3000/reset-password`;
- `https://your-staging-domain/auth/callback`;
- `https://your-staging-domain/reset-password`;
- `https://your-production-domain/auth/callback`;
- `https://your-production-domain/reset-password`.

Also set **Site URL** in Supabase to your stable production FitMate domain. Old
emails keep the URL that was generated when they were sent, so request a new
verification/reset email after changing the URL configuration.

## AI coach and nutrition scan

Authenticated users can open `/coach` to:

- discuss training, recovery, and general nutrition with the AI coach;
- upload a JPEG, PNG, or WebP meal photo (up to 8 MB);
- receive estimated calories, protein, carbohydrate, fat, fiber, portion size,
  assumptions, and practical suggestions.

Each account can make up to ten coach consultations and ten meal scans per
day. The two limits are counted separately, checked on the server, and reset at
00:00 Asia/Jakarta time.

Coach messages and structured nutrition results are stored in the user's own
Supabase rows with Row Level Security. The original meal image is processed for
the response but is not stored by FitMate. Nutrition values from a photo are
estimates, not a diagnosis or a replacement for a registered health
professional.

## Workout rest timer

Completing an exercise automatically opens the rest timer using the rest period
from the active program. Users can pause, resume, reset, add or subtract 15
seconds, or choose a 30/60/90-second preset. A sound and supported-device
vibration indicate that the break is complete. The completion alarm repeats a
clear multi-tone pattern every three seconds until the user dismisses it, with
a 20-second automatic safety cutoff. The on-screen completion notice remains
visible after the sound stops.

## Equipment substitutions and load progress

Every generated exercise remains visible in the weekly plan. If its equipment
is unavailable, select **Equipment unavailable** to see up to four alternatives
from the same target-muscle group. Candidates with different equipment are
prioritized, and the original exercise name remains attached to the workout
log so the generated program is never lost.

During an active workout, the user may enter a load from 0 to 1,000 kg before
marking an exercise complete. This field is optional, including for bodyweight
movements. Completed load records are grouped by the exercise actually
performed and displayed in the Dashboard with exercise selection, latest load,
best load, recent change, and a responsive 12-entry progress chart.

## Languages and motivation

The global language selector saves `ID` or `EN` in the browser and updates the
landing page, authentication, onboarding, dashboard, plan, workout, exercise
guides, rest timer, AI coach, meal scan, and motivation UI. The selected locale
is also sent to the workout-plan and coach APIs. Exercise `name` fields are the
only deliberate exception and always use the exact English library names.

Authenticated app navigation includes `/motivation`, a small Mood Booster with
bilingual humorous encouragement, 36 messages across three moods, sharing, and
direct links back to Workout or Coach. Boost messages do not repeat during the
daily allowance, which is limited to 10 uses per browser and resets on the next
Asia/Jakarta calendar day.

## Validation

Run the complete project check before deployment:

```bash
npm run check
```

The check includes `npm run audit:guides`, a reproducible 1,000-cycle audit of
all 29 canonical exercises in Indonesian and English. It verifies the correct
3D preset, three movement phases, equipment preparation, form focus, canonical
name normalization, and the comparison/start/finish viewer modes.
It also runs `npm run audit:ui` to verify the 10-use Boost limit, the 36-message
non-repeating pool, live icons on every main page, exercise-specific Explore
previews, muscle-matched equipment substitutions, optional load logging, the
Dashboard load chart, the 10 consultation / 10 meal-scan limits, canonical
exercise-name normalization, procedural WebGL 3D guides, password recovery,
monitoring, and staging-test safeguards.

For production, configure the same environment variables in your hosting
provider and run `npm run build`.


## Pre-launch feature set

Migration `202607280008_prelaunch_features.sql` adds the production-preparation
features that are not present in the original schema:

- daily readiness scoring using sleep, energy, soreness, stress, pain, and available time;
- injury history, movement limitations, pain areas, equipment, and medical-clearance flags;
- set-by-set workout logs with warm-up/working/failure/drop/back-off sets, load, reps, RIR, RPE, and technique notes;
- deterministic progressive-overload, deload, maintain, reduce, and technique recommendations;
- 28-day workout calendar, weekly review, muscle-balance summaries, estimated 1RM records, body measurements, and private progress photos;
- editable nutrition journal, AI-scan journal insertion, daily macro targets, and food suggestions based on remaining targets;
- PWA install support, safe offline shell, queued set-log synchronization, and in-app workout reminders;
- user data export, permanent account deletion, Privacy Policy, Terms, and public deletion instructions.

The web/PWA reminder checks the saved schedule while FitMate is open or running as
an installed PWA. Fully native background alarms are added during the Android
packaging phase because browser support varies by device.

Run the complete deterministic pre-launch calibration with:

```bash
npm run calibrate:1m
```

The report is written to `reports/prelaunch-calibration-1000000.json`. The
1,000,000 cases are software assertions, not clinical or motion-capture validation.

## Monitoring

After migration `202607270007_monitoring.sql` is applied, add the administrator
account to `FITMATE_ADMIN_EMAILS` and open `/admin/monitoring`. The page shows
client/server errors, seven-day activity, workouts, active users, AI requests,
tokens, estimated AI cost, consultations, and meal scans. It also links to the
provider dashboards for deeper infrastructure and billing details.

Monitoring intentionally avoids storing prompts and meal images. It records
small operational metadata only, and a monitoring failure never blocks a user
request. The cost is an estimate; configure the two current per-million-token
rates whenever model pricing changes.

## Supabase staging tests

End-to-end tests are guarded so they cannot mutate production accidentally.
Copy `.env.staging.example`, use a separate Supabase staging project and a
dedicated staging account, then run:

```bash
npm run test:e2e
```

The suite covers desktop and mobile login, the Forgot Password entry, Dashboard,
muscle-matched equipment substitution, Start Workout, optional load input, and
server-side 10-consultation / 10-meal limits. Paid Generate Plan testing runs
only when `FITMATE_E2E_RUN_AI=true`. The included GitHub Actions workflow runs
the same quality checks and enables staging E2E only when the repository
variable `FITMATE_E2E_ENABLED` is `true`.

## Exercise 3D guides

FitMate renders all 29 primary exercise guides with a lightweight procedural WebGL character. The athlete uses simple geometric body parts, a FitMate green shirt, shorts, shoes, and synchronized exercise equipment. No FBX, GLB, texture bundle, or remote model URL is required.

Each guide provides an automatic movement loop, start and finish positions, pause/play, front/side/back camera shortcuts, drag-to-rotate 360-degree viewing, and scroll or pinch zoom. Exercise cards use a lightweight 3D-style preview so the catalog remains responsive on mobile.

## Free GPS Jogging

FitMate menyediakan route tracker gratis di `/jogging` dengan GPS live, distance, duration, pace, speed, calorie estimate, elevation gain, kilometer splits, activity history, dan share card track/photo.

Setup database dan map provider tersedia di [`JOGGING_FEATURE_SETUP.md`](./JOGGING_FEATURE_SETUP.md).
