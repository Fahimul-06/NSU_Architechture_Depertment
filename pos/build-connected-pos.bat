@echo off
cd /d %~dp0
set UNIVERSITY_API_URL=http://localhost:8080
mvn clean package
if errorlevel 1 pause & exit /b 1
java -jar target\university-nfc-pos.jar
