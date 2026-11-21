import React from 'react';
import { COPY } from '../copy.js';
import Explain from './Explain.jsx';
import { MoonArt } from './Illustrations.jsx';

// The caught-up line: the border between free friend reels and paid reels.
export default function CaughtUpCard({ onClose, onKeep, explain }) {
  return (
    <div className="caught-up">
      <div className="caught-text">
        <h2>{COPY.caughtUp.title}</h2>
        <p>{COPY.caughtUp.body}</p>
        <div className="zone-pills">
          <span className="pill pill-free">Friends · free</span>
          <span className="pill pill-paid">After this · −1 per reel</span>
        </div>
      </div>
      <div className="caught-art"><MoonArt /></div>
      <div className="caught-actions">
        <button className="btn primary big" onClick={onClose}>
          {COPY.caughtUp.close}
        </button>
        <button className="btn link light" onClick={onKeep}>
          {COPY.caughtUp.keep}
        </button>
        <Explain show={explain} text={COPY.explain.friends} />
      </div>
    </div>
  );
}
