// Run with: npm test   (from frontend/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import {
  reelNumberAt, indexOfReel, isFreeReel, paidNumber, pointsForReel, pointsCleared,
  asksQuestion, nextQuestion, shuffleOptions, audioForReel, transitionMsInto,
  visualDecay, decayFilter, rulesForReel,
} from './frustration.js';

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

test('feed positions: reels 1-5, then the card, then reel 6…', () => {
  assert.deepEqual(range(0, 7).map((i) => reelNumberAt(i)), [1, 2, 3, 4, 5, null, 6, 7]);
  for (const n of range(1, 50)) assert.equal(reelNumberAt(indexOfReel(n)), n);
});

test('first 5 reels are free, then every reel costs 1 point', () => {
  for (const n of range(1, 5)) {
    assert.equal(isFreeReel(n), true);
    assert.equal(pointsForReel(n), 0);
  }
  for (const n of range(6, 50)) assert.equal(pointsForReel(n), 1);
  const total = range(1, 20).reduce((s, n) => s + pointsForReel(n), 0);
  assert.equal(total, 15); // 20 reels watched = 15 paid reels
  assert.equal(paidNumber(6), 1);
});

test('15 minutes away clears 1 point', () => {
  assert.equal(pointsCleared(14), 0);
  assert.equal(pointsCleared(15), 1);
  assert.equal(pointsCleared(31), 2);
});

test('a question right after the 5 free reels, then every 5 reels: 6, 11, 16…', () => {
  const asked = range(1, 30).filter((n) => asksQuestion(n));
  assert.deepEqual(asked, [6, 11, 16, 21, 26]);
  for (const n of range(1, 5)) assert.equal(asksQuestion(n), false); // free reels never ask
});

test('wrong answer leads to a different next question', () => {
  const pool = [
    { id: 'a', options: ['1', '2', '3', '4'], answerIndex: 0 },
    { id: 'b', options: ['1', '2', '3', '4'], answerIndex: 1 },
  ];
  const first = nextQuestion(pool, 0);
  assert.equal(first.question.id, 'a');
  const second = nextQuestion(pool, 0, 'a'); // pointer would repeat 'a', so it skips
  assert.equal(second.question.id, 'b');
  assert.equal(nextQuestion([], 3).question, null);
});

test('shuffled options keep the right answer', () => {
  const q = { id: 'x', options: ['right', 'w1', 'w2', 'w3'], answerIndex: 0 };
  for (let i = 0; i < 20; i++) {
    const s = shuffleOptions(q);
    assert.equal(s.options[s.answerIndex], 'right');
    assert.deepEqual([...s.options].sort(), [...q.options].sort());
  }
});

test('free reels play at full volume', () => {
  for (const n of range(1, 5)) assert.deepEqual(audioForReel(n), { muted: false, volume: 1 });
});

test('paid reels alternate on / muted and get 2% quieter each reel', () => {
  assert.deepEqual(audioForReel(6), { muted: false, volume: 0.98 });
  assert.deepEqual(audioForReel(7), { muted: true, volume: 0.96 });
  assert.deepEqual(audioForReel(8), { muted: false, volume: 0.94 });
  assert.deepEqual(audioForReel(9), { muted: true, volume: 0.92 });
  // never fully silent on the "on" reels
  assert.equal(audioForReel(500).volume, CONFIG.minVolume);
  // the card has no sound rules
  assert.deepEqual(audioForReel(null), { muted: false, volume: 1 });
});

test('reels 1-10 arrive normally, reel 11 onwards takes 3 seconds', () => {
  for (const n of range(1, 10)) assert.equal(transitionMsInto(n), CONFIG.normalTransitionMs);
  for (const n of range(11, 50)) assert.equal(transitionMsInto(n), 3000);
  assert.equal(transitionMsInto(null), CONFIG.normalTransitionMs); // the card
});

test('colours start fading after reel 10 and reach full decay 15 reels later', () => {
  for (const n of range(1, 10)) assert.equal(visualDecay(n), 0);
  assert.ok(visualDecay(11) > 0 && visualDecay(11) < 0.1);
  assert.ok(visualDecay(18) > visualDecay(12));
  assert.equal(visualDecay(25), 1);
  assert.equal(visualDecay(40), 1);
  assert.equal(decayFilter(0), 'none');
  assert.match(decayFilter(1), /grayscale\(1\).*blur\(2\.5px\)/);
});

test('rulesForReel summarises one reel', () => {
  assert.deepEqual(rulesForReel(10), {
    reel: 10, free: false, points: 1, question: false, muted: false, volume: 0.9,
    transitionMs: CONFIG.normalTransitionMs, decay: 0, filter: 'none',
  });
  const r11 = rulesForReel(11);
  assert.equal(r11.transitionMs, 3000);
  assert.equal(r11.muted, true);
  assert.notEqual(r11.filter, 'none');
  assert.equal(r11.question, true);
});

test('demo overrides still give a sensible sequence', () => {
  const demo = { ...CONFIG, questionEvery: 2, slowAfterReels: 8, decayFullAfterReels: 5 };
  assert.deepEqual(range(1, 12).filter((n) => asksQuestion(n, demo)), [6, 8, 10, 12]);
  assert.equal(transitionMsInto(9, demo), 3000);
  assert.equal(visualDecay(13, demo), 1);
});
