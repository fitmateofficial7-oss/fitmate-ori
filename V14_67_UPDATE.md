# FitMate v14.67 – Local Dev Compile Performance Fix

## Penyebab yang ditangani
- file detail panduan 2D terlalu besar ikut masuk ke bundle preview halaman Exercise
- komponen guide berat di-import langsung saat halaman Exercise pertama dibuka
- cache `.next` / `tsconfig.tsbuildinfo` lama berpotensi terbawa setelah mengganti versi folder
- Next.js 16 memakai Turbopack secara default; proyek ini sekarang menyediakan jalur Webpack untuk local dev yang lebih stabil pada konfigurasi ini

## Perbaikan
- memisahkan mapping kategori 2D yang ringan ke `lib/exercise-2d-categories.ts`
- preview 2D tidak lagi meng-import seluruh data penjelasan 29 exercise
- `Exercise3DGuide` dan `Exercise3DPreview` di-load secara dinamis
- script default `npm run dev` memakai `next dev --webpack`
- tambah `npm run dev:clean` untuk membersihkan cache lalu menjalankan local dev
- menghapus `tsconfig.tsbuildinfo` lama dari paket

## Cara menjalankan
```bash
npm install
npm run dev:clean
```

Untuk run berikutnya cukup:
```bash
npm run dev
```
