@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title FitMate - Android API 36 Auto Setup V6

cls
echo ======================================================
echo       FITMATE - ANDROID 16 / API 36 SETUP V6
echo ======================================================
echo.
echo Installer V6: memperbaiki penerimaan license sdkmanager di Windows.
echo Tidak memakai PowerShell.
echo.

echo [1/6] Mencari Java 21...
call :JAVA21_FIND
if errorlevel 1 goto :SETUP_FAIL

echo.
echo [2/6] Mencari Android SDK...
call :SDK_FIND
if errorlevel 1 goto :SETUP_FAIL

echo.
echo [3/6] Mencari sdkmanager...
call :SDKMANAGER_FIND
if errorlevel 1 (
    echo [INFO] sdkmanager belum tersedia.
    echo [INFO] Mengunduh Android SDK Command-line Tools resmi...
    call :CMDLINE_INSTALL
    if errorlevel 1 goto :SETUP_FAIL

    call :SDKMANAGER_FIND
    if errorlevel 1 goto :SETUP_FAIL
)

echo.
echo [4/6] Menerima license dan memasang Android API 36...
call :API36_INSTALL
if errorlevel 1 goto :SETUP_FAIL

echo.
echo [5/6] Memverifikasi Android API 36...
call :API36_VERIFY
if errorlevel 1 goto :SETUP_FAIL

echo.
echo [6/6] Setup selesai.
echo.
echo ======================================================
echo                ANDROID API 36 SIAP
echo ======================================================
echo Android SDK:
echo   %SDK_ROOT%
echo.
echo Platform:
echo   %SDK_ROOT%\platforms\android-36
echo.
echo sdkmanager:
echo   %SDKMANAGER%
echo ======================================================
echo.

if /I "%~1"=="/AUTO" exit /b 0
pause
exit /b 0


:JAVA21_FIND
set "JAVA_SELECTED="

call :JAVA21_TRY "%FITMATE_JAVA_HOME%"
if defined JAVA_SELECTED goto :JAVA21_OK

rem Lokasi Java 21 yang sebelumnya terdeteksi pada mesin FitMate.
call :JAVA21_TRY "%USERPROFILE%\.jdks\jbr-21.0.11"
if defined JAVA_SELECTED goto :JAVA21_OK

call :JAVA21_TRY "%JAVA_HOME%"
if defined JAVA_SELECTED goto :JAVA21_OK

call :JAVA21_TRY "%JDK_HOME%"
if defined JAVA_SELECTED goto :JAVA21_OK

call :JAVA21_TRY "%STUDIO_JDK%"
if defined JAVA_SELECTED goto :JAVA21_OK

for /f "delims=" %%J in ('where java 2^>nul') do (
    if not defined JAVA_SELECTED (
        for %%P in ("%%~dpJ..") do call :JAVA21_TRY "%%~fP"
    )
)
if defined JAVA_SELECTED goto :JAVA21_OK

call :JAVA21_TRY "%ProgramFiles%\Android\Android Studio\jbr"
if defined JAVA_SELECTED goto :JAVA21_OK

call :JAVA21_TRY "%LOCALAPPDATA%\Programs\Android Studio\jbr"
if defined JAVA_SELECTED goto :JAVA21_OK

for /d %%D in ("%ProgramFiles%\Eclipse Adoptium\jdk-21*") do (
    if not defined JAVA_SELECTED call :JAVA21_TRY "%%~fD"
)
if defined JAVA_SELECTED goto :JAVA21_OK

for /d %%D in ("%ProgramFiles%\Microsoft\jdk-21*") do (
    if not defined JAVA_SELECTED call :JAVA21_TRY "%%~fD"
)
if defined JAVA_SELECTED goto :JAVA21_OK

for /d %%D in ("%ProgramFiles%\Java\jdk-21*") do (
    if not defined JAVA_SELECTED call :JAVA21_TRY "%%~fD"
)
if defined JAVA_SELECTED goto :JAVA21_OK

for /d %%D in ("%USERPROFILE%\.jdks\*21*") do (
    if not defined JAVA_SELECTED call :JAVA21_TRY "%%~fD"
)
if defined JAVA_SELECTED goto :JAVA21_OK

for /d %%D in ("%USERPROFILE%\.gradle\jdks\*21*") do (
    if not defined JAVA_SELECTED call :JAVA21_TRY "%%~fD"
)
if defined JAVA_SELECTED goto :JAVA21_OK

echo [ERROR] Java/JDK 21 tidak ditemukan.
exit /b 1

:JAVA21_OK
set "JAVA_HOME=%JAVA_SELECTED%"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo [OK] Java 21:
echo      %JAVA_HOME%
"%JAVA_HOME%\bin\java.exe" -version
exit /b 0


:JAVA21_TRY
set "JAVA_CANDIDATE=%~1"
if not defined JAVA_CANDIDATE exit /b 0
if not exist "%JAVA_CANDIDATE%\bin\java.exe" exit /b 0
if not exist "%JAVA_CANDIDATE%\bin\javac.exe" exit /b 0

set "JAVA_TEST=%TEMP%\fitmate-java-%RANDOM%-%RANDOM%.txt"
"%JAVA_CANDIDATE%\bin\java.exe" -version > "%JAVA_TEST%" 2>&1
if errorlevel 1 (
    del /q "%JAVA_TEST%" >nul 2>&1
    exit /b 0
)

set "JAVA_VER="
for /f "usebackq tokens=3" %%V in ("%JAVA_TEST%") do (
    if not defined JAVA_VER set "JAVA_VER=%%~V"
)
del /q "%JAVA_TEST%" >nul 2>&1

if not defined JAVA_VER exit /b 0
for /f "tokens=1 delims=." %%M in ("%JAVA_VER%") do set "JAVA_MAJOR=%%M"
if "%JAVA_MAJOR%"=="21" set "JAVA_SELECTED=%JAVA_CANDIDATE%"
exit /b 0


:SDK_FIND
set "SDK_ROOT="

if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%" set "SDK_ROOT=%ANDROID_SDK_ROOT%"
if defined SDK_ROOT goto :SDK_OK

if defined ANDROID_HOME if exist "%ANDROID_HOME%" set "SDK_ROOT=%ANDROID_HOME%"
if defined SDK_ROOT goto :SDK_OK

if exist "%LOCALAPPDATA%\Android\Sdk" set "SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
if defined SDK_ROOT goto :SDK_OK

if exist "%USERPROFILE%\AppData\Local\Android\Sdk" set "SDK_ROOT=%USERPROFILE%\AppData\Local\Android\Sdk"
if defined SDK_ROOT goto :SDK_OK

set "SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
mkdir "%SDK_ROOT%" >nul 2>&1
if not exist "%SDK_ROOT%" (
    echo [ERROR] Android SDK folder tidak dapat dibuat.
    exit /b 1
)

:SDK_OK
set "ANDROID_SDK_ROOT=%SDK_ROOT%"
set "ANDROID_HOME=%SDK_ROOT%"
echo [OK] Android SDK:
echo      %SDK_ROOT%
exit /b 0


:SDKMANAGER_FIND
set "SDKMANAGER="

if exist "%SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat" (
    set "SDKMANAGER=%SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat"
    goto :SDKMANAGER_OK
)

for /d %%D in ("%SDK_ROOT%\cmdline-tools\*") do (
    if not defined SDKMANAGER (
        if exist "%%~fD\bin\sdkmanager.bat" set "SDKMANAGER=%%~fD\bin\sdkmanager.bat"
    )
)
if defined SDKMANAGER goto :SDKMANAGER_OK

if exist "%SDK_ROOT%\tools\bin\sdkmanager.bat" (
    set "SDKMANAGER=%SDK_ROOT%\tools\bin\sdkmanager.bat"
    goto :SDKMANAGER_OK
)

exit /b 1

:SDKMANAGER_OK
echo [OK] sdkmanager:
echo      %SDKMANAGER%
exit /b 0


:CMDLINE_INSTALL
set "TOOLS_URL=https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip"
set "TMP_ROOT=%TEMP%\fitmate-sdktools-%RANDOM%-%RANDOM%"
set "TOOLS_ZIP=%TMP_ROOT%\tools.zip"
set "TOOLS_EXTRACT=%TMP_ROOT%\extract"

mkdir "%TMP_ROOT%" >nul 2>&1
mkdir "%TOOLS_EXTRACT%" >nul 2>&1

where curl.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] curl.exe tidak tersedia di Windows.
    call :TMP_CLEAN
    exit /b 1
)

where tar.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] tar.exe tidak tersedia di Windows.
    call :TMP_CLEAN
    exit /b 1
)

echo Download:
echo   %TOOLS_URL%
curl.exe -L --fail --retry 3 --retry-delay 2 -o "%TOOLS_ZIP%" "%TOOLS_URL%"
if errorlevel 1 (
    echo [ERROR] Download Command-line Tools gagal.
    call :TMP_CLEAN
    exit /b 1
)

tar.exe -xf "%TOOLS_ZIP%" -C "%TOOLS_EXTRACT%"
if errorlevel 1 (
    echo [ERROR] Ekstraksi Command-line Tools gagal.
    call :TMP_CLEAN
    exit /b 1
)

if not exist "%TOOLS_EXTRACT%\cmdline-tools\bin\sdkmanager.bat" (
    echo [ERROR] sdkmanager tidak ditemukan di hasil ekstrak.
    call :TMP_CLEAN
    exit /b 1
)

if not exist "%SDK_ROOT%\cmdline-tools" mkdir "%SDK_ROOT%\cmdline-tools" >nul 2>&1

if exist "%SDK_ROOT%\cmdline-tools\latest" (
    rmdir /s /q "%SDK_ROOT%\cmdline-tools\latest" >nul 2>&1
)

mkdir "%SDK_ROOT%\cmdline-tools\latest" >nul 2>&1
xcopy "%TOOLS_EXTRACT%\cmdline-tools\*" "%SDK_ROOT%\cmdline-tools\latest\" /E /I /H /Y >nul
if errorlevel 1 (
    echo [ERROR] Gagal memasang Command-line Tools.
    call :TMP_CLEAN
    exit /b 1
)

if not exist "%SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat" (
    echo [ERROR] sdkmanager belum tersedia setelah instalasi.
    call :TMP_CLEAN
    exit /b 1
)

echo [OK] Command-line Tools berhasil dipasang.
call :TMP_CLEAN
exit /b 0


:API36_INSTALL
set "LICENSE_INPUT=%TEMP%\fitmate-android-license-%RANDOM%-%RANDOM%.txt"

rem Windows tidak memiliki perintah `yes`. Buat file jawaban y dan redirect
rem ke stdin sdkmanager. Ini lebih stabil daripada pipe + CALL pada .bat.
(for /L %%I in (1,1,300) do @echo y)>"%LICENSE_INPUT%"
if not exist "%LICENSE_INPUT%" (
    echo [ERROR] Gagal membuat file jawaban license sementara.
    exit /b 1
)

echo [INFO] Menerima semua Android SDK licenses...
call "%SDKMANAGER%" --sdk_root="%SDK_ROOT%" --licenses < "%LICENSE_INPUT%"
set "LICENSE_EXIT=%ERRORLEVEL%"
if not "%LICENSE_EXIT%"=="0" (
    echo [ERROR] sdkmanager --licenses gagal. Exit code: %LICENSE_EXIT%
    del /q "%LICENSE_INPUT%" >nul 2>&1
    exit /b 1
)

echo.
echo [INFO] Memasang platform-tools, Android 16 API 36, dan Build-Tools 36.0.0...
call "%SDKMANAGER%" --sdk_root="%SDK_ROOT%" "platform-tools" "platforms;android-36" "build-tools;36.0.0" < "%LICENSE_INPUT%"
set "INSTALL_EXIT=%ERRORLEVEL%"
del /q "%LICENSE_INPUT%" >nul 2>&1

if not "%INSTALL_EXIT%"=="0" (
    echo [ERROR] Instalasi paket Android SDK gagal. Exit code: %INSTALL_EXIT%
    exit /b 1
)
exit /b 0


:API36_VERIFY
if not exist "%SDK_ROOT%\platforms\android-36\android.jar" (
    echo [ERROR] %SDK_ROOT%\platforms\android-36\android.jar belum ada.
    echo [INFO] License atau download paket Android API 36 belum selesai.
    exit /b 1
)

if not exist "%SDK_ROOT%\build-tools\36.0.0" (
    echo [ERROR] Build-Tools 36.0.0 belum ada.
    exit /b 1
)

if not exist "%SDK_ROOT%\platform-tools" (
    echo [ERROR] Platform-Tools belum ada.
    exit /b 1
)

echo [OK] Android SDK Platform 36 tersedia.
echo [OK] Android SDK Build-Tools 36.0.0 tersedia.
echo [OK] Android SDK Platform-Tools tersedia.
exit /b 0


:TMP_CLEAN
if defined TMP_ROOT if exist "%TMP_ROOT%" rmdir /s /q "%TMP_ROOT%" >nul 2>&1
exit /b 0


:SETUP_FAIL
echo.
echo ======================================================
echo               SETUP ANDROID API 36 GAGAL
echo ======================================================
echo Lihat error tepat di atas bagian ini.
echo.
if /I "%~1"=="/AUTO" exit /b 1
pause
exit /b 1
