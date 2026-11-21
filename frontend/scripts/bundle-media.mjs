// Copies the videos (and the reel list) into frontend/public so they are packed
// inside the Android APK and the feed works with no network.
//
// Reads the same folders as the backend: REELS_DIR / THUMBS_DIR from backend/.env,
// defaulting to backend/media/reels and backend/media/thumbs.
// Uses backend/data/reels.json if it has entries, otherwise lists the folder directly.
//
// Usage (from frontend/):  npm run bundle:media
// Then build with VITE_BUNDLED_MEDIA=true (see .env.production.example).

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.join(here, '..');
const backend = path.join(frontend, '..', 'backend');

// Load REELS_DIR / THUMBS_DIR from backend/.env without needing dotenv here.
const envFile = path.join(backend, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const m = line.match(/^\s*(REELS_DIR|THUMBS_DIR)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const media = await import(pathToFileURL(path.join(backend, 'src', 'media.js')).href);

const manifest = media.readManifest();
const reels = (manifest.length > 0 ? manifest : media.scanReels()).filter((r) => media.mediaExists(r.src));
if (reels.length === 0) {
  console.error(`No videos found in ${media.reelsDir()}. Add videos there (or set REELS_DIR in backend/.env).`);
  process.exit(1);
}

const outReels = path.join(frontend, 'public', 'reels');
const outThumbs = path.join(frontend, 'public', 'thumbs');
await rm(outReels, { recursive: true, force: true });
await rm(outThumbs, { recursive: true, force: true });
await mkdir(outReels, { recursive: true });
await mkdir(outThumbs, { recursive: true });

let thumbs = 0;
for (const r of reels) {
  const file = decodeURIComponent(r.src.replace('/media/reels/', ''));
  await cp(path.join(media.reelsDir(), file), path.join(outReels, file));
  if (r.poster && media.mediaExists(r.poster)) {
    const t = decodeURIComponent(r.poster.replace('/media/thumbs/', ''));
    await cp(path.join(media.thumbsDir(), t), path.join(outThumbs, t));
    thumbs++;
  }
}
await writeFile(path.join(outReels, 'reels.json'), JSON.stringify(reels, null, 2) + '\n');
console.log(`Bundled ${reels.length} videos and ${thumbs} thumbnails from ${media.reelsDir()} into public/`);
