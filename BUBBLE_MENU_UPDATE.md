# FitMate UI Update

Versi: 1.1.0-simple-ui-motion

## Perubahan utama

- Navigasi tetap berupa satu bubble di tengah bawah.
- Jarak horizontal dan vertikal antarbubble diperlebar.
- Label menu memakai ukuran dan tinggi seragam agar rata serta tidak bertabrakan.
- Kontras dark mode diperbaiki untuk teks, kartu, formulir, placeholder, dan menu.
- Halaman Workout disederhanakan dan tombol **Mulai Latihan / Start Workout** selalu tersedia saat sesi dapat dimulai.
- Detail pencatatan set dibuat opsional agar halaman Workout tidak terasa penuh.
- Halaman Nutrition disusun ulang menjadi ringkasan harian yang lebih ringan; form hanya muncul saat dibutuhkan.
- Petunjuk napas pada viewer 3D dihapus.
- Transisi gerakan 3D dibuat lebih halus tanpa jeda pose buatan yang mengganggu.
- Cache service worker dinaikkan ke `fitmate-shell-v16-simple-ui-motion`.

## Menjalankan versi baru

1. Ekstrak ZIP ke folder baru.
2. Jalankan `npm install` lalu `npm run dev`.
3. Tutup tab localhost versi lama dan buka kembali.
4. Jika PWA lama pernah di-install, lakukan satu kali hard refresh atau buka ulang aplikasinya agar service worker terbaru aktif.
