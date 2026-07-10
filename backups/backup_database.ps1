# =============================================================================
# HRMS PostgreSQL backup script
# - Dumps the HRMS database (reads credentials from LARAVEL\.env)
# - Copies uploaded files (storage\app) incrementally, never deletes
# - Keeps the 5 newest dumps always; removes dumps older than 30 days
#
# Run manually:      powershell -ExecutionPolicy Bypass -File D:\HRMS\backups\backup_database.ps1
# Schedule daily:    powershell -ExecutionPolicy Bypass -File D:\HRMS\backups\backup_database.ps1 -Install
# =============================================================================
param([switch]$Install)

$ErrorActionPreference = "Stop"
$backupDir = $PSScriptRoot
$root      = Split-Path -Parent $backupDir
$logFile   = Join-Path $backupDir "backup_log.txt"

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
    Add-Content -Path $logFile -Value $line
    Write-Host $line
}

# --- Install as daily scheduled task (8:00 PM) -------------------------------
# Runs as SYSTEM (not the interactive user) so it fires even if nobody is
# logged in, the screen is locked, or the machine is on battery. Requires an
# elevated (Run as Administrator) PowerShell session to register.
if ($Install) {
    $action    = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$backupDir\backup_database.ps1`""
    $trigger   = New-ScheduledTaskTrigger -Daily -At 8:00PM
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Hours 1)
    Register-ScheduledTask -TaskName "HRMS DB Backup" -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
        -Description "Nightly HRMS PostgreSQL dump + storage file backup. Runs as SYSTEM regardless of login/battery state." -Force | Out-Null
    Write-Host "Scheduled task 'HRMS DB Backup' created (daily at 20:00, runs as SYSTEM)."
    Write-Host "Running a first backup now..."
}

# --- Read DB credentials from Laravel .env -----------------------------------
$envFile = Join-Path $root "LARAVEL\.env"
if (-not (Test-Path $envFile)) { Log "ERROR: $envFile not found"; exit 1 }
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $envVars[$Matches[1]] = $Matches[2].Trim().Trim('"') }
}
$dbHost = $envVars['DB_HOST'];     $dbPort = $envVars['DB_PORT']
$dbName = $envVars['DB_DATABASE']; $dbUser = $envVars['DB_USERNAME']
$env:PGPASSWORD = $envVars['DB_PASSWORD']

# --- Locate pg_dump -----------------------------------------------------------
$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
if (-not $pgDump) {
    $candidates = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending
    if ($candidates) { $pgDump = $candidates[0].FullName }
}
if (-not $pgDump) { Log "ERROR: pg_dump.exe not found. Install PostgreSQL client tools or add them to PATH."; exit 1 }

# --- Dump the database ---------------------------------------------------------
$stamp    = Get-Date -Format "yyyy-MM-dd_HHmm"
$dumpFile = Join-Path $backupDir "HRMS_$stamp.dump"
& $pgDump -h $dbHost -p $dbPort -U $dbUser -d $dbName -F c -f $dumpFile
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dumpFile) -or (Get-Item $dumpFile).Length -eq 0) {
    Log "ERROR: pg_dump failed (exit $LASTEXITCODE)"; exit 1
}
Log "OK: database dumped to $dumpFile ($([math]::Round((Get-Item $dumpFile).Length / 1KB)) KB)"

# --- Back up uploaded files (additive copy, never deletes) --------------------
$storageSrc = Join-Path $root "LARAVEL\storage\app"
$storageDst = Join-Path $backupDir "storage_files"
robocopy $storageSrc $storageDst /E /XO /R:1 /W:1 /NP /NFL /NDL | Out-Null
if ($LASTEXITCODE -le 7) { Log "OK: storage files copied to $storageDst" }
else { Log "WARNING: robocopy exit code $LASTEXITCODE while copying storage files" }

# --- Rotate old dumps (keep 5 newest always; delete others older than 30 days) -
$dumps = Get-ChildItem (Join-Path $backupDir "HRMS_*.dump") | Sort-Object LastWriteTime -Descending
if ($dumps.Count -gt 5) {
    $dumps | Select-Object -Skip 5 | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | ForEach-Object {
        Remove-Item $_.FullName; Log "Rotated out old dump: $($_.Name)"
    }
}

Log "Backup finished successfully."
