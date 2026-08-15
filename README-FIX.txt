FITMATE LATEST - EXERCISE PRESET TYPE COMPATIBILITY FIX

Error yang diperbaiki:
  Exercise2DPreset tidak diekspor dari @/lib/exercise-guides

Fix:
  export type Exercise2DPreset = ExerciseGuidePreset;

Patch ini additive/idempotent: tidak mengganti UI, menu, Jogging, Privacy,
exercise data, atau fitur lain.

Cara paling aman untuk project terbaru Anda:
1. Ekstrak isi ZIP patch ke ROOT project FitMate (folder yang ada package.json).
2. Jalankan APPLY-FIX.bat (Windows) atau APPLY-FIX.sh.
3. Script akan menambahkan alias hanya jika belum ada, lalu menjalankan npm run build.
