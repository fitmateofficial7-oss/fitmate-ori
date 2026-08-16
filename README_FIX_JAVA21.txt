FITMATE JAVA 21 BUILD FIX V3

Masalah yang diperbaiki:
- BAT sebelumnya sudah menemukan Java 21, tetapi masih bisa jatuh ke blok
  "JDK 21 YANG VALID BELUM DITEMUKAN".
- Detector V3 memverifikasi Java 21 menggunakan javac -version dan
  memprioritaskan %USERPROFILE%\.jdks\jbr-21.0.11 yang sudah terbukti ada.

Cara pakai:
1. Copy BUILD-PLAYSTORE-AAB.bat ke root project FitMate.
2. Pilih Replace/Timpa file lama.
3. BUILD-APK.bat juga boleh ditimpa supaya detector Java konsisten.
4. Jalankan BUILD-PLAYSTORE-AAB.bat lagi.

Expected output:
[2/8] Mencari Java 21 yang valid...
[OK] Java 21 ditemukan dan diverifikasi:
     C:\Users\Attar\.jdks\jbr-21.0.11
javac 21.0.11
openjdk version "21.0.11" ...

Lalu BAT HARUS lanjut ke:
[API36] Memeriksa Android 16 / API 36...

Perbaikan ini tidak mengubah AndroidManifest/location policy fix.
