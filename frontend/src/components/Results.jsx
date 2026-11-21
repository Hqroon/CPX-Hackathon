// Session summary. Layout follows the template's "Session complete" screen.
import React from 'react';
import { COPY, formatMinutes } from '../copy.js';
import { minutesToClear } from '../rules/points.js';
import { CONFIG } from '../config.js';
import { BrandMark, Wordmark } from './Brand.jsx';
import { IconCircleCheck, IconRotate, IconLayers, IconCheck } from './Icons.jsx';

export default function Results({ stats, points, onRestart, onHome }) {
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
