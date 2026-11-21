// Hidden judging controls. Open by tapping the logo 5 times. Owner: M2.
import React from 'react';
import { IconClose } from './Icons.jsx';

export default function DemoPanel({ info, actions, onClose }) {
  return (
    <div className="demo-panel" role="dialog" aria-label="Demo controls">
      <div className="demo-head">
        <strong><span className="dot" aria-hidden="true" />Demo controls</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Close demo controls"><IconClose size={16} /></button>
      </div>
      <div className="demo-grid">
        <button className="btn small" onClick={actions.skip15}>Skip 15 minutes</button>
        <button className="btn small" onClick={actions.jumpToSlow}>Jump to reel {info.slowThreshold} (next swipe is slow)</button>
        <button className="btn small" onClick={actions.triggerQuiz}>Trigger a question now</button>
        <button className={`btn small ${info.demo ? 'on' : ''}`} onClick={actions.toggleDemo}>
          Demo speed ×3: {info.demo ? 'on' : 'off'}
        </button>
        <button className={`btn small ${info.explain ? 'on' : ''}`} onClick={actions.toggleExplain}>
          Explain mode: {info.explain ? 'on' : 'off'}
        </button>
        <button className="btn small danger" onClick={actions.reset}>Reset everything</button>
      </div>
      <dl className="demo-info">
        <dt>Reels</dt><dd>{info.reelSource}</dd>
        <dt>Questions</dt><dd>{info.provider || '–'} ({info.questionCount})</dd>
        <dt>Points</dt><dd>{info.points}</dd>
        <dt>Session</dt><dd>{info.totalReels} reels · {info.reelsAfterLine} after line</dd>
        <dt>Now</dt><dd>reel {info.currentReel ?? '–'} · sound {info.volume} · decay {info.decay}%</dd>
        <dt>Rules</dt><dd>question after the free reels, then every {info.questionEvery} · slow + fading after reel {info.slowThreshold}</dd>
      </dl>
    </div>
  );
}
