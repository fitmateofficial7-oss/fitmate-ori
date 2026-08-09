# FitMate v14.75 Build Fix

Fixed a TypeScript production build failure in `app/exercises/page.tsx` where `LiveIcon` was rendered without the required `children` prop.

The 2D exercise-guide card now renders a lightweight navigation arrow inside `LiveIcon`.

Verification completed:
- Project import/static syntax audit: PASS
- i18n audit: PASS
- mobile UI audit: PASS
- empty `LiveIcon` usage scan: 0 remaining

No database migration or environment-variable change is required for this fix.
