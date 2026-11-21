import React from 'react';
import { COPY } from '../copy.js';
import { minutesToClear } from '../rules/points.js';

export default function Results({ stats, points, onRestart }) {
  return (
    <div className="results">
      <div className="receipt">
        <div className="receipt-head">{COPY.results.title}</div>
        <div className="receipt-big">−{points}</div>
        <ul>
          <li>{COPY.results.reels(stats.reelsAfterLine)}</li>
          <li>{COPY.results.owed(points, minutesToClear(points))}</li>
          <li>{COPY.results.quiz(stats.right, stats.asked)}</li>
          <li>{stats.totalReels} reels in total this session</li>
        </ul>
        <button className="btn primary" onClick={onRestart}>
          {COPY.results.again}
        </button>
      </div>
    </div>
  );
}
