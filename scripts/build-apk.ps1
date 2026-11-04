# =============================================================================
# Save Shop APK Build Script
# Usage:
#   .\scripts\build-apk.ps1               -> builds with staging env (default)
#   .\scripts\build-apk.ps1 -Env staging  -> staging (https://stg.mysaveshop.online)
#   .\scripts\build-apk.ps1 -Env prod     -> production (https://mysaveshop.online)
# Run from: f:\Study\Save Shop\Save-shop\
# =============================================================================

param(
    [ValidateSet("staging", "prod")]
    [string]$Env = "staging"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Pick the right .env file
$EnvFile = if ($Env -eq "prod") { ".env.production" } else { ".env.staging" }
$EnvPath = Join-Path $ProjectRoot $EnvFile

if (-not (Test-Path $EnvPath)) {
    Write-Error "Env file not found: $EnvPath"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Save Shop APK Builder" -ForegroundColor Cyan
Write-Host "  Environment : $($Env.ToUpper())" -ForegroundColor Yellow
Write-Host "  Env file    : $EnvFile" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load and export each key=value from the .env file
Get-Content $EnvPath | ForEach-Object {
    $line = $_.Trim()
    # Skip blank lines and comments
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Length -eq 2) {
            $key   = $parts[0].Trim()
            $value = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  SET $key = $value" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "Running Gradle build..." -ForegroundColor Green

$AndroidDir = Join-Path $ProjectRoot "android"
Set-Location $AndroidDir

./gradlew clean assembleRelease

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL" -ForegroundColor Green
    $ApkPath = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $ApkPath) {
        Write-Host "  APK: $ApkPath" -ForegroundColor Green
    }
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "BUILD FAILED (exit code $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}
