import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateQuestions } from './src/questions.js';
import { configuredProviders } from './src/llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(__dirname, 'media');
const REELS_JSON = path.join(__dirname, 'data', 'reels.json');
const EVENTS_FILE = path.join(__dirname, 'data', 'events.jsonl');
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Videos and thumbnails. express.static supports Range requests, which video seeking needs.
app.use('/media', express.static(MEDIA_DIR, { maxAge: '1h' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, providers: configuredProviders().map((p) => p.label) });
});

// GET /api/reels -> reel list. `available` tells M3 which files are still missing.
app.get('/api/reels', async (_req, res) => {
  try {
    const reels = JSON.parse(await readFile(REELS_JSON, 'utf8'));
    const withStatus = reels.map((r) => {
      const local = r.src && r.src.startsWith('/media/') ? path.join(__dirname, r.src) : null;
      return { ...r, available: local ? existsSync(local) : Boolean(r.src) };
    });
    res.json(withStatus);
  } catch (err) {
    res.status(500).json({ error: 'Could not read data/reels.json: ' + err.message });
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
  console.log(`LLM providers: ${providers.length ? providers.join(' -> ') : 'none (fallback questions only)'}`);
});
