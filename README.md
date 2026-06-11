# E-Business Card Mobile

React Native (TypeScript) app for scanning business cards and sending OCR text to the API.

## Prerequisites

- Node.js 22+
- Android Studio + emulator (Windows) or Xcode (Mac, for iOS later)
- API running: `../e-business-card-api` → `docker compose up`

## Run (Android)

**Terminal 1 — API:**
```powershell
cd ..\e-business-card-api
docker compose up
```

**Terminal 2 — Metro:**
```powershell
cd e-business-card-mobile
npm start
```

**Terminal 3 — Android:**
```powershell
cd e-business-card-mobile

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;C:\Program Files\Android\Android Studio\jbr\bin;$env:PATH"

npm run android
```

## API URL

Edit `src/config/apiConfig.ts`:

| Target | URL |
|--------|-----|
| Android emulator | `http://10.0.2.2:8000` (default) |
| Physical device | `http://<your-PC-LAN-IP>:8000` |

## Key modules

| Path | Role |
|------|------|
| `src/services/ocr.ts` | Camera/gallery + ML Kit text extraction |
| `src/api/cards.ts` | `POST /api/v1/cards/process` |
| `src/screens/ScanScreen.tsx` | Full scan → parse → display flow |

See `SETUP.md` for detailed setup and troubleshooting.
