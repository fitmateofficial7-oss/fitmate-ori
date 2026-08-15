#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if [ ! -f package.json ]; then
  echo "Extract/overlay patch ini ke root project FitMate, lalu jalankan kembali."
  exit 1
fi
node scripts/apply-exercise-preset-compat-fix.cjs
npm run build
