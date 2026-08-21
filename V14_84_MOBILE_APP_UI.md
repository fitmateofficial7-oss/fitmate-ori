# FitMate v14.84 — Mobile App UI Pass

Fokus versi ini adalah membuat halaman inti terasa seperti aplikasi HP untuk olahraga: cepat dipahami, aksi utama terlihat lebih dulu, dan scroll vertikal dikurangi tanpa mengubah bottom menu yang sudah dipakai.

## Coach
- Coach menjadi halaman chat penuh, bukan card kecil di tengah halaman.
- Area pesan memakai sisa tinggi layar sampai tepat di atas bottom dock.
- Composer/pesan selalu berada di bawah area chat.
- Bubble user/Coach dibedakan seperti aplikasi messenger.
- Empty state dibuat ringan dengan quick-question horizontal.
- Tombol Nutrisi di header Coach dihapus supaya Coach fokus konsultasi chat.
- Fitur scan makanan tetap berada di Nutrition.

## Mobile density seluruh aplikasi
- Dashboard: hanya overview, quick stats, status workout, dan shortcut penting. Detail analytics tetap di Progress.
- Plan: hero/profile yang duplikatif disembunyikan di HP; level latihan dibuat 3 pilihan ringkas; weekly plan bisa digeser horizontal.
- Workout: hero/status dan kartu sesi dipadatkan.
- Exercise Guide: search/filter compact dan library 2 kolom; detail panjang baru terlihat setelah gerakan dibuka.
- Progress: grup analytics menggunakan swipe horizontal untuk mengurangi tumpukan vertikal.
- Nutrition: scan makanan tetap menjadi aksi utama dan tracking sekunder lebih compact.
- Jogging: mobile langsung fokus ke area route/start, bukan hero promosi.
- Settings: kartu dan field dipadatkan; teks penjelasan sekunder dikurangi pada layar HP.
- Premium: checkout/action diprioritaskan, copy panjang diperkecil pada mobile.
- Motivation: hero besar dihilangkan pada mobile; mood dibuat 3 tombol ringkas.

## Bottom menu
`components/floating-bubble-menu.tsx` tidak diubah pada v14.84. Struktur, posisi, center bubble, dan bubble sound dari v14.83 tetap dipertahankan.

## Validation
- `node scripts/audit-mobile-app-v1484.cjs` — PASS (20 checks)
- `node scripts/audit-mobile-ui.cjs` — PASS
- `node scripts/audit-ui-content.cjs` — PASS
- `node scripts/audit-i18n.cjs` — PASS
- `node --no-warnings --experimental-strip-types scripts/audit-ai-scope.mjs` — PASS
- `node scripts/audit-premium-gates.cjs` — PASS

Full Next.js build tidak dijalankan karena source ZIP tidak menyertakan `node_modules`. Syntax parse Coach diperiksa dengan TypeScript compiler tanpa dependency resolution dan tidak ditemukan parse error.
