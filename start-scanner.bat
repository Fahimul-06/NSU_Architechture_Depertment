@echo off
start "Ticket Scanner" cmd /k "cd /d %~dp0scanner && run-scanner.bat"
