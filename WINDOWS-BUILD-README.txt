FITMATE - WINDOWS BUILD BUTTONS
================================

File:
1. BUILD-APK.bat
   Membuat APK debug untuk install/testing di HP.

2. BUILD-PLAYSTORE-AAB.bat
   Membuat AAB release untuk Google Play Console.

APAKAH BAT HARUS DIBUAT ULANG SETIAP ADA PERUBAHAN?
Tidak. BAT ini menjalankan build dari isi project pada saat BAT diklik.
Perubahan source code, konfigurasi yang ada di project, dan native sync akan
mengikuti build berikutnya.

Karena FitMate Android memakai CAPACITOR_SERVER_URL/FITMATE_APP_URL/
NEXT_PUBLIC_APP_URL, perubahan UI/web di domain FitMate yang sama akan terlihat
setelah versi web tersebut dideploy. APK tidak perlu dibuild ulang hanya untuk
perubahan web biasa.

Build Android baru tetap diperlukan bila yang berubah antara lain:
- AndroidManifest / permission Android
- plugin Capacitor/native
- app icon / splash Android
- package/applicationId
- versionCode / versionName
- konfigurasi native
- signing configuration

SEBELUM KLIK BAT
================
Pastikan .env.local atau .env.production berisi URL FitMate HTTPS yang aktif,
contoh:

CAPACITOR_SERVER_URL=https://domain-fitmate-kamu.com
FITMATE_APP_URL=https://domain-fitmate-kamu.com
NEXT_PUBLIC_APP_URL=https://domain-fitmate-kamu.com

Jangan gunakan localhost untuk APK yang dipasang di HP.

PLAY STORE
==========
BUILD-PLAYSTORE-AAB.bat sengaja berhenti jika
android/fitmate-release-signing.properties tidak ditemukan.
Gunakan upload keystore/key FitMate yang sama untuk setiap update Play Store.
Setiap AAB baru yang diupload juga harus mempunyai versionCode lebih tinggi.
