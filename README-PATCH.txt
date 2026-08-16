FITMATE API 36 PLAY STORE PATCH

Patch ini dibuat untuk project fitmate-mobile-native-home-v14.80.
Copy seluruh isi folder fitmate ke root project FitMate dan izinkan replace file.

Yang diperbaiki:
- compileSdk 36
- targetSdk 36
- Android Gradle Plugin 8.10.1
- Gradle wrapper existing 8.11.1 dipertahankan
- verifier API 36
- installer Android SDK Platform 36
- BUILD-APK.bat reusable + API36 check
- BUILD-PLAYSTORE-AAB.bat reusable + API36 check + auto versionCode

Setelah patch:
1. Jalankan INSTALL-ANDROID-API36.bat jika SDK Platform 36 belum ada.
2. Untuk testing: BUILD-APK.bat
3. Untuk Play Store: BUILD-PLAYSTORE-AAB.bat
