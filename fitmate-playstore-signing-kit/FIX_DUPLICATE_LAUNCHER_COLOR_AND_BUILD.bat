@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX_DUPLICATE_LAUNCHER_COLOR_AND_BUILD.ps1" -ProjectRoot "E:\fitmate" -ReleaseFolder "E:\FitMateRelease"
echo.
pause
