// Copies the videos and reels.json from the backend into frontend/public,
// so they get packed inside the Android APK and the feed works with no network.
//
// Usage (from frontend/):  npm run bundle:media
// Then build with VITE_BUNDLED_MEDIA=true (see .env.production.example).

import { cp, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.join(here, '..');
const backend = path.join(frontend, '..', 'backend');

const jobs = [
  { from: path.join(backend, 'media', 'reels'), to: path.join(frontend, 'public', 'reels') },
  { from: path.join(backend, 'media', 'thumbs'), to: path.join(frontend, 'public', 'thumbs') },
];

for (const { from, to } of jobs) {
  await rm(to, { recursive: true, force: true });
  await mkdir(to, { recursive: true });
  if (!existsSync(from)) continue;
  const files = (await readdir(from)).filter((f) => !f.startsWith('.'));
  for (const f of files) await cp(path.join(from, f), path.join(to, f));
  console.log(`Copied ${files.length} files to ${path.relative(frontend, to)}`);
}

const manifest = path.join(backend, 'data', 'reels.json');
if (existsSync(manifest)) {
  await copyFile(manifest, path.join(frontend, 'public', 'reels', 'reels.json'));
  console.log('Copied reels.json to public/reels/reels.json');
} else {
  console.warn('backend/data/reels.json not found. Run `npm run manifest` in backend/ first.');
}
