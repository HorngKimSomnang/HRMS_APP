@echo off
title HRMS Dev Environment

echo Starting HRMS...

:: Silent background DB backup (no window, no prompt, doesn't block startup)
start "" /B powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "d:\HRMS\backups\backup_database.ps1" >nul 2>&1

:: Mobile API tunnel (start only when it is not already running)
tasklist /FI "IMAGENAME eq ngrok.exe" 2>NUL | find /I "ngrok.exe" >NUL
if errorlevel 1 start "" /B "C:\Users\chaly\AppData\Roaming\npm\node_modules\ngrok\bin\ngrok.exe" http --domain=lilla-semivulcanized-geopolitically.ngrok-free.dev 8000 >nul 2>&1

:: Laravel: scheduler runs silently in background, server in foreground
start "Laravel API" cmd /k "cd /d d:\HRMS\LARAVEL && start /B php artisan schedule:work >nul 2>&1 && php artisan serve"

:: React Admin Panel
start "React Admin" cmd /k "cd /d d:\HRMS\REACT && npm run dev"

echo.
echo  Laravel  ^> http://localhost:8000
echo  React    ^> http://localhost:5173
echo.
timeout /t 2 >nul
