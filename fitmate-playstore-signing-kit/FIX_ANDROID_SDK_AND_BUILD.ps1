param(
  [string]$ProjectRoot = "E:\fitmate",
  [string]$ReleaseFolder = "E:\FitMateRelease"
)

$ErrorActionPreference = "Stop"

$kitRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidRoot = Join-Path $ProjectRoot "android"
$localProperties = Join-Path $androidRoot "local.properties"

if (!(Test-Path $androidRoot)) {
  throw "Folder Android tidak ditemukan: $androidRoot"
}

function Test-AndroidSdk([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
  if (!(Test-Path $Path)) { return $false }

  # Require at least these standard SDK directories.
  $platforms = Join-Path $Path "platforms"
  $platformTools = Join-Path $Path "platform-tools"

  return (Test-Path $platforms) -and (Test-Path $platformTools)
}

$candidates = @(
  $env:ANDROID_HOME,
  $env:ANDROID_SDK_ROOT,
  (Join-Path $env:LOCALAPPDATA "Android\Sdk"),
  (Join-Path $env:USERPROFILE "AppData\Local\Android\Sdk"),
  "C:\Android\Sdk"
) | Where-Object { $_ } | Select-Object -Unique

$sdk = $null
foreach ($candidate in $candidates) {
  if (Test-AndroidSdk $candidate) {
    $sdk = (Resolve-Path $candidate).Path
    break
  }
}

if (!$sdk) {
  Write-Host "ANDROID SDK TIDAK DITEMUKAN OTOMATIS." -ForegroundColor Red
  Write-Host ""
  Write-Host "Lokasi yang dicek:" -ForegroundColor Yellow
  $candidates | ForEach-Object { Write-Host "  $_" }
  Write-Host ""
  throw "Android SDK tidak ditemukan."
}

Write-Host "Android SDK ditemukan:" -ForegroundColor Green
Write-Host "  $sdk" -ForegroundColor Cyan

# Back up local.properties if it already exists.
if (Test-Path $localProperties) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Copy-Item $localProperties "$localProperties.before-v10-$timestamp.bak" -Force
}

# Forward slashes avoid Windows escaping problems in Java properties.
$sdkForGradle = $sdk.Replace("\", "/")
$localContent = "sdk.dir=$sdkForGradle`r`n"

# local.properties should not contain a BOM.
[System.IO.File]::WriteAllText(
  $localProperties,
  $localContent,
  [System.Text.Encoding]::ASCII
)

# Also expose ANDROID_HOME to this build process.
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = "$sdk\platform-tools;$env:Path"

Write-Host ""
Write-Host "local.properties berhasil dibuat:" -ForegroundColor Green
Write-Host "  $localProperties"
Write-Host "  sdk.dir=$sdkForGradle"
Write-Host ""

# Show installed Android platforms so the next error is obvious if compileSdk is missing.
$platformDir = Join-Path $sdk "platforms"
$installedPlatforms = @(
  Get-ChildItem $platformDir -Directory -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty Name |
  Sort-Object
)

if ($installedPlatforms.Count -gt 0) {
  Write-Host "Android SDK Platforms terpasang:" -ForegroundColor Cyan
  $installedPlatforms | ForEach-Object { Write-Host "  $_" }
} else {
  throw "Folder SDK ditemukan, tetapi belum ada Android SDK Platform yang terpasang."
}

Write-Host ""
Write-Host "Melanjutkan build signed AAB..." -ForegroundColor Cyan
Write-Host ""

powershell -NoProfile -ExecutionPolicy Bypass `
  -File (Join-Path $kitRoot "BUILD_RELEASE_AAB.ps1") `
  -ProjectRoot $ProjectRoot `
  -ReleaseFolder $ReleaseFolder

if ($LASTEXITCODE -ne 0) {
  throw "Build AAB masih gagal. Kirim error baru di bagian 'What went wrong'. Jangan buat keystore baru."
}
