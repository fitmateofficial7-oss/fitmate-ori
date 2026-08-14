@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CAPTURE_BUILD_ERROR.ps1" -ProjectRoot "E:\fitmate" -OutputFolder "E:\FitMateRelease"
echo.
pause
