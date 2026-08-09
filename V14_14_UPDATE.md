# FitMate AI v14.14

## Fixes

- Restored the missing `getAuthenticatedUser` helper in `/api/coach`, supporting both Bearer tokens and Supabase session cookies.
- Billing status now falls back safely to a Free account when Premium database tables have not been installed yet, instead of returning HTTP 500 to the Plan page.
- Coach usage status also remains readable while a local/fresh Supabase database is awaiting the Premium migrations.
- Added `supabase/FITMATE_PREMIUM_SETUP.sql`, a single SQL file containing all Premium, generation quota, AI usage, checkout-lock, and atomic-completion migrations.
- Added a PostgREST schema-cache reload at the end of the setup SQL.

## Required database step

Run `supabase/FITMATE_PREMIUM_SETUP.sql` once in Supabase Dashboard → SQL Editor. The code fallback prevents the page crash, but database-backed limits, Premium checkout, and usage persistence require these tables and functions.
