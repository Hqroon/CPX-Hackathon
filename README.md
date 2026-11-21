# Doomscroll Tax (刷屏税)

**CrossPointX 2026 · Track 2: Reverse UX Challenge.** The brief: *an app users hate, but still have to use.*

Repo: https://github.com/Hqroon/CPX-Hackathon

A reel feed where the first 5 reels are free, then everything after costs you:

| Mechanism | Rule | Why |
|---|---|---|
| Slide gate | Upload 5+ course slides (PDF) before every session | Commitment device |
| Negative points | −1 per reel after the 5 free reels. 15 min away clears 1. | Loss aversion, cooling-off |
| Question toll | Reels 10, 15, 20…: the video pauses for a question. Right = next reel; wrong = 5 s, then a new question. | Testing effect |
| Volume roulette | From reel 6: sound on, muted, on, muted… and each reel quietly 2% softer (no on-screen slider) | Broken flow |
| Slow scroll + visual decay | From reel 11: each reel takes 3 s to arrive, and colours drain / blur a bit more each reel | Fogg Behavior Model, reward decay |

All of these rules live in one tested module, `frontend/src/rules/frustration.js`, driven by the numbers in `frontend/src/config.js`. Run `npm test` in `frontend/` after changing either.

The first 5 reels of every session are always free (golden path), so the task can always be completed.

**Android demo:** the app is wrapped as an APK with Capacitor, with the videos packed inside. See [docs/ANDROID_APK.md](docs/ANDROID_APK.md).

**Reel Guard (second APK):** the same rules running **on top of Instagram / Xiaohongshu / Douyin** through an Android accessibility service, with "Backup: open our own feed" built in. Build variant `guardDebug`. See [docs/REEL_GUARD.md](docs/REEL_GUARD.md).

## Quick start

Requires Node.js 18+ (tested on 24).

```bash
# 1. Backend (port 8787)
cd backend
cp .env.example .env        # Windows: copy .env.example .env, then add your API keys
npm install
npm run dev

# 2. Frontend (port 5173), in a second terminal
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. To test on a phone on the same Wi-Fi, open `http://<laptop-ip>:5173`.

**No keys? No videos? It still works.** Without `.env` keys the backend serves fallback questions. Without videos the frontend shows coloured mock reels. Both are labelled in the demo panel.

**Demo panel:** tap the 刷屏税 logo 5 times. Controls: skip 15 minutes, jump to just before slow scroll, trigger a question, demo speed ×3, explain mode, reset.

## Adding the 50 reels (M3)

1. Install ffmpeg: `winget install Gyan.FFmpeg`, and convert the clips to vertical MP4 with sound (command in TEAM_PLAN.md).
2. Put the videos in **one folder**. Any file names work (`.mp4`, `.webm`, `.mov`). Either:
   - use the default `backend/media/reels/`, or
   - point the backend at any other folder in `backend/.env`: `REELS_DIR=D:\videos\doomscroll` (optional `THUMBS_DIR` for `<name>.jpg` thumbnails).
3. Restart the backend. **That's enough to get going:** if `data/reels.json` is empty, the backend scans the folder and serves every video with placeholder captions. `http://localhost:8787/api/health` shows how many videos it found.
4. Optional: `npm run manifest` (or `npm run manifest:captions` for AI captions) writes `data/reels.json` so you can edit captions and authors. Re-running keeps your edits and adds new videos.

The order is shuffled every session, and the first 5 shown are free. Use free-licence clips only (Pexels, Pixabay, Mixkit). Videos are gitignored; share the folder by drive/USB. For the APK, `npm run bundle:media` in `frontend/` copies the same folder into the app.

## Question generation (M4, M5)

- `frontend/src/rules/slides.js` extracts page text from the PDF in the browser (PDF.js).
- `POST /api/questions` → `backend/src/questions.js` builds the prompt, calls the provider chain, validates every question (4 unique options, the quote must exist on the cited page, options shuffled), and fills up with `data/fallback-questions.json` if needed.
- Provider chain (`backend/src/llm.js`): AMD Token Factory → AIHubMix → Tokener, all OpenAI-compatible. Order set by `PROVIDER_ORDER` in `.env`.
- Test it: `cd backend && npm run test:questions`

## API

```
GET  /api/health      -> { ok, providers }
GET  /api/reels       -> [{ id, src, poster, author, isFriend, caption, likes, available }]
POST /api/questions   { slides: [{ page, text }], count } -> { questions, provider, usedFallback }
POST /api/events      { sessionId, type, ... } -> appended to backend/data/events.jsonl
```

## Project structure

```
backend/
  server.js              Express server, routes, serves frontend/dist in production
  src/llm.js             provider fallback chain (AMD Token Factory, AIHubMix, Tokener)
  src/questions.js       prompt, validation, fallback
  scripts/               make-manifest.js, test-questions.js
  data/                  reels.json, fallback-questions.json
  media/reels, thumbs    videos (gitignored)
frontend/
  src/App.jsx            session + all rules (points, quiz, volume, slow scroll, demo panel)
  src/components/        Feed, SlideGate, QuizModal, CaughtUpCard, Results, DemoPanel, Explain
  src/rules/             points.js (time-away rule), slides.js (PDF extraction)
  src/config.js          every tunable number
  src/copy.js            every on-screen sentence
  src/mock/              mock reels, questions, sample slides
```

## Production build (single server)

```bash
cd frontend && npm run build
cd ../backend && npm start      # serves the built frontend + API on port 8787
```

## Tools and services used

React, Vite, PDF.js, Node.js, Express, ffmpeg, AMD Token Factory, AIHubMix, Tokener, Dify (AMD plugin for the poster), AMD Creative Factory / OneclickAMD. Stock video: Pexels / Pixabay / Mixkit. AI coding assistants: Claude Code (add any others the team uses).

## License

Apache License 2.0. See [LICENSE](LICENSE).
