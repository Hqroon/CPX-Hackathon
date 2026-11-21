// Bridge to the native Reel Guard (Android only).
//
// The "guard" APK runs the frustration rules on top of Instagram / Xiaohongshu / Douyin
// through an Android accessibility service (frontend/android/.../guard/). This file is
// how the web app talks to it. In the browser and in the plain "feed" APK every call
// is a safe no-op, so the normal app is unaffected.

import { Capacitor, registerPlugin } from '@capacitor/core';
import { CONFIG, GUARD_TARGETS } from '../config.js';

const ReelGuard = registerPlugin('ReelGuard');

const onAndroid = () => Capacitor.getPlatform() === 'android';

/** { mode, accessibilityEnabled, running, points, sessionReels, installed, hasQuestions… } on Android, else null. */
export async function getGuardStatus() {
  // Browser preview of the Android home chooser + Reel Guard screen: http://localhost:5173/?guard-preview
  if (!onAndroid() && typeof location !== 'undefined' && location.search.includes('guard-preview')) {
    return {
      mode: 'combined', accessibilityEnabled: false, running: false, enabled: true, points: 7,
      sessionReels: 12, questionsAsked: 1, hasQuestions: false,
      targets: GUARD_TARGETS.map((t) => t.pkg), installed: ['com.instagram.android', 'com.xingin.xhs'],
      preview: true,
    };
  }
  if (!onAndroid()) return null;
  try {
    return await ReelGuard.getStatus();
  } catch {
    return null; // plugin missing (old build) or not Android
  }
}

/** The rule numbers the native side uses (same names as config.js). */
function guardConfig() {
  const keys = [
    'freeReels', 'pointsPerReel', 'minutesPerPoint', 'questionEvery', 'wrongWaitSeconds',
    'volumeStepDown', 'minVolume', 'slowAfterReels', 'slowTransitionMs', 'decayFullAfterReels',
  ];
  return Object.fromEntries(keys.map((k) => [k, CONFIG[k]]));
}

/** Send questions (optional), rule numbers and target apps to the native service. */
export async function syncGuard({ questions } = {}) {
  if (!onAndroid()) return null;
  const payload = { config: guardConfig(), targets: GUARD_TARGETS.map((t) => t.pkg) };
  if (Array.isArray(questions) && questions.length > 0) {
    payload.questions = questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      answerIndex: q.answerIndex,
      explanation: q.explanation || '',
    }));
  }
  try {
    return await ReelGuard.configure(payload);
  } catch (err) {
    console.warn('[reel guard] configure failed:', err);
    return null;
  }
}

export const openGuardSettings = () => ReelGuard.openAccessibilitySettings().catch(() => {});
export const openGuardAppInfo = () => ReelGuard.openAppDetails().catch(() => {});
export const resetGuard = () => ReelGuard.resetPoints().catch(() => null);

export async function launchGuardedApp(pkg) {
  try {
    await ReelGuard.launchApp({ package: pkg });
    return true;
  } catch {
    return false;
  }
}
