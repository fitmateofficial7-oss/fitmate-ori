# FitMate v14.72 — Admin Users + Natural UI

Versi ini dibangun di atas FitMate v14.71 tanpa mengubah alur utama workout, billing Xendit, jogging, quota, dan panduan exercise 2D yang sudah ada.

## 1. Admin Users

Halaman baru: `/admin/users`

Admin yang email-nya terdaftar pada `FITMATE_ADMIN_EMAILS` sekarang dapat:

- mencari user berdasarkan nama atau email;
- melihat status Free, Premium manual, atau Premium Xendit;
- memberikan Premium manual selama 7 hari, 30 hari, 3 bulan, 6 bulan, 1 tahun, atau durasi custom 1–730 hari;
- memperpanjang Premium manual;
- mencabut Premium manual;
- melihat tanggal daftar, login terakhir, dan masa aktif Premium;
- membuka halaman Monitoring dari navigasi admin.

Premium manual disimpan pada tabel `user_subscriptions` yang sudah ada dengan `amount = 0` dan metadata sumber `admin_manual`. Tidak dibuat transaksi pembayaran palsu, sehingga akses manual tidak ikut dihitung sebagai pembayaran Xendit.

Langganan Xendit yang sedang aktif sengaja tidak dapat dicabut dari tombol Premium manual. Pembatalan langganan berbayar tetap mengikuti flow billing yang sudah ada.

## 2. Login admin

Setelah login normal, FitMate memeriksa sesi ke endpoint server-side `/api/admin/session`.

- Admin -> `/admin/users`
- User biasa -> `/dashboard`

Email admin tetap dikonfigurasi hanya melalui server environment:

```env
FITMATE_ADMIN_EMAILS=admin@domain.com
```

Untuk beberapa admin, pisahkan dengan koma:

```env
FITMATE_ADMIN_EMAILS=admin1@domain.com,admin2@domain.com
```

Setelah mengubah environment lokal, restart `npm run dev`. Setelah mengubah environment produksi, lakukan redeploy.

Tidak diperlukan migration SQL baru untuk fitur Admin Users selama migration Premium yang sudah dipakai v14.71 sudah aktif.

## 3. Natural UI pass

UI utama dirapikan agar terasa seperti aplikasi fitness komersial, bukan template generatif:

- emoji dan simbol dekoratif pada halaman utama dihapus;
- icon utama memakai satu sistem line icon FitMate;
- tulisan promosi yang terlalu berlebihan dipendekkan;
- penyebutan `FitMate AI` pada branding umum diubah menjadi `FitMate`;
- istilah AI hanya dipertahankan pada konteks legal/transparansi pemrosesan atau internal API yang memang perlu;
- hierarki heading, radius card, shadow, dan uppercase dibuat lebih tenang dan konsisten;
- halaman Motivation diubah menjadi catatan latihan yang praktis dan natural, 12 pesan per kondisi;
- copy Dashboard, Plan, Coach, Premium, Exercise, Nutrition, Progress, Jogging, Login, Register, Onboarding, Settings, dan Reset Password dirapikan;
- panduan exercise 2D memakai wording yang lebih sederhana dan tetap mempertahankan step, target otot, tips, serta kesalahan umum.

## 4. QA yang dijalankan

PASS:

- `audit-sql-compatibility.cjs`
- `audit-subscription-flow.cjs`
- `audit-premium-gates.cjs`
- `audit-jogging-feature.cjs`
- `audit-ui-content.cjs`
- `audit-project.cjs --cycles 100`
- parser TypeScript/TSX: 90 file, 0 syntax error
- pemindaian simbol/emoji dekoratif pada `app` dan `components`: 0 match

Full `npm ci` / `next build` tidak dapat dijalankan di sandbox ini karena registry dependency yang tersedia tidak menyediakan dependency transitive yang dibutuhkan (`zod-validation-error@4.0.2`, dan registry juga tidak menyediakan package Capacitor background-geolocation). Jalankan `npm install`/`npm ci`, `npm run typecheck`, dan `npm run build` pada environment development/CI yang biasa dipakai project sebelum deploy.

## 5. Acceptance test singkat

1. Pastikan `FITMATE_ADMIN_EMAILS` berisi email admin baru.
2. Restart dev server atau redeploy produksi.
3. Login dengan email admin; harus masuk ke `/admin/users`.
4. Cari satu akun Free, pilih durasi, lalu klik `Jadikan Premium`.
5. Login/refresh sebagai user tersebut; badge dan akses Premium harus aktif.
6. Perpanjang Premium manual dan pastikan tanggal akses berubah.
7. Cabut Premium manual dan pastikan user kembali Free.
8. Pastikan akun Premium Xendit tidak menampilkan tombol `Cabut Premium` manual.
