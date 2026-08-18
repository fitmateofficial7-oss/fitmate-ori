@echo off
setlocal
cd /d "%~dp0"
echo ======================================================
echo  FITMATE - COMPATIBILITY LAUNCHER API 36
echo ======================================================
echo.
echo File V2 lama sudah digantikan agar tidak memakai installer yang usang.
echo Menjalankan INSTALL-ANDROID-API36.bat terbaru...
echo.
call "%~dp0INSTALL-ANDROID-API36.bat" %*
exit /b %ERRORLEVEL%
