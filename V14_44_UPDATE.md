# FitMate AI v14.44 — Xendit Webhook Test Fix

Tanggal: 4 Agustus 2026 (Asia/Jakarta)

## Perbaikan

- Endpoint webhook tetap berada di `/api/billing/webhook/xendit`.
- Payload contoh dari tombol **Tes dan simpan** Xendit kini mendapat HTTP 200 setelah token diverifikasi dan event disimpan.
- Payload contoh yang tidak cocok dengan langganan lokal tidak pernah mengaktifkan Premium.
- Webhook transaksi nyata yang cocok tetap diproses seperti sebelumnya.
- Event tanpa pasangan tetap tercatat dengan `processed = false` dan `processing_error` agar dapat direkonsiliasi.

## Penggunaan lokal

Simpan credential pengujian di `.env.local`, jalankan ulang `npm run dev`, lalu arahkan ngrok ke port 3000. Jangan menaruh secret pada `.env.staging.example`.
