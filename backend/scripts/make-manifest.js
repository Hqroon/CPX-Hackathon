// Builds data/reels.json from the videos in REELS_DIR (default: media/reels/).
// Owner: M3.
//
// Any file names work (r01.mp4, clip-cat.mp4…). The id is the file name without extension.
// Optional thumbnail: THUMBS_DIR/<id>.jpg
// Re-running keeps captions/authors you already edited in reels.json and drops entries
// whose video is gone.
//
// Usage (from backend/):
//   npm run manifest             placeholder captions for new videos
//   npm run manifest:captions    captions for new videos written by the LLM (uses .env keys)

import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { chatWithFallback, parseJsonLoose } from '../src/llm.js';
import { reelsDir, listVideoFiles, readManifest, entryForFile, REELS_JSON } from '../src/media.js';

async function llmCaptions(count) {
  const messages = [
    { role: 'system', content: 'You write short social media captions. Output only JSON.' },
    {
      role: 'user',
      content: `Write ${count} different short-video captions. Mix English and Chinese, Instagram and Xiaohongshu style, under 12 words each, some with one emoji. Return {"captions":["..."]}`,
    },
  ];
  const { value } = await chatWithFallback(messages, (t) => {
    const caps = parseJsonLoose(t).captions;
    if (!Array.isArray(caps) || caps.length === 0) throw new Error('no captions');
    return caps;
  });
  return value;
}

const files = listVideoFiles();
if (files.length === 0) {
  console.log(`No videos found in ${reelsDir()}. Add .mp4 files there (or set REELS_DIR in .env) and run again.`);
  process.exit(0);
}

let existing = new Map();
try {
  existing = new Map(readManifest().map((r) => [r.id, r]));
} catch (err) {
  console.warn('Existing reels.json is unreadable, starting fresh:', err.message);
}

const newFiles = files.filter((f) => !existing.has(f.replace(/\.[^.]+$/, '')));
let captions = [];
if (process.argv.includes('--captions') && newFiles.length > 0) {
  try {
    captions = await llmCaptions(newFiles.length);
    console.log(`Got ${captions.length} captions from the LLM.`);
  } catch (err) {
    console.warn('Caption generation failed, using placeholders:', err.message);
  }
}

let c = 0;
const reels = files.map((file) => {
  const id = file.replace(/\.[^.]+$/, '');
  const prev = existing.get(id) || null;
  return entryForFile(file, prev, prev ? null : captions[c++] || null);
});

await writeFile(REELS_JSON, JSON.stringify(reels, null, 2) + '\n');
console.log(`Wrote ${reels.length} reels to data/reels.json (${newFiles.length} new) from ${reelsDir()}`);
