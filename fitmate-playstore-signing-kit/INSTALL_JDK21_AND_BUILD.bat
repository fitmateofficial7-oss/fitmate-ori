@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL_JDK21_AND_BUILD.ps1" -ProjectRoot "E:\fitmate" -ReleaseFolder "E:\FitMateRelease"
echo.
pause
