# FitMate AI v14.47 — Xendit Subscription Anchor Fix

## Perbaikan

- Checkout Xendit sekarang memiliki `expires_at` eksplisit selama 30 menit.
- `subscription.schedule.anchor_date` dihitung sebagai tanggal penagihan bulan
  berikutnya, bukan lima menit setelah checkout dibuat.
- Tanggal penagihan bulanan dibatasi maksimal tanggal 28 sesuai aturan Xendit.
- Memperbaiki error: `subscription.schedule.anchor_date must be greater than or
  equal to expires_at`.
- Pembayaran pertama tetap diproses langsung melalui `immediate_payment: true`;
  `anchor_date` digunakan untuk siklus bulanan selanjutnya.

Tidak ada perubahan pada harga Premium, webhook token, API key, maupun skema
database.
