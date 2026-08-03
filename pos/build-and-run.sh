#!/usr/bin/env bash
set -euo pipefail
command -v java >/dev/null || { echo 'Java 17+ is required.'; exit 1; }
command -v mvn >/dev/null || { echo 'Maven is required.'; exit 1; }
mvn clean package
java -jar target/university-nfc-pos.jar
