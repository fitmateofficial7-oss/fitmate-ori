# FitMate v14.75 — Complete English Translation

This release focuses on full Indonesian/English UI consistency. Selecting **EN** now updates the full product interface instead of only the main headings.

## What changed

- Completed English copy across all user-facing pages and shared components.
- Localized dynamic values that were previously stored in Indonesian, including profile goals, experience levels, training days, workout day names/focus, workout history names/statuses, readiness recommendations, progression reasons, jogging session titles, and nutrition meal types.
- Localized dates and time labels according to the active language.
- Localized the jogging map, route export/share card, PWA reminders, rest-timer notifications, and native background jogging notification.
- Coach requests now consistently send the selected language, including meal scans and quota messages.
- AI workout-plan generation now consistently receives the selected language and returns English plan copy when EN is active.
- Xendit checkout now receives the selected language and uses the matching hosted-checkout locale.
- Legal pages now use dedicated English source labels instead of carrying Indonesian labels into EN mode.
- HTML `lang` follows the selected language and the language choice remains stored in `localStorage`.
- Existing user-authored content is not machine-translated; only FitMate-generated/system UI copy is localized.

## Translation coverage audit

A new script is included:

```bash
npm run audit:i18n
```

It verifies:

- every user-facing page is language-aware;
- no direct Indonesian UI literal bypasses the language switch;
- stored/dynamic FitMate values use localization helpers;
- jogging/share/background notifications follow the active language;
- Coach and plan-generation APIs receive the selected language;
- Xendit checkout locale follows the selected language;
- legal pages include dedicated English copy.

The audit is also part of `npm run check` and `npm run release:check`.

## QA performed for this release

- SQL compatibility: PASS
- Subscription flow: PASS
- Premium gates: PASS
- Jogging/background GPS: PASS
- AI scope: PASS
- Persistent rest timer: PASS
- Mobile UI: PASS
- UI content audit: PASS
- Translation coverage audit: PASS
- TypeScript source parser/import audit: 0 broken local imports, 0 syntax errors

A full dependency-based Next.js build still needs to be run in a normal development/CI environment after dependencies are installed.
