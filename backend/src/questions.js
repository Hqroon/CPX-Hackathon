// Slides -> validated multiple-choice questions.
// Owner: M5. Prompt text matches TEAM_PLAN.md section 5.1.

import { readFile } from 'node:fs/promises';
import { chatWithFallback, parseJsonLoose } from './llm.js';

const FALLBACK_PATH = new URL('../data/fallback-questions.json', import.meta.url);
const PAGES_PER_BATCH = 6;
const MAX_QUESTIONS = 15;

const SYSTEM_PROMPT = `You write multiple-choice questions that help a university student recall their own lecture slides.
Every question must be answerable from the slide text alone. Never use outside facts.
Output only valid JSON. No markdown, no commentary.`;

function userPrompt(pages, count) {
  const slideLines = pages.map((p) => `[page ${p.page}] ${p.text}`).join('\n');
  return `Here are lecture slides. Each line starts with the page number.

${slideLines}

Write ${count} multiple-choice questions.
Rules:
- About 60% recall (a definition, fact, or step from the slides) and 40% understanding (apply, compare, or spot the mistake).
- Question under 25 words. Each option under 12 words.
- Exactly 4 options, exactly one correct.
- Wrong options must be plausible and from the same topic.
- Never use "all of the above" or "none of the above".
- Write in the same language as the slides.
- For each question give source_page and a supporting_quote copied word for word from that page.
- explanation: one sentence saying why the answer is right.

Return exactly this JSON shape:
{"questions":[{"question":"","options":["","","",""],"answer_index":0,"explanation":"","source_page":0,"supporting_quote":""}]}`;
}

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const BANNED = [/all of the above/i, /none of the above/i, /以上都/, /以上皆/];

function shuffleOptions(options, answerIndex) {
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => options[i]), answerIndex: order.indexOf(answerIndex) };
}

/** Returns a clean question or null if it fails any check. */
export function validateQuestion(q, pagesByNumber) {
  if (!q || typeof q.question !== 'string' || !q.question.trim()) return null;
  if (!Array.isArray(q.options) || q.options.length !== 4) return null;
  const opts = q.options.map((o) => String(o).trim());
  if (opts.some((o) => !o)) return null;
  if (new Set(opts.map(norm)).size !== 4) return null;
  const ai = Number(q.answer_index);
  if (!Number.isInteger(ai) || ai < 0 || ai > 3) return null;
  if ([q.question, ...opts].some((t) => BANNED.some((re) => re.test(t)))) return null;

  // Grounding check: the quote must really appear on the cited page.
  const page = pagesByNumber.get(Number(q.source_page));
  if (!page) return null;
  const quote = norm(q.supporting_quote);
  if (quote.length < 4 || !norm(page.text).includes(quote)) return null;

  const shuffled = shuffleOptions(opts, ai);
  return {
    question: q.question.trim(),
    options: shuffled.options,
    answerIndex: shuffled.answerIndex,
    explanation: String(q.explanation || '').trim(),
    sourcePage: Number(q.source_page),
  };
}

async function loadFallback() {
  const raw = JSON.parse(await readFile(FALLBACK_PATH, 'utf8'));
  return raw.map((q) => ({ ...q, ...shuffleOptions(q.options, q.answerIndex) }));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function generateBatch(pages, count) {
  const pagesByNumber = new Map(pages.map((p) => [Number(p.page), p]));
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt(pages, count) },
  ];
  const { value, provider } = await chatWithFallback(messages, (text) => {
    const parsed = parseJsonLoose(text);
    const valid = (parsed.questions || [])
      .map((q) => validateQuestion(q, pagesByNumber))
      .filter(Boolean);
    if (valid.length === 0) throw new Error('No valid questions in reply');
    return valid;
  });
  return { questions: value, provider };
}

/**
 * slides: [{ page, text }]. Returns { questions, provider, usedFallback }.
 * Never throws: if every provider fails, it returns fallback questions.
 */
export async function generateQuestions(slides, requested = 10) {
  const pages = (slides || [])
    .map((s) => ({ page: Number(s.page), text: String(s.text || '').slice(0, 2500) }))
    .filter((s) => Number.isFinite(s.page) && s.text.trim().length >= 30);
  const target = Math.max(1, Math.min(MAX_QUESTIONS, Number(requested) || 10, pages.length * 2 || 10));

  let questions = [];
  const providersUsed = new Set();
  if (pages.length > 0) {
    const batches = chunk(pages, PAGES_PER_BATCH);
    const perBatch = Math.ceil(target / batches.length);
    const results = await Promise.allSettled(batches.map((b) => generateBatch(b, perBatch)));
    for (const r of results) {
      if (r.status === 'fulfilled') {
        questions.push(...r.value.questions);
        providersUsed.add(r.value.provider);
      } else {
        console.warn('[questions] batch failed:', r.reason?.message);
      }
    }
  }

  let usedFallback = false;
  if (questions.length < Math.min(3, target)) {
    usedFallback = true;
    const fallback = await loadFallback();
    questions = questions.concat(fallback).slice(0, Math.max(target, 3));
  }

  questions = questions.slice(0, target).map((q, i) => ({ id: `q${i + 1}`, ...q }));
  return {
    questions,
    provider: usedFallback && providersUsed.size === 0 ? 'fallback' : [...providersUsed].join('+'),
    usedFallback,
  };
}
