// The slide gate shown before every session. Owner: M4.
import React, { useRef, useState } from 'react';
import { CONFIG } from '../config.js';
import { COPY } from '../copy.js';
import { extractSlides } from '../rules/slides.js';
import Explain from './Explain.jsx';
import sample from '../mock/sample-slides.json';

export default function SlideGate({ onStart, explain }) {
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

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-badge">Toll booth</div>
        <h1>{COPY.gate.title}</h1>
        <p>{COPY.gate.body}</p>
        <Explain show={explain} text={COPY.explain.gate} />

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,.ppt,.pptx"
          hidden
          onChange={onFile}
        />

        {status.kind !== 'ready' && (
          <div className="gate-actions">
            <button
              className="btn primary"
              onClick={() => inputRef.current?.click()}
              disabled={status.kind === 'reading'}
            >
              {COPY.gate.upload}
            </button>
            <button
              className="btn ghost"
              onClick={() => setStatus({ kind: 'ready', slides: sample.pages, name: sample.title })}
              disabled={status.kind === 'reading'}
            >
              {COPY.gate.sample}
            </button>
          </div>
        )}

        {status.kind === 'reading' && <p className="gate-status">{COPY.gate.reading(status.n)}</p>}
        {status.kind === 'error' && <p className="gate-error" role="alert">{status.msg}</p>}

        {status.kind === 'ready' && (
          <>
            <p className="gate-status">
              <strong>{status.name}</strong>
              <br />
              {COPY.gate.ready(status.slides.length)}
            </p>
            {/* onStart must run inside this click so the browser allows video with sound. */}
            <button className="btn primary big" onClick={() => onStart(status.slides)}>
              {COPY.gate.start}
            </button>
            <button className="btn link" onClick={() => setStatus({ kind: 'idle' })}>
              Choose different slides
            </button>
          </>
        )}
      </div>
    </div>
  );
}
