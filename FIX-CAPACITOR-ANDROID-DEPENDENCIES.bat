@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title FitMate - Repair Capacitor Android Dependencies
cls
echo ======================================================
echo       FITMATE - REPAIR CAPACITOR DEPENDENCIES
echo ======================================================
echo.
where node >nul 2>&1
if errorlevel 1 goto :fail
where npm >nul 2>&1
if errorlevel 1 goto :fail
if not exist "package-lock.json" goto :fail

echo [1/3] Mengecek kondisi sekarang...
node scripts\verify-capacitor-install.cjs
if not errorlevel 1 (
  echo.
  echo [OK] Dependency sudah bersih. Tidak perlu diperbaiki.
  pause
  exit /b 0
)

echo.
echo [2/3] Menghapus node_modules lama melalui npm ci dan memasang ulang dari lockfile...
call npm ci --legacy-peer-deps
if errorlevel 1 goto :fail

echo.
echo [3/3] Verifikasi akhir...
node scripts\verify-capacitor-install.cjs
if errorlevel 1 goto :fail

echo.
echo ======================================================
echo                    REPAIR BERHASIL
echo ======================================================
echo.
echo Sekarang jalankan BUILD-PLAYSTORE-AAB.bat
pause
exit /b 0

:fail
echo.
echo ======================================================
echo                     REPAIR GAGAL
echo ======================================================
echo.
echo Lihat error di atas. Jangan lanjut build sebelum dependency bersih.
pause
exit /b 1
