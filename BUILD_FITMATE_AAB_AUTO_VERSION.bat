@echo off
setlocal
cd /d "%~dp0"

echo =====================================================
echo FitMate - Play Store AAB Builder

echo File lama ini sekarang diarahkan ke builder utama

echo agar pengecekan Java 21, API 36, disclosure lokasi,

echo server production, signing, dan auto-version selalu sama.
echo =====================================================
echo.
call "%~dp0BUILD-PLAYSTORE-AAB.bat"
exit /b %ERRORLEVEL%
