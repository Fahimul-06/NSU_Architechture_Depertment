# NSU Architecture NFC Service POS

A runnable Java Swing POS prototype for university faculty-office appointments.

## Features

- NFC card UID input (works with keyboard-emulation USB readers)
- Registered student verification
- Department, faculty, and service selection
- Separate service duration per student
- Automatic next-slot allocation
- Unique token and appointment ID
- QR ticket generation
- Native printer dialog for thermal/standard printers
- Demo data included

## Requirements

- Java 17 or newer
- Maven 3.9 or newer

## Run in development

```bash
mvn clean package
java -jar target/university-nfc-pos.jar
```

## Demo NFC cards

- `04A37C92B180` — Nujhat Raisa Arpa
- `04BB219AB771` — Fahimul Arefin
- `04CC55AA1020` — Mahin Ahmed

## NFC reader setup

Many USB NFC readers can operate as keyboard-emulation devices. Configure the reader to type the card UID and send Enter. Click the UID field once; subsequent taps are accepted like keyboard input.

For an ACR122U using PC/SC mode, replace the keyboard input with a PC/SC reader service. The UI and business flow can remain unchanged.

## Production integration points

The included `DemoRepository` is intentionally local so the POS runs immediately. Replace it with an HTTP API client connected to the central Node/Express/MongoDB backend. The server must reserve appointment slots atomically to prevent duplicate bookings across multiple kiosks.

## Connected mode
This version reads all records and creates appointments through the shared backend.
Start `../backend` first, or run `../start-all.bat`.
The default API is `http://localhost:8080`. Override it with `UNIVERSITY_API_URL`.


## Receive NFC taps from Android

Start the POS with a unique terminal code:

```powershell
java -Dterminal.id=POS-01 -Dapi.url=https://YOUR-API.onrender.com -jar target\university-nfc-pos.jar
```

The waiting screen polls the backend every 1.2 seconds. When the paired Android scanner reads an active student card, the POS automatically displays the student profile and enables service booking. Sessions expire after two minutes and are consumed only once.
