# FitMate AI v1.4.51

## Seluruh panduan latihan dipindahkan dari 3D ke 2D

- Seluruh 29 gerakan utama memakai diagram SVG 2D yang deterministik.
- Setiap gerakan mempunyai tampilan **Bandingkan**, **Posisi awal**, dan
  **Posisi akhir**.
- Diagram menampilkan alat yang sesuai, otot utama, arah umum gerakan, tiga
  tahapan, persiapan alat, dan fokus teknik.
- Katalog Exercise dan dialog panduan di halaman Workout menggunakan sistem 2D
  yang sama agar tidak ada perbedaan visual.
- Batas akun tetap sama: Free dapat membuka 10 panduan; Premium membuka seluruh
  29 panduan.

## Mesin 3D dibersihkan

- Viewer WebGL, skeletal rig, model FBX, tekstur, dan dependensi `three`
  dihapus dari paket v1.4.51.
- Penghapusan ini mengurangi ukuran paket, waktu pemuatan, pemakaian memori, dan
  risiko model salah arah atau gagal dirender pada perangkat tertentu.
- Kolom database lama `model_3d_url` dan `model_animation` boleh tetap ada.
  Kolom tersebut tidak lagi dibaca aplikasi dan tidak memerlukan migration baru.

## Validasi

- `npm run audit:guides` menguji seluruh 29 preset, dua bahasa, isi tahapan,
  persiapan alat, normalisasi nama, dan tiga mode tampilan selama 1.000 siklus.
- `npm run calibrate:1m` menjalankan lebih dari satu juta assertion deterministik
  untuk katalog panduan 2D.
- Diagram 2D adalah panduan edukasi, bukan sertifikasi biomekanik atau pengganti
  arahan pelatih maupun tenaga kesehatan.

