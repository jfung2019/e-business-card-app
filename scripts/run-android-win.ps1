# Builds/installs Android on Windows via subst to avoid CMake MAX_PATH failures.
# Usage:
#   npm run android:win              # dev flavor (default) — com.megaannumai.ebusinesscard.dev
#   npm run android:win:prod         # prod flavor — com.megaannumai.ebusinesscard
#   npm run android:win:device       # physical phone (arm64 + --device <serial>)
#   npm run android:win -- --install-only

param(
  [switch]$Device,
  [switch]$InstallOnly,
  [switch]$Prod
)

$ErrorActionPreference = "Stop"

$projectPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$driveLetter = "Z:"

function Ensure-SubstDrive {
  param([string]$Letter, [string]$TargetPath)

  if (Test-Path $Letter) {
    $existingTarget = (Get-Item $Letter).Target
    if ($existingTarget -and ($existingTarget -eq $TargetPath)) {
      return
    }
    subst $Letter /d | Out-Null
  }

  subst $Letter $TargetPath | Out-Null
}

Ensure-SubstDrive -Letter $driveLetter -TargetPath $projectPath

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$jbrHome = "C:\Program Files\Android\Android Studio\jbr"
if (-not (Test-Path (Join-Path $jbrHome "bin\java.exe"))) {
  Write-Error "Android Studio JBR not found at $jbrHome. Install Android Studio and retry."
  exit 1
}
$env:JAVA_HOME = $jbrHome
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

# JDK 24+ prints a native-access warning that AGP CMake treats as configure failure.
# java -version writes to stderr; use cmd so PowerShell Stop does not treat it as failure.
$javaVersionLine = cmd /c "`"$env:JAVA_HOME\bin\java.exe`" -version 2>&1"
if ("$javaVersionLine" -match '"(\d+)') {
  $javaMajor = [int]$Matches[1]
  Write-Host "JAVA_HOME=$env:JAVA_HOME (JDK $javaMajor)"
  if ($javaMajor -ge 24) {
    $nativeAccess = "--enable-native-access=ALL-UNNAMED"
    if ("$env:JAVA_TOOL_OPTIONS" -notmatch "enable-native-access") {
      $env:JAVA_TOOL_OPTIONS = ("$env:JAVA_TOOL_OPTIONS $nativeAccess").Trim()
    }
    if ("$env:GRADLE_OPTS" -notmatch "enable-native-access") {
      $env:GRADLE_OPTS = ("$env:GRADLE_OPTS $nativeAccess").Trim()
    }
  }
} else {
  Write-Host "JAVA_HOME=$env:JAVA_HOME"
}

$connectedDevices = & adb devices 2>$null |
  Select-Object -Skip 1 |
  Where-Object { $_ -match "\tdevice$" }

$hasPhysicalDevice = @($connectedDevices | Where-Object { $_ -notmatch "emulator-" }).Count -gt 0
$arch = if ($Device -or $hasPhysicalDevice) { "arm64-v8a" } else { "x86_64" }
$gradleArgs = @("-PreactNativeArchitectures=$arch")

$variant = if ($Prod) { "prodDebug" } else { "devDebug" }
$installTask = if ($Prod) { "app:installProdDebug" } else { "app:installDevDebug" }

Write-Host "Using $driveLetter -> $projectPath"
Write-Host "Building for architecture: $arch"
Write-Host "Android variant: $variant"

if ($InstallOnly) {
  Set-Location "$driveLetter\android"
  & .\gradlew.bat $installTask @gradleArgs
  exit $LASTEXITCODE
}

Set-Location $driveLetter
$packagerArgs = @($args | Where-Object {
    $_ -ne "--device" -and $_ -ne "--install-only" -and $_ -ne "--prod"
  })
if ($packagerArgs -notcontains "--no-packager") {
  $packagerArgs += "--no-packager"
}
# RN CLI --device requires a serial. A bare --device steals the next flag
# (e.g. --mode) and fails with: Could not find device: "--mode".
if ($Device) {
  $physicalIds = @(
    $connectedDevices |
      Where-Object { $_ -notmatch "emulator-" } |
      ForEach-Object { ($_ -split "\s+")[0] } |
      Where-Object { $_ }
  )
  if ($physicalIds.Count -eq 0) {
    Write-Error "No physical Android device connected. Enable USB debugging and run: adb devices"
    exit 1
  }
  if ($packagerArgs -notcontains "--device") {
    $packagerArgs += "--device"
    $packagerArgs += $physicalIds[0]
  }
  Write-Host "Target device: $($physicalIds[0])"
}
if ($packagerArgs -notcontains "--mode") {
  $packagerArgs += "--mode"
  $packagerArgs += $variant
}
# Dev flavor installs applicationIdSuffix ".dev". Without --appId the CLI
# launches com.megaannumai.ebusinesscard/.MainActivity (prod) and fails
# with "Activity class does not exist" even though install succeeded.
$appId = if ($Prod) { "com.megaannumai.ebusinesscard" } else { "com.megaannumai.ebusinesscard.dev" }
if ($packagerArgs -notcontains "--appId") {
  $packagerArgs += "--appId"
  $packagerArgs += $appId
}

$extraParams = ($gradleArgs | ForEach-Object { $_ }) -join " "
npx react-native run-android --extra-params $extraParams @packagerArgs
