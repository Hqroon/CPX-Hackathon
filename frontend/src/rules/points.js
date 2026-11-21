// Negative points: saved in localStorage so they survive closing the app.
// Owner: M2.
import { CONFIG } from '../config.js';

const KEY = 'doomscroll-tax.points';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { points: 0, lastClosedAt: null };
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

/** Apply the "15 minutes away clears 1 point" rule. Returns { points, waived }. */
export function loadPoints(now = Date.now()) {
  const state = read();
  let waived = 0;
  if (state.lastClosedAt && state.points > 0) {
    const awayMinutes = (now - state.lastClosedAt) / 60000;
    waived = Math.min(state.points, Math.floor(awayMinutes / CONFIG.minutesPerPoint));
  }
  const points = state.points - waived;
  // Keep the remainder of partial time away by moving lastClosedAt forward.
  const lastClosedAt = state.lastClosedAt
    ? state.lastClosedAt + waived * CONFIG.minutesPerPoint * 60000
    : null;
  write({ points, lastClosedAt });
  return { points, waived };
}

export function savePoints(points) {
  write({ ...read(), points });
}

export function markClosed(now = Date.now()) {
  write({ ...read(), lastClosedAt: now });
}

export function markOpened() {
  write({ ...read(), lastClosedAt: null });
}

/** Demo control: pretend the user was away for `minutes`. */
export function simulateAway(minutes) {
  const state = read();
  const base = state.lastClosedAt ?? Date.now();
  write({ ...state, lastClosedAt: base - minutes * 60000 });
  return loadPoints();
}

export function resetPoints() {
  write({ points: 0, lastClosedAt: null });
}

export const minutesToClear = (points) => points * CONFIG.minutesPerPoint;
