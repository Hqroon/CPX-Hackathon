import React from 'react';
import { COPY, formatMinutes } from '../copy.js';
import { minutesToClear } from '../rules/points.js';
import Doodle from './Doodle.jsx';

export default function Results({ stats, points, onRestart }) {
  const mins = minutesToClear(points);
  const tiles = [
    { label: 'Reels watched', value: stats.totalReels, tone: 'purple' },
    { label: 'After free reels', value: stats.reelsAfterLine, tone: 'coral' },
    { label: 'Questions right', value: `${stats.right}/${stats.asked}`, tone: 'green' },
    { label: 'Time away to clear', value: points > 0 ? formatMinutes(mins) : '—', tone: 'yellow' },
  ];
  return (
    <div className="results">
      <div className="results-card">
        <Doodle name="meditating" className="small" />
        <div className="results-hero">
          <span className="results-label">{COPY.results.title}</span>
          <span className={`results-big ${points > 0 ? 'owing' : ''}`}>{points > 0 ? `−${points}` : '0'}</span>
          <span className="results-unit">{points === 1 ? 'point owed' : 'points owed'}</span>
        </div>

        <div className="tiles">
          {tiles.map((t) => (
            <div key={t.label} className={`tile tone-${t.tone}`}>
              <span className="tile-value">{t.value}</span>
              <span className="tile-label">{t.label}</span>
            </div>
          ))}
        </div>

        <ul className="results-notes">
          <li>{COPY.results.owed(points, mins)}</li>
          <li>{COPY.results.quiz(stats.right, stats.asked)}</li>
        </ul>

        <button className="btn primary big" onClick={onRestart}>
          {COPY.results.again}
        </button>
      </div>
    </div>
  );
}
