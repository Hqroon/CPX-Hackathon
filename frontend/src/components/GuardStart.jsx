// "Continue on other apps" (Android): one button, Start 看看, which shrinks the app into
// the floating bubble that taxes Instagram / Xiaohongshu. The phone is set up in advance
// (看看 allowed in Accessibility), so there is no setup screen here. Owner: M1.
import React, { useState } from 'react';
import { HomeLogo } from './Brand.jsx';
import { IconBack, IconShare } from './Icons.jsx';
import { openGuardSettings } from '../native/reelGuard.js';
import BackgroundLogo from './BackgroundLogo.jsx';

export default function GuardStart({ status, nativeApp, onStart, onBack, onNote }) {
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!nativeApp) {
      onNote('The bubble runs in the 看看 Android app. In the browser, use “Continue in this app”.');
      return;
    }
    if (!status?.accessibilityEnabled) {
      // Safety net only: on the demo phone this is already switched on.
      onNote('Turn on 看看 in Accessibility first, then come back and tap Start.');
      openGuardSettings();
      return;
    }
    setBusy(true);
    try {
      await onStart();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen start">
      <BackgroundLogo />
      <div className="screen-scroll start-scroll">
        <div className="start-header">
          <HomeLogo />
        </div>
      </div>

      <div className="upload-backdrop">
        <div className="upload-dialog card" role="dialog" aria-modal="true" aria-labelledby="guard-start-title">
          <div className="dialog-head">
            <button type="button" className="dialog-back" onClick={onBack} aria-label="Go back">
              <IconBack size={20} />
            </button>
            <h2 id="guard-start-title" className="upload-title">Continue on other apps</h2>
          </div>
          <p className="muted upload-sub">看看 becomes a floating bubble. Then open Instagram or Xiaohongshu.</p>
          <button className="btn primary start-pulse" onClick={start} disabled={busy}>
            <IconShare size={18} /><span>{busy ? 'Starting…' : 'Start 看看'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
