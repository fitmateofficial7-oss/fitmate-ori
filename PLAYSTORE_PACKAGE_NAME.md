# FitMate — Play Store Package Name

## Package name final

```
com.growsia.fitmate
```

Nilai ini dipakai sebagai identitas unik aplikasi FitMate untuk Android / Google Play.

## Konfigurasi yang sudah disiapkan

`capacitor.config.ts`

```ts
appId: "com.growsia.fitmate",
appName: "FitMate AI",
```

Package name sengaja menggunakan format:

- `com` — reverse-domain convention
- `growsia` — identitas publisher / perusahaan
- `fitmate` — nama produk

## Validasi

Jalankan:

```bash
npm run verify:package-name
```

Script akan memastikan `appId`, dan setelah folder Android dibuat juga memeriksa `applicationId` serta `namespace`.

## Membuat project Android

Setelah dependency sudah terpasang:

```bash
npm install
npm run verify:package-name
npm run native:add:android
npm run native:sync
npm run verify:package-name
```

Setelah project Android dibuat, package Android harus tetap:

```
com.growsia.fitmate
```

## Penting

Setelah FitMate pertama kali dipublikasikan di Google Play menggunakan package name ini, jangan menggantinya. Package name adalah identitas permanen aplikasi di Play Store.

## Tahap Play Store berikutnya

Tahap setelah package name:
1. Android project final
2. versionCode / versionName
3. app icon + adaptive icon
4. splash screen
5. permission review
6. signing keystore
7. release AAB
8. Play Console listing
9. privacy policy / Data safety
10. internal testing sebelum production


## Stage 2

Lihat `PLAYSTORE_ANDROID_STAGE_2.md` untuk versionCode/versionName dan persiapan Android project.
