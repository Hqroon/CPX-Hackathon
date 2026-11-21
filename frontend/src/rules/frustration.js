// The frustrating mechanisms as small, pure functions.
//
// Everything is decided from the reel number (1, 2, 3… in viewing order) and the
// config, so the same rules work for any set of videos: point the backend at the
// video folder and these rules apply automatically.
//
// Spec (CONFIG defaults):
//   reels 1–5      free: 0 points, no question, full volume, normal speed, no decay
//   reel 6+        −1 point each
//   reels 6,11,16… a question right after the free reels, then after every 5 more reels;
//                  right = next reel, wrong = wait, then a new question
//   reel 6+        sound alternates on / muted, and each paid reel is 2% quieter
//   reel 11+       each new reel takes 3 s to arrive, and colours progressively fade

import { CONFIG } from '../config.js';

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

/**
 * Reel number for a position in the feed. The feed is
 *   [reel 1 … reel F] [allowance card] [reel F+1 …]
 * so the card (index F) has no reel number and returns null.
 */
export function reelNumberAt(index, cfg = CONFIG) {
  if (index < cfg.freeReels) return index + 1;
  if (index === cfg.freeReels) return null; // the "free reels used up" card
  return index;
}

/** Feed index of a given reel number (inverse of reelNumberAt). */
export function indexOfReel(n, cfg = CONFIG) {
  return n <= cfg.freeReels ? n - 1 : n;
}

export const isFreeReel = (n, cfg = CONFIG) => n >= 1 && n <= cfg.freeReels;

/** 0 for free reels, then 1, 2, 3… for the paid reels. */
export const paidNumber = (n, cfg = CONFIG) => Math.max(0, n - cfg.freeReels);

// ---------------------------------------------------------------------------
// Negative points
// ---------------------------------------------------------------------------

/** Points charged for watching reel n. */
export const pointsForReel = (n, cfg = CONFIG) => (isFreeReel(n, cfg) ? 0 : cfg.pointsPerReel);

/** Points cleared by being away for `minutesAway` (whole points only). */
export const pointsCleared = (minutesAway, cfg = CONFIG) =>
  Math.max(0, Math.floor(minutesAway / cfg.minutesPerPoint));

// ---------------------------------------------------------------------------
// Question toll
// ---------------------------------------------------------------------------

/**
 * True when a question must be answered on arriving at reel n.
 * The first question comes as soon as the free reels end (reel F+1), then one after
 * every `questionEvery` further reels: with 5 free and every 5 -> reels 6, 11, 16, 21…
 */
export function asksQuestion(n, cfg = CONFIG) {
  const k = paidNumber(n, cfg);
  return k > 0 && k % cfg.questionEvery === 0; // reels 10, 15, 20…
}

/**
 * Next question from the pool, never the same one twice in a row.
 * `pointer` is a running counter owned by the caller; returns { question, pointer }.
 */
export function nextQuestion(pool, pointer, avoidId = null) {
  if (!pool || pool.length === 0) return { question: null, pointer };
  let p = pointer;
  let q = pool[p % pool.length];
  if (pool.length > 1 && q.id === avoidId) {
    p += 1;
    q = pool[p % pool.length];
  }
  return { question: shuffleOptions(q), pointer: p + 1 };
}

/** Same question with its options in a new random order. */
export function shuffleOptions(q, random = Math.random) {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => q.options[i]), answerIndex: order.indexOf(q.answerIndex) };
}

// ---------------------------------------------------------------------------
// Volume roulette (silent fade, nothing shown on screen)
// ---------------------------------------------------------------------------

/**
 * Sound for reel n: { muted, volume } with volume in 0..1.
 * Free reels: full volume. Paid reels: 1st on, 2nd muted, 3rd on… and each
 * paid reel is volumeStepDown quieter than the last (never below minVolume).
 * Note: iPhone browsers ignore `volume` (mute still works); Android honours both.
 */
export function audioForReel(n, cfg = CONFIG) {
  if (n == null || isFreeReel(n, cfg)) return { muted: false, volume: 1 };
  const k = paidNumber(n, cfg);
  const volume = clamp(1 - cfg.volumeStepDown * k, cfg.minVolume, 1);
  return { muted: k % 2 === 0, volume: Math.round(volume * 1000) / 1000 };
}

// ---------------------------------------------------------------------------
// Slow scroll
// ---------------------------------------------------------------------------

/** How long the swipe INTO reel n takes (ms). The card in between is never slow. */
export function transitionMsInto(n, cfg = CONFIG) {
  return n != null && n > cfg.slowAfterReels ? cfg.slowTransitionMs : cfg.normalTransitionMs;
}

export const isSlowFrom = (n, cfg = CONFIG) => n != null && n === cfg.slowAfterReels + 1;

// ---------------------------------------------------------------------------
// Visual decay
// ---------------------------------------------------------------------------

/** 0 (normal) → 1 (fully decayed) for reel n. Starts after slowAfterReels. */
export function visualDecay(n, cfg = CONFIG) {
  if (n == null || n <= cfg.slowAfterReels) return 0;
  const steps = n - cfg.slowAfterReels;
  return clamp(steps / cfg.decayFullAfterReels, 0, 1);
}

/**
 * CSS filter for a decay level: colours drain to grey, contrast and brightness
 * drop, and a slight blur creeps in. 0 returns 'none'.
 */
export function decayFilter(level) {
  if (!level) return 'none';
  const d = clamp(level, 0, 1);
  const f = (x) => Math.round(x * 100) / 100;
  return [
    `grayscale(${f(d)})`,
    `saturate(${f(1 - 0.6 * d)})`,
    `contrast(${f(1 - 0.35 * d)})`,
    `brightness(${f(1 - 0.3 * d)})`,
    `blur(${f(2.5 * d)}px)`,
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Everything for one reel, in one call
// ---------------------------------------------------------------------------

/** All rule outputs for reel n — handy for the UI, logging and the poster table. */
export function rulesForReel(n, cfg = CONFIG) {
  const audio = audioForReel(n, cfg);
  const decay = visualDecay(n, cfg);
  return {
    reel: n,
    free: isFreeReel(n, cfg),
    points: pointsForReel(n, cfg),
    question: asksQuestion(n, cfg),
    muted: audio.muted,
    volume: audio.volume,
    transitionMs: transitionMsInto(n, cfg),
    decay,
    filter: decayFilter(decay),
  };
}
