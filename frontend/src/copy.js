// All on-screen text in one place (TEAM_PLAN.md section 5.2).

export const COPY = {
  gate: {
    title: 'Course slides',
    body: '',
    upload: 'Upload PDF',
    sample: 'Use sample slides',
    start: 'Start scrolling',
    reading: (n) => `Reading your slides… ${n} pages found.`,
    ready: (n) => `${n} slides ready. Your first 5 reels are free while we write your questions.`,
    tooFew: (n) =>
      `We could only read ${n} slides. Upload at least 5 slides with text. Image-only slides don't count.`,
    notPdf: 'Export your slides to PDF first, then upload them here.',
    failed: "We couldn't read that file. Try another PDF or use the sample slides.",
  },
  allowance: {
    title: (n) => `Your ${n} free reels are used up.`,
    body: 'Every reel after this costs 1 point. You get 1 point back for every 15 minutes away.',
    close: 'Close the app (recommended)',
    keep: 'Keep scrolling anyway',
  },
  freeChip: (k, n) => `Free reel ${k} of ${n}`,
  points: {
    ten: (p, mins) => `${p} points. That's ${formatMinutes(mins)} away to clear.`,
    welcomeBack: (waived, left) => `Welcome back. ${waived} point${waived === 1 ? '' : 's'} cleared while you were away. ${left} left.`,
  },
  quiz: {
    header: (k) => `Toll question ${k}`,
    sub: (page) => (page ? `From your slides, page ${page}. Your reel is paused.` : 'Your reel is paused.'),
    right: 'Correct. Reel unlocked.',
    // The explanation is shown only after a correct answer, so a wrong guess doesn't give the answer away.
    wrong: (s) => `Not quite. A new question in ${s}s.`,
  },
  slow: (n) => `You've watched ${n} reels. Each one now takes 3 seconds to load, and the colours are fading. On purpose.`,
  results: {
    title: 'Session receipt',
    reels: (n) => `${n} reels after your free ones ran out`,
    owed: (p, mins) =>
      p > 0 ? `${p} point${p === 1 ? '' : 's'} owed. Clear ${p === 1 ? 'it' : 'them'} by staying away for ${formatMinutes(mins)}.` : 'No points owed. Nice.',
    quiz: (r, t) =>
      t > 0 ? `${r} of ${t} question${t === 1 ? '' : 's'} right. That's revision you didn't plan to do.` : 'No questions this time.',
    again: 'Start a new session',
  },
  explain: {
    gate: 'Commitment device: you choose what to learn before you start scrolling.',
    points: 'Loss aversion and cooling-off: extra scrolling costs something, and only time away pays it back.',
    quiz: 'Testing effect: recalling your own slides turns scrolling time into revision.',
    volume: 'Broken flow: sound switches on and off every reel, and quietly gets 2% softer each time, so the feed loses its pull.',
    slow: 'Fogg Behavior Model: making the next reel harder to reach weakens the habit without banning it.',
    decay: 'Reward decay: colours drain and the picture blurs the longer you scroll, so each new reel is less satisfying.',
    free: 'Golden path: your first 5 reels are always free, so you can always check what you came for. Only what comes after costs you.',
  },
};

export function formatMinutes(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
