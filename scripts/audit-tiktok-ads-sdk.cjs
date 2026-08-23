const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const topGradle = read('android/build.gradle');
const appGradle = read('android/app/build.gradle');
const proguard = read('android/app/proguard-rules.pro');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const manager = read('android/app/src/main/java/com/growsia/fitmate/TikTokBusinessManager.java');
const plugin = read('android/app/src/main/java/com/growsia/fitmate/TikTokBusinessPlugin.java');
const helper = read('lib/tiktok-business.ts');

check('JitPack repository', topGradle.includes("maven { url 'https://jitpack.io' }"));
check('idea plugin', topGradle.includes("apply plugin: 'idea'"));
check('jcenter repository', topGradle.includes('jcenter()'));
check('Java 8 source compatibility', appGradle.includes('sourceCompatibility JavaVersion.VERSION_1_8'));
check('Java 8 target compatibility', appGradle.includes('targetCompatibility JavaVersion.VERSION_1_8'));
check('TikTok SDK 1.5.0 dependency', appGradle.includes("com.github.tiktok:tiktok-business-android-sdk:1.5.0"));
check('Lifecycle process dependency', appGradle.includes('androidx.lifecycle:lifecycle-process:2.3.1'));
check('Lifecycle java8 dependency', appGradle.includes('androidx.lifecycle:lifecycle-common-java8:2.3.1'));
check('Install referrer dependency', appGradle.includes('com.android.installreferrer:installreferrer:2.2'));
check('TikTok ProGuard rule', proguard.includes('-keep class com.tiktok.** { *; }'));
check('Billing ProGuard rule', proguard.includes('-keep class com.android.billingclient.api.** { *; }'));
check('Lifecycle ProGuard rule', proguard.includes('-keep class androidx.lifecycle.** { *; }'));
check('Application bootstrap', manifest.includes('android:name=".FitMateApplication"'));
check('No App Secret packaged in Android BuildConfig', !appGradle.includes('buildConfigField \"String\", \"TIKTOK_APP_SECRET\"') && !manager.includes('BuildConfig.TIKTOK_APP_SECRET') && !plugin.includes('BuildConfig.TIKTOK_APP_SECRET'));
check('identify bridge', plugin.includes('TikTokBusinessSdk.identify'));
check('logout bridge', plugin.includes('TikTokBusinessSdk.logout'));
check('standard event bridge', plugin.includes('trackTTEvent(parsed'));
check('commerce event bridge', plugin.includes('trackCommerceEvent'));
check('IDR commerce default', plugin.includes('call.getString("currency", "IDR")'));
check('LaunchAPP wiring', manager.includes('EventName.LAUNCH_APP'));
check('Login event exposed', helper.includes('LOGIN: "LOGIN"'));
check('Registration event exposed', helper.includes('REGISTRATION: "REGISTRATION"'));
check('Search event exposed', helper.includes('SEARCH: "SEARCH"'));
check('Subscribe event exposed', helper.includes('SUBSCRIBE: "SUBSCRIBE"'));
check('All user supplied standard events available', [
  'SEARCH','SPEND_CREDITS','SUBSCRIBE','REGISTRATION','LAUNCH_APP','CREATE_GROUP',
  'COMPLETE_TUTORIAL','UNLOCK_ACHIEVEMENT','CREATE_ROLE','LOAN_APPROVAL','LOGIN',
  'IN_APP_AD_CLICK','START_TRIAL','LOAN_DISBURSAL','ADD_PAYMENT_INFO','JOIN_GROUP',
  'RATE','GENERATE_LEAD','ACHIEVE_LEVEL','LOAN_APPLICATION','IN_APP_AD_IMPR'
].every((event) => helper.includes(`${event}: "${event}"`)));
check('All commerce events available', ['CHECKOUT','PURCHASE','ADD_TO_WISHLIST','ADD_TO_CART','VIEW_CONTENT']
  .every((event) => helper.includes(`| "${event}"`) || helper.includes(`eventName: "${event}"`)));

let failed = 0;
for (const item of checks) {
  console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}`);
  if (!item.pass) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
process.exit(failed ? 1 : 0);
