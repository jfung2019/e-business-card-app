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
- `@react-native-firebase/app` + `@react-native-firebase/auth`
- `@react-navigation/native` + `@react-navigation/native-stack`

---

## Step 2 — Firebase setup (required for login)

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Add an **Android app** with package name `com.ebusinesscard`
3. Download `google-services.json` and place it at:
   ```
   android/app/google-services.json
   ```
4. In Firebase Console → **Authentication** → **Sign-in method**:
   - Enable **Email/Password**
   - (Later) enable **Google** for Google Sign-In
5. For the API, download a **service account JSON** from Firebase Console → Project settings → Service accounts → Generate new private key
   - Save as `e-business-card-api/firebase-service-account.json`
   - Set in API `.env`: `FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json`

After adding `google-services.json`, rebuild the Android app (`npm run android`).

---

## Step 3 — Android permissions & HTTP

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

## Step 4 — iOS permissions (Mac only)

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

## Step 5 — API URL for your device

Edit `src/config/apiConfig.ts`:

| How you run the app | `API_BASE_URL` |
|---------------------|----------------|
| Android emulator | `http://10.0.2.2:8000` (default) |
| iOS simulator | `http://localhost:8000` |
| Physical phone | `http://<YOUR_PC_LAN_IP>:8000` e.g. `http://192.168.1.10:8000` |

Find your PC IP: `ipconfig` → IPv4 Address.

---

## Step 6 — Run the app

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

## Step 7 — Test flow

1. App opens → sign in or create an account
2. **Take Photo** or **Choose Image**
3. Select/capture a business card image
4. On-device OCR extracts text → shows **Raw OCR** (ML Kit **Chinese** script — see `src/services/ocr.ts`)
5. App calls `POST /api/v1/cards/process` (with Firebase ID token)
6. **Contact** + **Additional Details** appear
7. Confirm in MongoDB Compass: `e_business_card` → `captured_cards` (`owner_user_id` = Firebase UID)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Network error | Check API URL, docker running, cleartext traffic on Android |
| 502 from API | OpenRouter model blocked — use `deepseek/deepseek-chat` in `.env` |
| No text detected | Brighter photo, flat card, less blur |
| Chinese missing from Raw OCR | Rebuild native app after OCR changes; try better lighting |
| English-only card scans poorly | Chinese script is optimized for 中文; switch to `TextRecognitionScript.LATIN` for EN-only cards |
| Camera won't open | Grant camera permission in device settings |
| Physical device can't reach API | Same Wi‑Fi as PC; use LAN IP not localhost |
| Build fails: path too long (Windows) | Enable `LongPathsEnabled` in registry and restart PC |
| Hot reload not working | Run `npm start` from `e-business-card-mobile`, not a copy folder |
| Login fails / Firebase error | Check `google-services.json` exists and Email/Password is enabled in Firebase Console |
| 401 from API | API needs `firebase-service-account.json` and `FIREBASE_CREDENTIALS_PATH` in `.env` |
| Forgot password | Enter email on login screen → tap **Forgot password?** |
