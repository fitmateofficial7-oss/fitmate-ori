> **Historical note:** Stage 2 described the Capacitor 7 blocker. Stage 3 has now migrated the source to Capacitor 8 and `@capgo/background-geolocation`. See `PLAYSTORE_CAPACITOR8_STAGE_3.md`.

# FitMate — Play Store Stage 2
## Android Project + Versioning Preparation

### Identitas release pertama

```text
Package name : com.growsia.fitmate
versionCode  : 1
versionName  : 1.0.0
```

`versionCode` harus selalu naik untuk setiap upload Android berikutnya.
Contoh:
- 1.0.0 → versionCode 1
- 1.0.1 → versionCode 2
- 1.1.0 → versionCode 3

`versionName` adalah versi yang dilihat pengguna.

## Script yang sudah disiapkan

```bash
npm run verify:package-name
npm run playstore:android:configure
npm run playstore:android:verify
npm run playstore:capacitor8:check
npm run playstore:preflight
```

### Ketika folder Android belum ada

Di komputer development:

```bash
npm install
npm run native:add:android
npm run playstore:android:verify
npm run native:open:android
```

Perintah `native:add:android` sudah diubah supaya otomatis memasang:
- namespace `com.growsia.fitmate`
- applicationId `com.growsia.fitmate`
- versionCode `1`
- versionName `1.0.0`

## Target SDK Google Play 2026

FitMate saat ini masih menggunakan Capacitor 7.x.

Capacitor 7 secara resmi mendukung target SDK 35.
Capacitor 8 secara resmi mendukung target SDK 36.

Google Play menetapkan bahwa mulai **31 Agustus 2026**, aplikasi baru dan update untuk mobile harus menargetkan Android 16 / API 36 atau lebih tinggi.

Karena itu **jangan menganggap Android release final sebelum migrasi Capacitor 8 selesai**.

## Kenapa Capacitor 8 belum dipaksakan di versi ini?

FitMate memakai:

```text
@capacitor-community/background-geolocation 1.2.26
```

Dokumentasi repository plugin tersebut saat ini mencantumkan dukungan Capacitor sampai v7, dan ada issue terbuka tentang kebutuhan update untuk Capacitor v8.

Memaksa upgrade sekarang berisiko merusak background GPS/jogging.

## Tahap berikutnya

Stage 3 harus:
1. memilih solusi background geolocation yang kompatibel dengan Capacitor 8,
2. migrasikan Capacitor core/android/ios/CLI dan plugin resmi ke v8,
3. buat Android project dengan compileSdk 36 / targetSdk 36,
4. audit permission Android 16,
5. tes background GPS,
6. baru lanjut icon, splash, signing, dan AAB.

## Stage 3 completed in source

See `PLAYSTORE_CAPACITOR8_STAGE_3.md`. The project is now configured for Capacitor 8 + target SDK 36 using `@capgo/background-geolocation`.
