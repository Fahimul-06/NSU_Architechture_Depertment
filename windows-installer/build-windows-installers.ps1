$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Out = Join-Path $Root 'installers'

function Require-Command($Name, $Help) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is required. $Help"
    }
}

Require-Command java 'Install JDK 21.'
Require-Command javac 'Install JDK 21, not only a JRE.'
Require-Command jar 'Install JDK 21.'
Require-Command jpackage 'Install JDK 21 containing jpackage.'
Require-Command mvn 'Install Apache Maven 3.9 or newer.'

Write-Host 'Building POS...' -ForegroundColor Cyan
Push-Location (Join-Path $Root 'pos')
mvn -B clean package
Pop-Location
$PosJar = Join-Path $Root 'pos\target\university-nfc-pos.jar'
if (-not (Test-Path $PosJar)) { throw 'POS JAR was not created.' }

Write-Host 'Building scanner...' -ForegroundColor Cyan
$Scanner = Join-Path $Root 'scanner'
$Classes = Join-Path $Scanner 'build\classes'
Remove-Item $Classes -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $Classes | Out-Null
$Sources = Get-ChildItem -Path (Join-Path $Scanner 'src\main\java') -Recurse -Filter *.java | ForEach-Object FullName
$SourcesFile = Join-Path $Scanner 'build\sources.txt'
$Sources | Set-Content $SourcesFile
& javac --release 17 -d $Classes "@$SourcesFile"
$Manifest = Join-Path $Scanner 'build\manifest.txt'
"Manifest-Version: 1.0`r`nMain-Class: com.university.scanner.Main`r`n" | Set-Content -Encoding ascii $Manifest
$ScannerJar = Join-Path $Scanner 'university-ticket-scanner.jar'
& jar cfm $ScannerJar $Manifest -C $Classes .

Remove-Item $Out -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $Out | Out-Null

Write-Host 'Building POS installer...' -ForegroundColor Cyan
& jpackage --type exe --name 'NSU Architecture POS' --app-version 1.6.0 `
  --vendor 'North South University Architecture' `
  --description 'NFC appointment ticket POS for the NSU Architecture Department' `
  --input (Join-Path $Root 'pos\target') --main-jar university-nfc-pos.jar `
  --main-class com.university.pos.Main --dest $Out --win-menu `
  --win-menu-group 'NSU Architecture' --win-shortcut --win-dir-chooser --win-per-user-install

Write-Host 'Building scanner installer...' -ForegroundColor Cyan
$ScannerInput = Join-Path $Scanner 'package-input'
Remove-Item $ScannerInput -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $ScannerInput | Out-Null
Copy-Item $ScannerJar $ScannerInput
& jpackage --type exe --name 'NSU Architecture Scanner' --app-version 1.6.0 `
  --vendor 'North South University Architecture' `
  --description 'NFC and QR appointment validation scanner' `
  --input $ScannerInput --main-jar university-ticket-scanner.jar `
  --main-class com.university.scanner.Main --dest $Out --win-menu `
  --win-menu-group 'NSU Architecture' --win-shortcut --win-dir-chooser --win-per-user-install

Copy-Item (Join-Path $PSScriptRoot 'README-WINDOWS-INSTALLERS.md') $Out
Write-Host "Installers created in $Out" -ForegroundColor Green
Get-ChildItem $Out
