# FitMate Android API 36 V5 — No Loop

V5 memperbaiki loop pada installer V4.

Penyebab V4:
- label Java di INSTALL-ANDROID-API36.bat tercampur dengan blok BUILD-APK;
- saat installer mencari Java, ia menjalankan verifikasi API 36 dan memanggil dirinya sendiri.

V5:
- INSTALL-ANDROID-API36.bat ditulis ulang secara mandiri;
- tidak ada `npm run verify:api36:sdk` di dalam installer;
- tidak ada recursive call ke INSTALL-ANDROID-API36.bat;
- Java 21 auto-detect;
- Android SDK auto-detect;
- sdkmanager auto-detect;
- Command-line Tools auto-download dari Google bila belum ada;
- Android 16 / API 36 + Build-Tools 36.0.0 dipasang otomatis.

Command-line Tools:
https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip

Build config tetap:
- compileSdkVersion 36
- targetSdkVersion 36
- minSdkVersion 23
- AGP 8.10.1
- Gradle 8.11.1

Cara pakai:
- Jalankan BUILD-APK.bat untuk testing.
- Jalankan BUILD-PLAYSTORE-AAB.bat untuk Google Play.
