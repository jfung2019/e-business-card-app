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
- `@react-native-firebase/app` + `@react-native-firebase/auth` (login only; scan images go to API GridFS)
- `react-native-document-scanner-plugin` (camera scan crop/align)
- `@react-navigation/native` + `@react-navigation/native-stack`

---

## Step 2 — Firebase setup (required for login)

Use **two Firebase projects** so dev/debug cannot touch prod users:

| Environment | Firebase project | Android package / iOS bundle ID |
|-------------|------------------|--------------------------------|
| **Dev** | `mega-e-business-card-dev` | `com.megaannumai.ebusinesscard.dev` |
| **Prod** | `mega-e-business-card` | `com.megaannumai.ebusinesscard` |

Skip Google Analytics and Gemini when creating projects — only **Authentication → Email/Password** is required.

### Android

1. In each Firebase project, add an **Android app** with the package name from the table above.
2. Download `google-services.json` into the matching flavor folder:

   | Flavor | Path |
   |--------|------|
   | Prod | `android/app/src/prod/google-services.json` |
   | Dev | `android/app/src/dev/google-services.json` |

   See `*.example` files in those folders for the expected shape.

3. **Debug builds** (default) use the **dev** flavor → `com.megaannumai.ebusinesscard.dev` → dev Firebase.
4. **Release / prod testing** use the **prod** flavor → `com.megaannumai.ebusinesscard` → prod Firebase.

```powershell
# Dev build (default) — EBC Dev app, dev Firebase, dev API
npm run android:win

# Prod flavor debug build — prod Firebase + prod API (for pre-release testing)
npm run android:win:prod
```

### iOS (Mac)

| Command | Bundle ID | Firebase plist |
|---------|-----------|----------------|
| `npm run ios:dev` | `com.megaannumai.ebusinesscard.dev` | `ios/GoogleService-Info-Dev.plist` |
| `npm run ios:prod` | `com.megaannumai.ebusinesscard` | `ios/GoogleService-Info.plist` |
| Release (Archive / TestFlight) | `com.megaannumai.ebusinesscard` | `ios/GoogleService-Info.plist` |

1. Register **both** bundle IDs in the matching Firebase projects.
2. Download plists to `ios/GoogleService-Info-Dev.plist` (dev) and `ios/GoogleService-Info.plist` (prod).
3. See `ios/GoogleService-Info*.plist.example` for reference.

### API (each server)

Download a **service account JSON** per Firebase project (Project settings → Service accounts):

| Server | File | `.env` |
|--------|------|--------|
| Prod (`ebc.megaannum.ai`) | `firebase-service-account.json` | `FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json` |
| Dev + local docker | `firebase-service-account-dev.json` | `FIREBASE_CREDENTIALS_PATH=./firebase-service-account-dev.json` |

After adding `google-services.json` files, rebuild the native app.

Scanned card photos are uploaded with `POST /api/v1/cards/process` and stored in **MongoDB GridFS** on the API server. No Firebase Storage required.

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

## Step 4 — iOS setup (Mac only)

The `ios/` folder is already in Git. You **edit** `Info.plist` in the repo — you do not download it from Apple.

| File | In Git? | Where |
|------|---------|--------|
| `ios/EBusinessCard/Info.plist` | ✅ Yes | App permissions & display name — already configured |
| `ios/GoogleService-Info.plist` | ❌ No (secret) | Download from [Firebase Console](https://console.firebase.google.com/) |

### Firebase iOS app

1. **Dev Firebase** → Add iOS app → Bundle ID **`com.megaannumai.ebusinesscard.dev`**
   - Save `GoogleService-Info-Dev.plist` to `ios/GoogleService-Info-Dev.plist`
2. **Prod Firebase** → Add iOS app → Bundle ID **`com.megaannumai.ebusinesscard`**
   - Save `GoogleService-Info.plist` to `ios/GoogleService-Info.plist`
3. On Mac, open `ios/EBusinessCard.xcworkspace` in Xcode and ensure both plists are in the project (prod plist is bundled for Release; add Dev plist to the target if needed for Debug)

See `ios/GoogleService-Info.plist.example` and `ios/GoogleService-Info-Dev.plist.example`.

### Build on Mac

```bash
git clone https://github.com/jfung2019/e-business-card-app.git e-business-card-mobile
cd e-business-card-mobile
npm install
cd ios && pod install && cd ..

# Copy GoogleService-Info.plist (see above)

npm start          # Terminal 1
### Run on device (dev vs prod)

| Command | Scheme | Install | Firebase | API |
|---------|--------|---------|----------|-----|
| `npm run ios:dev` | `EBusinessCard-Dev` | E-Business Cards **Dev** | `mega-e-business-card-dev` | `focms.megaannum.ai:8001` |
| `npm run ios:prod` | `EBusinessCard-Prod` | E-Business Cards | `mega-e-business-card` | `ebc.megaannum.ai` |

Both are **debug builds** (Metro + fast refresh). Use **Archive / Release** in Xcode for TestFlight.

```bash
cd ios && pod install && cd ..
npm start          # Terminal 1
npm run ios:dev    # Terminal 2 — dev on connected iPhone
npm run ios:prod   # Terminal 2 — prod on connected iPhone
```

Legacy: `npm run ios` = same as `ios:dev` (simulator or device).
```

`Info.plist` already includes camera/photo permissions and `NSAllowsLocalNetworking` for local API dev.

For **TestFlight**, deploy the API to a public HTTPS URL and update `src/config/apiConfig.ts`.

---

## Step 5 — API URL for your device

`src/config/apiConfig.ts` picks the API from the **build environment**:

| Build | API |
|-------|-----|
| Release (prod flavor) | `https://ebc.megaannum.ai` |
| Dev flavor debug (default) | `https://focms.megaannum.ai:8001` |
| Dev flavor + `DEBUG_API_TARGET = 'local'` | `http://10.0.2.2:8000` (Android) / `http://localhost:8000` (iOS) |

Change `DEBUG_API_TARGET` in `apiConfig.ts` only when testing against local docker API.

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
