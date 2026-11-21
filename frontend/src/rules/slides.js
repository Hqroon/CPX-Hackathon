// PDF -> clean page text, entirely in the browser. Owner: M4.
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_CHARS = 30;

/**
 * Returns [{ page, text }] for pages with enough text.
 * Repeated header/footer lines (appearing on most pages) are removed.
 */
export async function extractSlides(file, onProgress = () => {}) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const raw = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const lines = [];
    let current = '';
    for (const item of content.items) {
      current += item.str;
      if (item.hasEOL) {
        lines.push(current.trim());
        current = '';
      } else {
        current += ' ';
      }
    }
    if (current.trim()) lines.push(current.trim());
    raw.push({ page: n, lines: lines.filter(Boolean) });
    onProgress(n, pdf.numPages);
  }
  return cleanPages(raw);
}

export function cleanPages(raw) {
  // Lines that appear on more than half the pages are headers/footers.
  const counts = new Map();
  for (const p of raw) for (const l of new Set(p.lines)) counts.set(l, (counts.get(l) || 0) + 1);
  const repeated = new Set(
    [...counts].filter(([, c]) => raw.length >= 4 && c > raw.length / 2).map(([l]) => l)
  );
  return raw
    .map((p) => ({
      page: p.page,
      text: p.lines
        .filter((l) => !repeated.has(l) && !/^\d+$/.test(l))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }))
    .filter((p) => p.text.length >= MIN_CHARS);
}
