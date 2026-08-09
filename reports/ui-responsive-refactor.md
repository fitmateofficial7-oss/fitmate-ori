# FitMate UI Responsive Refactor

## Tujuan

Menyederhanakan tampilan seluruh aplikasi tanpa menghapus fitur, menyatukan pola visual antarpages, dan memastikan penggunaan tetap nyaman pada smartphone dengan lebar layar mulai 320 px.

## Perubahan utama

- Navigasi bawah smartphone dipadatkan menjadi lima akses: Beranda, Rencana, Latihan, Coach, dan Lainnya.
- Fitur Gerakan, Progres, Nutrisi, Pengaturan, dan Motivasi tetap tersedia melalui menu Lainnya.
- Navigasi desktop tetap menampilkan seluruh fitur dan mempertahankan kontrol tema serta bahasa.
- Ditambahkan `RouteShell` untuk memberi aturan tampilan yang konsisten pada seluruh halaman aplikasi.
- Warna latar, kartu, border, bayangan, radius, form, ukuran teks, dan jarak disederhanakan secara global.
- Hero gradient yang ramai pada halaman aplikasi dibuat lebih tenang tanpa menghilangkan hierarki informasi.
- Header Progress, Nutrition, dan Settings disamakan dengan pola halaman lain.
- Form menggunakan ukuran teks aman untuk smartphone sehingga tidak memicu zoom otomatis pada iOS.
- Tabel dapat digeser horizontal pada layar kecil.
- Modal/menu menghormati dynamic viewport height dan safe-area perangkat.
- Dekorasi blur yang tidak penting disembunyikan pada aplikasi agar antarmuka lebih ringan.
- Dukungan dark mode, dua bahasa, reduced motion, dan seluruh fitur lama tetap dipertahankan.

## File utama yang berubah

- `app/layout.tsx`
- `app/globals.css`
- `components/app-dock.tsx`
- `components/theme-toggle.tsx`
- `components/language-toggle.tsx`
- `components/route-shell.tsx`
- `scripts/audit-responsive-ui.cjs`
- `package.json`

## Pemeriksaan yang lulus

- Responsive UI audit: PASS
- SQL compatibility audit: PASS
- Import/syntax audit, 100 siklus: PASS
- Exercise motion audit, 100 siklus: PASS
- Existing UI content audit: PASS
- CSS parser validation: PASS, tanpa syntax error

## Catatan build lokal

Pemeriksaan instalasi dependency dan build penuh tidak dapat diselesaikan di lingkungan pengerjaan karena registry npm internal berulang kali mengembalikan HTTP 503 saat mengunduh `zod`/`zod-validation-error`. Kegagalan ini berasal dari layanan registry, bukan dari hasil audit source code. Jalankan `npm install` lalu `npm run check` ketika registry tersedia.
