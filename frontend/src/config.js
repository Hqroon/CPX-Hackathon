// Every tunable number lives here. The rules in src/rules/frustration.js read
// only these values, so changing a number here changes the whole app.
//
// "Reel number" below means the position of a reel in the session: 1, 2, 3…
// (the "free reels used up" card in between is not counted).

export const CONFIG = {
  // --- Golden path -----------------------------------------------------------
  freeReels: 5,              // reels 1–5 are free: no points, no questions, normal sound and speed

  // --- Negative points -------------------------------------------------------
  pointsPerReel: 1,          // every reel after the free ones costs this many points
  minutesPerPoint: 15,       // minutes away from the app that clear 1 point

  // --- Question toll ---------------------------------------------------------
  questionEvery: 5,          // a question after every N paid reels (reels 10, 15, 20…)
  wrongWaitSeconds: 5,       // wrong answer: wait this long, then a NEW question appears
  questionCount: 12,         // questions requested from the backend per session
  maxPdfFiles: 5,            // slide gate: PDFs that can be uploaded together
  minSlides: 1,              // slide gate: any 1-5 PDFs work as long as at least one page has text

  // --- Volume roulette -------------------------------------------------------
  // After the free reels, sound alternates: on, muted, on, muted…
  // and every paid reel is quietly 2% softer than the one before (no on-screen slider).
  volumeStepDown: 0.02,      // volume lost per paid reel
  minVolume: 0.05,           // never fully silent on the "on" reels

  // --- Slow scroll + visual decay ---------------------------------------------
  slowAfterReels: 10,        // from reel 11 on, each new reel takes slowTransitionMs to arrive
  slowTransitionMs: 3000,
  normalTransitionMs: 320,
  decayFullAfterReels: 15,   // visual decay grows from reel 11 and is at full strength 15 reels later

  // --- Input -----------------------------------------------------------------
  swipeThresholdPx: 80,
};

// Apps the Reel Guard APK runs on top of (Android package names).
// Only used in the "guard" build; see docs/REEL_GUARD.md.
export const GUARD_TARGETS = [
  { pkg: 'com.instagram.android', name: 'Instagram' },
  { pkg: 'com.xingin.xhs', name: '小红书 Xiaohongshu' },
  { pkg: 'com.ss.android.ugc.aweme', name: '抖音 Douyin' },
  { pkg: 'com.ss.android.ugc.aweme.lite', name: '抖音极速版 Douyin Lite' },
  { pkg: 'com.zhiliaoapp.musically', name: 'TikTok' },
  { pkg: 'com.ss.android.ugc.trill', name: 'TikTok (Asia)' },
  { pkg: 'com.smile.gifmaker', name: '快手 Kuaishou' },
];

// "Demo speed x3" in the demo panel swaps in these values so the whole journey
// fits into a 3-minute judging slot.
export const DEMO_OVERRIDES = {
  questionEvery: 2,
  slowAfterReels: 8,
  decayFullAfterReels: 5,
  volumeStepDown: 0.1,
};
