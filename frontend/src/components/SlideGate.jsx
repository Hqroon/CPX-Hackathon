// The slide gate shown before every session. Owner: M4.
import React, { useRef, useState } from 'react';
import { CONFIG } from '../config.js';
import { COPY } from '../copy.js';
import { extractSlides } from '../rules/slides.js';
import Explain from './Explain.jsx';
import { IconUpload, IconDoc, IconCheck } from './Icons.jsx';
import { LogoMark, SlidesArt } from './Illustrations.jsx';
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

  const reading = status.kind === 'reading';
  const ready = status.kind === 'ready';
  const count = ready ? status.slides.length : reading ? status.n : 0;

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="brand" aria-hidden="true">
          <span>Doomscroll</span>
          <LogoMark size={26} />
          <span>Tax</span>
        </div>
        <div className="gate-art"><SlidesArt /></div>
        <h1>{COPY.gate.title}</h1>
        {COPY.gate.body && <p className="gate-body">{COPY.gate.body}</p>}
        <Explain show={explain} text={COPY.explain.gate} />

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,.ppt,.pptx"
          hidden
          onChange={onFile}
        />

        {/* Slide counter: five boxes to fill, like a form field. */}
        <div className="slide-counter" aria-label={`${count} of ${CONFIG.minSlides} slides`}>
          {Array.from({ length: CONFIG.minSlides }, (_, i) => (
            <span key={i} className={`slide-box ${i < count ? 'filled' : ''}`}>
              {i < count ? <IconCheck size={16} /> : i + 1}
            </span>
          ))}
          <span className="slide-counter-label">
            {count > CONFIG.minSlides ? `+${count - CONFIG.minSlides} more` : `min ${CONFIG.minSlides}`}
          </span>
        </div>

        {!ready && (
          <div className="gate-actions">
            <button
              className={`btn primary big ${reading ? 'busy' : ''}`}
              onClick={() => inputRef.current?.click()}
              disabled={reading}
            >
              <IconUpload size={20} />
              <span>{reading ? COPY.gate.reading(status.n) : COPY.gate.upload}</span>
            </button>
            <button
              className="btn ghost"
              onClick={() => setStatus({ kind: 'ready', slides: sample.pages, name: sample.title })}
              disabled={reading}
            >
              {COPY.gate.sample}
            </button>
          </div>
        )}

        {status.kind === 'error' && <p className="gate-error" role="alert">{status.msg}</p>}

        {ready && (
          <>
            <div className="file-slip">
              <IconDoc size={22} />
              <div>
                <strong>{status.name}</strong>
                <span>{COPY.gate.ready(status.slides.length)}</span>
              </div>
              <span className="file-ok" aria-label="Accepted"><IconCheck size={16} /></span>
            </div>
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
