param(
  [string]$ProjectRoot = "E:\fitmate",
  [string]$ReleaseFolder = "E:\FitMateRelease"
)

$ErrorActionPreference = "Stop"

$kitRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$variablesGradle = Join-Path $ProjectRoot "android\variables.gradle"

if (!(Test-Path $variablesGradle)) {
  throw "variables.gradle tidak ditemukan: $variablesGradle"
}

Write-Host "FitMate - Reset Android variables.gradle" -ForegroundColor Green

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$variablesGradle.before-v9-$timestamp.bak"
Copy-Item $variablesGradle $backup -Force

# Exact Capacitor 7.4.3 android-template/variables.gradle.
# Use pure ASCII so there can be no UTF-8 BOM or corrupt first character.
$officialVariables = @'
ext {
    minSdkVersion = 23
    compileSdkVersion = 35
    targetSdkVersion = 35
    androidxActivityVersion = '1.9.2'
    androidxAppCompatVersion = '1.7.0'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.15.0'
    androidxFragmentVersion = '1.8.4'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.12.1'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.2.1'
    androidxEspressoCoreVersion = '3.6.1'
    cordovaAndroidVersion = '10.1.1'
}
'@

[System.IO.File]::WriteAllText(
  $variablesGradle,
  $officialVariables,
  [System.Text.Encoding]::ASCII
)

# Verify exact first bytes must be: 65 78 74 20 7B = "ext {"
$bytes = [System.IO.File]::ReadAllBytes($variablesGradle)
if ($bytes.Length -lt 5) {
  throw "variables.gradle terlalu pendek setelah rewrite."
}

$expected = @(0x65, 0x78, 0x74, 0x20, 0x7B)
for ($i = 0; $i -lt $expected.Count; $i++) {
  if ($bytes[$i] -ne $expected[$i]) {
    throw "Byte awal variables.gradle masih salah pada posisi $i."
  }
}

$firstLine = [System.IO.File]::ReadLines($variablesGradle) | Select-Object -First 1
if ($firstLine -ne "ext {") {
  throw "Baris pertama variables.gradle bukan 'ext {'. Terbaca: '$firstLine'"
}

Write-Host "OK variables.gradle ditulis ulang dari nol." -ForegroundColor Green
Write-Host "OK first line: ext {" -ForegroundColor Green
Write-Host "OK tanpa BOM / karakter ? / karakter hilang." -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Melanjutkan build signed AAB..." -ForegroundColor Cyan
Write-Host ""

powershell -NoProfile -ExecutionPolicy Bypass `
  -File (Join-Path $kitRoot "BUILD_RELEASE_AAB.ps1") `
  -ProjectRoot $ProjectRoot `
  -ReleaseFolder $ReleaseFolder

if ($LASTEXITCODE -ne 0) {
  throw "Build AAB masih gagal. Kirim error baru yang muncul paling bawah; jangan buat keystore baru."
}
