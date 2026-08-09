# FitMate AI v1.4.49 — QRIS + Automatic + Webhook Fix

Versi ini dibuat dari basis **v1.4.48 Xendit Webhook Reference Fix** yang dikirim pengguna. Perbaikan pencocokan referensi webhook tetap dipertahankan dan diperluas untuk dua metode pembayaran.

## Hasil akhir

- **QRIS**: Rp49.000 sekali bayar, Premium aktif tepat 30 hari, perpanjangan manual.
- **Otomatis**: Rp49.000 per bulan melalui metode berulang yang didukung Xendit, seperti kartu atau BRI Direct Debit.
- QRIS menggunakan Payment Session `PAY` dan hanya mengizinkan channel `QRIS`.
- Otomatis tetap menggunakan Payment Session `SUBSCRIPTION` dan membutuhkan persetujuan tagihan berulang.
- Webhook mengenali referensi lama dan baru, termasuk:
  - `fitmate-premium-UUID`
  - `fitmate-premium-qris-UUID`
  - `fitmate-premium-recurring-UUID`
  - seluruh bentuk di atas ketika Xendit menambahkan akhiran `_UUID`.
- Event `capture.succeeded`, `payment.succeeded`, recurring cycle sukses, dan Payment Session QRIS yang terverifikasi dapat mengaktifkan Premium.
- Event `capture.failed` ditangani tanpa mengubah akses QRIS yang sudah aktif menjadi kedaluwarsa.
- QRIS tidak memiliki `next_billing_at` dan notifikasi duplikat tidak menambah 30 hari berulang kali.

## Langkah manual

1. Salin `.env.local` lama ke folder versi ini.
2. Tidak perlu menjalankan SQL Supabase baru.
3. Pastikan QRIS aktif di Xendit Test Mode.
4. Pertahankan webhook yang sudah ada pada `/api/billing/webhook/xendit`.
5. Jalankan `npm install`, `npm run verify:xendit`, lalu `npm run dev`.
6. Lakukan pembayaran uji baru. Jika transaksi lama masih pending, kirim ulang webhook sukses aslinya dari Xendit setelah versi ini berjalan.
