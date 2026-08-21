# FitMate v14.83 — Compact Mobile + Nutrition Scan

## Mobile UI
- Bottom navigation and center bubble geometry are unchanged.
- Global phone spacing is tighter, including vertical section padding and large card padding.
- Mobile footer is hidden to avoid unnecessary page length.
- Dashboard mobile is now an overview: detailed charts/history are moved out of the Home flow and remain available from Progress.
- Dashboard shortcuts are a compact 2x2 grid for Plan, Nutrition, Progress, and Settings.
- Coach behaves like a native chat screen; only the conversation pane scrolls.

## Coach
- Coach is consultation/chat only.
- Meal photo upload and nutrition-analysis UI were removed from Coach.
- Existing chat quota behavior remains: Free 1 lifetime consultation, Premium 10/day.

## Nutrition
- Meal photo scanning now lives directly in Nutrition.
- Camera and gallery entry points are available on mobile.
- Scan result stays on the Nutrition page and shows:
  - health star rating
  - health score
  - calories
  - protein
  - carbohydrates
  - fat
  - fiber
  - short AI summary/suggestion
- Free users can still use their meal-scan allowance from Nutrition.
- Advanced journal/target tracking remains Premium and is shown compactly/collapsible.
- Today journal initially shows only three entries and can expand.

## Validation
- TSX parser: PASS for Coach, Nutrition, Dashboard.
- audit-mobile-ui: PASS.
- audit-i18n: PASS.
- audit-ui-content: PASS.
- audit-premium-gates updated for the new Coach/Nutrition separation: PASS.
- audit-ai-scope: PASS.

Full Next.js build was not run because the uploaded project intentionally does not include node_modules.
