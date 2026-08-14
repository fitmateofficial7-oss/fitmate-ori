param(
  [string]$ProjectRoot = "E:\fitmate",
  [string]$ReleaseFolder = "E:\FitMateRelease"
)

$ErrorActionPreference = "Stop"
$kitRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Find-Jdk21 {
  $roots = @(
    "C:\Program Files\Eclipse Adoptium",
    "C:\Program Files\Microsoft",
    "C:\Program Files\Java",
    "$env:LOCALAPPDATA\Programs\Eclipse Adoptium",
    (Join-Path $env:USERPROFILE ".jdks")
  ) | Where-Object { $_ }

  foreach ($base in $roots) {
    if (!(Test-Path $base)) { continue }
    foreach ($dir in Get-ChildItem $base -Directory -ErrorAction SilentlyContinue) {
      $java = Join-Path $dir.FullName "bin\java.exe"
      if (!(Test-Path $java)) { continue }

      $tmpOut = [System.IO.Path]::GetTempFileName()
      $tmpErr = [System.IO.Path]::GetTempFileName()
      try {
        Start-Process -FilePath $java -ArgumentList "-version" -Wait -NoNewWindow `
          -RedirectStandardOutput $tmpOut -RedirectStandardError $tmpErr | Out-Null
        $txt = ((Get-Content $tmpOut -Raw -ErrorAction SilentlyContinue) + "`n" +
                (Get-Content $tmpErr -Raw -ErrorAction SilentlyContinue))
        if ($txt -match 'version "21(\.|")') {
          return $dir.FullName
        }
      } finally {
        Remove-Item $tmpOut,$tmpErr -Force -ErrorAction SilentlyContinue
      }
    }
  }
  return $null
}

Write-Host "FitMate - JDK 21 Setup + AAB Build" -ForegroundColor Green

$jdk21 = Find-Jdk21
if (!$jdk21) {
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if (!$winget) {
    throw "winget tidak tersedia. Install JDK 21 (Temurin) lalu jalankan BUILD_RELEASE_AAB.bat."
  }

  Write-Host ""
  Write-Host "JDK 21 belum ada. Menginstall Eclipse Temurin JDK 21..." -ForegroundColor Cyan
  & winget install --id EclipseAdoptium.Temurin.21.JDK -e `
    --accept-package-agreements --accept-source-agreements --silent

  if ($LASTEXITCODE -ne 0) {
    throw "Instalasi JDK 21 via winget gagal."
  }

  Start-Sleep -Seconds 2
  $jdk21 = Find-Jdk21
}

if (!$jdk21) {
  throw "JDK 21 selesai diproses tetapi belum ditemukan. Tutup jendela ini, lalu jalankan script lagi."
}

Write-Host ""
Write-Host "JDK 21 ditemukan:" -ForegroundColor Green
Write-Host "  $jdk21" -ForegroundColor Cyan

$env:JAVA_HOME = $jdk21
$env:Path = "$jdk21\bin;$env:Path"

powershell -NoProfile -ExecutionPolicy Bypass `
  -File (Join-Path $kitRoot "BUILD_RELEASE_AAB.ps1") `
  -ProjectRoot $ProjectRoot `
  -ReleaseFolder $ReleaseFolder

if ($LASTEXITCODE -ne 0) {
  throw "Build masih gagal. Kirim bagian 'What went wrong' dari error berikutnya."
}
