@echo off
setlocal
cd /d "%~dp0"
if not exist package.json (
  echo.
  echo PATCH ZIP harus diekstrak/ditimpa ke ROOT project FitMate terlebih dahulu.
  echo Setelah itu jalankan APPLY-FIX.bat dari root project.
  exit /b 1
)
node scripts\apply-exercise-preset-compat-fix.cjs || exit /b 1
echo.
echo Menjalankan production build...
call npm run build
exit /b %errorlevel%
