// The slide gate shown before every session. Owner: M4.
import React, { useState } from 'react';
import { CONFIG } from '../config.js';
import { COPY } from '../copy.js';
import { useSlideUpload } from '../rules/useSlideUpload.js';
import Explain from './Explain.jsx';
import { IconUpload, IconDoc, IconChevron, IconArrow } from './Icons.jsx';
import TopBar from './Brand.jsx';

const IS_DEV = import.meta.env.DEV;

function DevDiagnostics({ diagnostics, error }) {
  const [selectedPage, setSelectedPage] = useState('');
  if (!IS_DEV || (!diagnostics && !error)) return null;

  const slides = diagnostics?.slides || [];
  const selected = slides.find((slide) => String(slide.page) === selectedPage) || slides[0];
  return (
    <details className="gate-status" style={{ textAlign: 'left', marginTop: 16 }}>
      <summary>PDF extraction diagnostics (development only)</summary>
      <dl>
        <dt>File</dt><dd>{diagnostics?.fileName || '—'}</dd>
        <dt>Total PDF pages</dt><dd>{diagnostics?.totalPages ?? '—'}</dd>
        <dt>Usable pages</dt><dd>{diagnostics?.usablePages ?? 0}</dd>
        <dt>Page errors</dt><dd>{diagnostics?.pageErrors?.length ?? 0}</dd>
      </dl>
      {error && <p role="alert">Error: {error}</p>}
      {diagnostics?.pageErrors?.map((item) => (
        <p key={item.page}>Page {item.page}: {item.message}</p>
      ))}
      {slides.length > 0 && (
        <>
          <label>
            Text preview page{' '}
            <select value={selected?.page || ''} onChange={(event) => setSelectedPage(event.target.value)}>
              {slides.map((slide) => <option key={slide.page} value={slide.page}>{slide.page}</option>)}
            </select>
          </label>
          <p>{selected?.text.slice(0, 400)}{selected?.text.length > 400 ? '…' : ''}</p>
        </>
      )}
    </details>
  );
}

export default function SlideGate({ onStart, explain, onBack, startLabel }) {
  const { status, diagnostics, inputRef, onFile, readingLabel, reading, ready, choose, reset } = useSlideUpload();
  const deckTitle = ready ? status.name.replace(/\.pdf$/i, '') : '';

  return (
    <div className="screen gate">
      <TopBar right={onBack && <button type="button" className="btn small back-btn" onClick={onBack}>← Back</button>} />
      <div className="screen-scroll">
        <p className="eyebrow">Step 1 of 2</p>
        <h1 className="title">{COPY.gate.title}</h1>
        <p className="lede">Questions about these slides will pop up while you scroll.</p>
        <Explain show={explain} text={COPY.explain.gate} />

        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={onFile} />

        {!ready && (
          <div className="card list-card">
            <button className="list-row" onClick={choose} disabled={reading}>
              <span className="row-icon"><IconUpload size={16} /></span>
              <span className="row-text">
                <span className="row-title" role={reading ? 'status' : undefined} aria-live="polite">
                  {reading ? readingLabel : status.kind === 'error' ? 'Choose other PDFs' : 'Upload PDFs'}
                </span>
                <span className="row-sub">1 to {CONFIG.maxPdfFiles} PDFs with selectable text</span>
              </span>
              <IconChevron size={18} className="row-chevron" />
            </button>
          </div>
        )}

        {status.kind === 'error' && <p className="form-error" role="alert">{status.msg}</p>}

        {ready && (
          <>
            <div className="card deck-card">
              <div className="deck-cover" aria-hidden="true">
                <span>{deckTitle}</span>
              </div>
              <div className="deck-info">
                <p className="deck-title">{deckTitle}</p>
                <p className="muted">{status.files?.length > 1 ? `${status.files.length} PDFs combined` : 'Your slides'}</p>
                <p className="muted deck-count"><IconDoc size={14} /> {status.slides.length} slides read</p>
              </div>
            </div>

            <div className="stat-row">
              <div className="card stat"><strong>{status.slides.length}</strong><span>Slides</span></div>
              <div className="card stat"><strong>{CONFIG.freeReels}</strong><span>Free reels</span></div>
              <div className="card stat"><strong>{CONFIG.questionEvery}</strong><span>Reels per question</span></div>
            </div>

            <p className="group-label">Questions will come from</p>
            <div className="card list-card">
              {status.files?.length > 1
                ? status.files.map((f, i) => (
                  <div className="list-row static" key={f.name + i}>
                    <span className="row-icon">{i + 1}</span>
                    <span className="row-text">
                      <span className="row-title">{f.name}</span>
                      <span className="row-sub">{f.count} slides</span>
                    </span>
                  </div>
                ))
                : status.slides.slice(0, 3).map((sl) => (
                  <div className="list-row static" key={sl.page}>
                    <span className="row-icon">{sl.page}</span>
                    <span className="row-text"><span className="row-title clamp">{sl.text}</span></span>
                  </div>
                ))}
            </div>
            {status.skipped?.length > 0 && (
              <p className="form-error" role="status">Skipped: {status.skipped.join('; ')}.</p>
            )}
            <button className="text-link center" onClick={reset}>Choose different slides</button>
          </>
        )}

        <DevDiagnostics diagnostics={diagnostics} error={status.error} />
      </div>

      {ready && (
        <div className="bottom-actions">
          {/* onStart must run inside this click so the browser allows video with sound. */}
          <button className="btn primary" onClick={() => onStart(status.slides)}>
            <span>{startLabel || COPY.gate.start}</span>
            <IconArrow size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
