@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo =====================================================
echo FitMate - Build AAB Release + Auto Version Code
echo =====================================================
echo.

if not exist "android\gradlew.bat" (
  echo [ERROR] Folder android tidak ditemukan.
  echo Taruh file ini di folder utama FitMate.
  echo Contoh: E:\fitmate\BUILD_FITMATE_AAB_AUTO_VERSION.bat
  pause
  exit /b 1
)

if not exist "increment-version-code.cjs" (
  echo [ERROR] increment-version-code.cjs tidak ditemukan.
  echo Pastikan file BAT dan JS berada di folder yang sama.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js tidak ditemukan di PATH.
  pause
  exit /b 1
)

echo [1/5] Mendeteksi Java...
set "DETECTED_JAVA_HOME="
for /f "tokens=1,* delims==" %%A in ('java -XshowSettings:properties -version 2^>^&1 ^| findstr /C:"java.home ="') do (
    for /f "tokens=* delims= " %%C in ("%%B") do set "DETECTED_JAVA_HOME=%%C"
)

if not defined DETECTED_JAVA_HOME (
    set "JAVA_EXE="
    for /f "delims=" %%I in ('where java.exe 2^>nul') do if not defined JAVA_EXE set "JAVA_EXE=%%~fI"
    if not defined JAVA_EXE (
        echo [ERROR] Java/JDK tidak ditemukan.
        pause
        exit /b 1
    )
    for %%I in ("%JAVA_EXE%") do set "JAVA_BIN=%%~dpI"
    for %%I in ("%JAVA_BIN%..") do set "DETECTED_JAVA_HOME=%%~fI"
)

if not exist "%DETECTED_JAVA_HOME%\bin\java.exe" (
    echo [ERROR] JAVA_HOME hasil deteksi tidak valid:
    echo %DETECTED_JAVA_HOME%
    pause
    exit /b 1
)

set "JAVA_HOME=%DETECTED_JAVA_HOME%"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo JAVA_HOME=%JAVA_HOME%

echo.
echo [2/5] Menyiapkan versionCode baru...
for /f "tokens=1,2 delims==" %%A in ('node increment-version-code.cjs prepare') do (
  if /I "%%A"=="VERSION_CODE" set "NEW_VERSION_CODE=%%B"
  if /I "%%A"=="VERSION_NAME" set "NEW_VERSION_NAME=%%B"
)

if not defined NEW_VERSION_CODE (
  echo [ERROR] Gagal mengubah versionCode.
  pause
  exit /b 1
)

echo versionCode baru : %NEW_VERSION_CODE%
if defined NEW_VERSION_NAME echo versionName      : %NEW_VERSION_NAME%

echo.
echo [POLICY] Memeriksa ACCESS_BACKGROUND_LOCATION...
findstr /C:"android.permission.ACCESS_BACKGROUND_LOCATION" "android\app\src\main\AndroidManifest.xml" >nul 2>&1
if not errorlevel 1 (
  echo [ERROR] ACCESS_BACKGROUND_LOCATION masih ada di AndroidManifest.xml.
  echo Build dihentikan agar AAB tidak ditolak Google Play lagi.
  goto :rollback
)
echo [OK] Restricted background-location permission tidak ada.

echo.
echo [3/5] Membersihkan build lama...
pushd android
call gradlew.bat --stop >nul 2>nul
call gradlew.bat clean
if errorlevel 1 (
  popd
  goto :rollback
)

echo.
echo [4/5] Membuat AAB RELEASE...
call gradlew.bat bundleRelease
if errorlevel 1 (
  popd
  goto :rollback
)
popd

if not exist "android\app\build\outputs\bundle\release\app-release.aab" (
  echo [ERROR] Build selesai tetapi app-release.aab tidak ditemukan.
  goto :rollback
)

echo.
echo [5/5] Menyalin hasil build...
set "OUTPUT=FitMate-release-vc%NEW_VERSION_CODE%.aab"
copy /Y "android\app\build\outputs\bundle\release\app-release.aab" "%OUTPUT%" >nul

node increment-version-code.cjs commit >nul 2>nul

echo.
echo =====================================================
echo BERHASIL
echo =====================================================
echo versionCode : %NEW_VERSION_CODE%
if defined NEW_VERSION_NAME echo versionName : %NEW_VERSION_NAME%
echo.
echo File untuk Google Play:
echo %CD%\%OUTPUT%
echo.
echo Setiap kali BAT ini dijalankan lagi,
echo versionCode akan otomatis naik 1.
echo =====================================================
pause
exit /b 0

:rollback
echo.
echo [INFO] Build gagal. Mengembalikan versionCode sebelumnya...
node increment-version-code.cjs rollback >nul 2>nul
echo.
echo =====================================================
echo BUILD GAGAL
echo versionCode dikembalikan agar tidak meloncat sia-sia.
echo Kirim screenshot error paling bawah ke ChatGPT.
echo =====================================================
pause
exit /b 1
