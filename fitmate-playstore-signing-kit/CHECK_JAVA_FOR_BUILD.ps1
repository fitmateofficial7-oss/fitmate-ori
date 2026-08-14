$paths = @(
  $env:JAVA_HOME,
  "C:\Program Files\Android\Android Studio\jbr"
)

$jdks = Join-Path $env:USERPROFILE ".jdks"
if (Test-Path $jdks) {
  $paths += (Get-ChildItem $jdks -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
}

$paths = $paths | Where-Object { $_ } | Select-Object -Unique
foreach ($p in $paths) {
  $java = Join-Path $p "bin\java.exe"
  if (Test-Path $java) {
    Write-Host ""
    Write-Host $p -ForegroundColor Cyan
    & $java -version
  }
}
Write-Host ""
Write-Host "Untuk Gradle 8.11.1 gunakan Java 17-23. FitMate direkomendasikan JDK 17."
