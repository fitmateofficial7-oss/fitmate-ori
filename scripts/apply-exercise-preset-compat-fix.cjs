const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'lib', 'exercise-guides.ts');
if (!fs.existsSync(target)) {
  console.error('ERROR: lib/exercise-guides.ts tidak ditemukan. Jalankan dari root project FitMate.');
  process.exit(1);
}
let source = fs.readFileSync(target, 'utf8');
if (!source.includes('export type ExerciseGuidePreset')) {
  console.error('ERROR: ExerciseGuidePreset tidak ditemukan. Project ini bukan struktur FitMate yang diharapkan.');
  process.exit(1);
}
if (!source.includes('export type Exercise2DPreset = ExerciseGuidePreset;')) {
  const marker = 'export type ExerciseGuide = {';
  if (!source.includes(marker)) {
    console.error('ERROR: marker ExerciseGuide tidak ditemukan; patch dihentikan agar tidak merusak source.');
    process.exit(1);
  }
  source = source.replace(
    marker,
    '// Backward-compatible alias for newer/legacy 2D exercise components.\n' +
      '// Keep ExerciseGuidePreset as the canonical preset type.\n' +
      'export type Exercise2DPreset = ExerciseGuidePreset;\n\n' + marker
  );
  fs.writeFileSync(target, source, 'utf8');
  console.log('OK: Exercise2DPreset compatibility alias ditambahkan.');
} else {
  console.log('OK: compatibility alias sudah ada; tidak ada perubahan tambahan.');
}

const thumbnail = path.join(root, 'components', 'exercise-pose-thumbnail.tsx');
if (fs.existsSync(thumbnail)) {
  const text = fs.readFileSync(thumbnail, 'utf8');
  if (text.includes('Exercise2DPreset')) {
    console.log('OK: exercise-pose-thumbnail.tsx tetap kompatibel dengan alias baru.');
  }
}
