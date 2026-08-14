param(
  [string]$ProjectRoot = "E:\fitmate",
  [string]$KeysFolder = "E:\FitMateKeys"
)

$ErrorActionPreference = "Stop"

$androidRoot = Join-Path $ProjectRoot "android"
$appGradle = Join-Path $androidRoot "app\build.gradle"
$variablesGradle = Join-Path $androidRoot "variables.gradle"

# v7 deliberately uses a NEW signing-properties filename.
# This avoids the old android\keystore.properties file if Android Studio/Gradle
# currently has it open/locked.
$signingPropertiesPath = Join-Path $androidRoot "fitmate-release-signing.properties"

$keystorePath = Join-Path $KeysFolder "fitmate-upload-key.jks"
$kitRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$credentialFile = Join-Path $kitRoot "FITMATE_KEYSTORE_CREDENTIALS.txt"

if (!(Test-Path $appGradle)) {
  throw "android/app/build.gradle tidak ditemukan di $ProjectRoot"
}
if (!(Test-Path $variablesGradle)) {
  throw "android/variables.gradle tidak ditemukan di $ProjectRoot"
}
if (!(Test-Path $keystorePath)) {
  throw "Keystore tidak ditemukan: $keystorePath"
}
if (!(Test-Path $credentialFile)) {
  throw "FITMATE_KEYSTORE_CREDENTIALS.txt tidak ditemukan di signing kit."
}

Write-Host "Membackup konfigurasi Android..." -ForegroundColor Cyan
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $appGradle "$appGradle.before-v7-$timestamp.bak" -Force
Copy-Item $variablesGradle "$variablesGradle.before-v7-$timestamp.bak" -Force

# Read credentials directly from the signing-kit credential file.
$cred = Get-Content $credentialFile
$storePassword = $null
$keyPassword = $null
$keyAlias = "fitmate-upload"

foreach ($line in $cred) {
  if ($line.StartsWith("Store pass   :")) {
    $storePassword = $line.Substring("Store pass   :".Length).Trim()
  }
  elseif ($line.StartsWith("Key pass     :")) {
    $keyPassword = $line.Substring("Key pass     :".Length).Trim()
  }
  elseif ($line.StartsWith("Alias        :")) {
    $value = $line.Substring("Alias        :".Length).Trim()
    if ($value) { $keyAlias = $value }
  }
}

if (!$storePassword -or !$keyPassword) {
  throw "Password signing tidak dapat dibaca dari FITMATE_KEYSTORE_CREDENTIALS.txt."
}

# Use a brand-new properties file so an existing locked keystore.properties
# can be left completely untouched.
$gradleKeyPath = $keystorePath.Replace("\", "/")
$signingContent = @"
storeFile=$gradleKeyPath
storePassword=$storePassword
keyAlias=$keyAlias
keyPassword=$keyPassword
"@

# Retry briefly in the unlikely event that antivirus/indexing touches the new file.
$written = $false
for ($i = 1; $i -le 5; $i++) {
  try {
    [System.IO.File]::WriteAllText(
      $signingPropertiesPath,
      $signingContent,
      [System.Text.Encoding]::ASCII
    )
    $written = $true
    break
  }
  catch {
    if ($i -eq 5) { throw }
    Start-Sleep -Milliseconds 500
  }
}
if (!$written) {
  throw "Gagal membuat fitmate-release-signing.properties."
}

# Repair SDK values but preserve other Capacitor dependency versions.
$vars = Get-Content $variablesGradle -Raw

# Hapus BOM / karakter pengganti yang bisa muncul di awal file dan membuat Gradle membaca "?ext {".
$vars = $vars.TrimStart([char]0xFEFF)
if ($vars.StartsWith("?ext {")) {
  $vars = $vars.Substring(1)
}
if ($vars.StartsWith([char]0xFFFD)) {
  $vars = $vars.Substring(1)
}

if ($vars -match 'compileSdkVersion\s*=\s*\d+') {
  $vars = [regex]::Replace($vars, 'compileSdkVersion\s*=\s*\d+', 'compileSdkVersion = 35')
} else {
  $vars = $vars -replace 'ext\s*\{', "ext {`r`n    compileSdkVersion = 35"
}

if ($vars -match 'targetSdkVersion\s*=\s*\d+') {
  $vars = [regex]::Replace($vars, 'targetSdkVersion\s*=\s*\d+', 'targetSdkVersion = 35')
} else {
  $vars = $vars -replace 'ext\s*\{', "ext {`r`n    targetSdkVersion = 35"
}

if ($vars -match 'minSdkVersion\s*=\s*\d+') {
  $vars = [regex]::Replace($vars, 'minSdkVersion\s*=\s*\d+', 'minSdkVersion = 23')
} else {
  $vars = $vars -replace 'ext\s*\{', "ext {`r`n    minSdkVersion = 23"
}

[System.IO.File]::WriteAllText($variablesGradle, $vars, [System.Text.Encoding]::ASCII)

# Rebuild app/build.gradle with a safe signing configuration.
# IMPORTANT: use fitmate-release-signing.properties, NOT the locked keystore.properties.
$buildGradle = @'
apply plugin: 'com.android.application'

def fitmateSigningPropertiesFile = rootProject.file("fitmate-release-signing.properties")
def fitmateSigningProperties = new Properties()
if (fitmateSigningPropertiesFile.exists()) {
    fitmateSigningProperties.load(new FileInputStream(fitmateSigningPropertiesFile))
}

android {
    namespace "com.growsia.fitmate"
    compileSdk rootProject.ext.compileSdkVersion

    signingConfigs {
        release {
            if (
                fitmateSigningPropertiesFile.exists() &&
                fitmateSigningProperties['storeFile'] &&
                fitmateSigningProperties['storePassword'] &&
                fitmateSigningProperties['keyAlias'] &&
                fitmateSigningProperties['keyPassword']
            ) {
                storeFile file(fitmateSigningProperties['storeFile'])
                storePassword fitmateSigningProperties['storePassword']
                keyAlias fitmateSigningProperties['keyAlias']
                keyPassword fitmateSigningProperties['keyPassword']
            }
        }
    }

    defaultConfig {
        applicationId "com.growsia.fitmate"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
            ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

repositories {
    flatDir {
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    testImplementation "junit:junit:$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
    implementation project(':capacitor-cordova-android-plugins')
}

apply from: 'capacitor.build.gradle'

try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
}
'@

[System.IO.File]::WriteAllText($appGradle, $buildGradle, [System.Text.Encoding]::ASCII)

# Protect all signing secrets from Git.
$gitignore = Join-Path $ProjectRoot ".gitignore"
if (!(Test-Path $gitignore)) {
  New-Item -ItemType File -Path $gitignore | Out-Null
}
$existing = Get-Content $gitignore -Raw
$ignoreEntries = @(
  "android/keystore.properties",
  "android/fitmate-release-signing.properties",
  "*.jks",
  "*.keystore"
)
foreach ($entry in $ignoreEntries) {
  if ($existing -notmatch [regex]::Escape($entry)) {
    Add-Content -Path $gitignore -Value $entry
  }
}

Write-Host ""
Write-Host "ANDROID GRADLE BERHASIL DIPERBAIKI" -ForegroundColor Green
Write-Host "Package       : com.growsia.fitmate"
Write-Host "compileSdk    : 35"
Write-Host "targetSdk     : 35"
Write-Host "minSdk        : 23"
Write-Host "versionCode   : 1"
Write-Host "versionName   : 1.0.0"
Write-Host "Signing key   : $keystorePath"
Write-Host "Signing props : $signingPropertiesPath"
Write-Host ""
Write-Host "File android\keystore.properties lama TIDAK disentuh." -ForegroundColor Yellow
Write-Host "Backup build.gradle/variables.gradle lama sudah dibuat." -ForegroundColor DarkGray
