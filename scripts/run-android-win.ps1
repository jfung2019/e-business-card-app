# Shortens the project path via subst to avoid Windows MAX_PATH (260) CMake failures.
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$driveLetter = "Z:"

if (-not (Test-Path $driveLetter)) {
  subst $driveLetter $projectPath | Out-Null
}

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;C:\Program Files\Android\Android Studio\jbr\bin;$env:PATH"

Set-Location $driveLetter
$packagerArgs = $args
if ($packagerArgs -notcontains "--no-packager") {
  $packagerArgs += "--no-packager"
}
npx react-native run-android @packagerArgs
