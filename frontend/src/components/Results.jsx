// Session summary: minimal, fits on one screen.
import React from 'react';
import { COPY, formatMinutes } from '../copy.js';
import { minutesToClear } from '../rules/points.js';
import { BrandMark, Wordmark } from './Brand.jsx';

export default function Results({ stats, points, onRestart, onHome }) {
  const mins = minutesToClear(points);
  return (
    <div className="screen results">
      <div className="top-bar centered-brand">
        <div className="brand"><BrandMark size={26} /><Wordmark size="sm" /></div>
      </div>
      <div className="screen-scroll results-min">
        <h1 className="title results-title">Session Complete</h1>

        <div className="total">
          {/* "−59" is centred as one unit; the minus is its own span so it can be styled. */}
          <span className={`total-number ${points > 0 ? 'owing' : ''}`} aria-label={points > 0 ? `minus ${points}` : '0'}>
            {points > 0 && <span className="total-sign" aria-hidden="true">−</span>}{points > 0 ? points : 0}
          </span>
          <p className="muted strong">{points === 1 ? 'point owed' : 'points owed'}</p>
          {points > 0 && <p className="muted clear-note">Clears after {formatMinutes(mins)} away</p>}
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
