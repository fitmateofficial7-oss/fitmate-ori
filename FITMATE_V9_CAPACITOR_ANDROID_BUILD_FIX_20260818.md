# FitMate V9 — Capacitor Android clean dependency fix

Build error yang ditangani:

- `@capacitor/android/.../SystemBars.java: method does not override...`
- `cannot find symbol super.onPageCommitVisible(WebView,String)`

## Root cause yang ditangani

Project FitMate memakai jalur Capacitor 7, tetapi folder `node_modules` lokal dapat tertinggal/mencampur source Capacitor lain setelah source project ditimpa tanpa menghapus `node_modules`. Builder lama hanya mengecek keberadaan `node_modules/.bin/cap.cmd`, sehingga tree yang stale tetap dipakai Gradle.

## Perbaikan V9

- Pin Capacitor release line ke versi exact yang sudah ada di lockfile:
  - `@capacitor/android 7.6.8`
  - `@capacitor/core 7.6.8`
  - `@capacitor/cli 7.6.8`
  - `@capacitor/ios 7.6.8`
  - `@capacitor/local-notifications 7.0.7`
- Tambah `scripts/verify-capacitor-install.cjs`.
- Builder otomatis mendeteksi versi/mismatch/stale `SystemBars.java`.
- Jika tidak bersih, builder otomatis menjalankan `npm ci --legacy-peer-deps`, bukan melanjutkan memakai node_modules lama.
- Setelah `native:sync`, dependency diverifikasi sekali lagi sebelum Gradle release build.
- Menyediakan `FIX-CAPACITOR-ANDROID-DEPENDENCIES.bat` untuk repair manual satu klik.

Tidak ada perubahan database, entitlement, Xendit, jogging, disclosure, package name, atau signing key.
