param(
  [string]$ProjectRoot = "E:\fitmate",
  [string]$ReleaseFolder = "E:\FitMateRelease"
)

$ErrorActionPreference = "Stop"

$kitRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$valuesDir = Join-Path $ProjectRoot "android\app\src\main\res\values"
$colorsFile = Join-Path $valuesDir "colors.xml"
$launcherBgFile = Join-Path $valuesDir "ic_launcher_background.xml"

if (!(Test-Path $colorsFile)) {
  throw "colors.xml tidak ditemukan: $colorsFile"
}
if (!(Test-Path $launcherBgFile)) {
  Write-Host "ic_launcher_background.xml tidak ada. Tidak ada file duplikat yang perlu diperbaiki." -ForegroundColor Yellow
}

Write-Host "FitMate - Fix Duplicate Launcher Color" -ForegroundColor Green

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeBackupDir = Join-Path $ProjectRoot "android\fitmate-build-backups\v12-$timestamp"
New-Item -ItemType Directory -Force -Path $safeBackupDir | Out-Null
Copy-Item $colorsFile (Join-Path $safeBackupDir "colors.xml") -Force

if (Test-Path $launcherBgFile) {
  Copy-Item $launcherBgFile (Join-Path $safeBackupDir "ic_launcher_background.xml") -Force
}

# Keep colors.xml as the canonical location for ic_launcher_background.
$colorsText = Get-Content $colorsFile -Raw

# Ensure colors.xml has exactly one definition of ic_launcher_background.
$colorPattern = '<color\s+name=["'']ic_launcher_background["''][^>]*>.*?</color>'
$matches = [regex]::Matches($colorsText, $colorPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

if ($matches.Count -eq 0) {
  # If colors.xml somehow does not contain the value, take it from ic_launcher_background.xml if possible.
  $value = "#FFFFFF"
  if (Test-Path $launcherBgFile) {
    $launcherText = Get-Content $launcherBgFile -Raw
    $m = [regex]::Match(
      $launcherText,
      '<color\s+name=["'']ic_launcher_background["''][^>]*>(.*?)</color>',
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
    if ($m.Success) {
      $value = $m.Groups[1].Value.Trim()
    }
  }

  $insert = "    <color name=`"ic_launcher_background`">$value</color>`r`n"
  $colorsText = $colorsText -replace '</resources>', "$insert</resources>"
}
elseif ($matches.Count -gt 1) {
  # Preserve the first definition and remove any additional duplicates.
  $firstSeen = $false
  $colorsText = [regex]::Replace(
    $colorsText,
    $colorPattern,
    {
      param($m)
      if (-not $script:firstSeen) {
        $script:firstSeen = $true
        return $m.Value
      }
      return ""
    },
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

# Write colors.xml without BOM.
[System.IO.File]::WriteAllText(
  $colorsFile,
  $colorsText,
  [System.Text.Encoding]::UTF8
)

# Remove ONLY the duplicate ic_launcher_background definition from the second file.
if (Test-Path $launcherBgFile) {
  $launcherText = Get-Content $launcherBgFile -Raw
  $launcherText = [regex]::Replace(
    $launcherText,
    '<color\s+name=["'']ic_launcher_background["''][^>]*>.*?</color>',
    '',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  # If that file now contains only <resources> ... </resources> (comments/whitespace allowed), remove it.
  $test = $launcherText
  $test = [regex]::Replace($test, '<!--.*?-->', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $test = $test.Trim()

  if ($test -match '^<resources[^>]*>\s*</resources>$') {
    Remove-Item $launcherBgFile -Force
    Write-Host "Duplicate file dihapus: ic_launcher_background.xml" -ForegroundColor Green
  }
  else {
    [System.IO.File]::WriteAllText(
      $launcherBgFile,
      $launcherText,
      [System.Text.Encoding]::UTF8
    )
    Write-Host "Duplicate color dihapus dari ic_launcher_background.xml" -ForegroundColor Green
  }
}

# Verify there is now exactly one resource definition across values/*.xml.
$allValueFiles = Get-ChildItem $valuesDir -Filter "*.xml" -File
$count = 0
$locations = @()

foreach ($file in $allValueFiles) {
  $txt = Get-Content $file.FullName -Raw
  $ms = [regex]::Matches(
    $txt,
    '<color\s+name=["'']ic_launcher_background["'']',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  if ($ms.Count -gt 0) {
    $count += $ms.Count
    $locations += $file.Name
  }
}

if ($count -ne 1) {
  throw "Setelah perbaikan masih ditemukan $count definisi ic_launcher_background di: $($locations -join ', ')"
}

Write-Host ""
Write-Host "Resource launcher color sekarang bersih." -ForegroundColor Green
Write-Host "Definisi aktif: $($locations -join ', ')" -ForegroundColor Cyan
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
