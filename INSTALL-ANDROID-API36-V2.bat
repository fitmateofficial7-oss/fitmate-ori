@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title FitMate - Install Android 16 API 36

cls
echo ======================================================
echo       FITMATE - INSTALL ANDROID 16 / API 36 V2
echo ======================================================
echo.
echo Installer API 36 mandiri untuk Windows Batch.
echo.

echo [1/5] Mencari Java 21 yang valid...
call :detect_java21
if errorlevel 1 goto :fail

echo.
echo [2/5] Mencari Android SDK...
call :detect_android_sdk
if errorlevel 1 goto :fail

echo.
echo [3/5] Mencari sdkmanager...
call :detect_sdkmanager
if errorlevel 1 goto :fail

echo.
echo [4/5] Memasang Android SDK Platform 36...
echo.
echo Android SDK:
echo   %SDK_ROOT%
echo.
echo sdkmanager:
echo   %SDKMANAGER%
echo.
echo Jika license Android muncul, ketik y lalu Enter.
echo.

call "%SDKMANAGER%" --sdk_root="%SDK_ROOT%" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
if errorlevel 1 goto :fail

echo.
echo [5/5] Memverifikasi hasil instalasi...

if not exist "%SDK_ROOT%\platforms\android-36\android.jar" (
    echo [ERROR] android-36 belum ditemukan setelah sdkmanager selesai.
    goto :fail
)

if not exist "%SDK_ROOT%\build-tools\36.0.0" (
    echo [WARNING] Build Tools 36.0.0 tidak ditemukan.
    echo Gradle mungkin memakai Build Tools lain yang kompatibel.
)

echo.
echo ======================================================
echo                  API 36 BERHASIL
echo ======================================================
echo.
echo Android 16 / API 36 sudah tersedia:
echo   %SDK_ROOT%\platforms\android-36
echo.
echo Sekarang BUILD-APK.bat dan BUILD-PLAYSTORE-AAB.bat
echo bisa dijalankan kembali.
echo.
if /I "%~1"=="/AUTO" exit /b 0
pause
exit /b 0


:detect_android_sdk
set "SDK_ROOT="

if defined ANDROID_SDK_ROOT (
    if exist "%ANDROID_SDK_ROOT%" set "SDK_ROOT=%ANDROID_SDK_ROOT%"
)
if defined SDK_ROOT goto :sdk_found

if defined ANDROID_HOME (
    if exist "%ANDROID_HOME%" set "SDK_ROOT=%ANDROID_HOME%"
)
if defined SDK_ROOT goto :sdk_found

if defined LOCALAPPDATA (
    if exist "%LOCALAPPDATA%\Android\Sdk" set "SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
)
if defined SDK_ROOT goto :sdk_found

if defined USERPROFILE (
    if exist "%USERPROFILE%\AppData\Local\Android\Sdk" set "SDK_ROOT=%USERPROFILE%\AppData\Local\Android\Sdk"
)
if defined SDK_ROOT goto :sdk_found

echo [ERROR] Android SDK tidak ditemukan.
echo.
echo Buka Android Studio:
echo   More Actions ^> SDK Manager
echo lalu pastikan Android SDK sudah terinstall.
echo.
exit /b 1

:sdk_found
set "ANDROID_SDK_ROOT=%SDK_ROOT%"
set "ANDROID_HOME=%SDK_ROOT%"
echo [OK] Android SDK:
echo      %SDK_ROOT%
exit /b 0


:detect_sdkmanager
set "SDKMANAGER="

if exist "%SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat" (
    set "SDKMANAGER=%SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat"
    goto :sdkmanager_found
)

for /d %%D in ("%SDK_ROOT%\cmdline-tools\*") do (
    if not defined SDKMANAGER (
        if exist "%%~fD\bin\sdkmanager.bat" set "SDKMANAGER=%%~fD\bin\sdkmanager.bat"
    )
)
if defined SDKMANAGER goto :sdkmanager_found

if exist "%SDK_ROOT%\tools\bin\sdkmanager.bat" (
    set "SDKMANAGER=%SDK_ROOT%\tools\bin\sdkmanager.bat"
    goto :sdkmanager_found
)

echo [ERROR] sdkmanager tidak ditemukan.
echo.
echo Di Android Studio buka:
echo   More Actions ^> SDK Manager ^> SDK Tools
echo lalu centang:
echo   Android SDK Command-line Tools ^(latest^)
echo klik Apply, kemudian jalankan BAT ini lagi.
echo.
exit /b 1

:sdkmanager_found
echo [OK] sdkmanager:
echo      %SDKMANAGER%
exit /b 0


:fail
echo.
echo ======================================================
echo                 INSTALASI GAGAL
echo ======================================================
echo.
echo Lihat pesan error di atas.
echo.
if /I "%~1"=="/AUTO" exit /b 1
pause
exit /b 1


:detect_java21
if errorlevel 1 goto :fail

echo.
echo [API36] Memeriksa Android 16 / API 36...
echo.
call npm run verify:api36:sdk
if errorlevel 1 (
  echo.
  echo [INFO] Jika Platform 36 belum terinstall, jalankan INSTALL-ANDROID-API36.bat
  goto :fail
)

echo.
echo [3/6] Memeriksa URL FitMate untuk Android...
call npm run native:verify-url
if errorlevel 1 goto :fail

echo.
echo [4/6] Sinkronisasi Capacitor dan konfigurasi native...
call npm run native:sync
if errorlevel 1 goto :fail

echo.
echo [5/6] Membersihkan build Android lama...
pushd android
call gradlew.bat --stop >nul 2>&1
call gradlew.bat clean
if errorlevel 1 (
  popd
  goto :fail
)

echo.
echo [6/6] Membuat APK debug untuk testing...
call gradlew.bat assembleDebug
set "GRADLE_EXIT=%ERRORLEVEL%"
popd
if not "%GRADLE_EXIT%"=="0" goto :fail

set "APK_PATH=%CD%\android\app\build\outputs\apk\debug\app-debug.apk"
if not exist "%APK_PATH%" (
  echo [ERROR] Gradle selesai tetapi APK tidak ditemukan:
  echo %APK_PATH%
  goto :fail
)

echo.
echo ======================================================
echo                   BUILD BERHASIL
echo ======================================================
echo.
echo APK terbaru:
echo %APK_PATH%
echo.
echo Explorer akan membuka lokasi APK.
echo.
explorer /select,"%APK_PATH%"
pause
exit /b 0

:fail
echo.
echo ======================================================
echo                    BUILD GAGAL
echo ======================================================
echo.
echo Lihat pesan error di atas.
echo Tidak ada APK lama yang dianggap sebagai build baru.
echo.
pause
exit /b 1

:detect_java21
set "JAVA_SELECTED="

rem ======================================================
rem FITMATE JAVA 21 AUTO DETECTOR V2
rem Tidak menjalankan quoted EXE di dalam FOR /F.
rem Ini menghindari error: 'C:\Program' is not recognized.
rem ======================================================

rem 1) Environment variables.
call :try_java21 "%FITMATE_JAVA_HOME%"
if defined JAVA_SELECTED goto :java_found

call :try_java21 "%JAVA_HOME%"
if defined JAVA_SELECTED goto :java_found

call :try_java21 "%JDK_HOME%"
if defined JAVA_SELECTED goto :java_found

call :try_java21 "%STUDIO_JDK%"
if defined JAVA_SELECTED goto :java_found

rem 2) java.exe / javac.exe yang sudah ada di PATH.
for /f "delims=" %%J in ('where java 2^>nul') do (
    if not defined JAVA_SELECTED (
        for %%P in ("%%~dpJ..") do call :try_java21 "%%~fP"
    )
)
if defined JAVA_SELECTED goto :java_found

for /f "delims=" %%J in ('where javac 2^>nul') do (
    if not defined JAVA_SELECTED (
        for %%P in ("%%~dpJ..") do call :try_java21 "%%~fP"
    )
)
if defined JAVA_SELECTED goto :java_found

rem 3) Android Studio / JetBrains Runtime.
call :try_java21 "%ProgramFiles%\Android\Android Studio\jbr"
if defined JAVA_SELECTED goto :java_found

call :try_java21 "%ProgramFiles%\Android\Android Studio\jre"
if defined JAVA_SELECTED goto :java_found

call :try_java21 "%LOCALAPPDATA%\Programs\Android Studio\jbr"
if defined JAVA_SELECTED goto :java_found

for /d %%D in ("%ProgramFiles%\Android\Android Studio*\jbr") do (
    if not defined JAVA_SELECTED call :try_java21 "%%~fD"
)
if defined JAVA_SELECTED goto :java_found

for /d %%D in ("%LOCALAPPDATA%\Programs\Android Studio*\jbr") do (
    if not defined JAVA_SELECTED call :try_java21 "%%~fD"
)
if defined JAVA_SELECTED goto :java_found

rem 4) JDK 21 umum.
for /d %%D in ("%ProgramFiles%\Eclipse Adoptium\jdk-21*") do (
    if not defined JAVA_SELECTED call :try_java21 "%%~fD"
)
if defined JAVA_SELECTED goto :java_found

for /d %%D in ("%LOCALAPPDATA%\Programs\Eclipse Adoptium\jdk-21*") do (
    if not defined JAVA_SELECTED call :try_java21 "%%~fD"
)
if defined JAVA_SELECTED goto :java_found

for /d %%D in ("%ProgramFiles%\Microsoft\jdk-21*") do (
    if not defined JAVA_SELECTED call :try_java21 "%%~fD"
)
if defined JAVA_SELECTED goto :java_found

for /d %%D in ("%ProgramFiles%\Java\jdk-21*") do (
    if not defined JAVA_SELECTED call :try_java21 "%%~fD"
)
if defined JAVA_SELECTED goto :java_found

for /d %%D in ("%ProgramFiles%\Amazon Corretto\jdk21*") do (
    if not defined JAVA_SELECTED call :try_java21 "%%~fD"
)
if defined JAVA_SELECTED goto :java_found

for /d %%D in ("%ProgramFiles%\Zulu\zulu-21*") do (
    if not defined JAVA_SELECTED call :try_java21 "%%~fD"
)
if defined JAVA_SELECTED goto :java_found

rem 5) JDK yang dibuat/didownload IDE di profile user.
for /d %%D in ("%USERPROFILE%\.jdks\*21*") do (
    if not defined JAVA_SELECTED call :try_java21 "%%~fD"
)
if defined JAVA_SELECTED goto :java_found

for /d %%D in ("%USERPROFILE%\.gradle\jdks\*21*") do (
    if not defined JAVA_SELECTED call :try_java21 "%%~fD"
)
if defined JAVA_SELECTED goto :java_found

echo.
echo ======================================================
echo [ERROR] JDK 21 YANG VALID BELUM DITEMUKAN
echo ======================================================
echo.
echo BAT sudah mengecek JAVA_HOME, PATH, Android Studio,
echo Adoptium, Microsoft JDK, Java, Corretto, Zulu,
echo .jdks, dan Gradle JDK.
echo.
echo Jika JDK 21 memang sudah terinstall di lokasi custom:
echo.
echo   set "FITMATE_JAVA_HOME=C:\lokasi\jdk-21"
echo   BUILD-APK.bat
echo.
echo Atau install JDK 21 lalu jalankan BAT ini lagi.
echo.
exit /b 1

:java_found
set "JAVA_HOME=%JAVA_SELECTED%"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo.
echo [OK] Java 21 ditemukan:
echo      %JAVA_HOME%
echo.
"%JAVA_HOME%\bin\java.exe" -version
exit /b 0


:try_java21
set "JAVA_CANDIDATE=%~1"

if not defined JAVA_CANDIDATE exit /b 0
if not exist "%JAVA_CANDIDATE%\bin\java.exe" exit /b 0
if not exist "%JAVA_CANDIDATE%\bin\javac.exe" exit /b 0

rem Jalankan java.exe langsung ke temporary file.
rem Sengaja TIDAK memakai quoted executable di FOR /F.
set "JAVA_TEST_FILE=%TEMP%\fitmate-java-version-%RANDOM%-%RANDOM%.txt"
"%JAVA_CANDIDATE%\bin\java.exe" -version > "%JAVA_TEST_FILE%" 2>&1
if errorlevel 1 (
    del /q "%JAVA_TEST_FILE%" >nul 2>&1
    exit /b 0
)

set "JAVA_VERSION_RAW="
for /f "usebackq tokens=1,2,3*" %%A in ("%JAVA_TEST_FILE%") do (
    if not defined JAVA_VERSION_RAW set "JAVA_VERSION_RAW=%%~C"
)
del /q "%JAVA_TEST_FILE%" >nul 2>&1

if not defined JAVA_VERSION_RAW exit /b 0

set "JAVA_MAJOR="
for /f "tokens=1 delims=." %%M in ("%JAVA_VERSION_RAW%") do set "JAVA_MAJOR=%%M"

if "%JAVA_MAJOR%"=="21" (
    set "JAVA_SELECTED=%JAVA_CANDIDATE%"
)

exit /b 0
