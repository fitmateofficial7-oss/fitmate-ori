@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CLEAN_RESOURCE_BACKUPS_AND_BUILD.ps1" -ProjectRoot "E:\fitmate" -ReleaseFolder "E:\FitMateRelease"
echo.
pause
