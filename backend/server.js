import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateQuestions } from './src/questions.js';
import { configuredProviders } from './src/llm.js';
import { reelsDir, thumbsDir, readManifest, scanReels, mediaExists, listVideoFiles } from './src/media.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_FILE = path.join(__dirname, 'data', 'events.jsonl');
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Videos and thumbnails, from whatever folders REELS_DIR / THUMBS_DIR point at.
// express.static supports Range requests, which video seeking needs.
app.use('/media/reels', express.static(reelsDir(), { maxAge: '1h' }));
app.use('/media/thumbs', express.static(thumbsDir(), { maxAge: '1h' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    providers: configuredProviders().map((p) => p.label),
    reelsDir: reelsDir(),
    videosFound: listVideoFiles().length,
  });
});

// GET /api/reels -> reel list.
// Uses data/reels.json if it has entries (captions you wrote), otherwise scans the
// video folder directly, so dropping videos into REELS_DIR is enough to get going.
// `available: false` marks entries whose file is missing.
app.get('/api/reels', (_req, res) => {
  try {
    const manifest = readManifest();
    const reels = manifest.length > 0 ? manifest : scanReels();
    res.json(reels.map((r) => ({ ...r, available: mediaExists(r.src) })));
  } catch (err) {
    res.status(500).json({ error: 'Could not read the reel list: ' + err.message });
  }
});

// POST /api/questions { slides: [{page, text}], count } -> { questions, provider, usedFallback }
app.post('/api/questions', async (req, res) => {
  const { slides, count } = req.body || {};
  if (!Array.isArray(slides) || slides.length === 0) {
    return res.status(400).json({ error: 'Send { slides: [{ page, text }], count }' });
  }
  const started = Date.now();
  const result = await generateQuestions(slides, count);
  console.log(
    `[questions] ${result.questions.length} questions via ${result.provider} in ${Date.now() - started} ms`
  );
  res.json(result);
});

// POST /api/events { sessionId, type, reelId, ts, ... } -> appended to data/events.jsonl
app.post('/api/events', async (req, res) => {
  const event = { ...req.body, receivedAt: Date.now() };
  try {
    await appendFile(EVENTS_FILE, JSON.stringify(event) + '\n');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// In production, serve the built frontend from the same server.
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get(/^\/(?!api|media).*/, (_req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  const providers = configuredProviders().map((p) => p.label);
  console.log(`Doomscroll Tax backend on http://localhost:${port}`);
  console.log(`Videos: ${listVideoFiles().length} found in ${reelsDir()}`);
  console.log(`LLM providers: ${providers.length ? providers.join(' -> ') : 'none (fallback questions only)'}`);
});
