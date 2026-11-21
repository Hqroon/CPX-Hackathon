// Welcome screen (dark theme only): floating 3D logo, app name, Start.
// Start leads to the upload-slides page (StartScreen). Styles: theme-dark.css ("Welcome").
import React, { useRef, useState } from 'react';
import Logo3D from './Logo3D.jsx';
import { BRAND } from './Brand.jsx';

const EXIT_MS = 420; // matches .welcome.leaving in theme-dark.css

export default function Welcome({ onStart }) {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  function start() {
    if (done.current) return;
    done.current = true;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { onStart(); return; }
    setLeaving(true);
    setTimeout(onStart, EXIT_MS);
  }

  return (
    <div className={`screen welcome${leaving ? ' leaving' : ''}`}>
      <div className="welcome-stage" aria-hidden="true">
        <span className="welcome-aura" />
        <span className="welcome-orbit"><span className="welcome-orbit-light" /></span>
        <span className="welcome-logo"><Logo3D size={168} /></span>
        <span className="welcome-shadow" />
      </div>

      <h1 className="welcome-name" aria-label={BRAND.full}>
        <span className="welcome-cn" lang="zh" aria-hidden="true">{BRAND.cn}</span>
        <span className="welcome-en" aria-hidden="true">{BRAND.en}</span>
      </h1>

      <div className="welcome-actions">
        <button type="button" className="welcome-start" onClick={start}>
          <span>Start</span>
        </button>
      </div>
    </div>
  );
}
