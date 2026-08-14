@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CHECK_JAVA_FOR_BUILD.ps1"
echo.
pause
