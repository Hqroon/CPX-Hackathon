// Full-screen card shown after the free reels. Owner: M1.
import React from 'react';
import { COPY } from '../copy.js';
import { CONFIG } from '../config.js';
import Explain from './Explain.jsx';
import { IconCircleCheck } from './Icons.jsx';
import BackgroundLogo from './BackgroundLogo.jsx';

export default function AllowanceCard({ freeReels, onClose, onKeep, explain }) {
  return (
    <div className="screen allowance">
      <BackgroundLogo />
      <div className="screen-scroll centered">
        <span className="complete-icon" aria-hidden="true"><IconCircleCheck size={30} /></span>
        <h2 className="title">{COPY.allowance.title(freeReels)}</h2>
        <p className="lede">{COPY.allowance.body}</p>

        <div className="stat-row">
          <div className="card stat"><strong>{freeReels}/{freeReels}</strong><span>Free reels used</span></div>
          <div className="card stat warn"><strong>−1</strong><span>Per reel now</span></div>
          <div className="card stat"><strong>{CONFIG.minutesPerPoint}m</strong><span>Away per point back</span></div>
        </div>
        <Explain show={explain} text={COPY.explain.free} />
      </div>
      <div className="bottom-actions">
        <button className="btn primary" onClick={onClose}>{COPY.allowance.close}</button>
        <button className="btn secondary" onClick={onKeep}>{COPY.allowance.keep}</button>
        <p className="hint">Or swipe up to keep scrolling</p>
      </div>
    </div>
  );
}
