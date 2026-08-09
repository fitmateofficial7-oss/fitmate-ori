# FitMate v14.76 – Email Verification & Password Recovery Fix

Perbaikan:
- verifikasi email tidak lagi bergantung langsung pada URL ngrok lama
- register sekarang memakai `emailRedirectTo` yang eksplisit
- ditambahkan `/auth/callback` untuk menangani konfirmasi email
- forgot password memakai URL publik terkonfigurasi
- reset password mendukung PKCE code dan token hash fallback
- reset password memastikan session recovery aktif sebelum mengganti password
- login menampilkan notifikasi setelah email berhasil diverifikasi

Environment baru yang direkomendasikan:

```env
NEXT_PUBLIC_APP_URL=https://DOMAIN-FITMATE
```

Supabase Dashboard wajib mengizinkan:
- `https://DOMAIN-FITMATE/auth/callback`
- `https://DOMAIN-FITMATE/reset-password`

Untuk localhost:
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/reset-password`

Jangan menggunakan ngrok lama/offline sebagai Site URL production.
Email lama tetap membawa link lama, jadi kirim ulang email setelah konfigurasi diubah.
