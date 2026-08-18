const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'lib', 'exercise-guides.ts');
const canonical = 'export type ExerciseGuidePreset';
const alias = 'export type Exercise2DPreset = ExerciseGuidePreset;';
const marker = 'export type ExerciseGuide = {';

if (!fs.existsSync(target)) {
  console.error('❌ FitMate build compatibility check gagal: lib/exercise-guides.ts tidak ditemukan.');
  process.exit(1);
}

let source = fs.readFileSync(target, 'utf8');
if (!source.includes(canonical)) {
  console.error('❌ ExerciseGuidePreset tidak ditemukan. Build dihentikan agar source tidak dipatch secara salah.');
  process.exit(1);
}

if (!source.includes(alias)) {
  if (!source.includes(marker)) {
    console.error('❌ Marker ExerciseGuide tidak ditemukan. Build dihentikan agar source tidak rusak.');
    process.exit(1);
  }
  source = source.replace(
    marker,
    '// Backward-compatible alias for legacy/current 2D exercise components.\n' +
      '// Keep ExerciseGuidePreset as the canonical preset type.\n' +
      alias + '\n\n' + marker
  );
  fs.writeFileSync(target, source, 'utf8');
  console.log('✅ Exercise2DPreset compatibility alias otomatis ditambahkan.');
} else {
  console.log('✅ Exercise preset compatibility siap.');
}
