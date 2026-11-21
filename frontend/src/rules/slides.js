// PDF -> clean page text, entirely in the browser. Owner: M4.
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export const MIN_USABLE_CHARS = 30;
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

const PDF_HEADER = '%PDF-';
const EDGE_LINE_COUNT = 3;
const LINE_Y_TOLERANCE = 2;

export class SlideExtractionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SlideExtractionError';
    this.code = code;
    this.details = details;
  }
}

export function validatePdfFile(file) {
  if (!file) throw new SlideExtractionError('NO_FILE', 'Choose a PDF file.');
  if (file.size === 0) throw new SlideExtractionError('EMPTY_FILE', 'This file is empty. Choose a valid PDF.');
  if (file.size > MAX_PDF_BYTES) {
    throw new SlideExtractionError('FILE_TOO_LARGE', 'This PDF is larger than 50 MB. Export a smaller copy and try again.');
  }
  if (!/\.pdf$/i.test(file.name || '') && file.type !== 'application/pdf') {
    throw new SlideExtractionError('NOT_PDF', 'Export your slides as a PDF, then upload the PDF file.');
  }
}

async function validatePdfHeader(file) {
  const header = new TextDecoder('latin1').decode(await file.slice(0, PDF_HEADER.length).arrayBuffer());
  if (header !== PDF_HEADER) {
    throw new SlideExtractionError('INVALID_PDF', 'This file does not contain valid PDF data. Export it again as PDF and retry.');
  }
}

function normalizeText(value) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function repeatedLineKey(line) {
  return normalizeText(line)
    .toLocaleLowerCase()
    .replace(/\b\d+\b/g, '#')
    .replace(/[–—-]+/g, '-')
    .trim();
}

function linesFromTextItems(items) {
  const positioned = items
    .filter((item) => typeof item.str === 'string' && normalizeText(item.str))
    .map((item, order) => ({
      text: normalizeText(item.str),
      x: Number(item.transform?.[4]) || 0,
      y: Number(item.transform?.[5]) || 0,
      order,
    }));

  if (positioned.length === 0) return [];

  const rows = [];
  for (const item of positioned) {
    let row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= LINE_Y_TOLERANCE);
    if (!row) {
      row = { y: item.y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => normalizeText(
      row.items
        .sort((a, b) => (a.x - b.x) || (a.order - b.order))
        .map((item) => item.text)
        .join(' '),
    ))
    .filter(Boolean);
}

function toSlideExtractionError(error) {
  if (error instanceof SlideExtractionError) return error;
  const name = error?.name || '';
  if (name === 'PasswordException') {
    return new SlideExtractionError('PASSWORD_PROTECTED', 'This PDF is password-protected. Upload an unlocked copy.');
  }
  if (name === 'InvalidPDFException' || name === 'MissingPDFException') {
    return new SlideExtractionError('INVALID_PDF', 'This PDF is damaged or invalid. Export it again and retry.');
  }
  return new SlideExtractionError('READ_FAILED', 'The PDF could not be read. Export a fresh PDF copy and try again.', {
    cause: error?.message || String(error),
  });
}

/**
 * Extract a PDF and return both usable slides and lightweight diagnostics.
 * onProgress receives { processedPages, totalPages, page, error }.
 */
export async function extractSlidesWithDiagnostics(file, onProgress = () => {}) {
  validatePdfFile(file);
  await validatePdfHeader(file);

  let pdf;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (error) {
    throw toSlideExtractionError(error);
  }

  const rawPages = [];
  const pageErrors = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    try {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      rawPages.push({ page: pageNumber, lines: linesFromTextItems(content.items) });
      onProgress({ processedPages: pageNumber, totalPages: pdf.numPages, page: pageNumber, error: null });
    } catch (error) {
      const pageError = { page: pageNumber, message: error?.message || 'Unable to read this page.' };
      pageErrors.push(pageError);
      rawPages.push({ page: pageNumber, lines: [] });
      onProgress({ processedPages: pageNumber, totalPages: pdf.numPages, page: pageNumber, error: pageError });
    }
  }

  const slides = cleanPages(rawPages);
  const pagesWithText = rawPages.filter((page) => normalizeText(page.lines.join(' ')).length > 0).length;
  return {
    slides,
    diagnostics: {
      fileName: file.name,
      totalPages: pdf.numPages,
      pagesWithText,
      usablePages: slides.length,
      excludedPages: rawPages
        .filter((page) => !slides.some((slide) => slide.page === page.page))
        .map((page) => page.page),
      pageErrors,
    },
  };
}

/** Backwards-compatible helper returning only [{ page, text }]. */
export async function extractSlides(file, onProgress = () => {}) {
  const result = await extractSlidesWithDiagnostics(file, (progress) => {
    onProgress(progress.processedPages, progress.totalPages, progress);
  });
  return result.slides;
}

export function cleanPages(rawPages) {
  const pages = rawPages.map((page) => ({
    page: page.page,
    lines: (page.lines || []).map(normalizeText).filter(Boolean),
  }));

  const edgeCounts = new Map();
  for (const page of pages) {
    // On sparse slides every line is meaningful; only infer furniture when a
    // page has enough separate lines to distinguish body from its edges.
    if (page.lines.length < EDGE_LINE_COUNT * 2) continue;
    const edgeLines = [...page.lines.slice(0, EDGE_LINE_COUNT), ...page.lines.slice(-EDGE_LINE_COUNT)];
    for (const line of new Set(edgeLines.map(repeatedLineKey).filter((key) => key.length >= 3))) {
      edgeCounts.set(line, (edgeCounts.get(line) || 0) + 1);
    }
  }

  const repeatedEdges = new Set(
    [...edgeCounts]
      .filter(([, count]) => pages.length >= 4 && count > pages.length / 2)
      .map(([line]) => line),
  );

  return pages
    .map((page) => ({
      page: page.page,
      text: normalizeText(page.lines
        .filter((line, index) => {
          const isEdge = page.lines.length >= EDGE_LINE_COUNT * 2
            && (index < EDGE_LINE_COUNT || index >= page.lines.length - EDGE_LINE_COUNT);
          const isRepeatedEdge = isEdge && repeatedEdges.has(repeatedLineKey(line));
          const isBarePageNumber = /^(?:page\s*)?\d+(?:\s*(?:\/|of)\s*\d+)?$/i.test(line);
          return !isRepeatedEdge && !isBarePageNumber;
        })
        .join(' ')),
    }))
    .filter((page) => page.text.length >= MIN_USABLE_CHARS);
}
