# NSU Architecture Windows Installers

The build produces two self-contained Windows installers:

- `NSU Architecture POS-1.1.0.exe`
- `NSU Architecture Scanner-1.1.0.exe`

Both installers bundle a private Java runtime. Java and Maven are not required on PCs where the applications are installed.

## First launch

### POS
The first launch asks for:

1. Backend API URL, for example `https://nsu-architecture-api.onrender.com`
2. POS terminal ID, for example `POS-01`

Settings are stored at:

`%USERPROFILE%\.nsu-architecture-pos\config.properties`

To change settings later, open Command Prompt and run the installed launcher with:

`"NSU Architecture POS.exe" --configure`

Alternatively, delete the configuration file and relaunch the app.

### Scanner
The first launch asks for the backend API URL.

Settings are stored at:

`%USERPROFILE%\.nsu-architecture-scanner\config.properties`

To change it later, run:

`"NSU Architecture Scanner.exe" --configure`

## NFC and QR hardware

USB NFC readers and QR scanners should operate in HID keyboard-emulation mode: scan/tap, type the value, then send Enter.

## Building locally

Requirements on the build PC only:

- Windows 10 or 11
- JDK 21 with `jpackage`
- Maven 3.9+
- WiX Toolset supported by the installed JDK/jpackage

Run PowerShell:

`powershell -ExecutionPolicy Bypass -File windows-installer\build-windows-installers.ps1`

## Building through GitHub Actions

Push the project to GitHub, open **Actions**, select **Build Windows Installers**, and choose **Run workflow**. Download the `nsu-architecture-windows-installers` artifact after the job completes.


## Version 1.3.1 queue display

After a student checks in by NFC or QR, the scanner displays the faculty response. When the faculty marks the appointment Completed, the scanner automatically displays the next checked-in student's token and student ID.
