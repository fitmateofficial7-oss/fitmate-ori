# FitMate v14.88 — TikTok App Events SDK

Android TikTok App Events SDK integration is prepared with SDK version `1.5.0`.

## Fill these Android values

Copy/use `android/tiktok.properties` and fill:

```properties
TIKTOK_APP_ID=
TIKTOK_TT_APP_ID=
TIKTOK_ACCESS_TOKEN=
```

The same names can also be supplied as Gradle `-P` properties or CI environment variables.

## App Secret

`TIKTOK_APP_SECRET` is **not used by the Android APK** and must never be placed in `strings.xml`, `BuildConfig`, Java/Kotlin source, Next.js client code, or any `NEXT_PUBLIC_*` variable.

No App Secret placeholder/value is added to the Android or web-client project in this version. If a future server-side TikTok API integration needs it, keep the real value only in server/Jenkins/hosting secret storage.

## Android requirements added

- JitPack repository
- `jcenter()` as requested by the TikTok integration guide
- `apply plugin: 'idea'`
- Java 8 source/target compatibility
- `com.github.tiktok:tiktok-business-android-sdk:1.5.0`
- Android Lifecycle Process 2.3.1
- Lifecycle Common Java 8 2.3.1
- Google Install Referrer 2.2
- Required ProGuard keep rules
- Native Capacitor `TikTokBusiness` bridge
- Native SDK initialization + explicit `LAUNCH_APP` tracking (SDK auto-launch logging is disabled to prevent duplicates)
- TikTok automatic install attribution remains available through the SDK
- Advanced Matching identify/logout support

## FitMate event mapping

Automatically wired where FitMate has a matching user action:

- App process launch → `LAUNCH_APP`
- Successful login → `LOGIN` + `identify`
- Successful registration → `REGISTRATION` + `identify`
- Remembered signed-in user on app open → `identify`
- Profile/settings update → TikTok `logout` then `identify`
- FitMate logout → TikTok `logout`
- Onboarding completion → `COMPLETE_TUTORIAL`
- Exercise search → `SEARCH`
- Open exercise detail → `VIEW_CONTENT`
- Save/bookmark exercise → `ADD_TO_WISHLIST`
- Premium checkout starts → `CHECKOUT`
- Provider-confirmed Premium payment → `PURCHASE`
- Provider-confirmed Premium activation → `SUBSCRIBE`

All commerce events use `IDR` and FitMate Premium uses the current app price (`Rp49.000`). A successful transaction ID is used as the TikTok purchase event ID when available for deduplication.

Other SDK standard events supplied by TikTok (`SPEND_CREDITS`, `CREATE_GROUP`, `CREATE_ROLE`, loan events, in-app ad events, etc.) remain exposed through `trackTikTokEvent(...)` but are intentionally **not fired automatically** because FitMate has no corresponding user action. Sending unrelated conversion events would contaminate TikTok Ads optimization data.

## Important before Play Store release

TikTok App Events SDK can transmit app/device/event information for attribution. Re-check FitMate's Play Console Data Safety answers and privacy disclosures before releasing a build with the SDK enabled.

## Build note

If `TIKTOK_APP_ID`, `TIKTOK_TT_APP_ID`, or `TIKTOK_ACCESS_TOKEN` is blank, FitMate still launches normally and TikTok tracking safely becomes unavailable until configuration is filled.

## Verification in this package

- TikTok integration source audit: **26/26 PASS**
- Changed TypeScript/TSX files: syntax parse **PASS**
- Native Java bridge: source/API stub compile **PASS**
- Existing mobile UI, i18n, premium gating, subscription, jogging, rest timer, location disclosure, and SQL audits used for regression checking remain unaffected where applicable.
- A full Gradle dependency compile could not be completed in the packaging environment because the Gradle distribution/dependencies require external network access. Run the normal Android build once the TikTok values are filled.
