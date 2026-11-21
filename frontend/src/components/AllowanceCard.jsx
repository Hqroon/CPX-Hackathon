// Full-screen card shown after the free reels. Owner: M1.
import React from 'react';
import { COPY } from '../copy.js';
import Explain from './Explain.jsx';
import Doodle from './Doodle.jsx';

export default function AllowanceCard({ freeReels, onClose, onKeep, explain }) {
  return (
    <div className="caught-up allowance">
      <div className="caught-text">
        <h2>{COPY.allowance.title(freeReels)}</h2>
        <p>{COPY.allowance.body}</p>
        <div className="zone-pills">
          <span className="pill pill-free">First {freeReels} were free</span>
          <span className="pill pill-paid">Now −1 per reel</span>
        </div>
      </div>
      <div className="caught-art"><Doodle name="zombieing" className="on-night" /></div>
      <div className="caught-actions">
        <button className="btn primary big" onClick={onClose}>
          {COPY.allowance.close}
        </button>
        <button className="btn link light" onClick={onKeep}>
          {COPY.allowance.keep}
        </button>
        <p className="allowance-hint">Swipe up to keep scrolling</p>
        <Explain show={explain} text={COPY.explain.free} />
      </div>
    </div>
  );
}
