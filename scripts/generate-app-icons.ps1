# Generates Android mipmap and iOS AppIcon assets from assets/app-icon-1024.png
param(
    [string]$Source = (Join-Path $PSScriptRoot "..\assets\app-icon-1024.png")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Resize-Icon {
    param(
        [System.Drawing.Image]$SourceImage,
        [int]$Size,
        [string]$OutputPath
    )

    $dir = Split-Path $OutputPath -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($SourceImage, 0, 0, $Size, $Size)
    $graphics.Dispose()
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$sourcePath = Resolve-Path $Source
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

try {
    $androidRes = Join-Path $root "android\app\src\main\res"
    $androidSizes = @{
        "mipmap-mdpi"    = 48
        "mipmap-hdpi"    = 72
        "mipmap-xhdpi"   = 96
        "mipmap-xxhdpi"  = 144
        "mipmap-xxxhdpi" = 192
    }

    foreach ($folder in $androidSizes.Keys) {
        $size = $androidSizes[$folder]
        $base = Join-Path $androidRes $folder
        Resize-Icon -SourceImage $sourceImage -Size $size -OutputPath (Join-Path $base "ic_launcher.png")
        Resize-Icon -SourceImage $sourceImage -Size $size -OutputPath (Join-Path $base "ic_launcher_round.png")
    }

    $iosSet = Join-Path $root "ios\EBusinessCard\Images.xcassets\AppIcon.appiconset"
    $iosIcons = @(
        @{ File = "Icon-App-20x20@2x.png"; Size = 40 },
        @{ File = "Icon-App-20x20@3x.png"; Size = 60 },
        @{ File = "Icon-App-29x29@2x.png"; Size = 58 },
        @{ File = "Icon-App-29x29@3x.png"; Size = 87 },
        @{ File = "Icon-App-40x40@2x.png"; Size = 80 },
        @{ File = "Icon-App-40x40@3x.png"; Size = 120 },
        @{ File = "Icon-App-60x60@2x.png"; Size = 120 },
        @{ File = "Icon-App-60x60@3x.png"; Size = 180 },
        @{ File = "Icon-App-1024x1024@1x.png"; Size = 1024 }
    )

    foreach ($icon in $iosIcons) {
        Resize-Icon -SourceImage $sourceImage -Size $icon.Size -OutputPath (Join-Path $iosSet $icon.File)
    }

    Write-Host "Generated Android and iOS app icons from $sourcePath"
}
finally {
    $sourceImage.Dispose()
}
