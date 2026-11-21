# Slide upload and question pipeline verification

## Scope

This review covers the browser PDF extraction path and a read-only inspection of the question-generation integration. Test files were synthetic university-style lecture decks created specifically for verification; no real student material was committed.

## Existing flow

1. `SlideGate.jsx` accepts a file and runs PDF extraction before enabling the session.
2. `slides.js` uses PDF.js in the browser and returns `[{ page, text }]`.
3. The Start button calls `onStart(status.slides)`. In `App.jsx`, this prop is `startSession`.
4. `startSession` enters the feed and calls `fetchQuestions(slides, CONFIG.questionCount)` asynchronously.
5. `fetchQuestions` sends `{ slides, count }` to `POST /api/questions`.
6. `App.jsx` stores the returned question array. Every fifth recommended reel, `openQuiz` selects from that array and passes the question to `QuizModal`.

If the returned array is empty or still loading, `openQuiz` uses frontend mock questions. If the backend has no working provider, the backend returns its own fallback bank. Those are separate fallbacks.

## Implemented reliability work

- PDF extension/MIME, non-empty size, 50 MB limit, and `%PDF-` file signature validation.
- Page-by-page extraction with original PDF page numbers preserved.
- Coordinate-based line reconstruction for common PowerPoint and lecture exports.
- Accurate `processedPages / totalPages` progress.
- Per-page extraction error collection without discarding readable pages.
- Conservative repeated header/footer removal at page edges.
- Exclusion of pages containing fewer than 30 cleaned characters.
- Dedicated scanned/image-only guidance; OCR is intentionally not included.
- Same-file retry and “choose another PDF” behavior after an error.
- Existing sample-slide judge path retained.
- Development-only diagnostics for filename, total pages, usable pages, page errors, and a bounded 400-character selected-page preview.

## Test evidence

Tests run on 2026-11-21:

| Scenario | Test data | Result |
|---|---|---|
| Text PDF with 10+ pages | Synthetic HCI lecture, 11 PDF pages | Passed: 11 usable pages; page numbers and preview shown |
| Fewer than 5 usable pages | Synthetic short deck, 5 PDF pages including a short title page | Passed: 4 usable pages; gate rejected it with a clear message |
| Image-only PDF | Rasterized version of the 11-page synthetic deck | Passed: 0 text pages; dedicated image-only/no-OCR message shown |
| Production frontend build | `npm run build` | Passed |
| Backend question test | `npm run test:questions` with no `.env` provider credentials | Passed fallback behavior; `provider: fallback`, `usedFallback: true` |
| Browser pipeline | Upload, start session, inspect demo panel | Passed transport/integration; displayed `Questions fallback (fallback)` |

No configured API provider was available in this workspace. Therefore actual AI generation was **not** verified and must not be claimed. The fallback response contained unrelated Big-O, calculus, biology, and economics questions and had `sourcePage: null`, proving it was not generated from the uploaded HCI deck.

### Real lecture files supplied by the team

The following files were tested through the actual browser upload UI on 2026-11-21. The three PowerPoint files were exported to temporary PDFs with LibreOffice for testing; the originals were not changed.

| Lecture | Total PDF pages | Usable pages | Page errors | Gate result |
|---|---:|---:|---:|---|
| PHYS121 W3T2 Gravitation | 38 | 37 | 0 | Accepted |
| PHYS121 W3T1 Linear Momentum | 37 | 36 | 0 | Accepted |
| CC2 W2S2 | 9 | 9 | 0 | Accepted |
| Calculus Week 2 Slides 2 | 16 | 16 | 0 | Accepted |
| Calculus Week 4 Slides 1 | 23 | 23 | 0 | Accepted |
| BIOL110 Lecture 6, PowerPoint export | 47 | 47 | 0 | Accepted |
| BIOL110 Lecture 18, PowerPoint export | 56 | 55 | 0 | Accepted |
| BIOL110 Lecture 22, PowerPoint export | 32 | 32 | 0 | Accepted |

An end-to-end browser run with PHYS121 Gravitation sent 37 extracted pages to `POST /api/questions`, retained source page numbers 1 through 37, requested 12 questions, and received HTTP 200. The response was `provider: "fallback"` and `usedFallback: true`; its first question concerned Big-O notation and had `sourcePage: null`. This confirms the upload and transport path, while also proving that no configured AI provider processed the physics document in this run.

## Remaining provider test

M5 should configure a real model ID and key only in `backend/.env`, run `npm run test:questions`, then verify all of the following:

- `provider` is the expected provider label rather than `fallback` or `mock`.
- `usedFallback` is `false` for a fully provider-generated result.
- `sourcePage` refers to an uploaded page.
- The question and explanation are supported by text on that page.
- The frontend demo panel reports the same provider after an upload.

Do not infer provider success merely because a quiz appears.
