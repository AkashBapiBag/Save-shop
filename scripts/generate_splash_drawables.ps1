param(
    [string]$bgColorHex = "#FFFFFF",
    [string]$darkBgColorHex = "#0F172A"
)

Add-Type -AssemblyName System.Drawing

$srcPath = "F:\Study\Save Shop\Save-shop\assets\images\splash-icon.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$srcBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $srcPath))

# First find exact bounding box of the circular emblem in the source image
$srcW = $srcBmp.Width
$srcH = $srcBmp.Height
$minX = $srcW; $maxX = 0; $minY = $srcH; $maxY = 0;
for ($y = 0; $y -lt $srcH; $y++) {
    for ($x = 0; $x -lt $srcW; $x++) {
        if ($srcBmp.GetPixel($x, $y).A -gt 15) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
$emblemW = $maxX - $minX + 1
$emblemH = $maxY - $minY + 1
Write-Host "Detected emblem in source image: X=$minX..$maxX ($emblemW px), Y=$minY..$maxY ($emblemH px)"

# Densities and multipliers for Android 12+ SplashScreen
# Android 12 SplashScreen specification:
# Full canvas: 288dp x 288dp
# Safe circular mask: 160dp diameter
# Target emblem diameter: 140dp (leaves 10dp safe buffer on every side inside the 160dp mask)
$targetEmblemDp = 140.0
$densities = [ordered]@{
    "drawable-mdpi" = 1.0
    "drawable-hdpi" = 1.5
    "drawable-xhdpi" = 2.0
    "drawable-xxhdpi" = 3.0
    "drawable-xxxhdpi" = 4.0
}

$resBase = "F:\Study\Save Shop\Save-shop\android\app\src\main\res"

foreach ($dirName in $densities.Keys) {
    $multiplier = $densities[$dirName]
    $canvasSize = [int](288.0 * $multiplier)
    $emblemSize = [int]($targetEmblemDp * $multiplier)
    $destX = [int](($canvasSize - $emblemSize) / 2.0)
    $destY = [int](($canvasSize - $emblemSize) / 2.0)

    $targetDir = Join-Path $resBase $dirName
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    $outBmp = New-Object System.Drawing.Bitmap $canvasSize, $canvasSize
    $g = [System.Drawing.Graphics]::FromImage($outBmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $srcRect = New-Object System.Drawing.Rectangle $minX, $minY, $emblemW, $emblemH
    $destRect = New-Object System.Drawing.Rectangle $destX, $destY, $emblemSize, $emblemSize

    $g.DrawImage($srcBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $outFilePath = Join-Path $targetDir "splashscreen_logo.png"
    $outBmp.Save($outFilePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $outBmp.Dispose()

    Write-Host "Generated $outFilePath ($canvasSize x $canvasSize, emblem: $emblemSize px at X=$destX, Y=$destY)"
}

$srcBmp.Dispose()
Write-Host "All Android splash screen drawables generated successfully!"
