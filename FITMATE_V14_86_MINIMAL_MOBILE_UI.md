# FitMate v14.86 — Minimal Mobile UI

Tujuan revisi ini adalah membuat FitMate terasa seperti aplikasi olahraga di HP: aksi utama terlihat cepat, teks sekunder tidak memenuhi layar, dan fitur lanjutan tetap tersedia tanpa membuat halaman sangat panjang.

## Prinsip
- Bottom navigation tidak diubah sama sekali.
- Informasi utama: aksi, status, angka, dan hasil.
- Penjelasan sekunder dipersingkat atau disembunyikan di mobile.
- Fitur lanjutan pada Progress, Settings, dan Premium dibuat expandable di mobile.
- Desktop/tablet tetap menampilkan konten lengkap.
- Dokumen legal dan prominent disclosure lokasi tidak dipangkas karena diperlukan untuk kepatuhan.

## Perubahan utama
- Dashboard: label statistik dan hero lebih singkat.
- Coach: empty state dan kontrol lebih ringkas; fokus ke percakapan.
- Nutrition: header, scan state, hasil, target, dan premium state lebih padat.
- Plan: quota dan pilihan level lebih singkat.
- Workout: teks status dan heading lebih action-first.
- Progress: statistik utama selalu terlihat; analisis mingguan, readiness, rekomendasi, body/photo menjadi tap-to-open di HP.
- Settings: account/logout tetap langsung terlihat; kondisi latihan, pengingat, tentang, dan data/privacy menjadi tap-to-open.
- Premium: checkout tetap prioritas; status dan transaksi menjadi tap-to-open di HP.
- Exercise guide: tutorial UI disembunyikan di HP; kartu otot/tips/kesalahan dapat digeser horizontal.
- Onboarding/Login: deskripsi sekunder dikurangi agar satu keputusan per layar.
- Motivation: helper copy dipangkas.

## Regression checks
- Mobile UI audit: PASS
- UI content audit: PASS
- i18n audit: PASS
- Premium gating: PASS
- Jogging feature audit: PASS
- Rest timer audit: PASS
- AI scope audit: PASS
- SQL compatibility: PASS
- Subscription flow: PASS
- Syntax transpile check untuk semua TSX yang diubah: PASS
- Bottom navigation SHA-256 identik dengan v14.85.

Catatan: full TypeScript/Next build tidak dijalankan karena dependency install di environment QA tidak selesai. Syntax TSX telah diperiksa menggunakan TypeScript transpiler global dan seluruh audit source-level terkait lulus.
