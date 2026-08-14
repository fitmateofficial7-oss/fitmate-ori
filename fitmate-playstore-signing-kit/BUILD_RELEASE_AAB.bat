@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD_RELEASE_AAB.ps1" -ProjectRoot "E:\fitmate" -ReleaseFolder "E:\FitMateRelease"
echo.
pause
