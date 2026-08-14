$ErrorActionPreference = "Stop"

$candidates = @(
  "C:\Program Files\Android\Android Studio\jbr",
  "C:\Program Files\Android\Android Studio\jre",
  "$env:LOCALAPPDATA\Programs\Android Studio\jbr",
  "$env:LOCALAPPDATA\Programs\Android Studio\jre"
)

$javaHome = $null
foreach ($candidate in $candidates) {
  if ($candidate -and (Test-Path (Join-Path $candidate "bin\java.exe"))) {
    $javaHome = $candidate
    break
  }
}

if (!$javaHome) {
  throw "Android Studio JDK/JBR tidak ditemukan otomatis."
}

[Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "User")

$currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$javaBin = "$javaHome\bin"

if ([string]::IsNullOrWhiteSpace($currentUserPath)) {
  $newUserPath = $javaBin
} elseif ($currentUserPath -notlike "*$javaBin*") {
  $newUserPath = "$javaBin;$currentUserPath"
} else {
  $newUserPath = $currentUserPath
}

[Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")

Write-Host "JAVA_HOME user berhasil diset:" -ForegroundColor Green
Write-Host $javaHome
Write-Host "Tutup dan buka kembali PowerShell agar environment baru terbaca."
