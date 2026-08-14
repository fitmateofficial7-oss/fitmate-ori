# FitMate V6 — Native Mobile Welcome

## Kenapa sebelumnya APK masih terlihat seperti website?
Capacitor memakai `server.url`, sehingga saat APK dibuka WebView langsung membuka
`https://fitmate.growsia.id`. Artinya tampilan pertama APK selalu mengikuti homepage
yang sedang ter-deploy di server, bukan source homepage yang baru ada di komputer.

## Perbaikan V6
- `server.url` dihapus dari `capacitor.config.ts`.
- Android sekarang selalu membuka halaman lokal `native-web/index.html` terlebih dahulu.
- Halaman lokal dibuat seperti reference mobile FitMate:
  - foto fitness gelap,
  - logo FitMate,
  - "Your Fitness / Your Mate",
  - tombol "Mulai Sekarang",
  - link "Sudah punya akun? Masuk".
- `Mulai Sekarang` membuka `/register`.
- `Masuk` membuka `/login`.
- Setelah itu aplikasi tetap menggunakan website/API FitMate production di WebView.
- Homepage website desktop tidak perlu diubah untuk mendapatkan welcome screen Android ini.
- URL remote tetap diambil dari `.env` saat `npm run native:sync`.
- API 36 / Java 21 / background GPS / build BAT V5 tetap dipertahankan.

## Build
Jalankan:
`BUILD-APK.bat`

Untuk Google Play:
`BUILD-PLAYSTORE-AAB.bat`

Setiap build menjalankan `native:sync`, jadi `runtime-config.js` akan diperbarui
mengikuti CAPACITOR_SERVER_URL / FITMATE_APP_URL / NEXT_PUBLIC_APP_URL.
