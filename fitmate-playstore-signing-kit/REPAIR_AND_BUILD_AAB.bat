@echo off
setlocal
echo ===============================================
echo FITMATE - REPAIR AND BUILD PLAY STORE AAB
echo ===============================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0REPAIR_ANDROID_GRADLE.ps1" -ProjectRoot "E:\fitmate" -KeysFolder "E:\FitMateKeys"
if errorlevel 1 goto :failed
echo.
echo Gradle config repaired. Starting release build...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD_RELEASE_AAB.ps1" -ProjectRoot "E:\fitmate" -ReleaseFolder "E:\FitMateRelease"
if errorlevel 1 goto :failed
goto :done

:failed
echo.
echo PROSES BERHENTI KARENA ADA ERROR.
echo Jangan buat keystore baru. Kirim output error terakhir.
goto :end

:done
echo.
echo SELESAI.
echo AAB: E:\FitMateRelease\FitMate-1.0.0-release.aab

:end
echo.
pause
