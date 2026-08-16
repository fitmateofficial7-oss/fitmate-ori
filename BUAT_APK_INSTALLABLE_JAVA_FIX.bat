@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo =============================================
echo FitMate - Build APK Installable (JAVA_HOME Fix)
echo =============================================
echo.

if not exist "android\gradlew.bat" (
  echo [ERROR] Folder android tidak ditemukan.
  echo Taruh file ini di folder utama FitMate, contoh E:\fitmate
  pause
  exit /b 1
)

echo [1/4] Mendeteksi Java yang benar...

set "DETECTED_JAVA_HOME="
for /f "tokens=1,* delims==" %%A in ('java -XshowSettings:properties -version 2^>^&1 ^| findstr /C:"java.home ="') do (
    for /f "tokens=* delims= " %%C in ("%%B") do set "DETECTED_JAVA_HOME=%%C"
)

if not defined DETECTED_JAVA_HOME (
    echo [WARN] Tidak bisa membaca java.home. Mencoba dari WHERE JAVA...
    set "JAVA_EXE="
    for /f "delims=" %%I in ('where java.exe 2^>nul') do if not defined JAVA_EXE set "JAVA_EXE=%%~fI"
    if not defined JAVA_EXE (
        echo [ERROR] Java tidak ditemukan.
        echo Install JDK 21 lalu coba lagi.
        pause
        exit /b 1
    )
    for %%I in ("%JAVA_EXE%") do set "JAVA_BIN=%%~dpI"
    for %%I in ("%JAVA_BIN%..") do set "DETECTED_JAVA_HOME=%%~fI"
)

if not exist "%DETECTED_JAVA_HOME%\bin\java.exe" (
    echo [ERROR] Java terdeteksi tetapi JAVA_HOME tidak valid:
    echo %DETECTED_JAVA_HOME%
    pause
    exit /b 1
)

set "JAVA_HOME=%DETECTED_JAVA_HOME%"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo JAVA_HOME=%JAVA_HOME%
"%JAVA_HOME%\bin\java.exe" -version
if errorlevel 1 goto :fail

echo.
echo [2/4] Membersihkan cache build lama...
pushd android
call gradlew.bat --stop >nul 2>nul
call gradlew.bat clean
if errorlevel 1 (
  popd
  goto :fail
)

echo.
echo [3/4] Membuat APK DEBUG yang ditandatangani otomatis...
call gradlew.bat assembleDebug
if errorlevel 1 (
  popd
  goto :fail
)
popd

echo.
echo [4/4] Menyalin APK...
if not exist "android\app\build\outputs\apk\debug\app-debug.apk" (
  echo [ERROR] app-debug.apk tidak ditemukan.
  goto :fail
)

copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "FitMate-Install.apk" >nul

echo.
echo =============================================
echo BERHASIL
echo APK:
echo %CD%\FitMate-Install.apk
echo =============================================
echo.
echo Jika FitMate lama memakai signature berbeda,
echo uninstall FitMate lama sebelum install APK ini.
echo.
pause
exit /b 0

:fail
echo.
echo =============================================
echo BUILD GAGAL
echo Kirim screenshot error PALING BAWAH ke ChatGPT.
echo =============================================
pause
exit /b 1
