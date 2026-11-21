// Session summary. Layout follows the template's "Session complete" screen.
// Dark theme: minimal one-screen version (title, white total with green sheen, stats, buttons).
// VITE_UI_THEME=original: the original markup below, unchanged.
import React, { useEffect, useState } from 'react';
import { COPY, formatMinutes } from '../copy.js';
import { minutesToClear } from '../rules/points.js';
import { CONFIG } from '../config.js';
import { BrandMark, Wordmark } from './Brand.jsx';
import { IconCircleCheck, IconRotate, IconLayers, IconCheck } from './Icons.jsx';
import { IS_DARK_THEME } from '../theme.js';

export default function Results(props) {
  return IS_DARK_THEME ? <ResultsMinimal {...props} /> : <ResultsOriginal {...props} />;
}

// ---- Original (VITE_UI_THEME=original) ------------------------------------------------
function ResultsOriginal({ stats, points, onRestart, onHome }) {
  const mins = minutesToClear(points);
  return (
    <div className="screen results">
      <div className="top-bar centered-brand">
        <div className="brand"><BrandMark size={26} /><Wordmark size="sm" /></div>
      </div>
      <div className="screen-scroll">
        <div className="complete-head">
          <span className="complete-icon" aria-hidden="true"><IconCircleCheck size={26} /></span>
          <h1 className="title">Session complete</h1>
        </div>

        <div className="total">
          <span className={`total-number ${points > 0 ? 'owing' : ''}`}>{points > 0 ? `−${points}` : '0'}</span>
          <p className="muted strong">{points === 1 ? 'point owed' : 'points owed'}</p>
        </div>

        <div className="card breakdown">
          <div><IconLayers size={16} /><strong>{stats.totalReels}</strong><span>Reels watched</span></div>
          <div className="warn"><IconRotate size={15} /><strong>{stats.reelsAfterLine}</strong><span>After free reels</span></div>
          <div><IconCheck size={16} /><strong>{stats.right}/{stats.asked}</strong><span>Questions right</span></div>
        </div>

        <p className="group-label">What happens next</p>
        <div className="card list-card">
          <div className="list-row static">
            <span className={`row-icon ${points > 0 ? 'warn' : ''}`}>{points > 0 ? <IconRotate size={15} /> : <IconCircleCheck size={16} />}</span>
            <span className="row-text">
              <span className="row-title">{points > 0 ? `Stay away for ${formatMinutes(mins)}` : 'Nothing to pay back'}</span>
              <span className="row-sub">{COPY.results.owed(points, mins)}</span>
            </span>
          </div>
          <div className="list-row static">
            <span className="row-icon"><IconCircleCheck size={16} /></span>
            <span className="row-text">
              <span className="row-title">Revision done</span>
              <span className="row-sub">{COPY.results.quiz(stats.right, stats.asked)}</span>
            </span>
          </div>
        </div>
        <p className="footnote">Points come back on their own: 1 for every {CONFIG.minutesPerPoint} minutes you spend away.</p>
      </div>
      <div className="bottom-actions">
        <button className="btn primary" onClick={onRestart}>{COPY.results.again}</button>
        {onHome && <button className="btn secondary" onClick={onHome}>Back to start</button>}
      </div>
    </div>
  );
}

// ---- Minimal (dark theme) -------------------------------------------------------------
const COUNT_MS = 600;

/** Counts 0 -> target once, ease-out. Reduced motion: shows the target straight away. */
function useCountUp(target) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [value, setValue] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce || target === 0) { setValue(target); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // First render only: the summary's numbers don't change while it is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

function ResultsMinimal({ stats, points, onRestart, onHome }) {
  const mins = minutesToClear(points);
  const owing = points > 0;
  const shown = useCountUp(points);

  return (
    <div className="screen results">
      <div className="top-bar centered-brand">
        <div className="brand"><BrandMark size={26} /><Wordmark size="sm" /></div>
      </div>
      <div className="screen-scroll results-min">
        <h1 className="title results-title">Session Complete</h1>

        <div className="total">
          {/* "−59" is centred as one unit; the minus is its own span so it can be styled.
              White with a green sheen in the dark theme (styles.css); counts up on open. */}
          <span className={`total-number ${owing ? 'owing' : ''}`} aria-label={owing ? `minus ${points}` : '0'}>
            {owing && <span className="total-sign" aria-hidden="true">−</span>}
            <span aria-hidden="true">{shown}</span>
          </span>
          <p className="muted strong">{points === 1 ? 'point owed' : 'points owed'}</p>
          {owing && <p className="muted clear-note">Clears after {formatMinutes(mins)} away</p>}
        </div>

        <div className="card breakdown">
          <div><strong>{stats.totalReels}</strong><span>Reels watched</span></div>
          <div className="warn"><strong>{stats.reelsAfterLine}</strong><span>After free reels</span></div>
          <div><strong>{stats.right}/{stats.asked}</strong><span>Questions right</span></div>
        </div>
      </div>
      <div className="bottom-actions">
        <button className="btn primary" onClick={onRestart}>{COPY.results.again}</button>
        {onHome && <button className="btn secondary" onClick={onHome}>Back to start</button>}
      </div>
    </div>
  );
}
