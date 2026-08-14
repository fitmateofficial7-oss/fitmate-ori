@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL_SIGNING.ps1" -ProjectRoot "E:\fitmate" -KeysFolder "E:\FitMateKeys"
echo.
pause
