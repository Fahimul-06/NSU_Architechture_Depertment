#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
rm -rf build && mkdir -p build/classes
find src/main/java -name '*.java' > build/sources.txt
javac -encoding UTF-8 -d build/classes @build/sources.txt
printf 'Main-Class: com.university.scanner.Main\n' > build/manifest.txt
jar cfm university-ticket-scanner.jar build/manifest.txt -C build/classes .
echo "Built university-ticket-scanner.jar"
