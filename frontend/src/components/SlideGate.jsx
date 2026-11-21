// The slide gate shown before every session. Owner: M4.
import React, { useRef, useState } from 'react';
import { CONFIG } from '../config.js';
import { COPY } from '../copy.js';
import { extractSlides } from '../rules/slides.js';
import Explain from './Explain.jsx';
import { IconUpload, IconLayers, IconChevron, IconArrow, IconDoc } from './Icons.jsx';
import TopBar from './Brand.jsx';
import sample from '../mock/sample-slides.json';

export default function SlideGate({ onStart, explain, user, onLogout }) {
  // idle | reading { n } | ready { slides, name } | error { msg }
  const [status, setStatus] = useState({ kind: 'idle' });
  const inputRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    if (!isPdf) {
      setStatus({ kind: 'error', msg: /\.pptx?$/i.test(file.name) ? COPY.gate.notPdf : COPY.gate.failed });
      return;
    }
    setStatus({ kind: 'reading', n: 0 });
    try {
      const slides = await extractSlides(file, (n) => setStatus({ kind: 'reading', n }));
      if (slides.length < CONFIG.minSlides) {
        setStatus({ kind: 'error', msg: COPY.gate.tooFew(slides.length) });
      } else {
        setStatus({ kind: 'ready', slides, name: file.name });
      }
    } catch (err) {
      console.error('[slides] extraction failed', err);
      setStatus({ kind: 'error', msg: COPY.gate.failed });
    }
  }

  const reading = status.kind === 'reading';
  const ready = status.kind === 'ready';
  const deckTitle = ready ? status.name.replace(/\.pdf$/i, '').replace(/^Sample:\s*/, '') : '';

  return (
    <div className="screen gate">
      <TopBar user={user} />
      <div className="screen-scroll">
        <h1 className="title">{COPY.gate.title}</h1>
        <Explain show={explain} text={COPY.explain.gate} />

        <input ref={inputRef} type="file" accept="application/pdf,.pdf,.ppt,.pptx" hidden onChange={onFile} />

        {!ready && (
          <div className="card list-card">
            <button className="list-row" onClick={() => inputRef.current?.click()} disabled={reading}>
              <span className="row-icon"><IconUpload size={16} /></span>
              <span className="row-text">
                <span className="row-title">{reading ? COPY.gate.reading(status.n) : 'Upload a PDF'}</span>
                <span className="row-sub">At least {CONFIG.minSlides} slides with text</span>
              </span>
              <IconChevron size={18} className="row-chevron" />
            </button>
            <button
              className="list-row"
              onClick={() => setStatus({ kind: 'ready', slides: sample.pages, name: sample.title })}
              disabled={reading}
            >
              <span className="row-icon"><IconLayers size={16} /></span>
              <span className="row-text">
                <span className="row-title">{COPY.gate.sample}</span>
                <span className="row-sub">Data Structures &amp; Algorithms, week 3</span>
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
                <p className="muted">Your slides</p>
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
              {status.slides.slice(0, 3).map((sl) => (
                <div className="list-row static" key={sl.page}>
                  <span className="row-icon">{sl.page}</span>
                  <span className="row-text"><span className="row-title clamp">{sl.text}</span></span>
                </div>
              ))}
            </div>
            <button className="text-link center" onClick={() => setStatus({ kind: 'idle' })}>Choose different slides</button>
          </>
        )}

        {user && onLogout && (
          <p className="switch-line">
            Not {user.name}?{' '}
            <button type="button" className="text-link" onClick={onLogout}>Log out</button>
          </p>
        )}
      </div>

      {ready && (
        <div className="bottom-actions">
          {/* onStart must run inside this click so the browser allows video with sound. */}
          <button className="btn primary" onClick={() => onStart(status.slides)}>
            <span>{COPY.gate.start}</span>
            <IconArrow size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
