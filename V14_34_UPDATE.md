# FitMate v14.34 – Free GPS Jogging & Share Cards

## Fitur baru

- Halaman `/jogging` dapat digunakan akun Free maupun Premium.
- Live GPS route dengan titik mulai, titik akhir, dan garis perjalanan.
- Statistik real-time:
  - jarak,
  - durasi,
  - average pace,
  - current pace,
  - average speed,
  - calorie estimate,
  - elevation gain,
  - split per kilometer.
- Kontrol mulai, jeda, lanjutkan, selesai, dan pemulihan draft bila browser tertutup.
- Penyimpanan lokal sebagai fallback serta sinkronisasi Supabase setelah migrasi dijalankan.
- Riwayat aktivitas jogging.
- Share card PNG dengan dua mode:
  - Track,
  - foto upload pengguna + overlay route dan statistik.
- Web Share API dan fallback download PNG.
- Menu bubble, dashboard, dan PWA shortcut menuju Jogging.
- Data jogging ikut account export.
- Privacy Policy diperbarui untuk data lokasi jogging.

## Database

Tambahkan migration:

```text
supabase/migrations/202607310011_jogging_tracker.sql
```

## Security

- `Permissions-Policy` mengizinkan geolocation hanya untuk same-origin.
- RLS membatasi sesi jogging berdasarkan `auth.uid() = user_id`.
- Foto share tetap diproses lokal dan tidak disimpan di server.

## Validation

- Jogging feature audit: PASS
- Jogging calculation audit: PASS
- SQL compatibility audit: PASS
- Import/syntax audit: PASS
- UI audit: PASS
- Exercise motion audit: PASS
- Focused TypeScript check untuk file jogging: PASS
