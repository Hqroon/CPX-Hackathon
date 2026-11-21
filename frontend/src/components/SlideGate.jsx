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
  IconUpload, IconDoc,
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

export default function SlideGate({ onStart, explain, user, onLogout }) {
  // idle | reading { processedPages, totalPages } | ready { slides, name } | error { msg }
  const [status, setStatus] = useState({ kind: 'idle' });
  const [diagnostics, setDiagnostics] = useState(null);
  const inputRef = useRef(null);

  // Up to CONFIG.maxPdfFiles PDFs are read one after another and merged into one deck.
  // Pages are renumbered 1..N across the deck (so the backend sees unique page numbers);
  // each slide keeps `file` and `filePage` so the quiz can say which file it came from.
  async function onFile(event) {
    const files = Array.from(event.target.files || []);
    // Allows choosing the same files again after an error.
    event.target.value = '';
    if (files.length === 0) return;
    if (files.length > CONFIG.maxPdfFiles) {
      setStatus({ kind: 'error', msg: COPY.gate.tooManyFiles(CONFIG.maxPdfFiles, files.length) });
      return;
    }

    for (const file of files) {
      try {
        validatePdfFile(file);
      } catch (error) {
        const msg = files.length > 1 ? `${file.name}: ${extractionMessage(error)}` : extractionMessage(error);
        setStatus({ kind: 'error', msg, error: error.message });
        return;
      }
    }

    const slides = [];
    const skipped = [];
    const perFile = [];
    let lastDiagnostics = null;
    for (let f = 0; f < files.length; f += 1) {
      const file = files[f];
      setStatus({ kind: 'reading', fileIndex: f + 1, fileCount: files.length, processedPages: 0, totalPages: null });
      try {
        const result = await extractSlidesWithDiagnostics(file, (progress) => {
          setStatus({
            kind: 'reading', fileIndex: f + 1, fileCount: files.length,
            processedPages: progress.processedPages, totalPages: progress.totalPages,
          });
        });
        lastDiagnostics = { ...result.diagnostics, slides: result.slides };
        if (result.slides.length === 0) {
          skipped.push(`${file.name} (no readable text)`);
          continue;
        }
        perFile.push({ name: file.name, count: result.slides.length });
        for (const sl of result.slides) {
          slides.push({ page: slides.length + 1, text: sl.text, file: file.name, filePage: sl.page });
        }
      } catch (error) {
        console.error('[slides] extraction failed', file.name, error);
        const cause = error?.details?.cause ? ` Details: ${error.details.cause}` : '';
        skipped.push(`${file.name} (${extractionMessage(error)}${cause})`);
      }
    }
    setDiagnostics(lastDiagnostics);

    if (slides.length < CONFIG.minSlides) {
      const base = slides.length === 0 && lastDiagnostics?.pagesWithText === 0
        ? extractionMessage(null, lastDiagnostics)
        : COPY.gate.tooFew(slides.length);
      const note = skipped.length ? ` Skipped: ${skipped.join('; ')}.` : '';
      setStatus({ kind: 'error', msg: base + note });
      return;
    }
    const name = perFile.length === 1 ? perFile[0].name : `${perFile[0].name.replace(/\.pdf$/i, '')} + ${perFile.length - 1} more`;
    setStatus({ kind: 'ready', slides, name, files: perFile, skipped });
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

  const fileNote = status.fileCount > 1 ? `File ${status.fileIndex} of ${status.fileCount}: ` : '';
  const readingLabel = status.kind === 'reading'
    ? status.totalPages
      ? `${fileNote}reading page ${status.processedPages} of ${status.totalPages}…`
      : `${fileNote}opening PDF…`
    : '';
  const reading = status.kind === 'reading';
  const ready = status.kind === 'ready';
  const deckTitle = ready ? status.name.replace(/\.pdf$/i, '').replace(/^Sample:\s*/, '') : '';

  return (
    <div className="screen gate">
      <TopBar user={user} />
      <div className="screen-scroll">
        <h1 className="title">{COPY.gate.title}</h1>
        <Explain show={explain} text={COPY.explain.gate} />

        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={onFile} />

        {!ready && (
          <div className="card list-card">
            <button className="list-row" onClick={() => inputRef.current?.click()} disabled={reading}>
              <span className="row-icon"><IconUpload size={16} /></span>
              <span className="row-text">
                <span className="row-title" role={reading ? 'status' : undefined} aria-live="polite">
                  {reading ? readingLabel : status.kind === 'error' ? 'Choose other PDFs' : 'Upload PDFs'}
                </span>
                <span className="row-sub">1 to {CONFIG.maxPdfFiles} PDFs with selectable text</span>
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
                <span className="row-sub">A random mix of real lecture slides from several courses</span>
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
            <button className="text-link center" onClick={() => setStatus({ kind: 'idle' })}>Choose different slides</button>
          </>
        )}

        {user && onLogout && (
          <p className="switch-line">
            Not {user.name}?{' '}
            <button type="button" className="text-link" onClick={onLogout}>Log out</button>
          </p>
        )}
        <DevDiagnostics diagnostics={diagnostics} error={status.error} />
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
