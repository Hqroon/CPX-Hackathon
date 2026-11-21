// Shared PDF upload state for the home page and the slide screen. Owner: M4.
//
// Up to CONFIG.maxPdfFiles PDFs are read one after another and merged into one deck.
// Pages are renumbered 1..N across the deck (so the backend sees unique page numbers);
// each slide keeps `file` and `filePage` so the quiz can say which file it came from.
import { useRef, useState } from 'react';
import { CONFIG } from '../config.js';
import { COPY } from '../copy.js';
import { extractSlidesWithDiagnostics, SlideExtractionError, validatePdfFile } from './slides.js';

export function extractionMessage(error, diagnostics) {
  if (error instanceof SlideExtractionError) return error.message;
  if (diagnostics?.totalPages > 0 && diagnostics.pagesWithText === 0) {
    return 'No selectable text was found. This looks like a scanned or image-only PDF. Please upload a text-based PDF exported from PowerPoint or your slide app; OCR is not supported.';
  }
  return COPY.gate.failed;
}

/**
 * status: idle | reading { fileIndex, fileCount, processedPages, totalPages }
 *       | ready { slides, name, files, skipped } | error { msg }
 */
export function useSlideUpload(savedDeck = null) {
  // savedDeck: { slides, name, files, skipped } from an earlier upload, so the user
  // isn't asked to upload the same files again when they come back to this screen.
  const [status, setStatus] = useState(() => (savedDeck ? { kind: 'ready', ...savedDeck } : { kind: 'idle' }));
  const [diagnostics, setDiagnostics] = useState(null);
  const inputRef = useRef(null);

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

  const fileNote = status.fileCount > 1 ? `File ${status.fileIndex} of ${status.fileCount}: ` : '';
  const readingLabel = status.kind === 'reading'
    ? status.totalPages
      ? `${fileNote}reading page ${status.processedPages} of ${status.totalPages}…`
      : `${fileNote}opening PDF…`
    : '';

  return {
    status,
    diagnostics,
    inputRef,
    onFile,
    readingLabel,
    reading: status.kind === 'reading',
    ready: status.kind === 'ready',
    choose: () => inputRef.current?.click(),
    // Preset decks already in the app (mock/course-slides.json), merged like uploaded PDFs.
    useDecks: (picked) => {
      // Some preset titles were saved with a broken dash (U+FFFD); show a real one.
      const decks = picked.map((d) => ({ ...d, title: String(d.title).replace(/�/g, '–') }));
      const slides = [];
      for (const deck of decks) {
        for (const sl of deck.pages) {
          if (String(sl.text || '').trim().length < 30) continue;
          slides.push({ page: slides.length + 1, text: sl.text, file: deck.title, filePage: sl.page });
        }
      }
      const files = decks.map((d) => ({ name: d.title, count: d.pages.length }));
      const name = files.length === 1 ? files[0].name : `${files[0].name} + ${files.length - 1} more`;
      const deck = { slides, name, files, skipped: [], preset: true };
      setDiagnostics(null);
      setStatus({ kind: 'ready', ...deck });
      return deck;
    },
    reset: () => { setStatus({ kind: 'idle' }); setDiagnostics(null); },
  };
}
