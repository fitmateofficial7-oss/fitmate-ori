# FitMate Auth Email Redirect Fix

## Masalah yang diperbaiki

Link verifikasi email dan link lupa kata sandi sebelumnya bisa mengarah ke URL
ngrok lama/offline. Akibatnya user melihat `ERR_NGROK_3200`, dan recovery
password juga gagal karena halaman reset tidak selalu mendapatkan session yang
valid.

## Perubahan kode

- Register sekarang mengirim `emailRedirectTo` secara eksplisit ke:
  `/auth/callback?next=/onboarding`.
- Forgot Password sekarang menggunakan helper URL yang sama dan diarahkan ke:
  `/reset-password`.
- Ditambahkan `lib/auth-redirect.ts` supaya URL auth memakai
  `NEXT_PUBLIC_APP_URL` jika tersedia, bukan bergantung pada ngrok lama.
- Ditambahkan `/auth/callback` untuk menangani session/email confirmation.
- Reset password diperkuat agar menerima:
  - PKCE `?code=...`;
  - implicit/hash `#access_token=...&refresh_token=...`;
  - event `PASSWORD_RECOVERY` dari Supabase.
- Sebelum `updateUser({ password })`, halaman reset memastikan recovery session
  benar-benar aktif.

## WAJIB disetel di Supabase Dashboard

Buka **Authentication → URL Configuration**.

### Site URL
Gunakan domain FitMate yang stabil. Jangan gunakan alamat ngrok lama yang sudah
mati.

Contoh production:

`https://fitmate-domain-kamu.com`

### Redirect URLs
Tambahkan minimal:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/reset-password`
- `https://DOMAIN-FITMATE/auth/callback`
- `https://DOMAIN-FITMATE/reset-password`

Jika sementara masih memakai ngrok, tambahkan URL ngrok yang sedang aktif juga.
Namun link akan mati lagi ketika tunnel ngrok itu berhenti, jadi domain tetap
lebih aman untuk production.

## Environment

Tambahkan di `.env.local` / environment deployment:

```env
NEXT_PUBLIC_APP_URL=https://DOMAIN-FITMATE
```

Untuk testing lokal di komputer yang sama:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Penting

Email verifikasi/reset yang sudah dikirim sebelum perubahan tetap membawa URL
lama. Setelah konfigurasi diperbaiki, kirim email verifikasi/reset baru untuk
pengujian.
