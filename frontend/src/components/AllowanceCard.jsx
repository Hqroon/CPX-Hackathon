// Full-screen card shown after the free reels. Owner: M1.
import React from 'react';
import { COPY } from '../copy.js';
import Explain from './Explain.jsx';

export default function AllowanceCard({ freeReels, onClose, onKeep, explain }) {
  return (
    <div className="allowance">
      <div className="allowance-icon" aria-hidden="true">−1</div>
      <h2>{COPY.allowance.title(freeReels)}</h2>
      <p>{COPY.allowance.body}</p>
      <button className="btn primary" onClick={onClose}>
        {COPY.allowance.close}
      </button>
      <button className="btn ghost" onClick={onKeep}>
        {COPY.allowance.keep}
      </button>
      <p className="allowance-hint">Swipe up to keep scrolling</p>
      <Explain show={explain} text={COPY.explain.free} />
    </div>
  );
}
