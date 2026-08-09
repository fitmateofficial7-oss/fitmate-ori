# FitMate v14.75.2 Build Fix

Fixes a TypeScript build failure in `components/simple-exercise-3d-canvas.tsx`.

- `handAxis` is explicitly typed as `Vec3`.
- Prevents fallback `[1, 0, 0]` from widening to `number[]`.
- Fixes `Target requires 3 element(s) but source may have fewer` at `drawDumbbell(...)`.
- Existing i18n/mobile/import audits remain passing.
