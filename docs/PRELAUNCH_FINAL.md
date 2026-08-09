# FitMate AI v14 — Pre-launch Final

## What is included

### Adaptive training

- Daily readiness score from sleep, energy, soreness, stress, pain, and available time.
- Readiness-based volume and intensity modifiers.
- Injury history, movement limits, pain areas, available equipment, and medical-clearance flag.
- Set-by-set logging for load, repetitions, RIR, RPE, notes, and set type.
- Deterministic increase, maintain, reduce, deload, and technique recommendations.
- Recent adherence, readiness, and adaptive recommendations are supplied to future plan generation.

### Progress

- 28-day workout calendar.
- Seven-day training summary and previous-week volume comparison.
- Muscle-balance view.
- Estimated 1RM personal records.
- Body measurements.
- Private progress photos using a user-owned Supabase Storage path and signed URLs.

### Nutrition

- Editable daily nutrition journal.
- AI meal scans are automatically copied into the journal.
- Daily calorie, protein, carbohydrate, fat, and fiber targets.
- Practical food suggestions derived from the remaining daily targets.
- AI results remain editable because photo-based estimates can be inaccurate.

### PWA, offline, and reminders

- Installable manifest, icons, service worker, and offline screen.
- Static assets are cached, but authenticated HTML is deliberately not persisted in the service-worker cache.
- Set logs are queued locally while offline and synchronized when the connection returns.
- Workout reminders are checked while FitMate is open or running as an installed PWA.
- Fully native background alarms belong to the later Android package because browser background support varies.

### Account and release readiness

- Data export as JSON.
- Permanent account and progress-photo deletion.
- Privacy Policy, Terms, and public Delete Account instructions.
- Monitoring remains server-only through the Supabase service-role client.
- Configure `NEXT_PUBLIC_FITMATE_SUPPORT_EMAIL` before public launch.

## Required Supabase migration

Run migrations in filename order and then run:

```text
supabase/migrations/202607280008_prelaunch_features.sql
```

This migration creates the new tables, RLS policies, indexes, triggers, and the private `progress-photos` bucket.

## Release checks

```bash
npm ci
npm run release:check
```

`release:check` runs lint, TypeScript, import audits, the 1,000-cycle procedural 3D guide audit, UI checks, the 1,000,000+ deterministic guide calibration, and the Next.js production build.

## Validation boundary

The automated calibration verifies software behavior, ranges, consistency, route wiring, privacy controls, and procedural pose changes. It does not replace:

- human biomechanics review;
- biomechanics or trainer validation;
- testing on real Android devices;
- accessibility testing with assistive technology;
- production load, penetration, and recovery testing;
- medical review of exercise or nutrition advice.
