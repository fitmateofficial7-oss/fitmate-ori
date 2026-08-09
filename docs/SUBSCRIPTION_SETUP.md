# FitMate Premium Subscription Setup

## Package rules

### FitMate Free
- 2 successful workout-plan generations for the lifetime of the account.
- 1 successful AI consultation for the lifetime of the account.
- 1 successful meal scan for the lifetime of the account.

Failed AI calls do not consume quota. Server-side database reservations prevent concurrent requests from bypassing the limits.

### FitMate Premium — Rp49.000
- 10 successful workout-plan generations per Asia/Jakarta week, resetting Monday at 00:00 WIB.
- 10 successful AI consultations per Asia/Jakarta calendar day.
- 10 successful meal scans per Asia/Jakarta calendar day.
- QRIS: one-time payment for exactly 30 days of access, renewed manually.
- Automatic: monthly renewal through a reusable card or BRI Direct Debit until the user stops renewal.

## Architecture

1. The authenticated client chooses QRIS or automatic monthly renewal and requests `POST /api/billing/checkout`.
2. Subscription/Refund terms are required for both modes. Separate recurring-charge consent is required only for the automatic option. QRIS is explicitly one-time.
3. The server acquires a per-user checkout lock and reuses only an unfinished checkout with the same payment mode.
4. The server creates a Xendit hosted `PAY` session restricted to QRIS, or a `SUBSCRIPTION` session for automatic renewal.
5. The browser is redirected to the Xendit payment link.
6. Returning to `/premium?checkout=success` does **not** activate Premium by itself.
7. Xendit sends a webhook to `POST /api/billing/webhook/xendit`.
8. FitMate validates `x-callback-token`, normalizes suffixed references, records the event idempotently, and activates Premium after a verified successful payment/capture/session event.
9. QRIS receives 30 days with `next_billing_at = null`; automatic billing receives the provider's monthly period.
10. The user can stop automatic renewal from `/premium`; paid access remains available through the period end.

## Required environment variables

```env
FITMATE_APP_URL=https://your-fitmate-domain.com
NEXT_PUBLIC_APP_URL=https://your-fitmate-domain.com
XENDIT_SECRET_KEY=xnd_production_...
XENDIT_WEBHOOK_TOKEN=...
```

Never expose either Xendit value using a `NEXT_PUBLIC_` prefix.

## Database deployment

Apply every migration in order, including:

- `202607300009_subscription_and_generation_quota.sql`
- `202607300010_ai_feature_entitlements.sql`
- `202607300011_billing_checkout_lock.sql`
- `202607300012_atomic_ai_completions.sql`
- `202608050013_legal_and_premium_weekly_quota.sql`

The migrations add subscription records, transaction history, webhook idempotency, immutable workout-plan versions, versioned billing consents, lifetime/daily/weekly AI quota counters, and concurrency-safe reservations.

## Xendit dashboard configuration

Use the same webhook verification token as `XENDIT_WEBHOOK_TOKEN` and configure the webhook destination:

```text
https://your-fitmate-domain.com/api/billing/webhook/xendit
```

Enable payment-session and recurring/subscription events needed for:

- checkout/session completion or expiration
- recurring plan activation/inactivation
- successful recurring cycle/payment
- retrying or failed recurring cycle/payment

Also enable **QRIS** in Xendit Payment Channels. The QRIS checkout deliberately sends `allowed_payment_channels: ["QRIS"]`; Xendit will reject it if that channel is unavailable for the account or environment.

Use Xendit test mode first. Do not use production keys in local development or staging.

## Pre-release payment test matrix

1. Free account sees 2 lifetime plan generations, 1 lifetime consultation, and 1 lifetime scan.
2. Failed OpenAI response releases the reserved quota.
3. The third Free plan generation returns `402 PREMIUM_REQUIRED`.
4. The second Free consultation and second Free meal scan each return `402 PREMIUM_REQUIRED`.
5. Both checkout types require Subscription/Refund terms; automatic checkout additionally requires explicit recurring-charge consent.
6. Double-click or concurrent checkout requests create only one active checkout flow.
7. Returning from checkout without a valid webhook does not activate Premium.
8. A valid successful-payment webhook activates Premium once, even when delivered repeatedly.
9. Premium plan generation stops at 10 successful results per Jakarta week; failed attempts do not consume quota.
10. Weekly plan-generation quota resets Monday at 00:00 Asia/Jakarta.
11. Premium usage stops at 10 consultations and 10 scans per Jakarta day.
12. Daily consultation and scan counters reset at 00:00 Asia/Jakarta.
13. QRIS grants exactly 30 days and never creates a next automatic billing date.
14. Both `payment.succeeded` and Xendit `capture.succeeded` can activate a matched successful checkout.
15. Cancel renewal deactivates future automatic billing but preserves access until the period end.
16. Expired/canceled access returns the account to Free without restoring previously consumed lifetime Free quotas.
17. Transaction history appears on `/premium`.
18. Account export produces a valid ZIP containing `fitmate-data.json`, subscription/transaction/consent/quota/plan-version records, and available progress-photo files.
19. A successful refund webhook revokes Premium and stops future recurring billing.
20. Account deletion is blocked if the provider subscription cannot be stopped first.

## Items the owner still must provide

- Xendit test and production secret keys.
- Xendit webhook verification tokens.
- Final production domain.
- Support email shown in legal pages.
- Confirmation that the Xendit account is approved for recurring/subscription payments.
- Legal review of Terms, Privacy Policy, and Refund Policy before public launch.

## Atomic completion guarantee

Migration `202607300012_atomic_ai_completions.sql` makes these operations transactional:

- Save/update a generated workout plan + consume its generation quota + create the immutable plan version.
- Save AI consultation messages + consume consultation quota.
- Save meal-scan messages + nutrition analysis + journal entry + consume scan quota.

Apply migrations in filename order. Do not deploy the updated API routes before migration `012` is active.

## Account deletion

The account-deletion API cancels any active or pending Xendit subscription before deleting the Supabase user. The deletion is blocked when provider cancellation fails, preventing an orphan recurring charge after local billing records are removed.
# Catatan referensi webhook Xendit

Xendit dapat menambahkan akhiran `_UUID` pada `reference_id` pembayaran. Handler FitMate v1.4.50 menormalisasi akhiran tersebut untuk referensi lama, QRIS, dan otomatis agar tetap cocok dengan checkout yang tersimpan di `user_subscriptions`.
