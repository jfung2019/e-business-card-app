# React Native setup — image scan test

## Prerequisites

1. **Backend running** (other terminal):
   ```powershell
   cd ..\e-business-card-api
   docker compose up
   ```
2. **Node.js 22+**
3. **Android Studio** (emulator) or a physical Android device with USB debugging
4. For iOS: Mac + Xcode (later)

---

## Step 1 — Install dependencies

```powershell
cd e-business-card-mobile
npm install
```

OCR packages are already in `package.json`:
- `react-native-image-picker`
- `@react-native-ml-kit/text-recognition`

---

## Step 2 — Android permissions & HTTP

Edit `android/app/src/main/AndroidManifest.xml` — add inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.INTERNET" />
```

Inside `<application>` tag add `android:usesCleartextTraffic="true"` (required for `http://10.0.2.2:8000`):

```xml
<application
  android:usesCleartextTraffic="true"
  ...>
```

---

## Step 3 — iOS permissions (Mac only)

Edit `ios/e-business-card-mobile/Info.plist` (or the app target folder under `ios/`):

```xml
<key>NSCameraUsageDescription</key>
<string>Scan business cards with the camera</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Pick a business card photo from your library</string>
```

For iOS simulator HTTP to localhost, add to Info.plist:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

---

## Step 4 — API URL for your device

Edit `src/config/apiConfig.ts`:

| How you run the app | `API_BASE_URL` |
|---------------------|----------------|
| Android emulator | `http://10.0.2.2:8000` (default) |
| iOS simulator | `http://localhost:8000` |
| Physical phone | `http://<YOUR_PC_LAN_IP>:8000` e.g. `http://192.168.1.10:8000` |

Find your PC IP: `ipconfig` → IPv4 Address.

---

## Step 5 — Run the app

**Terminal 1 — Metro:**

```powershell
cd e-business-card-mobile
npm start
```

**Terminal 2 — Android:**

```powershell
cd e-business-card-mobile
npm run android
```

First build takes several minutes. Edits under `src/` hot-reload automatically while Metro is running.

### Windows path length

If the Android build fails with `Filename longer than 260 characters`, enable long paths:

```powershell
# Run PowerShell as Administrator
Set-ItemProperty -Path HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem -Name LongPathsEnabled -Value 1
```

Restart the PC, then rebuild. Alternatively move the repo to a shorter path such as `C:\dev\ebc-mobile`.

---

## Step 6 — Test flow

1. App opens → **Take Photo** or **Choose Image**
2. Select/capture a business card image
3. On-device OCR extracts text → shows **Raw OCR**
4. App calls `POST /api/v1/cards/process`
5. **Contact** + **Additional Details** appear
6. Confirm in MongoDB Compass: `e_business_card` → `captured_cards`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Network error | Check API URL, docker running, cleartext traffic on Android |
| 502 from API | OpenRouter model blocked — use `deepseek/deepseek-chat` in `.env` |
| No text detected | Brighter photo, flat card, less blur |
| Camera won't open | Grant camera permission in device settings |
| Physical device can't reach API | Same Wi‑Fi as PC; use LAN IP not localhost |
| Build fails: path too long (Windows) | Enable `LongPathsEnabled` in registry and restart PC |
| Hot reload not working | Run `npm start` from `e-business-card-mobile`, not a copy folder |
