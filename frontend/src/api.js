// Backend calls. Each one falls back to mock data so the frontend works
// even when the backend or the LLM providers are down.

import mockReels from './mock/reels.json';
import mockQuestions from './mock/questions.json';
import { API_BASE, BUNDLED_MEDIA, mediaUrl } from './env.js';

const withUrls = (reels) =>
  reels.map((r) => ({ ...r, src: mediaUrl(r.src), poster: mediaUrl(r.poster) }));

export async function fetchReels() {
  // APK build with videos inside the app: read the bundled manifest, no network needed.
  if (BUNDLED_MEDIA) {
    try {
      const res = await fetch('./reels/reels.json');
      if (!res.ok) throw new Error(res.statusText);
      const reels = await res.json();
      if (reels.length > 0) return { reels: withUrls(reels), source: 'bundled' };
    } catch (err) {
      console.warn('[api] bundled reels missing, trying the backend:', err.message);
    }
  }
  try {
    const res = await fetch(`${API_BASE}/api/reels`);
    if (!res.ok) throw new Error(res.statusText);
    const reels = await res.json();
    const playable = reels.filter((r) => r.available !== false);
    if (playable.length > 0) return { reels: withUrls(playable), source: 'backend' };
  } catch (err) {
    console.warn('[api] /api/reels unavailable, using mock reels:', err.message);
  }
  return { reels: mockReels, source: 'mock' };
}

export async function fetchQuestions(slides, count) {
  try {
    const res = await fetch(`${API_BASE}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides, count }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined,
    });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    if (data.questions?.length) return data;
  } catch (err) {
    console.warn('[api] /api/questions unavailable, using mock questions:', err.message);
  }
  return { questions: mockQuestions, provider: 'mock', usedFallback: true };
}

export function logEvent(sessionId, type, extra = {}) {
  const url = `${API_BASE}/api/events`;
  const body = JSON.stringify({ sessionId, type, ts: Date.now(), ...extra });
  try {
    // sendBeacon survives page close; fetch is the fallback.
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))) return;
  } catch {}
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
}
