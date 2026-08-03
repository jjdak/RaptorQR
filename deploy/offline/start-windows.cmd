@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if not errorlevel 1 (
  py -3 offline-server.py
  goto :eof
)

where python >nul 2>nul
if not errorlevel 1 (
  python offline-server.py
  goto :eof
)

where node >nul 2>nul
if not errorlevel 1 (
  node offline-server.mjs
  goto :eof
)

echo Python and Node.js were not found. Starting the built-in PowerShell server...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0offline-server.ps1"
