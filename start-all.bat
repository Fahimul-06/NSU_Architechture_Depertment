@echo off
set ROOT=%~dp0
start "University API" cmd /k "cd /d %ROOT%backend && npm start"
timeout /t 2 /nobreak >nul
start "Faculty Dashboard" cmd /k "cd /d %ROOT%faculty-dashboard && npm install && npm run dev"
echo Backend and dashboard are starting.
echo Then run POS with: cd pos ^&^& mvn clean package ^&^& java -jar target\university-nfc-pos.jar
pause
