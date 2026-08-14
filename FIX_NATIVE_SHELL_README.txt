FITMATE ANDROID - NATIVE SHELL FIX
==================================

Masalah yang diperbaiki:
APK lama bisa berhasil di-build walaupun CAPACITOR_SERVER_URL kosong. Akibatnya
Android membuka file native-web/index.html dan menampilkan "FitMate AI Native Shell".

Perbaikan di paket ini:
1. capacitor.config.ts sekarang membaca .env Next.js secara otomatis.
2. URL Android otomatis mengambil urutan:
   CAPACITOR_SERVER_URL -> FITMATE_APP_URL -> NEXT_PUBLIC_APP_URL.
3. localhost/127.0.0.1 ditolak untuk build HP agar tidak salah alamat.
4. native:sync sekarang melakukan preflight dan GAGAL jika URL publik belum benar.
   Jadi APK/AAB salah tidak akan terbentuk diam-diam lagi.
5. Privacy Play Store patch terakhir sudah digabungkan ke full project ini.

CARA PAKAI
==========
1. Gunakan folder project ini sebagai pengganti project sebelumnya.
2. Pertahankan .env.local/.env.production milik kamu sendiri. Jangan upload secret ke GitHub.
3. Pastikan salah satu nilai berikut berisi URL HTTPS FitMate yang sudah online:

   CAPACITOR_SERVER_URL=https://DOMAIN-FITMATE
   NEXT_PUBLIC_APP_URL=https://DOMAIN-FITMATE
   FITMATE_APP_URL=https://DOMAIN-FITMATE

   Paling aman: isi ketiganya dengan domain FitMate yang sama.

4. Dari folder project jalankan:

   npm install
   npm run native:verify-url
   npm run native:sync

5. Setelah sukses, build ulang Android dari Android Studio atau Gradle.
6. HAPUS FitMate APK lama dari HP sebelum memasang APK baru supaya tidak bingung
   dengan build lama.

PENTING
=======
- Jangan gunakan localhost:3000 untuk APK di HP.
- Jangan build jika domain FitMate belum online. Project ini memang akan menghentikan
  native:sync daripada menghasilkan Native Shell lagi.
- Package Android tetap com.growsia.fitmate.
