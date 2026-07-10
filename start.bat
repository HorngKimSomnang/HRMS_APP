@echo off
title HRMS Dev Environment

echo Starting HRMS...

:: Silent background DB backup (no window, no prompt, doesn't block startup)
start "" /B powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "d:\HRMS\backups\backup_database.ps1" >nul 2>&1

:: Laravel: scheduler runs silently in background, server in foreground
start "Laravel API" cmd /k "cd /d d:\HRMS\LARAVEL && start /B php artisan schedule:work >nul 2>&1 && php artisan serve"

:: React Admin Panel
start "React Admin" cmd /k "cd /d d:\HRMS\REACT && npm run dev"

echo.
echo  Laravel  ^> http://localhost:8000
echo  React    ^> http://localhost:5173
echo.
timeout /t 2 >nul
