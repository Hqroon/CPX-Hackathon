// Backend calls. Each one falls back to mock data so the frontend works
// even when the backend or the LLM providers are down.

import mockReels from './mock/reels.json';
import mockQuestions from './mock/questions.json';

export async function fetchReels() {
  try {
    const res = await fetch('/api/reels');
    if (!res.ok) throw new Error(res.statusText);
    const reels = await res.json();
    const playable = reels.filter((r) => r.available !== false);
    if (playable.length > 0) return { reels: playable, source: 'backend' };
  } catch (err) {
    console.warn('[api] /api/reels unavailable, using mock reels:', err.message);
  }
  return { reels: mockReels, source: 'mock' };
}

export async function fetchQuestions(slides, count) {
  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides, count }),
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
  const body = JSON.stringify({ sessionId, type, ts: Date.now(), ...extra });
  // sendBeacon survives page close; fetch is the fallback.
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
  } else {
    fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
  }
}
