// The slide gate shown before every session. Owner: M4.
import React, { useRef, useState } from 'react';
import { CONFIG } from '../config.js';
import { COPY } from '../copy.js';
import {
  extractSlidesWithDiagnostics,
  SlideExtractionError,
  validatePdfFile,
} from '../rules/slides.js';
import Explain from './Explain.jsx';
import {
  IconUpload, IconDoc, IconCheck,
  IconLayers, IconChevron, IconArrow,
} from './Icons.jsx';
import TopBar from './Brand.jsx';
import samples from '../mock/course-slides.json';

const IS_DEV = import.meta.env.DEV;

function extractionMessage(error, diagnostics) {
  if (error instanceof SlideExtractionError) return error.message;
  if (diagnostics?.totalPages > 0 && diagnostics.pagesWithText === 0) {
    return 'No selectable text was found. This looks like a scanned or image-only PDF. Please upload a text-based PDF exported from PowerPoint or your slide app; OCR is not supported.';
  }
  return COPY.gate.failed;
}

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
  // idle | reading { processedPages, totalPages } | ready { slides, name } | error { msg }
  const [status, setStatus] = useState({ kind: 'idle' });
  const [diagnostics, setDiagnostics] = useState(null);
  const inputRef = useRef(null);

  async function onFile(event) {
    const file = event.target.files?.[0];
    // Allows choosing the same file again after an error.
    event.target.value = '';
    if (!file) return;

    const initialDiagnostics = {
      fileName: file.name, totalPages: null, usablePages: 0, pageErrors: [], slides: [],
    };
    setDiagnostics(initialDiagnostics);
    try {
      validatePdfFile(file);
    } catch (error) {
      setStatus({ kind: 'error', msg: extractionMessage(error), error: error.message });
      return;
    }

    setStatus({ kind: 'reading', processedPages: 0, totalPages: null });
    try {
      const result = await extractSlidesWithDiagnostics(file, (progress) => {
        setStatus({
          kind: 'reading',
          processedPages: progress.processedPages,
          totalPages: progress.totalPages,
        });
      });
      setDiagnostics({ ...result.diagnostics, slides: result.slides });

      if (result.slides.length < CONFIG.minSlides) {
        const msg = result.diagnostics.pagesWithText === 0
          ? extractionMessage(null, result.diagnostics)
          : COPY.gate.tooFew(result.slides.length);
        setStatus({
          kind: 'error',
          msg,
          error: result.diagnostics.pageErrors.length ? 'Some pages could not be read.' : null,
        });
      } else {
        setStatus({ kind: 'ready', slides: result.slides, name: file.name });
      }
    } catch (error) {
      console.error('[slides] extraction failed', error);
      setStatus({ kind: 'error', msg: extractionMessage(error, initialDiagnostics), error: error.message });
    }
  }

  function useSample() {
    // Mix courses automatically, with globally unique source-page identifiers.
    // Include the original lecture/page in the text so explanations retain context.
    const pool = samples.decks.flatMap((deck) => deck.pages.map((slide) => ({
      text: `[${deck.title}, original PDF page ${slide.page}] ${slide.text}`,
    })));
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const pages = pool.slice(0, 12).map((slide, index) => ({ page: index + 1, text: slide.text }));
    setDiagnostics(null);
    setStatus({ kind: 'ready', slides: pages, name: 'Mixed course samples · 随机跨学科课件' });
  }

  const readingLabel = status.kind === 'reading'
    ? status.totalPages
      ? `Reading page ${status.processedPages} of ${status.totalPages}…`
      : 'Opening PDF…'
    : '';
  const reading = status.kind === 'reading';
  const ready = status.kind === 'ready';
  const deckTitle = ready ? status.name.replace(/\.pdf$/i, '').replace(/^Sample:\s*/, '') : '';

  return (
    <div className="screen gate">
      <TopBar right={onBack && <button type="button" className="btn small back-btn" onClick={onBack}>← Back</button>} />
      <div className="screen-scroll">
        <p className="eyebrow">Step 1 of 2</p>
        <h1 className="title">{COPY.gate.title}</h1>
        <p className="lede">Questions about these slides will pop up while you scroll.</p>
        <Explain show={explain} text={COPY.explain.gate} />

        <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={onFile} />

        {!ready && (
          <div className="card list-card">
            <button className="list-row" onClick={() => inputRef.current?.click()} disabled={reading}>
              <span className="row-icon"><IconUpload size={16} /></span>
              <span className="row-text">
                <span className="row-title" role={reading ? 'status' : undefined} aria-live="polite">
                  {reading ? readingLabel : status.kind === 'error' ? 'Choose another PDF' : 'Upload a PDF'}
                </span>
                <span className="row-sub">At least {CONFIG.minSlides} slides with text</span>
              </span>
              <IconChevron size={18} className="row-chevron" />
            </button>
            <button
              className="list-row"
              onClick={useSample}
              disabled={reading}
            >
              <span className="row-icon"><IconLayers size={16} /></span>
              <span className="row-text">
                <span className="row-title">{COPY.gate.sample}</span>
                <span className="row-sub">Mixed lecture samples from several courses</span>
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
