// First screen: 看看 See See with an upload dialog. Owner: M1.
// Upload 1-5 PDFs first; then choose where to scroll. Both choices use these slides.
import React from 'react';
import { CONFIG } from '../config.js';
import { useSlideUpload } from '../rules/useSlideUpload.js';
import { HomeLogo } from './Brand.jsx';
import { IconLayers, IconShare, IconChevron, IconUpload, IconDoc } from './Icons.jsx';

export default function StartScreen({ onThisApp, onOtherApps, guardStatus, nativeApp }) {
  const { status, inputRef, onFile, readingLabel, reading, ready, choose, reset } = useSlideUpload();
  const owed = guardStatus?.points || 0;
  const armed = !!guardStatus?.armed;
  const otherSub = !nativeApp
    ? 'Android app only · Instagram, 小红书 Xiaohongshu'
    : armed
      ? 'Running as a bubble' + (owed > 0 ? ` · −${owed} owed` : '')
      : 'Instagram · 小红书 Xiaohongshu · 抖音 Douyin';

  return (
    <div className="screen start">
      <div className="screen-scroll start-scroll">
        <div className="start-header">
          <HomeLogo />
        </div>
      </div>

      <div className="upload-backdrop">
        <div className="upload-dialog card" role="dialog" aria-modal="true" aria-labelledby="upload-title">
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={onFile} />

          {!ready ? (
            <>
              <h2 id="upload-title" className="upload-title">Upload your slides</h2>
              <p className="muted upload-sub">
                Upload up to {CONFIG.maxPdfFiles} PDFs.
              </p>
              {status.kind === 'error' && <p className="form-error" role="alert">{status.msg}</p>}
              <button className="btn primary" onClick={choose} disabled={reading}>
                {reading ? (
                  <span role="status" aria-live="polite">{readingLabel}</span>
                ) : (
                  <><IconUpload size={18} /><span>{status.kind === 'error' ? 'Choose other PDFs' : 'Choose PDFs'}</span></>
                )}
              </button>
            </>
          ) : (
            <>
              <h2 id="upload-title" className="upload-title">Slides ready</h2>
              <div className="upload-files">
                {status.files.map((f, i) => (
                  <div className="upload-file" key={f.name + i}>
                    <IconDoc size={16} />
                    <span className="upload-file-name">{f.name}</span>
                    <span className="muted">{f.count} slides</span>
                  </div>
                ))}
              </div>
              {status.skipped?.length > 0 && (
                <p className="form-error" role="status">Skipped: {status.skipped.join('; ')}.</p>
              )}

              <p className="group-label">Where do you want to scroll?</p>
              <div className="card list-card">
                {/* onThisApp must run inside this click so the browser allows video with sound. */}
                <button className="list-row start-option" onClick={() => onThisApp(status.slides)}>
                  <span className="row-icon"><IconLayers size={18} /></span>
                  <span className="row-text">
                    <span className="row-title">Continue in the app</span>
                    <span className="row-sub">Scroll our reels with questions from your slides</span>
                  </span>
                  <IconChevron size={18} className="row-chevron" />
                </button>
                <button className="list-row start-option" onClick={() => onOtherApps(status.slides)}>
                  <span className={`row-icon ${armed ? 'on' : ''}`}><IconShare size={18} /></span>
                  <span className="row-text">
                    <span className="row-title">Continue on other apps</span>
                    <span className="row-sub">{otherSub}</span>
                  </span>
                  <IconChevron size={18} className="row-chevron" />
                </button>
              </div>
              <button className="text-link center" onClick={reset}>Choose different PDFs</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
