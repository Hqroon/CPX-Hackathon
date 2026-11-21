// All on-screen text in one place (TEAM_PLAN.md section 5.2).

export const COPY = {
  gate: {
    title: 'Course slides',
    body: '',
    upload: 'Upload PDF',
    sample: 'Use sample slides',
    start: 'Start scrolling',
    reading: (n) => `Reading your slides… ${n} pages found.`,
    ready: (n) => `${n} slides ready. Your friends' reels are free while we write your questions.`,
    tooFew: (n) =>
      `We could only read ${n} slides. Upload at least 5 slides with text. Image-only slides don't count.`,
    notPdf: 'Export your slides to PDF first, then upload them here.',
    failed: "We couldn't read that file. Try another PDF or use the sample slides.",
  },
  caughtUp: {
    title: "You're all caught up.",
    body: "That's everything from your friends. Every reel after this costs 1 point. You get 1 point back for every 15 minutes away.",
    close: 'Close the app (recommended)',
    keep: 'Keep scrolling anyway',
  },
  points: {
    ten: (p, mins) => `${p} points. That's ${formatMinutes(mins)} away to clear.`,
    welcomeBack: (waived, left) => `Welcome back. ${waived} point${waived === 1 ? '' : 's'} cleared while you were away. ${left} left.`,
  },
  quiz: {
    header: (k) => `Toll booth · question ${k}`,
    sub: (page) => (page ? `From your slides, page ${page}. Your reel is paused.` : 'Your reel is paused.'),
    right: 'Correct. Reel unlocked.',
    // The explanation is shown only after a correct answer, so a wrong guess doesn't give the answer away.
    wrong: (s) => `Not quite. Try again in ${s}s.`,
  },
  slow: (n) => `You've watched ${n} reels. Each one now takes 3 seconds to load. On purpose.`,
  results: {
    title: 'Session receipt',
    reels: (n) => `${n} reels after you were caught up`,
    owed: (p, mins) =>
      p > 0 ? `${p} points owed. Clear them by staying away for ${formatMinutes(mins)}.` : 'No points owed. Nice.',
    quiz: (r, t) =>
      t > 0 ? `${r} of ${t} questions right. That's revision you didn't plan to do.` : 'No questions this time.',
    again: 'Start a new session',
  },
  explain: {
    gate: 'Commitment device: you choose what to learn before you start scrolling.',
    points: 'Loss aversion and cooling-off: extra scrolling costs something, and only time away pays it back.',
    quiz: 'Testing effect: recalling your own slides turns scrolling time into revision.',
    volume: 'Broken flow: unpredictable sound breaks the immersion that keeps you watching.',
    slow: 'Fogg Behavior Model: making the next reel harder to reach weakens the habit without banning it.',
    friends: 'Golden path: you can always do what you came for. Only what comes after costs you.',
  },
};

export function formatMinutes(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
