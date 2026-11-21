// Where the videos live, and how to turn a folder of videos into reel entries.
// Owner: M3.
//
// By default videos are in backend/media/reels and thumbnails in backend/media/thumbs.
// To use another folder (a shared drive, a USB stick…), set in backend/.env:
//   REELS_DIR=D:\videos\doomscroll
//   THUMBS_DIR=D:\videos\doomscroll\thumbs      (optional)

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

export function reelsDir() {
  return path.resolve(BACKEND_ROOT, process.env.REELS_DIR || 'media/reels');
}

export function thumbsDir() {
  return path.resolve(BACKEND_ROOT, process.env.THUMBS_DIR || 'media/thumbs');
}

export const REELS_JSON = path.join(BACKEND_ROOT, 'data', 'reels.json');

/** Video file names in the reels folder, sorted. */
export function listVideoFiles(dir = reelsDir()) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => VIDEO_EXT.test(f) && !f.startsWith('.')).sort();
}

/** Read data/reels.json (tolerates a UTF-8 BOM). Returns [] if missing or empty. */
export function readManifest() {
  if (!existsSync(REELS_JSON)) return [];
  const text = readFileSync(REELS_JSON, 'utf8').replace(/^\uFEFF/, '').trim();
  if (!text) return [];
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [];
}

const CREATOR_NAMES = [
  'foodie.sz', 'travelwithmia', 'dailycat', 'gymrat_lee', 'study.with.yan', 'citylights',
  'memes.cn', 'plantdad', 'streetstyle.sh', 'techtok', 'bubbletea.club', 'hikingdiaries',
];
const PLACEHOLDER_CAPTIONS = [
  'Wait for the end 😳', 'POV: it is 2am and you have a deadline', 'Best noodles in Suzhou?',
  'This changed my morning routine', 'Rate this from 1 to 10', 'Nobody talks about this',
  '你绝对想不到结局', '周末去哪儿玩？', '这个也太好看了吧', 'Save this for later',
];

/** Small deterministic hash so a file always gets the same fake author/caption/likes. */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Build a reel entry for one video file. `existing` keeps captions you already edited. */
export function entryForFile(file, existing = null, caption = null) {
  const id = path.parse(file).name;
  const thumbFile = `${id}.jpg`;
  const h = hash(id);
  return {
    id,
    src: `/media/reels/${file}`,
    poster: existsSync(path.join(thumbsDir(), thumbFile)) ? `/media/thumbs/${thumbFile}` : null,
    author: existing?.author || CREATOR_NAMES[h % CREATOR_NAMES.length],
    caption: existing?.caption || caption || PLACEHOLDER_CAPTIONS[(h >>> 8) % PLACEHOLDER_CAPTIONS.length],
    likes: existing?.likes ?? 200 + (h % 20000),
  };
}

/** Scan the reels folder and build entries (no file written). */
export function scanReels() {
  return listVideoFiles().map((f) => entryForFile(f));
}

/** True if the file behind a /media/reels/... or /media/thumbs/... src exists. */
export function mediaExists(src) {
  if (!src) return false;
  if (/^https?:\/\//i.test(src)) return true;
  const m = src.match(/^\/media\/(reels|thumbs)\/(.+)$/);
  if (!m) return false;
  const dir = m[1] === 'reels' ? reelsDir() : thumbsDir();
  return existsSync(path.join(dir, decodeURIComponent(m[2])));
}
