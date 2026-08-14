FITMATE WINDOWS BUILD - JAVA 21 AUTO DETECT V2

Perbaikan V2
============
BAT V1 dapat menghasilkan:
'C:\Program' is not recognized as an internal or external command

Penyebab:
Pengecekan versi Java menjalankan executable ber-path spasi di dalam FOR /F.

V2:
- Menjalankan java.exe langsung dan menyimpan output ke temporary file.
- FOR /F hanya membaca temporary file, jadi C:\Program Files\... aman.
- Mengabaikan JAVA_HOME yang sudah tidak valid.
- Mencari Java 21 dari PATH, Android Studio, Adoptium, Microsoft JDK,
  Oracle/OpenJDK, Corretto, Zulu, user .jdks, dan Gradle JDK.
- BUILD-APK.bat dan BUILD-PLAYSTORE-AAB.bat tetap reusable.
- CHECK-JAVA-21.bat disediakan untuk mengecek Java saja.

Pemakaian:
1. Double click CHECK-JAVA-21.bat (opsional).
2. Double click BUILD-APK.bat untuk APK testing.
3. Double click BUILD-PLAYSTORE-AAB.bat untuk AAB Google Play.

Jika JDK 21 berada di lokasi custom, dari CMD:
  set "FITMATE_JAVA_HOME=C:\lokasi\jdk-21"
  BUILD-APK.bat
