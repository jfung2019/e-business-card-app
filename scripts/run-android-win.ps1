# Builds/installs Android on Windows via subst to avoid CMake MAX_PATH failures.
# Usage:
#   npm run android:win              # run on emulator or connected device
#   npm run android:win -- --device  # prefer a physical device when available
#   npm run android:win -- --install-only

param(
  [switch]$Device,
  [switch]$InstallOnly
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
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;C:\Program Files\Android\Android Studio\jbr\bin;$env:PATH"

$connectedDevices = & adb devices 2>$null |
  Select-Object -Skip 1 |
  Where-Object { $_ -match "\tdevice$" }

$hasPhysicalDevice = @($connectedDevices | Where-Object { $_ -notmatch "emulator-" }).Count -gt 0
$arch = if ($Device -or $hasPhysicalDevice) { "arm64-v8a" } else { "x86_64" }
$gradleArgs = @("-PreactNativeArchitectures=$arch")

Write-Host "Using $driveLetter -> $projectPath"
Write-Host "Building for architecture: $arch"

if ($InstallOnly) {
  Set-Location "$driveLetter\android"
  & .\gradlew.bat app:installDebug @gradleArgs
  exit $LASTEXITCODE
}

Set-Location $driveLetter
$packagerArgs = @($args | Where-Object { $_ -ne "--device" -and $_ -ne "--install-only" })
if ($packagerArgs -notcontains "--no-packager") {
  $packagerArgs += "--no-packager"
}
if ($Device -and $packagerArgs -notcontains "--device") {
  $packagerArgs += "--device"
}

$extraParams = ($gradleArgs | ForEach-Object { $_ }) -join " "
npx react-native run-android --extra-params $extraParams @packagerArgs
