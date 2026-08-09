# Hydration and inline-script fix

Fixed two runtime issues reported on Next.js 16.2.12 / React 19:

1. Replaced the native inline `<script dangerouslySetInnerHTML>` in `app/layout.tsx` with `next/script`, an explicit `id`, and `strategy="beforeInteractive"`.
2. Made route-dependent fixed navigation mount only after client hydration, so the server-rendered tree matches the browser's first React render.
3. Applied the same hydration guard to the public theme and language controls.
4. Added a null-safe pathname value for redirect/proxy and router-readiness cases.
5. Kept the compact bubble menu, dark mode, language selection, mobile safe-area support, and all routes.

Validation completed:
- Responsive UI audit: PASS
- Source syntax and local import audit, 100 cycles: PASS
- UI content audit: PASS
- SQL compatibility audit: PASS
- Motion audit, 100 cycles: PASS

A full Next.js build was not executed because package installation was unavailable in this environment. The project contains no `node_modules`; run `npm install` and `npm run build` locally.
