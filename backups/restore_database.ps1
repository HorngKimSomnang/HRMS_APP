# =============================================================================
# HRMS PostgreSQL restore script
# Usage:
#   powershell -ExecutionPolicy Bypass -File D:\HRMS\backups\restore_database.ps1 -DumpFile D:\HRMS\backups\HRMS_2026-07-02_2000.dump
# If -DumpFile is omitted, the newest dump in this folder is used.
# =============================================================================
param([string]$DumpFile)

$ErrorActionPreference = "Stop"
$backupDir = $PSScriptRoot
$root      = Split-Path -Parent $backupDir

if (-not $DumpFile) {
    $latest = Get-ChildItem (Join-Path $backupDir "HRMS_*.dump") | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { Write-Error "No dump files found in $backupDir"; exit 1 }
    $DumpFile = $latest.FullName
}
if (-not (Test-Path $DumpFile)) { Write-Error "Dump file not found: $DumpFile"; exit 1 }

# Read DB credentials from Laravel .env
$envVars = @{}
Get-Content (Join-Path $root "LARAVEL\.env") | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $envVars[$Matches[1]] = $Matches[2].Trim().Trim('"') }
}
$env:PGPASSWORD = $envVars['DB_PASSWORD']

# Locate pg_restore
$pgRestore = (Get-Command pg_restore -ErrorAction SilentlyContinue).Source
if (-not $pgRestore) {
    $candidates = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_restore.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending
    if ($candidates) { $pgRestore = $candidates[0].FullName }
}
if (-not $pgRestore) { Write-Error "pg_restore.exe not found"; exit 1 }

Write-Host "About to restore '$DumpFile' into database '$($envVars['DB_DATABASE'])'."
Write-Host "This REPLACES current data in that database with the backup's contents."
$confirm = Read-Host "Type YES to continue"
if ($confirm -ne "YES") { Write-Host "Cancelled."; exit 0 }

& $pgRestore -h $envVars['DB_HOST'] -p $envVars['DB_PORT'] -U $envVars['DB_USERNAME'] `
    -d $envVars['DB_DATABASE'] --clean --if-exists --no-owner $DumpFile

if ($LASTEXITCODE -eq 0) { Write-Host "Restore completed successfully." }
else { Write-Warning "pg_restore finished with exit code $LASTEXITCODE (some warnings are normal)." }
