@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0REPAIR_ANDROID_GRADLE.ps1" -ProjectRoot "E:\fitmate" -KeysFolder "E:\FitMateKeys"
echo.
pause
