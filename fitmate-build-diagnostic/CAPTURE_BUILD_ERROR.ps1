param(
  [string]$ProjectRoot = "E:\fitmate",
  [string]$OutputFolder = "E:\FitMateRelease"
)

$ErrorActionPreference = "Continue"

function Get-JavaMajor([string]$JavaHome) {
  $javaExe = Join-Path $JavaHome "bin\java.exe"
  if (!(Test-Path $javaExe)) { return $null }

  $out = New-TemporaryFile
  $err = New-TemporaryFile
  try {
    Start-Process -FilePath $javaExe -ArgumentList "-version" -Wait -NoNewWindow `
      -RedirectStandardOutput $out.FullName -RedirectStandardError $err.FullName | Out-Null
    $txt = ((Get-Content $out.FullName -Raw -ErrorAction SilentlyContinue) + "`n" +
            (Get-Content $err.FullName -Raw -ErrorAction SilentlyContinue))
    if ($txt -match 'version "1\.(\d+)') { return [int]$Matches[1] }
    if ($txt -match 'version "(\d+)') { return [int]$Matches[1] }
    return $null
  } finally {
    Remove-Item $out.FullName,$err.FullName -Force -ErrorAction SilentlyContinue
  }
}

function Find-CompatibleJava {
  $candidates = @()

  if ($env:JAVA_HOME) { $candidates += $env:JAVA_HOME }

  $jdksDir = Join-Path $env:USERPROFILE ".jdks"
  if (Test-Path $jdksDir) {
    $candidates += Get-ChildItem $jdksDir -Directory -ErrorAction SilentlyContinue |
      ForEach-Object { $_.FullName }
  }

  foreach ($base in @(
    "C:\Program Files\Eclipse Adoptium",
    "C:\Program Files\Microsoft",
    "C:\Program Files\Java"
  )) {
    if (Test-Path $base) {
      $candidates += Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { $_.FullName }
    }
  }

  $candidates += "C:\Program Files\Android\Android Studio\jbr"
  $candidates = $candidates | Where-Object { $_ } | Select-Object -Unique

  $found = foreach ($p in $candidates) {
    $major = Get-JavaMajor $p
    if ($major -ge 17 -and $major -le 23) {
      [PSCustomObject]@{ Path=$p; Major=$major }
    }
  }

  foreach ($pref in @(17,21,23,22,20,19,18)) {
    $m = $found | Where-Object { $_.Major -eq $pref } | Select-Object -First 1
    if ($m) { return $m }
  }
  return $null
}

New-Item -ItemType Directory -Force -Path $OutputFolder | Out-Null
$logFile = Join-Path $OutputFolder "fitmate-gradle-build-full-log.txt"

$java = Find-CompatibleJava
if (!$java) {
  "ERROR: JDK 17-23 tidak ditemukan." | Set-Content $logFile -Encoding UTF8
  Write-Host "JDK kompatibel tidak ditemukan." -ForegroundColor Red
  Write-Host "Log: $logFile"
  exit 1
}

$env:JAVA_HOME = $java.Path
$env:Path = "$($java.Path)\bin;$env:Path"

Write-Host "Menggunakan Java $($java.Major): $($java.Path)" -ForegroundColor Green
Write-Host "Menjalankan Gradle dengan --stacktrace dan menyimpan SELURUH output..." -ForegroundColor Cyan

Set-Location (Join-Path $ProjectRoot "android")

# Stop any daemon from another Java version.
& .\gradlew.bat --stop *> $null

# Capture ALL stdout/stderr to a file; do not truncate the real cause.
& .\gradlew.bat bundleRelease --stacktrace --info *> $logFile
$exit = $LASTEXITCODE

Write-Host ""
if ($exit -eq 0) {
  Write-Host "BUILD BERHASIL." -ForegroundColor Green
  $aab = Join-Path $ProjectRoot "android\app\build\outputs\bundle\release\app-release.aab"
  Write-Host "AAB: $aab" -ForegroundColor Cyan
} else {
  Write-Host "BUILD MASIH GAGAL, tapi error lengkap sudah tersimpan." -ForegroundColor Yellow
  Write-Host "Kirim file ini ke ChatGPT:" -ForegroundColor Cyan
  Write-Host $logFile -ForegroundColor White

  Write-Host ""
  Write-Host "Ringkasan error penting:" -ForegroundColor Yellow
  $lines = Get-Content $logFile
  $matches = $lines | Select-String -Pattern "FAILURE:|What went wrong:|Execution failed|Caused by:|Could not|error:|A problem occurred|Task .* FAILED" -SimpleMatch:$false
  if ($matches) {
    $matches | Select-Object -Last 40 | ForEach-Object { Write-Host $_.Line }
  } else {
    Write-Host "Tidak ada ringkasan otomatis; gunakan file log penuh."
  }
}
exit $exit
