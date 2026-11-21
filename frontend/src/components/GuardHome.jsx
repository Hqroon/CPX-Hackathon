// "Continue on other apps" (Android): one-time setup, then 看看 shrinks into a
// floating bubble that taxes Instagram / Xiaohongshu / Douyin. Owner: M1.
import React, { useEffect, useState } from 'react';
import { CONFIG } from '../config.js';
import TopBar from './Brand.jsx';
import { openGuardSettings, openGuardAppInfo, resetGuard } from '../native/reelGuard.js';

function Step({ done, n, title, children }) {
  return (
    <div className={`guard-step ${done ? 'done' : ''}`}>
      <div className="guard-step-mark" aria-hidden="true">{done ? '✓' : n}</div>
      <div className="guard-step-body">
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  );
}

export default function GuardHome({ status, nativeApp, onRefresh, onChooseSlides, onStart, onStop, onBack }) {
  const [busy, setBusy] = useState(false);
  const enabled = !!status?.accessibilityEnabled;
  const armed = !!status?.armed;

  // Refresh when the user comes back from Settings.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && onRefresh();
    document.addEventListener('visibilitychange', onVisible);
    const t = setInterval(onRefresh, 4000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(t);
    };
  }, [onRefresh]);

  async function run(fn) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen guard">
      <TopBar right={<button type="button" className="btn small back-btn" onClick={onBack}>← Back</button>} />
      <div className="screen-scroll">
        <p className="eyebrow">Continue on other apps</p>
        <h1 className="title">Tax the reels you already watch</h1>
        <p className="lede">
          看看 shrinks into a floating bubble. Open Instagram or Xiaohongshu: your first {CONFIG.freeReels} reels are free, then every reel costs a point.
        </p>

        {!nativeApp && (
          <p className="form-error" role="note">
            This works in the 看看 Android app. In the browser, use “Continue in the app”.
          </p>
        )}

        <div className="guard-meters">
          <div><span>Owed</span><strong>{status?.points > 0 ? `−${status.points}` : '0'}</strong></div>
          <div><span>Bubble</span><strong>{armed ? 'On' : 'Off'}</strong></div>
        </div>

        <Step n={1} done={enabled} title={enabled ? '看看 is allowed to watch reels' : 'Allow 看看 (once)'}>
          {!enabled && (
            <>
              <p>
                Settings → Accessibility → <b>看看</b> → turn on.
                Greyed out (Android 13+)? App info → ⋮ → <b>Allow restricted settings</b>, then try again.
              </p>
              <div className="guard-row">
                <button className="btn primary" onClick={openGuardSettings} disabled={!nativeApp}>Open Accessibility</button>
                <button className="btn secondary" onClick={openGuardAppInfo} disabled={!nativeApp}>App info</button>
              </div>
            </>
          )}
          {enabled && status?.running === false && (
            <>
              <p className="form-error" role="alert">
                Your phone has paused 看看 in the background. Open Accessibility, turn <b>看看</b> off and on again,
                and set its battery use to <b>No restrictions</b> so it isn't paused again.
              </p>
              <div className="guard-row">
                <button className="btn primary" onClick={openGuardSettings}>Open Accessibility</button>
                <button className="btn secondary" onClick={openGuardAppInfo}>App info</button>
              </div>
            </>
          )}
        </Step>

        <Step n={2} done={!!status?.hasQuestions} title="Questions from your slides (optional)">
          <p>{status?.hasQuestions ? 'Loaded from your slides.' : 'Without slides, general questions are used.'}</p>
          <button className="btn secondary" onClick={onChooseSlides}>
            {status?.hasQuestions ? 'Change slides' : 'Choose slides'}
          </button>
        </Step>

        <details className="guard-rules">
          <summary>What happens inside Instagram / Xiaohongshu</summary>
          <ul>
            <li>Reels 1–{CONFIG.freeReels}: free. The bubble shows your points; tap it to come back here.</li>
            <li>After that: −{CONFIG.pointsPerReel} per reel.</li>
            <li>Every {CONFIG.questionEvery} paid reels: a question card covers the reel. Wrong = {CONFIG.wrongWaitSeconds} s, then a new question.</li>
            <li>Sound switches on / off every reel and quietly gets {Math.round(CONFIG.volumeStepDown * 100)}% softer.</li>
            <li>After reel {CONFIG.slowAfterReels}: a {CONFIG.slowTransitionMs / 1000} s pause after every swipe, and the screen greys out.</li>
            <li>{CONFIG.minutesPerPoint} minutes away clears 1 point.</li>
          </ul>
        </details>

        <p className="switch-line">
          <button type="button" className="text-link" onClick={async () => { await resetGuard(); onRefresh(); }}>
            Reset points
          </button>
        </p>
      </div>

      <div className="bottom-actions">
        {armed ? (
          <>
            <button className="btn primary" disabled={busy} onClick={() => run(onStart)}>Back to the bubble</button>
            <button className="btn secondary" disabled={busy} onClick={() => run(onStop)}>Stop the bubble</button>
          </>
        ) : (
          <button className="btn primary" disabled={!enabled || status?.running === false || busy} onClick={() => run(onStart)}>
            {enabled ? 'Start: shrink into a bubble' : 'Finish step 1 to start'}
          </button>
        )}
      </div>
    </div>
  );
}
