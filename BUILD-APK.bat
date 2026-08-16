@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title FitMate - Build APK Testing

cls
echo ======================================================
echo              FITMATE - BUILD APK TESTING
echo ======================================================
echo.
echo BAT ini selalu membuild source FitMate terbaru di folder ini.
echo Tidak perlu membuat BAT baru setiap ada perubahan.
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js tidak ditemukan di PATH.
  echo Install Node.js 20+ lalu buka ulang CMD.
  goto :fail
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm tidak ditemukan di PATH.
  goto :fail
)

if not exist "package.json" (
  echo [ERROR] package.json tidak ditemukan.
  echo Jalankan BAT ini dari root project FitMate.
  goto :fail
)

if not exist "node_modules\.bin\cap.cmd" (
  echo [1/6] node_modules belum tersedia. Menjalankan npm install...
  call npm install
  if errorlevel 1 goto :fail
) else (
  echo [1/6] Dependencies tersedia.
)

echo.
echo [2/6] Mencari Java 21 yang valid...
call :detect_java21
if errorlevel 1 goto :fail

echo.
echo [API36] Memeriksa Android 16 / API 36...
echo.
call npm run verify:api36:sdk
if errorlevel 1 (
  echo.
  echo [INFO] Platform Android 16 / API 36 belum ada.
  echo [INFO] Menyiapkan API 36 dengan installer V5 no-loop...
  echo.
  call "%~dp0INSTALL-ANDROID-API36.bat" /AUTO
  if errorlevel 1 goto :fail

  echo.
  echo [INFO] Mengecek kembali API 36...
  call npm run verify:api36:sdk
  if errorlevel 1 goto :fail
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
rem FITMATE JAVA 21 AUTO DETECTOR V3
rem Fix: Java 21 yang sudah valid tidak boleh jatuh lagi
rem ke blok "JDK belum ditemukan".
rem ======================================================

call :check_java21 "%FITMATE_JAVA_HOME%"
if defined JAVA_SELECTED goto :java21_ready

rem Lokasi yang sudah terbukti ada pada mesin user.
call :check_java21 "%USERPROFILE%\.jdks\jbr-21.0.11"
if defined JAVA_SELECTED goto :java21_ready

call :check_java21 "%JAVA_HOME%"
if defined JAVA_SELECTED goto :java21_ready
call :check_java21 "%JDK_HOME%"
if defined JAVA_SELECTED goto :java21_ready
call :check_java21 "%STUDIO_JDK%"
if defined JAVA_SELECTED goto :java21_ready

call :check_java21 "%ProgramFiles%\Android\Android Studio\jbr"
if defined JAVA_SELECTED goto :java21_ready
call :check_java21 "%LOCALAPPDATA%\Programs\Android Studio\jbr"
if defined JAVA_SELECTED goto :java21_ready

for /d %%D in ("%USERPROFILE%\.jdks\*21*") do call :check_java21 "%%~fD"
if defined JAVA_SELECTED goto :java21_ready
for /d %%D in ("%USERPROFILE%\.gradle\jdks\*21*") do call :check_java21 "%%~fD"
if defined JAVA_SELECTED goto :java21_ready

for /d %%D in ("%ProgramFiles%\Eclipse Adoptium\jdk-21*") do call :check_java21 "%%~fD"
if defined JAVA_SELECTED goto :java21_ready
for /d %%D in ("%ProgramFiles%\Microsoft\jdk-21*") do call :check_java21 "%%~fD"
if defined JAVA_SELECTED goto :java21_ready
for /d %%D in ("%ProgramFiles%\Java\jdk-21*") do call :check_java21 "%%~fD"
if defined JAVA_SELECTED goto :java21_ready
for /d %%D in ("%ProgramFiles%\Amazon Corretto\jdk21*") do call :check_java21 "%%~fD"
if defined JAVA_SELECTED goto :java21_ready
for /d %%D in ("%ProgramFiles%\Zulu\zulu-21*") do call :check_java21 "%%~fD"
if defined JAVA_SELECTED goto :java21_ready

for /f "delims=" %%J in ('where javac 2^>nul') do call :check_java21 "%%~dpJ.."
if defined JAVA_SELECTED goto :java21_ready
for /f "delims=" %%J in ('where java 2^>nul') do call :check_java21 "%%~dpJ.."
if defined JAVA_SELECTED goto :java21_ready

echo.
echo ======================================================
echo [ERROR] JDK 21 YANG VALID BELUM DITEMUKAN
echo ======================================================
echo.
echo BAT sudah mengecek JBR Android Studio, .jdks,
echo JAVA_HOME, PATH, Adoptium, Microsoft, Java,
echo Corretto, Zulu, dan Gradle JDK.
echo.
echo Jika JDK 21 ada di lokasi custom:
echo   set "FITMATE_JAVA_HOME=C:\lokasi\jdk-21"
echo lalu jalankan BAT ini lagi.
echo.
exit /b 1

:java21_ready
set "JAVA_HOME=%JAVA_SELECTED%"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo.
echo [OK] Java 21 ditemukan dan diverifikasi:
echo      %JAVA_HOME%
echo.
"%JAVA_HOME%\bin\javac.exe" -version
if errorlevel 1 exit /b 1
"%JAVA_HOME%\bin\java.exe" -version
if errorlevel 1 exit /b 1
exit /b 0

:check_java21
if defined JAVA_SELECTED exit /b 0
set "JAVA_CANDIDATE=%~1"
if not defined JAVA_CANDIDATE exit /b 0
if not exist "%JAVA_CANDIDATE%\bin\java.exe" exit /b 0
if not exist "%JAVA_CANDIDATE%\bin\javac.exe" exit /b 0

set "JAVA_TEST_FILE=%TEMP%\fitmate-javac-version-%RANDOM%-%RANDOM%.txt"
"%JAVA_CANDIDATE%\bin\javac.exe" -version > "%JAVA_TEST_FILE%" 2>&1
if errorlevel 1 goto :check_java21_cleanup
findstr /B /C:"javac 21" "%JAVA_TEST_FILE%" >nul 2>&1
if errorlevel 1 goto :check_java21_cleanup
for %%P in ("%JAVA_CANDIDATE%") do set "JAVA_SELECTED=%%~fP"

:check_java21_cleanup
del /q "%JAVA_TEST_FILE%" >nul 2>&1
exit /b 0
