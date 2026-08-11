# FitMate Play Store Icon Prep

Versi ini sudah menyiapkan icon launcher Android dan icon untuk Google Play Store.

## Yang sudah disiapkan
- Package name: `com.growsia.fitmate`
- Android launcher icons di `android/app/src/main/res/`
- Adaptive icon XML di `android/app/src/main/res/mipmap-anydpi-v26/`
- Foreground adaptive icon di `android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png`
- Background color resource `ic_launcher_background` di `android/app/src/main/res/values/colors.xml`
- Play Store icon 512x512 di `playstore-assets/fitmate-playstore-icon-512.png`

## Cara pakai di project lokal
Kalau project lokal kamu sudah punya folder `android`, cukup salin folder berikut dari zip ini ke root project FitMate kamu dan izinkan overwrite bila diminta:

- `android/`
- `playstore-assets/`

Lalu jalankan:

```bash
npm run native:sync
npm run verify:package-name
```

Setelah itu buka lagi project Android. Icon launcher FitMate sudah siap.

## Struktur yang dibuat
- `mipmap-mdpi/ic_launcher.png`
- `mipmap-hdpi/ic_launcher.png`
- `mipmap-xhdpi/ic_launcher.png`
- `mipmap-xxhdpi/ic_launcher.png`
- `mipmap-xxxhdpi/ic_launcher.png`
- `mipmap-anydpi-v26/ic_launcher.xml`
- `mipmap-anydpi-v26/ic_launcher_round.xml`
- `drawable-nodpi/ic_launcher_foreground.png`
- `values/colors.xml`

## Catatan
Tahap berikutnya setelah icon adalah splash screen, signing config, dan release AAB.
