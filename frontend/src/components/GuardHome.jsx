// Home screen of the "Reel Guard" APK: set up the overlay, open Instagram / Xiaohongshu,
// or fall back to our own 50-video feed. Owner: M1.
import React, { useEffect, useState } from 'react';
import { CONFIG, GUARD_TARGETS } from '../config.js';
import { openGuardSettings, openGuardAppInfo, launchGuardedApp, resetGuard } from '../native/reelGuard.js';

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

export default function GuardHome({ status, onRefresh, onChooseSlides, onBackupFeed }) {
  const [message, setMessage] = useState('');
  const enabled = !!status?.accessibilityEnabled;
  const installed = new Set(status?.installed || []);

  // Refresh when the user comes back from Settings or from Instagram.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && onRefresh();
    document.addEventListener('visibilitychange', onVisible);
    const t = setInterval(onRefresh, 4000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(t);
    };
  }, [onRefresh]);

  async function open(target) {
    setMessage('');
    if (!enabled) {
      setMessage('Switch Reel Guard on first (step 1), or the feed will run without the tax.');
    }
    const ok = await launchGuardedApp(target.pkg);
    if (!ok) setMessage(`${target.name} isn't installed on this phone.`);
  }

  return (
    <div className="gate guard">
      <div className="gate-card">
        <div className="brand">Reel Guard</div>
        <h1>Tax the reels you already watch</h1>
        <p className="gate-body">
          Runs on top of Instagram and Xiaohongshu: your first {CONFIG.freeReels} reels are free, then every reel costs a point.
        </p>

        <div className="guard-meters">
          <div><span>Owed</span><strong>{status?.points > 0 ? `−${status.points}` : '0'}</strong></div>
          <div><span>Reels this session</span><strong>{status?.sessionReels || 0}</strong></div>
        </div>

        <Step n={1} done={enabled} title={enabled ? 'Reel Guard is on' : 'Switch on Reel Guard'}>
          {!enabled && (
            <>
              <p>
                Settings → Accessibility → <b>Reel Guard · Doomscroll Tax</b> → turn on.
                If it's greyed out (Android 13+): App info → ⋮ → <b>Allow restricted settings</b>, then try again.
              </p>
              <div className="guard-row">
                <button className="btn primary" onClick={openGuardSettings}>Open Accessibility</button>
                <button className="btn ghost" onClick={openGuardAppInfo}>App info</button>
              </div>
            </>
          )}
        </Step>

        <Step n={2} done={!!status?.hasQuestions} title="Questions from your slides">
          <p>{status?.hasQuestions ? 'Loaded. Choose new slides any time.' : 'Until you add slides, general questions are used.'}</p>
          <button className="btn ghost" onClick={onChooseSlides}>{status?.hasQuestions ? 'Change slides' : 'Choose slides'}</button>
        </Step>

        <Step n={3} done={false} title="Open a feed">
          <div className="guard-apps">
            {GUARD_TARGETS.filter((t) => installed.has(t.pkg) || ['com.instagram.android', 'com.xingin.xhs'].includes(t.pkg)).map((t) => (
              <button
                key={t.pkg}
                className={`btn ${installed.has(t.pkg) ? 'primary' : 'ghost'}`}
                disabled={!installed.has(t.pkg)}
                onClick={() => open(t)}
              >
                {t.name}{installed.has(t.pkg) ? '' : ' · not installed'}
              </button>
            ))}
          </div>
        </Step>

        {message && <p className="gate-error" role="alert">{message}</p>}

        <details className="guard-rules">
          <summary>What happens inside Instagram / Xiaohongshu</summary>
          <ul>
            <li>Reels 1–{CONFIG.freeReels}: free.</li>
            <li>After that: −{CONFIG.pointsPerReel} per reel, shown in a floating bubble (tap it to come back here).</li>
            <li>Every {CONFIG.questionEvery} paid reels: a question card covers the reel. Wrong = {CONFIG.wrongWaitSeconds} s, then a new question.</li>
            <li>Sound switches on / off every reel and quietly gets {Math.round(CONFIG.volumeStepDown * 100)}% softer.</li>
            <li>After reel {CONFIG.slowAfterReels}: a {CONFIG.slowTransitionMs / 1000} s pause after every swipe, and the screen greys out.</li>
            <li>{CONFIG.minutesPerPoint} minutes away from these apps clears 1 point.</li>
          </ul>
        </details>

        <button className="btn link" onClick={onBackupFeed}>Backup: open our own feed (50 videos) →</button>
        <button
          className="btn link"
          onClick={async () => {
            await resetGuard();
            onRefresh();
          }}
        >
          Reset guard points
        </button>
      </div>
    </div>
  );
}
