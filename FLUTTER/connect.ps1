# ADB Port Forwarding Script
# This allows your Phone/Emulator to access the Laptop's localhost (127.0.0.1)

Write-Host "--- HRMS Connection Setup ---" -ForegroundColor Cyan

# 1. Check if adb is available
if (!(Get-Command adb -ErrorAction SilentlyContinue)) {
    Write-Host "Warning: 'adb' not found in PATH. Trying common locations..." -ForegroundColor Yellow
    $adbPaths = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "C:\Android\platform-tools\adb.exe",
        "D:\Android\platform-tools\adb.exe"
    )
    foreach ($path in $adbPaths) {
        if (Test-Path $path) {
            $adb = $path
            break
        }
    }
} else {
    $adb = "adb"
}

if (!$adb) {
    Write-Host "ERROR: Could not find adb.exe. Please ensure Android SDK is installed." -ForegroundColor Red
    exit 1
}

# 2. Run ADB Reverse
Write-Host "Configuring ADB reverse for port 8000..." -ForegroundColor Yellow
& $adb reverse tcp:8000 tcp:8000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Your device can now access http://127.0.0.1:8000" -ForegroundColor Green
} else {
    Write-Host "FAILED: Is your device connected and USB debugging enabled?" -ForegroundColor Red
    Write-Host "Checking connected devices..."
    & $adb devices
}

Write-Host "`nMake sure your Laravel backend is running (php artisan serve)." -ForegroundColor Cyan
