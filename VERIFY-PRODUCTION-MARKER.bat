@echo off
setlocal
echo.
echo FitMate production marker check
echo ===============================
echo.
curl.exe --fail --location --silent --show-error --ipv4 ^
  https://fitmate.growsia.id/fitmate-release.json
if errorlevel 1 (
  echo.
  echo [ERROR] Marker belum dapat dibuka atau masih 404.
  pause
  exit /b 1
)
echo.
echo.
echo [OK] Marker production dapat dibuka.
pause
