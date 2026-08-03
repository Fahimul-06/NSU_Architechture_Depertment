@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-windows-installers.ps1"
if errorlevel 1 (
  echo.
  echo Installer build failed. Read the error above.
  pause
  exit /b 1
)
pause
