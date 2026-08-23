# FitMate v14.87 — Mobile Exercise Guide

Perubahan fokus pada halaman Exercise Guide tanpa mengubah bottom navigation.

## Detail gerakan mobile
- Full-height mobile sheet seperti halaman aplikasi, bukan modal web besar.
- Header ringkas: kembali, Exercise Guide, simpan gerakan.
- Nama latihan + kategori + otot target langsung terlihat.
- Muscle map depan/belakang menjadi visual utama.
- Otot utama dan pendukung diberi highlight hijau serta label Primary/Secondary.
- Langkah gerakan dipadatkan menjadi tiga fase inti.
- Thumbnail posisi awal ditampilkan di samping langkah.
- Equipment dan difficulty menjadi chip kecil.
- Tiga latihan terkait ditampilkan sebagai row compact.
- Fokus teknik dan shortcut Tanya Coach tetap tersedia tanpa paragraf panjang.

## Navigation
`components/floating-bubble-menu.tsx` tidak diubah. Struktur menu bawah dan bubble sound tetap sama.

## Validation
- TypeScript TSX transpile check: PASS untuk file yang diubah/ditambah.
- Mobile UI audit: PASS.
- i18n audit: PASS.
- Premium gating audit: PASS.
- Bottom navigation SHA-256 identik dengan v14.86.

Catatan: full production build tidak dijalankan karena source bundle tidak menyertakan `node_modules`.
