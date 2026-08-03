@echo off
setlocal
cd /d "%~dp0"
where javac >nul 2>nul || (echo Java JDK 17 or newer is required.& pause & exit /b 1)
if exist build rmdir /s /q build
mkdir build\classes
for /r src\main\java %%f in (*.java) do echo "%%f">>build\sources.txt
javac -encoding UTF-8 -d build\classes @build\sources.txt || (pause & exit /b 1)
echo Main-Class: com.university.scanner.Main>build\manifest.txt
jar cfm university-ticket-scanner.jar build\manifest.txt -C build\classes .
echo Scanner built successfully: university-ticket-scanner.jar
pause
