const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const expected = {
  '@capacitor/android': '7.6.8',
  '@capacitor/core': '7.6.8',
  '@capacitor/cli': '7.6.8',
  '@capacitor/ios': '7.6.8',
  '@capacitor/local-notifications': '7.0.7',
};

let failed = false;
function fail(message) {
  failed = true;
  console.error(`❌ ${message}`);
}
function ok(message) {
  console.log(`✅ ${message}`);
}

const rootPackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

for (const [name, version] of Object.entries(expected)) {
  const declared = rootPackage.dependencies?.[name] ?? rootPackage.devDependencies?.[name];
  if (declared !== version) {
    fail(`${name} di package.json harus exact ${version}, sekarang ${declared ?? 'tidak ada'}`);
  }

  const lockVersion = lock.packages?.[`node_modules/${name}`]?.version;
  if (lockVersion !== version) {
    fail(`${name} di package-lock harus ${version}, sekarang ${lockVersion ?? 'tidak ada'}`);
  }

  const installedPackage = path.join(root, 'node_modules', ...name.split('/'), 'package.json');
  if (!fs.existsSync(installedPackage)) {
    fail(`${name} belum terpasang di node_modules.`);
    continue;
  }
  const installed = JSON.parse(fs.readFileSync(installedPackage, 'utf8')).version;
  if (installed !== version) {
    fail(`${name} terpasang ${installed}, seharusnya ${version}.`);
  } else {
    ok(`${name} ${installed}`);
  }
}

// Capacitor SystemBars built-in Android source is a Capacitor 8+ surface.
// On the pinned Capacitor 7 line this file must not be left behind from an old node_modules tree.
const suspiciousSystemBars = path.join(
  root,
  'node_modules', '@capacitor', 'android', 'capacitor', 'src', 'main', 'java',
  'com', 'getcapacitor', 'plugin', 'SystemBars.java'
);
if (fs.existsSync(suspiciousSystemBars)) {
  fail('Ditemukan SystemBars.java sisa/mismatch di @capacitor/android. node_modules harus dipasang ulang bersih.');
} else {
  ok('Tidak ada SystemBars.java stale dari Capacitor 8+ di node_modules Capacitor 7.');
}

if (failed) {
  console.error('\nCAPACITOR INSTALL BELUM BERSIH.');
  console.error('Jalankan npm ci --legacy-peer-deps untuk membuat ulang node_modules dari package-lock.');
  process.exit(1);
}

console.log('\n✅ Capacitor dependency tree bersih dan konsisten untuk Android release.');
