param(
  [string]$ProjectRoot = "E:\fitmate",
  [string]$ReleaseFolder = "E:\FitMateRelease"
)

$ErrorActionPreference = "Stop"

$kitRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$resRoot = Join-Path $ProjectRoot "android\app\src\main\res"
$backupRoot = Join-Path $ProjectRoot "android\fitmate-build-backups"
$valuesDir = Join-Path $resRoot "values"
$colorsFile = Join-Path $valuesDir "colors.xml"
$launcherBgFile = Join-Path $valuesDir "ic_launcher_background.xml"

if (!(Test-Path $resRoot)) {
  throw "Android res folder tidak ditemukan: $resRoot"
}

Write-Host "FitMate - Clean Android Resource Backups" -ForegroundColor Green

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$sessionBackup = Join-Path $backupRoot $timestamp
New-Item -ItemType Directory -Force -Path $sessionBackup | Out-Null

# 1) Move backup artifacts OUTSIDE res/.
# Android's resource merger scans files under res/, so *.bak there can break the build.
$backupArtifacts = @(
  Get-ChildItem $resRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Name -like "*.bak" -or
    $_.Name -match '\.before-v\d+-.*\.bak$' -or
    $_.Name -match '\.before-.*\.bak$'
  }
)

foreach ($file in $backupArtifacts) {
  $relative = $file.FullName.Substring($resRoot.Length).TrimStart('\')
  $safeRelative = $relative.Replace('\', '__')
  $dest = Join-Path $sessionBackup $safeRelative
  Move-Item $file.FullName $dest -Force
  Write-Host "Moved backup out of res: $relative" -ForegroundColor DarkGray
}

# 2) Make a SAFE backup of the real XML files OUTSIDE res/.
if (Test-Path $colorsFile) {
  Copy-Item $colorsFile (Join-Path $sessionBackup "colors.xml") -Force
}
if (Test-Path $launcherBgFile) {
  Copy-Item $launcherBgFile (Join-Path $sessionBackup "ic_launcher_background.xml") -Force
}

# 3) Re-check duplicate ic_launcher_background and keep only one definition.
if (Test-Path $colorsFile) {
  $colorsText = Get-Content $colorsFile -Raw
} else {
  $colorsText = "<resources>`r`n</resources>`r`n"
}

$colorPattern = '<color\s+name=["'']ic_launcher_background["''][^>]*>.*?</color>'
$colorsMatches = [regex]::Matches(
  $colorsText,
  $colorPattern,
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

if ($colorsMatches.Count -eq 0) {
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
elseif ($colorsMatches.Count -gt 1) {
  $seen = $false
  $colorsText = [regex]::Replace(
    $colorsText,
    $colorPattern,
    {
      param($m)
      if (-not $script:seen) {
        $script:seen = $true
        return $m.Value
      }
      return ""
    },
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

[System.IO.File]::WriteAllText(
  $colorsFile,
  $colorsText,
  (New-Object System.Text.UTF8Encoding($false))
)

if (Test-Path $launcherBgFile) {
  $launcherText = Get-Content $launcherBgFile -Raw
  $launcherText = [regex]::Replace(
    $launcherText,
    '<color\s+name=["'']ic_launcher_background["''][^>]*>.*?</color>',
    '',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  $test = [regex]::Replace(
    $launcherText,
    '<!--.*?-->',
    '',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  ).Trim()

  if ($test -match '^<resources[^>]*>\s*</resources>$') {
    Remove-Item $launcherBgFile -Force
    Write-Host "Removed empty duplicate resource file: ic_launcher_background.xml" -ForegroundColor Green
  }
  else {
    [System.IO.File]::WriteAllText(
      $launcherBgFile,
      $launcherText,
      (New-Object System.Text.UTF8Encoding($false))
    )
  }
}

# 4) Verify there are NO .bak files left anywhere in Android res/.
$leftoverBackups = @(
  Get-ChildItem $resRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*.bak" }
)

if ($leftoverBackups.Count -gt 0) {
  throw "Masih ada file .bak di dalam res/: $($leftoverBackups.FullName -join ', ')"
}

# 5) Verify exactly one color resource definition.
$count = 0
$locations = @()

Get-ChildItem $valuesDir -Filter "*.xml" -File -ErrorAction SilentlyContinue | ForEach-Object {
  $txt = Get-Content $_.FullName -Raw
  $ms = [regex]::Matches(
    $txt,
    '<color\s+name=["'']ic_launcher_background["'']',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  if ($ms.Count -gt 0) {
    $count += $ms.Count
    $locations += $_.Name
  }
}

if ($count -ne 1) {
  throw "Resource ic_launcher_background harus tepat 1, sekarang ditemukan $count di: $($locations -join ', ')"
}

Write-Host ""
Write-Host "RESOURCE FOLDER SUDAH BERSIH" -ForegroundColor Green
Write-Host "Backup aman dipindahkan ke:" -ForegroundColor Cyan
Write-Host "  $sessionBackup"
Write-Host "ic_launcher_background aktif di: $($locations -join ', ')" -ForegroundColor Cyan
Write-Host ""
Write-Host "Melanjutkan build signed AAB..." -ForegroundColor Cyan
Write-Host ""

powershell -NoProfile -ExecutionPolicy Bypass `
  -File (Join-Path $kitRoot "BUILD_RELEASE_AAB.ps1") `
  -ProjectRoot $ProjectRoot `
  -ReleaseFolder $ReleaseFolder

if ($LASTEXITCODE -ne 0) {
  throw "Build AAB masih gagal. Kirim bagian 'What went wrong' dari error berikutnya. Jangan buat keystore baru."
}
