# FitMate AI v14.45 — Node.js 24 Xendit Verification Fix

## Perbaikan

- Memperbaiki `npm run verify:xendit` pada Node.js 24.
- `@next/env` sekarang dimuat melalui ekspor default CommonJS, sehingga
  `.env.local` tetap terbaca tanpa error `Named export 'loadEnvConfig' not found`.
- Tidak ada perubahan pada API key, webhook, database, harga Premium, atau alur
  pembayaran Xendit.

## Verifikasi

Jalankan dari folder proyek:

```bash
npm run verify:xendit
```

Jika konfigurasi benar, skrip akan menampilkan koneksi Xendit berhasil dan URL
webhook FitMate yang harus didaftarkan.
