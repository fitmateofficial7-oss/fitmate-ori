param(
  [string]$ProjectRoot = "E:\fitmate",
  [string]$ReleaseFolder = "E:\FitMateRelease"
)

$ErrorActionPreference = "Stop"

function Get-JavaVersionText([string]$JavaHome) {
  $javaExe = Join-Path $JavaHome "bin\java.exe"
  if (!(Test-Path $javaExe)) { return $null }

  $stdoutFile = [System.IO.Path]::GetTempFileName()
  $stderrFile = [System.IO.Path]::GetTempFileName()
  try {
    Start-Process -FilePath $javaExe -ArgumentList "-version" -NoNewWindow -Wait -PassThru `
      -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile | Out-Null

    $stdout = if (Test-Path $stdoutFile) { Get-Content $stdoutFile -Raw -ErrorAction SilentlyContinue } else { "" }
    $stderr = if (Test-Path $stderrFile) { Get-Content $stderrFile -Raw -ErrorAction SilentlyContinue } else { "" }
    return (($stdout + "`n" + $stderr).Trim())
  }
  finally {
    Remove-Item $stdoutFile -Force -ErrorAction SilentlyContinue
    Remove-Item $stderrFile -Force -ErrorAction SilentlyContinue
  }
}

function Get-JavaMajor([string]$JavaHome) {
  $output = Get-JavaVersionText $JavaHome
  if ([string]::IsNullOrWhiteSpace($output)) { return $null }
  if ($output -match 'version "1\.(\d+)') { return [int]$Matches[1] }
  if ($output -match 'version "(\d+)') { return [int]$Matches[1] }
  if ($output -match 'openjdk version "(\d+)') { return [int]$Matches[1] }
  return $null
}

function Add-Candidate([System.Collections.ArrayList]$List, [string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return }
  if (!(Test-Path (Join-Path $Path "bin\java.exe"))) { return }
  if (!$List.Contains($Path)) { [void]$List.Add($Path) }
}

function Find-JavaForSource21 {
  $candidates = New-Object System.Collections.ArrayList

  Add-Candidate $candidates $env:JAVA_HOME

  $jdksDir = Join-Path $env:USERPROFILE ".jdks"
  if (Test-Path $jdksDir) {
    Get-ChildItem $jdksDir -Directory -ErrorAction SilentlyContinue |
      ForEach-Object { Add-Candidate $candidates $_.FullName }
  }

  foreach ($base in @(
    "C:\Program Files\Eclipse Adoptium",
    "C:\Program Files\Microsoft",
    "C:\Program Files\Java",
    "$env:LOCALAPPDATA\Programs\Eclipse Adoptium",
    "$env:LOCALAPPDATA\Programs\Java"
  )) {
    if ($base -and (Test-Path $base)) {
      Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Add-Candidate $candidates $_.FullName }
    }
  }

  foreach ($candidate in @(
    "C:\Program Files\Android\Android Studio\jbr",
    "$env:LOCALAPPDATA\Programs\Android Studio\jbr"
  )) {
    Add-Candidate $candidates $candidate
  }

  $compatible = @()
  foreach ($candidate in $candidates) {
    $major = Get-JavaMajor $candidate
    if ($major) {
      if ($major -ge 21 -and $major -le 23) {
        Write-Host ("Compatible Java: {0} (Java {1})" -f $candidate, $major) -ForegroundColor DarkGray
        $compatible += [PSCustomObject]@{ Path = $candidate; Major = $major }
      } else {
        Write-Host ("Skip Java: {0} (Java {1})" -f $candidate, $major) -ForegroundColor DarkYellow
      }
    }
  }

  foreach ($preferred in @(21, 23, 22)) {
    $match = $compatible | Where-Object { $_.Major -eq $preferred } | Select-Object -First 1
    if ($match) { return $match }
  }
  return $null
}

Write-Host "FitMate - Build Signed Android App Bundle" -ForegroundColor Green

$javaSelection = Find-JavaForSource21
if (!$javaSelection) {
  Write-Host ""
  Write-Host "JDK 21-23 TIDAK DITEMUKAN" -ForegroundColor Red
  Write-Host "Dependency Android FitMate saat ini dikompilasi dengan Java source release 21." -ForegroundColor Yellow
  Write-Host "JDK 17 tidak cukup untuk task tersebut." -ForegroundColor Yellow
  Write-Host ""
  throw "JDK 21 diperlukan untuk build ini. Jalankan INSTALL_JDK21_AND_BUILD.bat dari kit v13."
}

$env:JAVA_HOME = $javaSelection.Path
$env:Path = "$($javaSelection.Path)\bin;$env:Path"

Write-Host ""
Write-Host ("Java untuk build: Java {0}" -f $javaSelection.Major) -ForegroundColor Green
Write-Host ("JAVA_HOME={0}" -f $env:JAVA_HOME) -ForegroundColor Cyan
$javaVersionText = Get-JavaVersionText $env:JAVA_HOME
if ($javaVersionText) { Write-Host $javaVersionText -ForegroundColor DarkGray }

Set-Location $ProjectRoot

Write-Host ""
Write-Host "[1/5] Sync Capacitor..."
npm run native:sync
if ($LASTEXITCODE -ne 0) { throw "native:sync gagal." }

Write-Host "[2/5] Verify package name..."
npm run verify:package-name
if ($LASTEXITCODE -ne 0) { throw "Package verification gagal." }

Write-Host "[3/5] Verify Gradle Java..."
Set-Location (Join-Path $ProjectRoot "android")
.\gradlew.bat --stop | Out-Null
.\gradlew.bat -version
if ($LASTEXITCODE -ne 0) { throw "Gradle tidak dapat menggunakan Java yang dipilih." }

Write-Host "[4/5] Build release AAB..."
.\gradlew.bat bundleRelease
if ($LASTEXITCODE -ne 0) { throw "Gradle bundleRelease gagal." }

$aab = Join-Path $ProjectRoot "android\app\build\outputs\bundle\release\app-release.aab"
if (!(Test-Path $aab)) {
  throw "Build selesai tetapi app-release.aab tidak ditemukan."
}

Write-Host "[5/5] Copy release artifact..."
New-Item -ItemType Directory -Force -Path $ReleaseFolder | Out-Null
$dest = Join-Path $ReleaseFolder "FitMate-1.0.0-release.aab"
Copy-Item $aab $dest -Force

Write-Host ""
Write-Host "SIGNED AAB BERHASIL DIBUAT" -ForegroundColor Green
Write-Host $dest -ForegroundColor Cyan
