@echo off
cd /d "%~dp0"
if not exist university-ticket-scanner.jar call build-scanner.bat
java -jar university-ticket-scanner.jar
