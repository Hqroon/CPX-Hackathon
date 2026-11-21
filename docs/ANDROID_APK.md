# Building the Android APK (Capacitor)

The web app in `frontend/` is wrapped into a real Android app with **Capacitor**. The same React code runs inside an Android WebView. The **50 videos are packed into the APK**, so scrolling works with no network. Only question generation calls the backend, and it falls back to built-in questions if the backend can't be reached.

**Who:** the teammate building the APK, on their own laptop.
**Time:** about 30–45 minutes the first time, mostly the Android Studio download and the first Gradle sync. **Use a good network** (phone hotspot), not the venue Wi-Fi.

---

## 1. Install once
1. **Node.js 20+.** Check with `node --version`.
2. **Android Studio** (latest): https://developer.android.com/studio. It includes the JDK that Gradle needs.
   - First launch: choose **Standard** setup and let it download the Android SDK.
   - **Settings → Languages & Frameworks → Android SDK**: make sure **Android 15 (API 35)** is installed.
3. **On the Android phone:** Settings → About phone → tap **Build number** 7 times → back to Settings → **Developer options** → turn on **USB debugging**.

## 2. Get the code and the videos
```powershell
git clone https://github.com/Hqroon/CPX-Hackathon.git
```
```powershell
cd CPX-Hackathon
```
(Use `main` once M1's `m1-feed` branch is merged; until then, `git switch m1-feed`.)

Get the 50 videos from **M3** and put them in `backend/media/reels/` (and the thumbnails in `backend/media/thumbs/`). Then generate the manifest:
```powershell
cd backend
```
```powershell
npm install --registry=https://registry.npmmirror.com
```
```powershell
npm run manifest
```

## 3. Build the web app with the videos inside
```powershell
cd ..\frontend
```
```powershell
npm install --registry=https://registry.npmmirror.com
```
```powershell
npm run bundle:media
```
That copies the videos and `reels.json` into `frontend/public/`.

Create `frontend/.env.production` from the example:
```powershell
copy .env.production.example .env.production
```
Edit it:
- `VITE_API_BASE`: the address of the laptop that will run the backend **during the demo**, e.g. `http://192.168.43.10:8787`. Find the laptop's IP with `ipconfig` (Wi-Fi adapter → IPv4 Address) while it's connected to the demo hotspot.
- `VITE_BUNDLED_MEDIA=true`

Build:
```powershell
npm run build
```

## 4. Sync the Android project
The Android project is already in the repo (`frontend/android/`, locked to portrait). After every web build, copy the build and the videos into it:
```powershell
npx cap sync android
```
(Only if `frontend/android/` is ever missing: `npx cap add android`, then add `android:screenOrientation="portrait"` to the MainActivity `<activity>` tag in `android/app/src/main/AndroidManifest.xml`.)

## 5. Build and install the APK
```powershell
npx cap open android
```
Android Studio opens the project. **Wait for "Gradle sync" to finish**; the first time it downloads a lot.

**Option A: run directly on the phone (easiest).** Plug the phone in over USB, accept the "Allow USB debugging" prompt on the phone, choose the phone in the device dropdown at the top, and press the green ▶ Run button.

**Option B: build an APK file.** Menu **Build → Build App Bundle(s) / APK(s) → Build APK(s)**. When it finishes, click **locate**. The file is `android/app/build/outputs/apk/debug/app-debug.apk`. Send it to the phone (USB or a file transfer app), open it, and allow "Install unknown apps" when asked.

## 6. Demo-day setup (backend for the questions)
1. Laptop and phone on the **same hotspot**.
2. On the laptop: `cd backend` → `npm start` (with `.env` keys filled in).
3. Windows may ask whether Node.js can use the network: allow **Private networks**.
4. Test from the phone's Chrome: `http://<laptop-ip>:8787/api/health` should show `{"ok":true,...}`.
5. Open the app. Tap the 刷屏税 logo 5 times to open the demo panel. **Reels: bundled** and a real provider name under **Questions** means everything is connected.

> If the laptop IP changes (new hotspot), update `VITE_API_BASE`, then `npm run build` → `npx cap sync android` → rebuild the APK. Or simply keep the same hotspot and laptop.

## 7. After any code change
```powershell
npm run build
```
```powershell
npx cap sync android
```
Then press ▶ Run again in Android Studio (or rebuild the APK).

## Troubleshooting
| Problem | Fix |
|---|---|
| White screen in the app | `npm run build` wasn't run before `npx cap sync`, or the build failed. Run both again. |
| Reels show coloured mock cards | `npm run bundle:media` wasn't run, or `VITE_BUNDLED_MEDIA` isn't `true` in `.env.production`. Rebuild and sync. |
| Questions are always the generic fallback ones | The phone can't reach the backend: check the IP, that the backend is running, the firewall prompt, and step 6.4. |
| No sound on the first reel | Sound starts after the **Start scrolling** tap. Check that the phone isn't on silent / media volume is up. |
| Gradle sync is very slow or fails (in China) | In `frontend/android/build.gradle`, inside **both** `repositories { ... }` blocks, add these two lines **above** `google()`: `maven { url 'https://maven.aliyun.com/repository/google' }` and `maven { url 'https://maven.aliyun.com/repository/public' }`. Then File → Sync Project with Gradle Files. |
| "SDK location not found" | Open the project once from Android Studio (`npx cap open android`), which creates `local.properties` automatically. |
