@echo off
setlocal
where java >nul 2>nul || (echo Java 17+ is required.& pause & exit /b 1)
where mvn >nul 2>nul || (echo Maven is required. Install Maven and add it to PATH.& pause & exit /b 1)
call mvn clean package
if errorlevel 1 (echo Build failed.& pause & exit /b 1)
java -jar target\university-nfc-pos.jar
