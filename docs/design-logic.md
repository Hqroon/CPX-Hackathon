# Slide gate design logic

## Contract

`SlideGate` preserves the existing public contract:

```jsx
<SlideGate onStart={startSession} explain={explain} />
```

The Start action passes only:

```js
[
  { page: 1, text: '...' },
  { page: 2, text: '...' },
]
```

Diagnostics never enter the question API payload.

## Extraction decisions

The browser validates inexpensive properties before loading PDF.js. It then checks the PDF signature, parses one page at a time, groups PDF text items by vertical position, orders each line horizontally, and normalizes whitespace/control characters.

Repeated content is removed conservatively. Only lines near the top or bottom of pages with enough line structure are candidates. A normalized comparison also handles changing page numbers. Repeated body bullets are not removed merely because they occur on many pages.

The 30-character threshold is applied after cleanup. This makes “five usable pages” mean five pages with sufficient question source material, not simply a five-page file.

## Error and retry states

The gate distinguishes invalid/non-PDF files, empty files, oversized files, protected/damaged PDFs, too few usable pages, and PDFs with no selectable text. Scanned or image-only files explicitly ask for a text-based export and state that OCR is unsupported.

The native file input is reset after every selection, allowing the same file to be selected again. The sample deck remains available in all non-reading states.

## Diagnostics and privacy

Extraction diagnostics render only in Vite development mode. They show counts, page-level errors, and at most 400 characters of a selected page. Production builds do not render the diagnostics UI or long raw lecture content.

## Question provenance

The app has three possible question sources:

| Source | `provider` | `usedFallback` | Meaning |
|---|---|---:|---|
| Actual configured model | Provider label such as `tokener` | `false` | Model response passed backend grounding validation |
| Backend fallback bank | `fallback` (or provider labels when a partial result is supplemented) | `true` | Some or all questions came from the server fallback bank |
| Frontend mock bank | `mock` | `true` | Request failed or returned no questions in `api.js` |

The hidden demo panel already exposes the provider string. This is the correct judging/debugging surface; quiz presence alone is not evidence of AI generation.
