param(
  [string]$ProjectRoot = "E:\fitmate",
  [string]$KeysFolder = "E:\FitMateKeys"
)

$ErrorActionPreference = "Stop"
$KitRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "FitMate - Google Play Signing Installer" -ForegroundColor Green
Write-Host "Project : $ProjectRoot"
Write-Host "Keys    : $KeysFolder"

if (!(Test-Path (Join-Path $ProjectRoot "android\app\build.gradle"))) {
  throw "Android project tidak ditemukan di $ProjectRoot. Pastikan folder android sudah ada."
}

$cap = Join-Path $ProjectRoot "capacitor.config.ts"
if (!(Test-Path $cap)) {
  throw "capacitor.config.ts tidak ditemukan."
}

$capText = Get-Content $cap -Raw
if ($capText -notmatch 'appId:\s*"com\.growsia\.fitmate"') {
  throw "Package name bukan com.growsia.fitmate. Installer dihentikan agar konfigurasi tidak rusak."
}

$credFile = Join-Path $KitRoot "FITMATE_KEYSTORE_CREDENTIALS.txt"
if (!(Test-Path $credFile)) {
  throw "FITMATE_KEYSTORE_CREDENTIALS.txt tidak ditemukan."
}
$cred = Get-Content $credFile

function Read-CredentialValue([string]$Prefix) {
  $line = $cred | Where-Object { $_.StartsWith($Prefix) } | Select-Object -First 1
  if (!$line) {
    throw "Nilai '$Prefix' tidak ditemukan di file credential."
  }
  return ($line.Substring($Prefix.Length)).Trim()
}

$alias = Read-CredentialValue "Alias        :"
$storePass = Read-CredentialValue "Store pass   :"
$keyPass = Read-CredentialValue "Key pass     :"

New-Item -ItemType Directory -Force -Path $KeysFolder | Out-Null
$targetKey = Join-Path $KeysFolder "fitmate-upload-key.jks"
Copy-Item (Join-Path $KitRoot "fitmate-upload-key.jks") $targetKey -Force

# Gunakan forward slash supaya path Windows aman di Java properties / Gradle.
$gradleKeyPath = $targetKey.Replace("\", "/")
$propertiesPath = Join-Path $ProjectRoot "android\keystore.properties"

@"
storeFile=$gradleKeyPath
storePassword=$storePass
keyAlias=$alias
keyPassword=$keyPass
"@ | Set-Content -Path $propertiesPath -Encoding UTF8

# Jangan pernah commit credential/keystore.
$gitignore = Join-Path $ProjectRoot ".gitignore"
if (!(Test-Path $gitignore)) {
  New-Item -ItemType File -Path $gitignore | Out-Null
}
$existing = Get-Content $gitignore -Raw
$lines = @(
  "android/keystore.properties",
  "*.jks",
  "*.keystore"
)
foreach ($line in $lines) {
  if ($existing -notmatch [regex]::Escape($line)) {
    Add-Content -Path $gitignore -Value $line
  }
}

node (Join-Path $KitRoot "scripts\configure-android-signing.cjs") $ProjectRoot
if ($LASTEXITCODE -ne 0) {
  throw "Gagal mengonfigurasi android/app/build.gradle."
}

Write-Host ""
Write-Host "SIGNING FITMATE BERHASIL DIPASANG" -ForegroundColor Green
Write-Host "Keystore : $targetKey"
Write-Host "Properties: $propertiesPath"
Write-Host ""
Write-Host "Berikutnya jalankan BUILD_RELEASE_AAB.bat." -ForegroundColor Cyan
