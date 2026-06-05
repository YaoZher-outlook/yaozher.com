@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-prod-servers.ps1"
if errorlevel 1 pause
