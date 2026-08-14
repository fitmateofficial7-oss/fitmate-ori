FITMATE PLAY STORE SIGNING KIT v13 - JAVA 21 FIX
=================================================

Error yang diperbaiki:
:capacitor-android:compileReleaseJavaWithJavac
error: invalid source release: 21

Artinya task compile Android meminta Java source release 21, sedangkan
build sebelumnya menggunakan JDK 17.

CARA PALING MUDAH
-----------------
Double-click:
INSTALL_JDK21_AND_BUILD.bat

Jika JDK 21 belum ada, script mencoba menginstall Eclipse Temurin JDK 21
melalui winget lalu menjalankan build.

Jika JDK 21 sudah ada, instalasi dilewati.

v13:
- memprioritaskan JDK 21
- tidak memakai Java 25
- tetap memakai Gradle 8.11.1
- tidak mengubah keystore/signing
- langsung membuat signed AAB

Hasil jika sukses:
E:\FitMateRelease\FitMate-1.0.0-release.aab

Jangan jalankan INSTALL_SIGNING lagi.
Jangan membuat keystore baru.
