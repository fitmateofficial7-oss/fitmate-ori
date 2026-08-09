# FitMate AI v14.11 — Premium Subscription Implementation Report

**Implementation date:** 30 July 2026  
**Timezone:** Asia/Jakarta  
**Payment provider foundation:** Xendit recurring subscription  
**Monthly price:** Rp49.000

## 1. Final package rules

### FitMate Free

- A maximum of **2 successful workout-plan generations for the lifetime of the account**.
- A maximum of **1 successful AI consultation for the lifetime of the account**.
- A maximum of **1 successful meal scan for the lifetime of the account**.
- Failed AI calls release their reservation and do not consume successful-use quota.
- Previously consumed Free lifetime quota is not restored after Premium expires or is canceled.

### FitMate Premium

- **Rp49.000 per month**, recurring until renewal is stopped.
- Up to **10 successful AI consultations per Asia/Jakarta calendar day**.
- Up to **10 successful meal scans per Asia/Jakarta calendar day**.
- Workout-plan regeneration while the paid subscription remains active.
- When renewal is canceled, access remains available only until the recorded paid-period end.

The requested injury/medical-clearance onboarding changes were intentionally **not implemented in this release**.

## 2. Subscription workflow delivered

1. The user opens `/premium` and sees Free/Premium entitlements and the recurring price.
2. The user must explicitly accept recurring billing terms.
3. The authenticated server acquires a per-user checkout lock.
4. A recent unfinished checkout is reused rather than duplicated.
5. The server creates a Xendit hosted subscription session with a server-only key.
6. Returning from Xendit does not activate Premium by itself.
7. Premium is activated only after a verified successful-payment webhook.
8. Webhook deliveries are written to an idempotency ledger before processing.
9. Duplicate webhooks return success without applying the event twice.
10. Late or out-of-order session events do not downgrade an active/canceled paid period.
11. Failed/retrying payments are recorded for monitoring and transaction history.
12. Refund success records the refund, revokes access, and deactivates recurring billing.
13. Users can stop renewal from `/premium`.
14. Account deletion first stops any provider-side recurring payment; deletion is blocked if that step fails.

## 3. Database changes

Apply these migrations **in filename order before deploying the updated application**:

1. `202607300009_subscription_and_generation_quota.sql`
2. `202607300010_ai_feature_entitlements.sql`
3. `202607300011_billing_checkout_lock.sql`
4. `202607300012_atomic_ai_completions.sql`

They add:

- Subscription state and transaction history.
- Durable webhook event/idempotency records.
- Lifetime Free generation quota and reservations.
- Lifetime Free consultation/meal-scan quota.
- Jakarta-day Premium consultation/meal-scan counters.
- Per-user checkout locking.
- Immutable workout-plan version history.
- User consent records.
- Atomic AI completion functions.
- Row-level security and service-role-only mutation functions.

## 4. Atomic quota and data guarantees

The database now completes each successful AI operation as one transaction:

- Workout plan: save/update active plan, create immutable plan version, and consume generation quota.
- Consultation: save user/assistant messages and consume consultation quota.
- Meal scan: save messages, nutrition analysis, journal entry, and consume scan quota.

A failed transaction cannot leave a result saved without consuming quota, or consume successful-use quota without saving its result. Short-lived reservations prevent concurrent requests from bypassing limits.

## 5. Product and UI changes

- New Premium page with Rp49.000/month pricing.
- Mandatory recurring-payment consent before checkout.
- Current subscription status, next billing/access-end date, cancellation, and transaction history.
- Free/Premium quota displays on Coach and Plan pages.
- Upgrade calls to action after Free lifetime quota is exhausted.
- Premium management card in Settings.
- Registration consent for Terms, Privacy Policy, and AI processing.
- Subscription/refund terms added to legal pages.
- Account export upgraded to a ZIP containing `fitmate-data.json` and available progress-photo files.
- Monitoring dashboard now includes Premium users, canceling users, 30-day revenue, estimated MRR, successful payments, and failed/retrying payments.
- Visible application label updated to FitMate AI v14.11.

## 6. Security and reliability changes

- Xendit credentials remain server-only.
- Webhook verification uses `x-callback-token` and constant-time comparison.
- Webhook processing is idempotent.
- Checkout uses an idempotency reference and a database mutex.
- Orphan provider checkout cleanup is attempted if local persistence fails.
- Premium access is fail-closed and requires a valid future paid-period end.
- Nutrition values are bounded before database insertion.
- Production security headers added: CSP, HSTS, clickjacking protection, MIME sniffing protection, Referrer Policy, and Permissions Policy.
- API routes use no-store/noindex response policies through Next.js headers.

## 7. Verification completed in this environment

Passed:

- Subscription-flow audit: **21/21 checks**.
- SQL compatibility audit for migrations 009–012.
- UI-content/entitlement consistency audit.
- Project import/static syntax audit: **71 source files, 7,100 repeated checks, 0 broken local imports, 0 syntax failures**.
- Exercise-motion audit: **100 cycles passed**.
- TypeScript parser syntax check across project source files: **0 parse errors**.
- Custom ZIP writer integrity test: `unzip -t` passed with no archive errors.
- Stale entitlement-text scan found no old Free daily limits.

## 8. Verification that remains mandatory before production

A complete dependency install could not be completed in this isolated environment because the available package registry did not provide `zod-validation-error@4.0.2`, while direct public-registry network resolution was unavailable. Consequently, this report does **not** claim that full lint, TypeScript semantic checking, production build, or browser E2E tests have run successfully here.

Run the following in a network-enabled staging/CI environment:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Then execute the Xendit test-mode payment matrix in `docs/SUBSCRIPTION_SETUP.md` before using production credentials.

## 9. Required owner inputs before live payments

- Production and staging Supabase URL, anon/publishable key, and service-role key.
- OpenAI key and final model configuration.
- Xendit test and production secret keys.
- Xendit webhook verification token for each environment.
- Confirmation that the Xendit account is enabled/approved for recurring subscriptions.
- Final public HTTPS domain for `FITMATE_APP_URL` and `NEXT_PUBLIC_APP_URL`.
- Production support email.
- Xendit dashboard webhook configuration for session, recurring plan/cycle, payment, and refund events.
- Legal review of Terms, Privacy Policy, and Refund Policy for the intended countries and age groups.

## 10. Deployment order

1. Back up the production database.
2. Deploy/apply migrations 009–012 in order.
3. Configure server-only secrets and public domain variables.
4. Configure Xendit test-mode webhooks.
5. Deploy to staging.
6. Run lint, typecheck, build, E2E, and payment test matrix.
7. Verify Free lifetime quotas and Premium Jakarta-day reset behavior.
8. Verify cancel, retry/failure, refund, and account-deletion behavior.
9. Switch to production Xendit credentials only after all staging checks pass.
10. Monitor payment failures, webhook processing errors, MRR, and AI cost after release.
