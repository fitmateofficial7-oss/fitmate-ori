# FitMate AI v14.46 — Ngrok Login & Registration Fix

## Perbaikan

- Domain development dari `FITMATE_APP_URL` dan `NEXT_PUBLIC_APP_URL` sekarang
  otomatis didaftarkan pada `allowedDevOrigins` Next.js.
- JavaScript halaman login dan pendaftaran dapat dimuat serta di-hydrate ketika
  FitMate dibuka melalui domain ngrok.
- Memperbaiki gejala form kembali ke `/login?` atau `/register?` tanpa memanggil
  autentikasi Supabase.
- Tidak ada perubahan pada API key Xendit, webhook token, database, maupun
  harga Premium.

## Setelah menyalin `.env.local`

Pastikan URL ngrok aktif berada di kedua variabel berikut:

```env
FITMATE_APP_URL=https://pummel-chewer-ranting.ngrok-free.dev
NEXT_PUBLIC_APP_URL=https://pummel-chewer-ranting.ngrok-free.dev
```

Restart `npm run dev` setelah mengubah `.env.local` atau domain ngrok.
