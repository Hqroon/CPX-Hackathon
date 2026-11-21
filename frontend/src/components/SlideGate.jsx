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
import sample from '../mock/sample-slides.json';

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

export default function SlideGate({ onStart, explain }) {
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
    setDiagnostics(null);
    setStatus({ kind: 'ready', slides: sample.pages, name: sample.title });
  }

  const readingLabel = status.kind === 'reading'
    ? status.totalPages
      ? `Reading page ${status.processedPages} of ${status.totalPages}…`
      : 'Opening PDF…'
    : '';

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
          accept="application/pdf,.pdf"
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
              {status.kind === 'error' ? 'Choose another PDF' : COPY.gate.upload}
            </button>
            <button className="btn ghost" onClick={useSample} disabled={status.kind === 'reading'}>
              {COPY.gate.sample}
            </button>
          </div>
        )}

        {status.kind === 'reading' && (
          <p className="gate-status" role="status" aria-live="polite">{readingLabel}</p>
        )}
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

        <DevDiagnostics diagnostics={diagnostics} error={status.error} />
      </div>
    </div>
  );
}
