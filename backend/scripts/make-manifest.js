// Builds data/reels.json from the files in media/reels/.
// Owner: M3.
//
// Naming convention:
//   media/reels/f01.mp4 ... f10.mp4  -> "friend" reels (shown first, never charged)
//   media/reels/r01.mp4 ... r40.mp4  -> recommended reels
//   media/thumbs/<same name>.jpg      -> optional thumbnail
//
// Usage:
//   npm run manifest             placeholder captions
//   npm run manifest:captions    captions written by the LLM (uses backend/.env keys)

import 'dotenv/config';
import { readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chatWithFallback, parseJsonLoose } from '../src/llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const REELS_DIR = path.join(ROOT, 'media', 'reels');
const THUMBS_DIR = path.join(ROOT, 'media', 'thumbs');
const OUT = path.join(ROOT, 'data', 'reels.json');

const FRIEND_NAMES = ['Lina', 'Wei', 'Sara', 'Kai', 'Mei', 'Omar', 'Yuki', 'Jun', 'Aisha', 'Hao'];
const CREATOR_NAMES = [
  'foodie.sz', 'travelwithmia', 'dailycat', 'gymrat_lee', 'study.with.yan', 'citylights',
  'memes.cn', 'plantdad', 'streetstyle.sh', 'techtok', 'bubbletea.club', 'hikingdiaries',
];
const PLACEHOLDER_CAPTIONS = [
  'Wait for the end 😳', 'POV: it is 2am and you have a deadline', 'Best noodles in Suzhou?',
  'This changed my morning routine', 'Rate this from 1 to 10', 'Nobody talks about this',
  '你绝对想不到结局', '周末去哪儿玩？', '这个也太好看了吧', 'Save this for later',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

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

const files = existsSync(REELS_DIR)
  ? (await readdir(REELS_DIR)).filter((f) => /\.(mp4|webm|mov)$/i.test(f)).sort()
  : [];

if (files.length === 0) {
  console.log('No videos found in media/reels/. Add f01.mp4..., r01.mp4... and run again.');
  process.exit(0);
}

let captions = [];
if (process.argv.includes('--captions')) {
  try {
    captions = await llmCaptions(files.length);
    console.log(`Got ${captions.length} captions from the LLM.`);
  } catch (err) {
    console.warn('Caption generation failed, using placeholders:', err.message);
  }
}

let friendIdx = 0;
const reels = files.map((file, i) => {
  const id = path.parse(file).name;
  const isFriend = /^f/i.test(id);
  const thumb = path.join(THUMBS_DIR, `${id}.jpg`);
  return {
    id,
    src: `/media/reels/${file}`,
    poster: existsSync(thumb) ? `/media/thumbs/${id}.jpg` : null,
    author: isFriend ? FRIEND_NAMES[friendIdx++ % FRIEND_NAMES.length] : rand(CREATOR_NAMES),
    isFriend,
    caption: captions[i] || rand(PLACEHOLDER_CAPTIONS),
    likes: isFriend ? 5 + Math.floor(Math.random() * 60) : 200 + Math.floor(Math.random() * 20000),
  };
});

await writeFile(OUT, JSON.stringify(reels, null, 2) + '\n');
console.log(`Wrote ${reels.length} reels (${reels.filter((r) => r.isFriend).length} friends) to data/reels.json`);
