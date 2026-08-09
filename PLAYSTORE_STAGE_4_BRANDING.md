# FitMate — Play Store Stage 4
## App Icon, Adaptive Icon, Splash Screen & Android App Name

### Identity

```text
Android package : com.growsia.fitmate
Android app name: FitMate AI
versionCode     : 1
versionName     : 1.0.0
```

## Branding sources prepared

Branding source assets:

```text
assets/
├── icon-only.png          1024×1024
├── icon-foreground.png    1024×1024
├── icon-background.png    1024×1024
├── icon-monochrome.png    1024×1024
├── splash.png             2732×2732
└── splash-dark.png        2732×2732
```

Also prepared:
- PWA icons
- maskable PWA icons
- Apple touch icon
- favicon
- white notification icon source
- Google Play 512×512 listing icon
- light/dark splash previews

## Why the icon is split into layers

Android adaptive icons use separate foreground and background layers so launchers can apply different masks and visual effects without clipping the important FitMate mark.

The FitMate logo is kept inside a conservative central safe area.

## Android 12+ splash

Android 12 and later uses the system SplashScreen design: a centered app icon over a single-color background. Because of that, the native Android launch experience is intentionally simple instead of using a busy full-screen graphic.

The large `splash.png` and `splash-dark.png` sources are still kept for Capacitor generation and older/native platforms.

## Generate after Android project exists

```powershell
npm install
npm run native:add:android
```

`native:add:android` now automatically:
1. creates the Capacitor Android project,
2. applies package/version configuration,
3. generates icon/splash resources,
4. applies FitMate app label and themed-icon support,
5. verifies branding.

If Android already exists:

```powershell
npm run playstore:branding
npm run native:sync
npm run playstore:branding:verify
```

Open Android Studio:

```powershell
npm run native:open:android
```

## App name

The installed Android launcher label is intentionally:

```text
FitMate AI
```

The Google Play store listing title can be finalized later without changing the Android package name.

## Files used for Play Console later

```text
playstore/branding/playstore-icon-512.png
```

Feature Graphic, phone screenshots, store description, privacy/Data Safety and release AAB are separate later stages.


## v14.81 install fix

`@capacitor/assets` has been removed from this project.

Reason: the current `@capacitor/assets` package pulls `sharp@0.32.6`, which can fail during installation on newer Node.js environments. FitMate now ships prebuilt Android launcher/splash resources under:

```text
playstore/android-res-template/
```

After `npx cap add android`, the project copies those resources directly with:

```bash
npm run playstore:branding
```

This means `npm install` no longer needs `@capacitor/assets` or its `sharp` dependency.

### Clean reinstall on Windows

After replacing the project files:

```powershell
cd C:\Users\Attar\fitmate-ai
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm cache verify
npm install
```

Node 22 LTS is still the safest recommendation for Capacitor 8, although Capacitor 8 accepts Node 22 or newer.
