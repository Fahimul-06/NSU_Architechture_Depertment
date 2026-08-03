@echo off
cd /d "%~dp0admin-dashboard"
if not exist node_modules call npm install
call npm run dev
pause
