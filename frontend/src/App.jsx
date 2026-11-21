// App: owns the session and applies the frustration rules. Owner: M2 (rules), M1 (Feed).
// Every rule decision comes from src/rules/frustration.js (pure, unit-tested).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Feed from './components/Feed.jsx';
import SlideGate from './components/SlideGate.jsx';
import GuardStart from './components/GuardStart.jsx';
import InfoPage from './components/InfoPage.jsx';
import { getGuardStatus, syncGuard, armGuard, minimizeApp } from './native/reelGuard.js';
import QuizModal from './components/QuizModal.jsx';
import AllowanceCard from './components/AllowanceCard.jsx';
import StartScreen from './components/StartScreen.jsx';
import Welcome from './components/Welcome.jsx';
import { IS_DARK_THEME } from './theme.js';
import DemoPanel from './components/DemoPanel.jsx';
import Results from './components/Results.jsx';
import Explain from './components/Explain.jsx';
import { IconSound, IconMute, IconClose } from './components/Icons.jsx';
import { BrandMark, Wordmark, BRAND } from './components/Brand.jsx';
import { CONFIG, DEMO_OVERRIDES } from './config.js';
import { COPY } from './copy.js';
import { fetchReels, fetchQuestions, logEvent, SAMPLE_QUESTIONS } from './api.js';
import {
  loadPoints, savePoints, markClosed, markOpened, simulateAway, resetPoints, minutesToClear,
} from './rules/points.js';
import { Capacitor } from '@capacitor/core';

// Demo rule: every launch of the Android app starts at 0 points, so each judge
// gets a clean phone. (The browser keeps its saved points.)
if (Capacitor.isNativePlatform()) resetPoints();
import {
  pointsForReel, isFreeReel, paidNumber, asksQuestion, nextQuestion, audioForReel,
  transitionMsInto, isSlowFrom, visualDecay, decayFilter, indexOfReel,
} from './rules/frustration.js';

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

// Laptop-only backdrop around the phone frame (hidden on phones by CSS).
function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="blob blob-a" />
      <span className="blob blob-b" />
      <span className="blob blob-c" />
      <div className="backdrop-caption">
        <BrandMark size={44} />
        <Wordmark size="lg" />
        <span>Your first reels are free. Everything after costs you.</span>
        <span className="backdrop-meta">CrossPointX 2026, Track 2: Reverse UX</span>
      </div>
    </div>
  );
}

export default function App() {
  const feedRef = useRef(null);
  const [reels, setReels] = useState(null);
  const [reelSource, setReelSource] = useState('');
  // start -> (in the app) gate -> feed -> results, or start -> (other apps) guard / bubble
  // Dark theme opens on the welcome screen; VITE_UI_THEME=original opens on 'start' as before.
  const [phase, setPhase] = useState(IS_DARK_THEME ? 'welcome' : 'start'); // welcome | start | gate | feed | results | guard
  // Android app (Reel Guard available)? null = still checking.
  const [nativeApp, setNativeApp] = useState(null);
  const [guardStatus, setGuardStatus] = useState(null);
  const [sessionId, setSessionId] = useState(newSessionId);
  const [index, setIndex] = useState(0);
  const maxSeenRef = useRef(0);
  const statsRef = useRef(emptyStats());
  const [stats, setStats] = useState(emptyStats());
  const [points, setPoints] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [deck, setDeck] = useState(null); // slides confirmed on the home popup, reused until the user changes them
  const [questionsReady, setQuestionsReady] = useState(false); // false while the backend writes them
  const [provider, setProvider] = useState('');
  const qPointerRef = useRef(0);
  const [quiz, setQuiz] = useState(null); // { q, k, phase: ask|right|wrong, picked, wait }
  const [explain, setExplain] = useState(false);
  const [demo, setDemo] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const tapsRef = useRef([]);

  const cfg = demo ? { ...CONFIG, ...DEMO_OVERRIDES } : CONFIG;
  const commitStats = () => setStats({ ...statsRef.current });

  const showToast = useCallback((text) => setToast({ text, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // On the Android app, start on the home chooser instead of the slide gate.
  const refreshGuard = useCallback(async () => {
    const s = await getGuardStatus();
    setGuardStatus(s);
    return s;
  }, []);
  useEffect(() => {
    refreshGuard().then((s) => {
      const isNative = !!s; // null in the browser
      setNativeApp(isNative);
      if (isNative) syncGuard(); // send the rule numbers and target apps (questions come from slides)
    });
  }, [refreshGuard]);

  // "Continue on other apps": if Reel Guard is switched on, the app shrinks into the
  // floating bubble straight away; otherwise show the one-time setup screen.
  // Slides chosen for Reel Guard, and the questions written from them (once, on start).
  const guardSlidesRef = useRef(null);
  const guardQuestionsRef = useRef({ slides: null, questions: [] });

  // "Continue on other apps" always opens the one-button page (Start 看看); the phone is
  // set up in advance, so there is no setup screen.
  async function continueWithOtherApps() {
    await refreshGuard();
    setPhase('guard');
  }

  async function startBubble() {
    // Questions for Reel Guard are written only now, when the user starts the bubble
    // (not when they open "Continue on other apps"), and once per set of slides.
    const slides = guardSlidesRef.current;
    if (slides && guardQuestionsRef.current.slides !== slides) {
      showToast('Writing questions from your slides…');
      const r = await fetchQuestions(slides, CONFIG.questionCount);
      guardQuestionsRef.current = { slides, questions: r.questions };
      showToast(`${r.questions.length} questions ready for Instagram / Xiaohongshu.`);
    }
    const guardQuestions = slides ? guardQuestionsRef.current.questions : (questions.length ? questions : undefined);
    await syncGuard({ questions: guardQuestions });
    await armGuard(true);
    await refreshGuard();
    setPhase('start');
    const ok = await minimizeApp();
    if (!ok) showToast('看看 is now a floating bubble. Open Instagram or Xiaohongshu.');
  }

  // Home page: slides were uploaded first, then "Continue on other apps" was chosen.
  // Write questions from those slides for Reel Guard, and open it straight away.
  function otherAppsWithSlides(slides) {
    guardSlidesRef.current = slides; // questions are written when the bubble starts
    continueWithOtherApps();
  }


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
    };
    apply();
    const onVisibility = () => (document.visibilityState === 'hidden' ? markClosed() : apply());
    const onHide = () => markClosed();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, [showToast]);

  // Shuffled reels, each tagged with its reel number:
  //   [reel 1 … reel 5] [free-reels-used-up card] [reel 6 …]
  const { items, lineIndex } = useMemo(() => {
    if (!reels) return { items: [], lineIndex: 0 };
    const all = shuffle(reels);
    const freeCount = Math.min(CONFIG.freeReels, all.length);
    return {
      items: [
        ...all.slice(0, freeCount).map((r, k) => ({
          type: 'reel', reel: r, reelNumber: k + 1, free: true, freeNumber: k + 1,
        })),
        { type: 'allowance', id: 'allowance', reelNumber: null },
        ...all.slice(freeCount).map((r, k) => ({
          type: 'reel', reel: r, reelNumber: freeCount + k + 1, free: false,
        })),
      ],
      lineIndex: freeCount,
    };
  }, [reels, sessionId]);

  // ---- Question toll -------------------------------------------------------
  const questionPool = () => (questions.length ? questions : SAMPLE_QUESTIONS);

  function drawQuestion(avoidId = null) {
    const { question, pointer } = nextQuestion(questionPool(), qPointerRef.current, avoidId);
    qPointerRef.current = pointer;
    statsRef.current.asked += 1;
    commitStats();
    logEvent(sessionId, 'quiz_open', { questionId: question?.id });
    return question;
  }


  function openQuiz() {
    // Questions from the user's slides aren't back yet: hold the reel paused on a
    // "writing your question" card rather than showing an unrelated sample question.
    if (!questionsReady) {
      setQuiz({ q: null, k: statsRef.current.asked + 1, phase: 'loading', picked: null, wait: 0 });
      return;
    }
    const q = drawQuestion();
    if (q) setQuiz({ q, k: statsRef.current.asked, phase: 'ask', picked: null, wait: 0 });
  }

  // As soon as the questions arrive, fill in a quiz that was waiting for them.
  useEffect(() => {
    if (!questionsReady || quiz?.phase !== 'loading') return;
    const q = drawQuestion();
    setQuiz(q ? { q, k: statsRef.current.asked, phase: 'ask', picked: null, wait: 0 } : null);
  }, [questionsReady, quiz]); // eslint-disable-line react-hooks/exhaustive-deps

  function answer(choice) {
    if (!quiz || quiz.phase !== 'ask') return;
    if (choice === quiz.q.answerIndex) {
      // Right: show it briefly, then the reel continues.
      statsRef.current.right += 1;
      commitStats();
      setQuiz({ ...quiz, phase: 'right', picked: choice });
      logEvent(sessionId, 'quiz_right', { questionId: quiz.q.id });
      setTimeout(() => setQuiz(null), 1600);
    } else {
      // Wrong: lock for wrongWaitSeconds, then a NEW question.
      statsRef.current.wrong += 1;
      commitStats();
      setQuiz({ ...quiz, phase: 'wrong', picked: choice, wait: cfg.wrongWaitSeconds });
      logEvent(sessionId, 'quiz_wrong', { questionId: quiz.q.id });
    }
  }

  // Wrong-answer countdown, then the next question.
  useEffect(() => {
    if (!quiz || quiz.phase !== 'wrong') return;
    if (quiz.wait <= 0) {
      const q = drawQuestion(quiz.q.id);
      setQuiz({ q, k: statsRef.current.asked, phase: 'ask', picked: null, wait: 0 });
      return;
    }
    const t = setTimeout(
      () => setQuiz((cur) => (cur && cur.phase === 'wrong' ? { ...cur, wait: cur.wait - 1 } : cur)),
      1000
    );
    return () => clearTimeout(t);
  }, [quiz]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Feed movement and per-reel rules ------------------------------------
  function addPoints(n) {
    if (n <= 0) return;
    setPoints((prev) => {
      const p = prev + n;
      savePoints(p);
      if (Math.floor(p / 10) > Math.floor(prev / 10)) showToast(COPY.points.ten(p, minutesToClear(p)));
      return p;
    });
  }

  /** Runs once per reel, the first time the user reaches it. */
  function onNewItem(i) {
    const item = items[i];
    if (!item || item.type !== 'reel') return;
    const n = item.reelNumber;
    const s = statsRef.current;
    s.totalReels = Math.max(s.totalReels, n);
    if (!isFreeReel(n, cfg)) s.reelsAfterLine = paidNumber(n, cfg);
    logEvent(sessionId, 'reel_view', { reelId: item.reel.id, reelNumber: n, free: isFreeReel(n, cfg) });

    addPoints(pointsForReel(n, cfg));
    if (isSlowFrom(n, cfg)) showToast(COPY.slow(cfg.slowAfterReels));
    if (asksQuestion(n, cfg)) openQuiz();
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
    setQuestionsReady(false);
    setProvider('generating…');
    // With several PDFs, remember which file (and its own page number) each deck page came from.
    const bySlide = new Map(slides.map((s) => [Number(s.page), s]));
    const multiFile = new Set(slides.map((s) => s.file).filter(Boolean)).size > 1;
    showToast('Generating questions from your slides…');
    fetchQuestions(slides, CONFIG.questionCount).then((r) => {
      const mapped = r.questions.map((q) => {
        const src = multiFile && bySlide.get(Number(q.sourcePage));
        return src ? { ...q, sourceFile: src.file, sourceFilePage: src.filePage } : q;
      });
      setQuestions(mapped);
      setQuestionsReady(true);
      syncGuard({ questions: mapped }); // no-op outside the Android app
      const label = r.provider || 'unknown';
      setProvider(r.usedFallback && !/fallback|mock/.test(label) ? `${label} + fallback` : label);
      // Questions are generated in the background; only the fallback notice is still shown.
      if (r.usedFallback) showToast('AI unavailable: using clearly labelled practice questions.');
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
    if (waived > 0) showToast(COPY.points.welcomeBack(waived, p));
    statsRef.current = emptyStats();
    commitStats();
    maxSeenRef.current = 0;
    qPointerRef.current = 0;
    setIndex(0);
    setQuiz(null);
    setQuestions([]);
    setQuestionsReady(false);
    setProvider('');
    setSessionId(newSessionId());
    // Back to the home popup: it reopens on the choices with the files already uploaded.
    setPhase(deck ? 'start' : 'gate');
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
    // Jump to the last normal-speed reel; the next swipe is the first slow one.
    jumpToSlow() {
      if (phase !== 'feed' || quiz) return;
      const target = Math.min(items.length - 1, Math.max(index, indexOfReel(cfg.slowAfterReels, cfg)));
      const s = statsRef.current;
      let added = 0;
      for (let i = maxSeenRef.current + 1; i <= target; i++) {
        const n = items[i]?.reelNumber;
        if (n != null) added += pointsForReel(n, cfg);
      }
      const n = items[target]?.reelNumber ?? s.totalReels;
      s.totalReels = Math.max(s.totalReels, n);
      s.reelsAfterLine = paidNumber(s.totalReels, cfg);
      addPoints(added);
      maxSeenRef.current = Math.max(maxSeenRef.current, target);
      setIndex(target);
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
  if (!reels || nativeApp === null) {
    return (
      <div className="app">
        <Backdrop />
        <div className="phone">
          <div className="loading">
            <span className="loading-mark"><BrandMark size={56} /></span>
            <span>Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  const current = items[index];
  const currentReel = current?.reelNumber ?? null;
  const afterLine = index > lineIndex;
  const audio = audioForReel(currentReel, cfg);
  const transitionMs = transitionMsInto(currentReel, cfg);
  const currentDecay = visualDecay(currentReel, cfg);
  const filterFor = (item) => decayFilter(visualDecay(item?.reelNumber ?? null, cfg));

  return (
    <div className="app">
      <Backdrop />
      <div className={`phone phase-${phase} ${current && current.type !== 'reel' ? 'on-card' : ''}`}>
        <Feed
          ref={feedRef}
          items={items}
          index={index}
          transitionMs={transitionMs}
          muted={audio.muted}
          volume={audio.volume}
          filterFor={filterFor}
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
          <button className="logo" onClick={(e) => { e.currentTarget.blur(); onLogoTap(); }} aria-label={BRAND.cn}>
            <BrandMark size={30} />
            <Wordmark tone="light" size="sm" />
          </button>
          {phase === 'feed' && (
            <div className="topbar-right">
              <span role="status" title="Question source">{provider === 'generating…' ? 'AI generating…' : /mock|fallback/.test(provider) ? 'Practice bank' : questions.length ? `AI · ${questions.length}` : ''}</span>
              {/* Sound state is only revealed in explain mode; otherwise the volume fade stays silent. */}
              {explain && afterLine && current?.type === 'reel' && (
                <span
                  className={`vol ${audio.muted ? 'muted' : 'wide'}`}
                  key={`vol-${index}`}
                  aria-label={audio.muted ? 'Muted' : `Volume ${Math.round(audio.volume * 100)}%`}
                >
                  {audio.muted ? <IconMute size={18} /> : <IconSound size={18} />}
                  {!audio.muted && <span className="vol-pct">{Math.round(audio.volume * 100)}%</span>}
                </span>
              )}
              <span className={`meter ${points > 0 ? 'owing' : ''}`} aria-label={`${points} Loan Points`}>
                <span className="meter-label">Loan Points</span>
                <span className="meter-value" key={points}>{points > 0 ? `−${points}` : '0'}</span>
              </span>
              <button className="icon-btn" onClick={endSession} aria-label="End session"><IconClose size={16} /></button>
            </div>
          )}
        </div>

        {explain && phase === 'feed' && (
          <div className="explain-stack">
            <Explain show text={COPY.explain.points} />
            {afterLine && <Explain show text={COPY.explain.volume} />}
            {currentDecay > 0 && <Explain show text={COPY.explain.decay} />}
          </div>
        )}

        {phase === 'welcome' && <Welcome onStart={() => setPhase('start')} />}
        {/* Mounted under the welcome screen too, so its fade-out reveals the upload page, not the feed. */}
        {(phase === 'start' || phase === 'welcome') && (
          <StartScreen
            nativeApp={nativeApp}
            guardStatus={guardStatus}
            onThisApp={startSession}
            onOtherApps={otherAppsWithSlides}
            deck={deck}
            onDeckChange={setDeck}
            onInfo={() => setPhase('info')}
          />
        )}
        {phase === 'gate' && <SlideGate onStart={startSession} explain={explain} onBack={() => setPhase('start')} />}
        {phase === 'results' && <Results stats={stats} points={points} onRestart={newSession} onHome={() => setPhase('start')} />}
        {phase === 'guard' && (
          <GuardStart
            status={guardStatus}
            nativeApp={nativeApp}
            onStart={startBubble}
            onBack={() => setPhase('start')}
            onNote={showToast}
          />
        )}
        {phase === 'info' && <InfoPage onBack={() => setPhase('start')} />}
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
              slowThreshold: cfg.slowAfterReels,
              currentReel,
              volume: audio.muted ? 'muted' : `${Math.round(audio.volume * 100)}%`,
              decay: Math.round(currentDecay * 100),
            }}
          />
        )}
      </div>
    </div>
  );
}
