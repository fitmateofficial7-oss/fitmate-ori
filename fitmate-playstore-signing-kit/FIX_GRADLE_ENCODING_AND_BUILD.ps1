param(
  [string]$ProjectRoot = "E:\fitmate",
  [string]$ReleaseFolder = "E:\FitMateRelease"
)

$ErrorActionPreference = "Stop"

$kitRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$variablesGradle = Join-Path $ProjectRoot "android\variables.gradle"
$appGradle = Join-Path $ProjectRoot "android\app\build.gradle"

if (!(Test-Path $variablesGradle)) {
  throw "variables.gradle tidak ditemukan: $variablesGradle"
}
if (!(Test-Path $appGradle)) {
  throw "app/build.gradle tidak ditemukan: $appGradle"
}

Write-Host "FitMate - Fix Gradle Encoding" -ForegroundColor Green

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $variablesGradle "$variablesGradle.before-encoding-fix-$timestamp.bak" -Force
Copy-Item $appGradle "$appGradle.before-encoding-fix-$timestamp.bak" -Force

function Clean-GradleText([string]$Path) {
  # Read bytes so we can explicitly handle BOM/corrupt first character.
  $bytes = [System.IO.File]::ReadAllBytes($Path)

  # Decode as UTF-8 first. Replacement chars will be removed below.
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)

  # Strip UTF-8 BOM and Unicode BOM/replacement chars.
  $text = $text.TrimStart([char]0xFEFF)
  $text = $text.TrimStart([char]0xFFFD)

  # The observed failure is literally "?ext {" at byte/character 1.
  if ($text.StartsWith("?ext {")) {
    $text = $text.Substring(1)
  }

  # Also remove a leading question mark only when it precedes common Gradle starts.
  if ($text.StartsWith("?apply plugin:") -or $text.StartsWith("?android {")) {
    $text = $text.Substring(1)
  }

  # Gradle Groovy files here are ASCII-only, so write ASCII to guarantee no BOM.
  [System.IO.File]::WriteAllText($Path, $text, [System.Text.Encoding]::ASCII)
}

Clean-GradleText $variablesGradle
Clean-GradleText $appGradle

# Confirm variables.gradle starts correctly.
$firstLine = [System.IO.File]::ReadLines($variablesGradle) | Select-Object -First 1
if ($firstLine -ne "ext {") {
  throw "Baris pertama variables.gradle masih tidak benar: '$firstLine'"
}

Write-Host "OK variables.gradle sekarang dimulai dengan: ext {" -ForegroundColor Green
Write-Host "OK file Gradle ditulis ulang tanpa UTF-8 BOM." -ForegroundColor Green
Write-Host ""
Write-Host "Melanjutkan build AAB..." -ForegroundColor Cyan

powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $kitRoot "BUILD_RELEASE_AAB.ps1") -ProjectRoot $ProjectRoot -ReleaseFolder $ReleaseFolder
if ($LASTEXITCODE -ne 0) {
  throw "Build AAB masih gagal. Kirim output error berikutnya; jangan buat keystore baru."
}
