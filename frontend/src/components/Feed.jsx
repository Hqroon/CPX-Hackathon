// Full-screen vertical reel feed. Owner: M1.
//
// Controlled component: App owns `index` and decides what a swipe does.
// Three <video> elements are reused for every reel (previous / current / next),
// so the sound permission unlocked by the slide-gate tap carries over.
//
// The TEAM_PLAN contract maps onto props like this:
//   player.onReelChange    -> onRequestMove(delta); App changes `index`
//   player.pause/resume    -> `paused`
//   player.blockSwipe      -> `blocked`
//   player.setTransitionMs -> `transitionMs`
//   player.setMuted        -> `muted`
//   (silent volume fade)   -> `volume` (0..1, applied to the current reel, nothing shown on screen)
//   (visual decay)         -> `filterFor(item)` returns a CSS filter for that reel
//   (ref) unlockAudio()    -> call inside the slide-gate click handler

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CONFIG } from '../config.js';
import { COPY } from '../copy.js';
import Explain from './Explain.jsx';
import { IconHeart, IconComment, IconShare } from './Icons.jsx';

const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 10;

const formatLikes = (n) =>
  n >= 10000 ? (n / 1000).toFixed(0) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

function ReelOverlay({ reel, item, freeReels, liked, onToggleLike, explain }) {
  const [expanded, setExpanded] = useState(false);
  const initial = reel.author?.[0]?.toUpperCase() || '?';
  return (
    <div className="reel-overlay">
      <div className="reel-meta">
        <div className="reel-author">
          <span className={`avatar ${item.free ? 'friend' : ''}`} aria-hidden="true">{initial}</span>
          <span className="handle">@{reel.author}</span>
          {item.free ? (
            <span className="tag tag-free">{COPY.freeChip(item.freeNumber, freeReels)}</span>
          ) : (
            <span className="tag tag-paid">Paid · −1</span>
          )}
        </div>
        <button
          type="button"
          className={`reel-caption ${expanded ? 'expanded' : ''}`}
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {reel.caption}
        </button>
        {item.free && item.freeNumber === 1 && <Explain show={explain} text={COPY.explain.free} />}
      </div>
      <div className="reel-side">
        <button
          type="button"
          className={`rail-btn like ${liked ? 'on' : ''}`}
          onClick={onToggleLike}
          aria-label={liked ? 'Unlike' : 'Like'}
          aria-pressed={liked}
        >
          <IconHeart filled={liked} size={28} />
        </button>
        <span className="rail-count">{formatLikes((reel.likes || 0) + (liked ? 1 : 0))}</span>
        <span className="rail-btn ghosted" aria-hidden="true"><IconComment size={26} /></span>
        <span className="rail-btn ghosted" aria-hidden="true"><IconShare size={24} /></span>
      </div>
    </div>
  );
}

const Feed = forwardRef(function Feed(
  {
    items, index, transitionMs, muted, volume = 1, filterFor = () => 'none',
    paused, blocked, onRequestMove, renderCard, explain, freeReels,
  },
  ref
) {
  const v0 = useRef(null);
  const v1 = useRef(null);
  const v2 = useRef(null);
  const videos = [v0, v1, v2];
  const containerRef = useRef(null);
  const lastSlotItems = useRef([null, null, null]);
  const prevIndex = useRef(index);
  const movingRef = useRef(false);
  const [moving, setMoving] = useState(false);
  const [buffering, setBuffering] = useState([true, true, true]);
  const [failed, setFailed] = useState([false, false, false]);
  const [liked, setLiked] = useState(() => new Set());
  const [burst, setBurst] = useState(null); // { id, key } big heart on double tap

  // Latest props for event handlers registered once.
  const moveRef = useRef(onRequestMove);
  moveRef.current = onRequestMove;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const request = useRef((delta) => {
    if (blockedRef.current || movingRef.current) return;
    moveRef.current(delta);
  }).current;

  // Which item index each of the 3 slots shows (index-1, index, index+1).
  const slots = [0, 1, 2].map((slot) => {
    for (const off of [-1, 0, 1]) {
      const i = index + off;
      if (i >= 0 && i < items.length && i % 3 === slot) return i;
    }
    return null;
  });
  // A slot whose item changed jumps into place without animating.
  const changed = slots.map((i, s) => lastSlotItems.current[s] !== i);
  useEffect(() => {
    lastSlotItems.current = slots;
  });

  const setSlotFlag = (setter, s, value) =>
    setter((arr) => (arr[s] === value ? arr : arr.map((v, k) => (k === s ? value : v))));

  useImperativeHandle(ref, () => ({
    unlockAudio() {
      videos.forEach((r) => {
        const v = r.current;
        if (!v || !v.getAttribute('src')) return;
        v.muted = false;
        const p = v.play();
        if (p) p.catch(() => {});
      });
    },
  }));

  // Lock input while a transition runs (3 s in slow mode).
  useEffect(() => {
    if (prevIndex.current === index) return;
    const jump = Math.abs(index - prevIndex.current) > 1;
    prevIndex.current = index;
    if (jump) {
      movingRef.current = false;
      setMoving(false);
      return;
    }
    movingRef.current = true;
    setMoving(true);
    const t = setTimeout(() => {
      movingRef.current = false;
      setMoving(false);
    }, transitionMs);
    return () => clearTimeout(t);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play the current reel, pause the others.
  useEffect(() => {
    videos.forEach((r, s) => {
      const v = r.current;
      if (!v) return;
      const i = slots[s];
      const item = i == null ? null : items[i];
      const isCurrent = i === index && item?.type === 'reel' && item.reel.src;
      if (isCurrent && !paused) {
        v.muted = muted;
        try {
          v.volume = volume; // ignored on iPhone (read-only there); works on Android and desktop
        } catch {}
        const p = v.play();
        if (p) {
          p.catch(() => {
            // Sound blocked by the browser: play muted rather than not at all.
            v.muted = true;
            v.play().catch(() => {});
          });
        }
      } else {
        v.pause();
      }
    });
  });

  // Mouse wheel / trackpad (laptop demo).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let acc = 0;
    let cooldownUntil = 0;
    const onWheel = (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now < cooldownUntil) return;
      acc += e.deltaY;
      if (Math.abs(acc) > 60) {
        request(acc > 0 ? 1 : -1);
        acc = 0;
        cooldownUntil = now + 700;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [request]);

  // Keyboard.
  useEffect(() => {
    const onKey = (e) => {
      // Never steal keys from text fields (login form, etc.).
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (['ArrowDown', 'PageDown', 'j'].includes(e.key)) {
        e.preventDefault();
        request(1);
      } else if (['ArrowUp', 'PageUp', 'k'].includes(e.key)) {
        e.preventDefault();
        request(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [request]);

  function toggleLike(id) {
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function likeWithBurst(id) {
    setLiked((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    setBurst({ id, key: Date.now() });
  }

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(null), 800);
    return () => clearTimeout(t);
  }, [burst]);

  // Touch / mouse: vertical swipe moves, double tap likes.
  const start = useRef(null);
  const lastTap = useRef(0);
  const onPointerDown = (e) => {
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    start.current = null;
    if (Math.abs(dy) > CONFIG.swipeThresholdPx && Math.abs(dy) > Math.abs(dx)) {
      request(dy < 0 ? 1 : -1);
      return;
    }
    if (Math.abs(dx) > TAP_SLOP_PX || Math.abs(dy) > TAP_SLOP_PX) return;
    if (e.target.closest('button')) return; // buttons handle their own taps
    const now = Date.now();
    const item = items[index];
    if (now - lastTap.current < DOUBLE_TAP_MS && item?.type === 'reel' && !blockedRef.current) {
      likeWithBurst(item.reel.id);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  return (
    <div
      ref={containerRef}
      className="feed"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
    >
      {slots.map((i, s) => {
        const item = i == null ? null : items[i];
        const offset = i == null ? 3 : i - index;
        const reel = item?.type === 'reel' ? item.reel : null;
        const easing = transitionMs > 1000 ? 'ease-in-out' : 'cubic-bezier(.2,.8,.2,1)';
        const style = {
          transform: `translate3d(0, ${offset * 100}%, 0)`,
          transition: changed[s] ? 'none' : `transform ${transitionMs}ms ${easing}`,
        };
        const showSkeleton = reel?.src && buffering[s] && !failed[s];
        const filter = item ? filterFor(item) : 'none';
        return (
          <div key={s} className="slot" style={style} aria-hidden={i !== index}>
            <video
              ref={videos[s]}
              className="reel-video"
              src={reel?.src || undefined}
              poster={reel?.poster || undefined}
              playsInline
              loop
              preload="auto"
              hidden={!reel?.src}
              style={{ filter }}
              onLoadStart={() => {
                setSlotFlag(setBuffering, s, true);
                setSlotFlag(setFailed, s, false);
              }}
              onWaiting={() => setSlotFlag(setBuffering, s, true)}
              onLoadedData={() => setSlotFlag(setBuffering, s, false)}
              onPlaying={() => setSlotFlag(setBuffering, s, false)}
              onError={() => {
                setSlotFlag(setFailed, s, true);
                setSlotFlag(setBuffering, s, false);
              }}
            />
            {showSkeleton && (
              <div className="skeleton" aria-hidden="true">
                <div className="skeleton-spinner" />
              </div>
            )}
            {reel?.src && failed[s] && (
              <div className="placeholder error">
                <span>!</span>
                <small>Couldn't load this reel. Swipe to the next one.</small>
              </div>
            )}
            {reel && !reel.src && (
              <div className="placeholder" style={{ background: reel.color || '#333', filter }}>
                <span className="placeholder-id">{reel.id}</span>
                <small>Mock reel · put {reel.id}.mp4 in backend/media/reels and run npm run manifest</small>
              </div>
            )}
            {reel && burst?.id === reel.id && (
              <div className="heart-burst" key={burst.key} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 21s-7.5-4.6-9.6-9.1C.9 8.6 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.7 0 5.7 4.1 4.2 7.4C19.5 16.4 12 21 12 21z" />
                </svg>
              </div>
            )}
            {reel && (
              <ReelOverlay
                key={reel.id}
                reel={reel}
                item={item}
                freeReels={freeReels}
                liked={liked.has(reel.id)}
                onToggleLike={() => toggleLike(reel.id)}
                explain={explain && i === index}
              />
            )}
            {item && item.type !== 'reel' && renderCard(item, i === index)}
          </div>
        );
      })}
      {moving && transitionMs >= 1000 && (
        <div className="slow-overlay" role="status">
          <div className="slow-card">
            <span className="slow-title">Loading next reel</span>
            <span className="slow-note">Slow scroll, on purpose</span>
            <div className="slow-track">
              <div className="slow-fill" style={{ animationDuration: `${transitionMs}ms` }} />
            </div>
            <div className="slow-times">
              <span>0:00</span>
              <span>0:{String(Math.round(transitionMs / 1000)).padStart(2, '0')}</span>
            </div>
          </div>
          <Explain show={explain} text={COPY.explain.slow} />
        </div>
      )}
    </div>
  );
});

export default Feed;
