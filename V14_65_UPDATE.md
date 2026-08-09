# FitMate v14.65 – Precision Upgrade for 2D Exercise Guides

Fokus versi ini:
- membuat panduan 2D lebih presisi lagi per exercise
- meningkatkan detail penjelasan langkah untuk semua 29 exercise
- menambahkan cue teknik spesifik di setiap langkah
- mempertahankan satu karakter 2D yang sama agar konsisten di seluruh library exercise

Perubahan utama:
1. `lib/exercise-2d-guides.ts`
   - dirombak menjadi data-driven
   - semua kategori exercise sekarang punya 3 langkah yang lebih spesifik:
     - posisi awal
     - fase gerakan utama
     - posisi akhir / reset
   - setiap langkah juga punya `coachingCues` tersendiri

2. `components/exercise-3d-guide.tsx`
   - kartu step sekarang menampilkan:
     - caption yang lebih presisi
     - daftar "Kunci teknik"
     - catatan teknik umum
   - ditambahkan legend visual untuk:
     - highlight otot hijau
     - panah arah gerakan
     - urutan langkah 1–3

Hasil UX:
- penjelasan gerakan lebih jelas dan tidak terlalu generik
- tiap latihan sekarang terasa lebih spesifik daripada versi sebelumnya
- user lebih mudah mengikuti bentuk latihan dari awal sampai selesai
