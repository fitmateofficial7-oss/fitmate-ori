
# FitMate Play Store – Tahap 3: Splash Screen & Native Assets

Tahap ini menyiapkan splash screen dan source asset native FitMate.

## Source asset yang sudah dibuat

Folder `assets/` sekarang berisi:

- `icon-only.png` — 1024 × 1024
- `icon-foreground.png` — 1024 × 1024
- `icon-background.png` — 1024 × 1024
- `splash.png` — 2732 × 2732
- `splash-dark.png` — 2732 × 2732

Format ini mengikuti struktur source asset yang digunakan `@capacitor/assets`.

## Cara menerapkan pada project Android lokal yang sudah ada

Dari `E:\fitmate`:

```powershell
npm install
npm run native:assets:android
npm run native:sync
npm run verify:package-name
npm run verify:android-release
```

`native:assets:android` akan membuat / memperbarui resource icon dan splash Android dari folder `assets`.

## Identitas release

- Package name: `com.growsia.fitmate`
- Rilis pertama: `versionCode 1`
- Rilis pertama: `versionName "1.0.0"`

## Target Android

Karena FitMate sedang dipersiapkan untuk Google Play pada Agustus 2026, cek `android/variables.gradle`.
Untuk rilis baru mulai 31 Agustus 2026 Google Play meminta target Android 16 / API 36 atau lebih tinggi.

Jangan menaikkan SDK secara membabi-buta bila Gradle/plugin belum kompatibel. Jalankan build sesudah perubahan dan perbaiki dependency bila Android Studio meminta upgrade.

## Setelah tahap ini

Tahap berikutnya:
1. review permission Android
2. membuat upload keystore
3. signing release
4. build `.aab`
5. internal testing Play Console
