# FitMate v14.63 – Full 2D Exercise View Guide Rebuild

Fokus versi ini:
- menghapus pendekatan panduan exercise 3D pada halaman View Guide
- mengganti seluruh panduan menjadi 2D step-by-step dengan satu karakter FitMate yang sama
- semua exercise guide sekarang ditampilkan berurutan dari awal, gerakan inti, sampai selesai
- preview exercise card juga ikut berubah menjadi preview 2D

Yang diubah:
- tambah `lib/exercise-2d-guides.ts` untuk normalisasi langkah 2D per exercise
- tambah `components/exercise-2d-scene.tsx` untuk render karakter 2D dan alat secara ringan di browser
- rewrite `components/exercise-3d-guide.tsx` menjadi panduan 2D berurutan 3 langkah
- rewrite `components/exercise-3d-preview.tsx` menjadi preview 2D
- update copy pada halaman exercise, premium, landing, manifest, dan register agar konsisten memakai istilah 2D

Hasil UX:
- saat buka View Guide, user melihat 3 kartu langkah:
  1. posisi awal
  2. gerakan utama
  3. posisi akhir / selesai
- seluruh 29 exercise memakai karakter 2D yang sama
- lebih ringan daripada canvas 3D dan lebih konsisten untuk mobile
