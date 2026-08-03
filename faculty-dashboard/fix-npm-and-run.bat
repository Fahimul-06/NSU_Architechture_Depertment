@echo off
setlocal
cd /d "%~dp0"
echo Setting npm to the public npm registry...
call npm config delete proxy
call npm config delete https-proxy
call npm config set registry https://registry.npmjs.org/

echo Cleaning old installation files...
if exist node_modules rmdir /s /q node_modules
call npm cache clean --force

echo Installing dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo Installation failed. Check your internet connection, firewall, VPN, or Node.js version.
  pause
  exit /b 1
)

echo Starting dashboard...
call npm run dev
