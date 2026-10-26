Add-Type -AssemblyName System.Drawing
$destDir = "F:\Study\Save Shop\Save-shop\public\icons"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force }
$srcPath = "F:\Study\Save Shop\Save-shop\assets\images\icon.png"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Img($w, $h, $out) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $w, $h)
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Resize-Img 192 192 "$destDir\icon-192.png"
Resize-Img 512 512 "$destDir\icon-512.png"

$maskBmp = New-Object System.Drawing.Bitmap 512, 512
$mg = [System.Drawing.Graphics]::FromImage($maskBmp)
$mg.Clear([System.Drawing.ColorTranslator]::FromHtml('#208AEF'))
$mg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$mg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$mg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$padding = [int](512 * 0.1)
$innerSize = 512 - ($padding * 2)
$mg.DrawImage($srcImg, $padding, $padding, $innerSize, $innerSize)
$maskBmp.Save("$destDir\icon-maskable-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$mg.Dispose()
$maskBmp.Dispose()

$srcImg.Dispose()
Write-Host "PWA icons created successfully"
