# Reel Guard: the Doomscroll Tax rules on top of Instagram / Xiaohongshu

Two APKs come from the same project:

| Build variant | App name on the phone | What it does |
|---|---|---|
| `feedDebug` | **Doomscroll Tax** | Our own feed with the 50 videos. The safe demo and the backup. |
| `guardDebug` | **Reel Guard** | Runs the rules **on top of Instagram, Xiaohongshu, Douyin, TikTok and Kuaishou**, on their real reels. Its home screen also has **"Backup: open our own feed"**, which opens the 50-video app inside the same APK. |

They have different app ids (`com.cpx.doomscrolltax` and `com.cpx.doomscrolltax.guard`), so **both can be installed on the demo phone at the same time**.

> Android only. iPhones don't allow one app to draw over another or watch its scrolling.

---

## What happens inside Instagram / Xiaohongshu

Same rules as the in-app feed (`frontend/src/rules/frustration.js`). The Java copy (`GuardRules.java`) was checked against it reel by reel.

| Reels | Effect on top of the other app |
|---|---|
| 1–5 | Free. A floating bubble shows points owed (tap it to come back to Reel Guard). |
| 6+ | −1 point per reel. The phone's **media volume** alternates on / muted and drops 2% per reel, **without showing the volume slider**. |
| 10, 15, 20… | A **question card covers the reel** and silences it. Right = card closes. Wrong = 5 s, then a **new** question. Leaving the app doesn't dodge it: the card is back when you return. |
| 11+ | After every swipe, a **3-second "Loading next reel…" cover** blocks the screen, and a **grey layer** dims the feed more each reel. |
| Away | 15 minutes away from all guarded apps clears 1 point. 10 minutes away starts a new session (5 free reels again). Your normal volume is restored when you leave. |

**Android limits:** an app can't pause or slow another app's video. So we **cover** it (question card, 3 s cover), **silence** it (audio focus + media volume) and **dim** it (grey layer). A "reel" = one swipe: scroll events closer than 0.9 s count once (`swipeDebounceMs`).

---

## Build it (APK teammate)

Prerequisites, the web build and syncing are the same as in [ANDROID_APK.md](ANDROID_APK.md). Then:

1. Android Studio → **Build → Select Build Variant** → set `app` to **`guardDebug`**.
2. Plug in the phone → ▶ Run. Or **Build → Build APK(s)**: the file is `android/app/build/outputs/apk/guard/debug/app-guard-debug.apk`.
3. To install the normal app as well, switch the variant to **`feedDebug`** and run again.

After any web change: `npm run build` → `npx cap sync android` → Run again.

## Switch it on (on the phone, once)

1. Open **Reel Guard** → step 1 → **Open Accessibility**.
2. Find **Reel Guard · Doomscroll Tax** (often under "Downloaded apps" or "Installed services") → turn it on → confirm.
3. **Greyed out / "Restricted setting"?** (Android 13+ blocks this for apps not installed from a store.) Go back to Reel Guard → **App info** → ⋮ (top right) → **Allow restricted settings** → repeat step 2.
4. Back in Reel Guard, step 1 shows ✓.
5. Step 2 → choose slides (or the sample slides), so the questions come from the course. The backend must be reachable (see `VITE_API_BASE` in ANDROID_APK.md). Without it, built-in questions are used.
6. Step 3 → **Instagram** or **小红书 Xiaohongshu**. Go to Reels / the video feed and swipe.

### Xiaomi, Huawei, Oppo, Vivo phones
These kill background services aggressively. On the demo phone:
- App info → **Autostart: on**
- Battery → **No restrictions** (not "Battery saver")
- Lock Reel Guard in the recent-apps screen (pull it down / padlock icon)

## Demo-day test checklist

- [ ] Open Xiaohongshu: toast "Reel Guard is on: your first 5 reels are free", and the bubble shows 0
- [ ] Swipe 5 reels: still 0
- [ ] Swipe 6: bubble −1, and sound alternates from here
- [ ] Reel 10: question card appears, the reel is silent, swiping is blocked
- [ ] Wrong answer: "A new question in 5s", then a different question
- [ ] Right answer: card closes, sound returns
- [ ] Reel 11+: 3 s "Loading next reel…" after every swipe, the screen greys more each reel
- [ ] Leave to the home screen: everything disappears, your normal volume is back
- [ ] Tap the bubble: Reel Guard opens
- [ ] **Backup:** Reel Guard → "Backup: open our own feed (50 videos)" works

## If it misbehaves on stage

1. Reel Guard home → **Reset guard points**, then reopen the app.
2. Still wrong: switch the accessibility service off and on.
3. Fall back: **"Backup: open our own feed"**, or open the separate **Doomscroll Tax** app. Same rules, 50 videos, no setup needed.

## Tuning

- Rule numbers come from `frontend/src/config.js` (synced to the phone when Reel Guard opens). Change them there, rebuild, sync.
- Native-only settings in `GuardConfig.java`: `swipeDebounceMs` (900 ms; raise it if one swipe counts twice), `sessionGapMinutes` (10), `maxGreyAlpha` (0.6).
- Guarded apps: `GUARD_TARGETS` in `config.js`, and the `<queries>` list in `android/app/src/guard/AndroidManifest.xml` (both must list the package).

## Files

```
frontend/android/app/src/main/java/com/cpx/doomscrolltax/
  MainActivity.java            registers the ReelGuard plugin
  guard/GuardRules.java        the rules (same as frustration.js)
  guard/GuardConfig.java       rule numbers (+ native-only tuning)
  guard/GuardStore.java        points, session, saved volume (SharedPreferences)
  guard/GuardQuestion.java     questions from the web app + built-in fallback
  guard/GuardOverlays.java     bubble, grey layer, 3 s cover, question card
  guard/ReelGuardService.java  the accessibility service (watches apps + swipes)
  guard/ReelGuardPlugin.java   bridge used by frontend/src/native/reelGuard.js
frontend/android/app/src/guard/
  AndroidManifest.xml          declares the service (guard variant only)
  res/values/strings.xml       app name "Reel Guard", app_mode = guard
  res/xml/reel_guard_service.xml
frontend/src/native/reelGuard.js   web → native bridge (no-op in the browser)
frontend/src/components/GuardHome.jsx
```

Preview the guard home screen in a browser: `http://localhost:5173/?guard-preview`.

**Privacy:** the service only receives "which app is open" and "something scrolled". `canRetrieveWindowContent` is false, so it never reads what's on screen, and nothing leaves the phone.

**Not tested on a device yet:** written without an Android SDK on the dev laptop. Syntax was checked with the JDK, and the rules were checked against the JS tests. The first real build on the APK laptop may surface small compile fixes.
