// App: owns the session and every rule. Owner: M2 (rules), M1 (Feed).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Feed from './components/Feed.jsx';
import SlideGate from './components/SlideGate.jsx';
import QuizModal from './components/QuizModal.jsx';
import AllowanceCard from './components/AllowanceCard.jsx';
import DemoPanel from './components/DemoPanel.jsx';
import Results from './components/Results.jsx';
import Explain from './components/Explain.jsx';
import { IconSound, IconMute, IconClose } from './components/Icons.jsx';
import { LogoMark } from './components/Illustrations.jsx';
import { CONFIG, DEMO_OVERRIDES } from './config.js';
import { COPY } from './copy.js';
import { fetchReels, fetchQuestions, logEvent } from './api.js';
import {
  loadPoints, savePoints, markClosed, markOpened, simulateAway, resetPoints, minutesToClear,
} from './rules/points.js';
import mockQuestions from './mock/questions.json';

const newSessionId = () => Math.random().toString(36).slice(2, 10);
const emptyStats = () => ({ totalReels: 0, reelsAfterLine: 0, asked: 0, right: 0, wrong: 0 });

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function reshuffleQuestion(q) {
  const order = shuffle(q.options.map((_, i) => i));
  return { ...q, options: order.map((i) => q.options[i]), answerIndex: order.indexOf(q.answerIndex) };
}

// Laptop-only backdrop around the phone frame (hidden on phones by CSS).
function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="blob blob-a" />
      <span className="blob blob-b" />
      <span className="blob blob-c" />
      <div className="backdrop-caption">
        <LogoMark size={44} />
        <strong>Doomscroll Tax</strong>
        <span>Your first reels are free. Everything after costs you.</span>
        <span className="backdrop-meta">CrossPointX 2026 · Track 2 · Reverse UX</span>
      </div>
    </div>
  );
}

export default function App() {
  const feedRef = useRef(null);
  const [reels, setReels] = useState(null);
  const [reelSource, setReelSource] = useState('');
  const [phase, setPhase] = useState('gate'); // gate | feed | results
  const [sessionId, setSessionId] = useState(newSessionId);
  const [index, setIndex] = useState(0);
  const maxSeenRef = useRef(0);
  const statsRef = useRef(emptyStats());
  const [stats, setStats] = useState(emptyStats());
  const [points, setPoints] = useState(0);
  const [owingAtStart, setOwingAtStart] = useState(false);
  const [slow, setSlow] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [provider, setProvider] = useState('');
  const qPointerRef = useRef(0);
  const [quiz, setQuiz] = useState(null); // { q, k, phase: ask|right|wrong, picked, wait }
  const [explain, setExplain] = useState(false);
  const [demo, setDemo] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const tapsRef = useRef([]);

  const cfg = demo ? { ...CONFIG, ...DEMO_OVERRIDES } : CONFIG;
  const slowThreshold = owingAtStart ? cfg.slowAfterIfOwing : cfg.slowAfterReels;
  const commitStats = () => setStats({ ...statsRef.current });

  const showToast = useCallback((text) => setToast({ text, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load reels once.
  useEffect(() => {
    fetchReels().then(({ reels: r, source }) => {
      setReels(r);
      setReelSource(source);
    });
  }, []);

  // Points: apply the time-away rule on open and whenever the app comes back into view.
  useEffect(() => {
    const apply = () => {
      const { points: p, waived } = loadPoints();
      markOpened();
      setPoints(p);
      if (waived > 0) showToast(COPY.points.welcomeBack(waived, p));
      return p;
    };
    setOwingAtStart(apply() > 0);
    const onVisibility = () => (document.visibilityState === 'hidden' ? markClosed() : apply());
    const onHide = () => markClosed();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, [showToast]);

  // Shuffled reels: the first CONFIG.freeReels are free, then the allowance card, then paid reels.
  const { items, lineIndex } = useMemo(() => {
    if (!reels) return { items: [], lineIndex: 0 };
    const all = shuffle(reels);
    const freeCount = Math.min(CONFIG.freeReels, all.length);
    return {
      items: [
        ...all.slice(0, freeCount).map((r, k) => ({ type: 'reel', reel: r, free: true, freeNumber: k + 1 })),
        { type: 'allowance', id: 'allowance' },
        ...all.slice(freeCount).map((r) => ({ type: 'reel', reel: r, free: false })),
      ],
      lineIndex: freeCount,
    };
  }, [reels, sessionId]);

  // ---- Question toll -------------------------------------------------------
  function openQuiz() {
    const pool = questions.length ? questions : mockQuestions;
    const q = reshuffleQuestion(pool[qPointerRef.current % pool.length]);
    qPointerRef.current += 1;
    statsRef.current.asked += 1;
    commitStats();
    setQuiz({ q, k: statsRef.current.asked, phase: 'ask', picked: null, wait: 0 });
    logEvent(sessionId, 'quiz_open', { questionId: q.id });
  }

  function answer(choice) {
    if (!quiz || quiz.phase !== 'ask') return;
    if (choice === quiz.q.answerIndex) {
      statsRef.current.right += 1;
      commitStats();
      setQuiz({ ...quiz, phase: 'right', picked: choice });
      logEvent(sessionId, 'quiz_right', { questionId: quiz.q.id });
      setTimeout(() => setQuiz(null), 1600);
    } else {
      statsRef.current.wrong += 1;
      commitStats();
      setQuiz({ ...quiz, phase: 'wrong', picked: choice, wait: cfg.wrongWaitSeconds });
      logEvent(sessionId, 'quiz_wrong', { questionId: quiz.q.id });
    }
  }

  // Wrong-answer countdown, then retry the same question with shuffled options.
  useEffect(() => {
    if (!quiz || quiz.phase !== 'wrong') return;
    if (quiz.wait <= 0) {
      setQuiz((cur) => ({ ...cur, phase: 'ask', picked: null, q: reshuffleQuestion(cur.q) }));
      return;
    }
    const t = setTimeout(() => setQuiz((cur) => (cur && cur.phase === 'wrong' ? { ...cur, wait: cur.wait - 1 } : cur)), 1000);
    return () => clearTimeout(t);
  }, [quiz]);

  // ---- Feed movement and per-reel rules ------------------------------------
  function addPoint(n = 1) {
    setPoints((prev) => {
      const p = prev + n;
      savePoints(p);
      if (Math.floor(p / 10) > Math.floor(prev / 10)) showToast(COPY.points.ten(p, minutesToClear(p)));
      return p;
    });
  }

  function onNewItem(i) {
    const item = items[i];
    if (!item || item.type !== 'reel') return;
    const s = statsRef.current;
    s.totalReels += 1;
    logEvent(sessionId, 'reel_view', { reelId: item.reel.id, free: item.free });
    if (!item.free) {
      s.reelsAfterLine += 1;
      addPoint(1);
      if (s.reelsAfterLine % cfg.questionEvery === 0) openQuiz();
    }
    if (!slow && s.totalReels >= slowThreshold) {
      setSlow(true);
      showToast(COPY.slow(s.totalReels));
    }
    commitStats();
  }

  function move(delta) {
    if (phase !== 'feed' || quiz) return;
    const next = Math.max(0, Math.min(items.length - 1, index + delta));
    if (next === index) {
      if (delta > 0) endSession();
      return;
    }
    setIndex(next);
    if (next > maxSeenRef.current) {
      maxSeenRef.current = next;
      onNewItem(next);
    }
  }

  // ---- Session lifecycle -----------------------------------------------------
  function startSession(slides) {
    feedRef.current?.unlockAudio(); // must happen inside the click
    setPhase('feed');
    logEvent(sessionId, 'session_start', { slides: slides.length });
    onNewItem(0);
    setQuestions([]);
    setProvider('generating…');
    fetchQuestions(slides, CONFIG.questionCount).then((r) => {
      setQuestions(r.questions);
      const label = r.provider || 'unknown';
      setProvider(r.usedFallback && !/fallback|mock/.test(label) ? `${label} + fallback` : label);
    });
  }

  function endSession() {
    setQuiz(null);
    setPhase('results');
    markClosed();
    logEvent(sessionId, 'session_end', { ...statsRef.current, points });
  }

  function newSession() {
    const { points: p, waived } = loadPoints();
    markOpened();
    setPoints(p);
    setOwingAtStart(p > 0);
    if (waived > 0) showToast(COPY.points.welcomeBack(waived, p));
    statsRef.current = emptyStats();
    commitStats();
    maxSeenRef.current = 0;
    qPointerRef.current = 0;
    setIndex(0);
    setSlow(false);
    setQuiz(null);
    setQuestions([]);
    setProvider('');
    setSessionId(newSessionId());
    setPhase('gate');
  }

  // ---- Demo controls ---------------------------------------------------------
  function onLogoTap() {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < 2000), now];
    if (tapsRef.current.length >= 5) {
      tapsRef.current = [];
      setPanelOpen((o) => !o);
    }
  }

  const demoActions = {
    skip15() {
      const { points: p, waived } = simulateAway(CONFIG.minutesPerPoint);
      markOpened();
      setPoints(p);
      showToast(COPY.points.welcomeBack(waived, p));
    },
    jumpToSlow() {
      if (phase !== 'feed' || quiz) return;
      const s = statsRef.current;
      const targetTotal = Math.max(s.totalReels, slowThreshold - 1);
      // Reels in items[0..t]: t+1 before the allowance card, t after it.
      let t = targetTotal <= lineIndex ? targetTotal - 1 : targetTotal;
      t = Math.min(items.length - 1, Math.max(t, index));
      const afterLine = Math.max(0, t - lineIndex);
      const added = afterLine - s.reelsAfterLine;
      s.totalReels = t < lineIndex ? t + 1 : t;
      s.reelsAfterLine = afterLine;
      if (added > 0) addPoint(added);
      maxSeenRef.current = t;
      setIndex(t);
      commitStats();
      setPanelOpen(false);
    },
    triggerQuiz() {
      if (phase === 'feed' && !quiz) {
        openQuiz();
        setPanelOpen(false);
      }
    },
    toggleDemo: () => setDemo((d) => !d),
    toggleExplain: () => setExplain((e) => !e),
    reset() {
      resetPoints();
      setPanelOpen(false);
      newSession();
    },
  };

  // ---- Render ----------------------------------------------------------------
  if (!reels) {
    return (
      <div className="app">
        <Backdrop />
        <div className="phone">
          <div className="loading">
            <span className="loading-mark"><LogoMark size={64} /></span>
            <span>Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  const current = items[index];
  const afterLine = index > lineIndex;
  // Volume roulette: first paid reel loud, next muted, and so on.
  const muted = current?.type === 'reel' && !current.free ? (index - lineIndex) % 2 === 0 : false;
  const transitionMs = slow ? cfg.slowTransitionMs : cfg.normalTransitionMs;

  return (
    <div className="app">
      <Backdrop />
      <div className={`phone phase-${phase}`}>
        <Feed
          ref={feedRef}
          items={items}
          index={index}
          transitionMs={transitionMs}
          muted={muted}
          paused={phase !== 'feed' || !!quiz}
          blocked={phase !== 'feed' || !!quiz}
          onRequestMove={move}
          explain={explain}
          freeReels={lineIndex}
          renderCard={(item) =>
            item.type === 'allowance' ? (
              <AllowanceCard freeReels={lineIndex} explain={explain} onClose={endSession} onKeep={() => move(1)} />
            ) : null
          }
        />

        <div className="topbar">
          <button className="logo" onClick={(e) => { e.currentTarget.blur(); onLogoTap(); }} aria-label="Doomscroll Tax">
            <LogoMark size={30} />
            <span className="wordmark">刷屏税</span>
          </button>
          {phase === 'feed' && (
            <div className="topbar-right">
              {afterLine && current?.type === 'reel' && (
                <span className={`vol ${muted ? 'muted' : ''}`} key={`vol-${index}`} aria-label={muted ? 'Muted' : 'Full volume'}>
                  {muted ? <IconMute size={18} /> : <IconSound size={18} />}
                </span>
              )}
              <span className={`meter ${points > 0 ? 'owing' : ''}`} aria-label={`${points} points owed`}>
                <span className="meter-label">Owed</span>
                <span className="meter-value" key={points}>{points > 0 ? `−${points}` : '0'}</span>
              </span>
              <button className={`icon-btn ${explain ? 'on' : ''}`} onClick={() => setExplain((e) => !e)} aria-label="Explain mode" aria-pressed={explain}>?</button>
              <button className="icon-btn" onClick={endSession} aria-label="End session"><IconClose size={16} /></button>
            </div>
          )}
        </div>

        {explain && phase === 'feed' && (
          <div className="explain-stack">
            <Explain show text={COPY.explain.points} />
            {afterLine && <Explain show text={COPY.explain.volume} />}
          </div>
        )}

        {phase === 'gate' && <SlideGate onStart={startSession} explain={explain} />}
        {phase === 'results' && <Results stats={stats} points={points} onRestart={newSession} />}
        {quiz && <QuizModal quiz={quiz} onAnswer={answer} explain={explain} />}
        {toast && <div className="toast" key={toast.id} role="status">{toast.text}</div>}
        {panelOpen && (
          <DemoPanel
            onClose={() => setPanelOpen(false)}
            actions={demoActions}
            info={{
              demo, explain, reelSource, provider, points,
              questionCount: questions.length,
              totalReels: stats.totalReels,
              reelsAfterLine: stats.reelsAfterLine,
              questionEvery: cfg.questionEvery,
              slowThreshold,
            }}
          />
        )}
      </div>
    </div>
  );
}
