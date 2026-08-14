const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.cwd();
const failures = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    failures.push(`Missing file: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function expect(rel, pattern, label) {
  const text = read(rel);
  if (!pattern.test(text)) failures.push(`${label} (${rel})`);
}

expect('app/layout.tsx', /fitmate-minimal-ui/, 'Minimal UI body class is missing');
expect('app/layout.tsx', /<MobileSwipeBack\s*\/>/, 'Swipe-back fallback is not mounted');
expect('app/globals.css', /FitMate minimal interface — 2026-08/, 'Minimal UI stylesheet is missing');
expect('app/globals.css', /\.fitmate-advanced-panel\[open\]/, 'Advanced-panel progressive disclosure styles are missing');

expect('android/app/src/main/java/com/growsia/fitmate/MainActivity.java', /registerPlugin\(MediaSaverPlugin\.class\)/, 'Native gallery plugin is not registered');
expect('android/app/src/main/java/com/growsia/fitmate/MainActivity.java', /OnBackPressedCallback/, 'Android back dispatcher override is missing');
expect('android/app/src/main/java/com/growsia/fitmate/MainActivity.java', /webView\.canGoBack\(\)/, 'Android back does not check WebView history');
expect('android/app/src/main/java/com/growsia/fitmate/MainActivity.java', /window\.history\.back\(\)/, 'Android back does not navigate Next.js SPA history');
expect('android/app/src/main/java/com/growsia/fitmate/MainActivity.java', /webView\.goBack\(\)/, 'Android back does not keep the WebView history fallback');

expect('scripts/configure-native-background-gps.cjs', /native-templates\/android\/com\/growsia\/fitmate/, 'Native configure script does not restore FitMate templates');
expect('native-templates/android/com/growsia/fitmate/MainActivity.java', /OnBackPressedCallback/, 'MainActivity regeneration template is missing back handling');
expect('native-templates/android/com/growsia/fitmate/MediaSaverPlugin.java', /MediaStore\.Images\.Media/, 'MediaSaver regeneration template is missing');

expect('android/app/src/main/java/com/growsia/fitmate/MediaSaverPlugin.java', /@CapacitorPlugin\(name = "MediaSaver"\)/, 'MediaSaver Capacitor plugin annotation is missing');
expect('android/app/src/main/java/com/growsia/fitmate/MediaSaverPlugin.java', /MediaStore\.Images\.Media/, 'Image MediaStore output is missing');
expect('android/app/src/main/java/com/growsia/fitmate/MediaSaverPlugin.java', /MediaStore\.Video\.Media/, 'Video MediaStore output is missing');
expect('android/app/src/main/java/com/growsia/fitmate/MediaSaverPlugin.java', /Environment\.DIRECTORY_PICTURES/, 'Pictures gallery destination is missing');
expect('android/app/src/main/java/com/growsia/fitmate/MediaSaverPlugin.java', /"\/FitMate"/, 'FitMate gallery album path is missing');

expect('lib/native-media-saver.ts', /registerPlugin<MediaSaverPlugin>\("MediaSaver"\)/, 'Web MediaSaver bridge is missing');
expect('app/jogging/page.tsx', /saveMediaToNativeGallery\(/, 'Jogging export is not using native gallery save');
expect('app/jogging/page.tsx', /Tersimpan ke Galeri/, 'Jogging gallery success message is missing');
expect('app/jogging/page.tsx', /<details className="fitmate-advanced-panel/, 'Jogging advanced share controls are not collapsed');
expect('app/jogging/page.tsx', /Simpan kartu/, 'Jogging save-card action is missing');

// Protect the navigation the user explicitly asked us not to change.
const menuPath = path.join(root, 'components/floating-bubble-menu.tsx');
if (fs.existsSync(menuPath)) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(menuPath)).digest('hex');
  const expected = '0c0f0e35057db63143b7dddd75d2ffd1442f858a9b9522fbc79da55893c2abb8';
  if (hash !== expected) failures.push(`Floating bubble menu changed unexpectedly (${hash})`);
}

if (failures.length) {
  console.error('FitMate simple-mobile audit FAILED');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('FitMate simple-mobile audit PASS');
console.log('- Minimal UI shell present');
console.log('- Existing floating bubble menu unchanged');
console.log('- Android edge/back gesture navigates WebView history first');
console.log('- Jogging Save uses Android MediaStore gallery bridge');
console.log('- Advanced Jogging share controls are progressive-disclosure');
