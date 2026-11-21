// Doomscroll Tax logo mark (eye + pause bars), flat and 3D. Dark theme only.
//
// 3D approach: CSS 3D transforms on layered SVGs (no Three.js). The same mark is stacked
// N times along the Z axis (darker greens at the back) to fake an extrusion, the front face
// gets a glossy gradient and an animated light sweep, and the whole stack slowly turns
// and floats. Falls back to the flat mark for prefers-reduced-motion, low-end devices,
// data saver, or browsers without preserve-3d.
//
// Colours, tilt, float and spin timing are CSS variables in theme-dark.css (--dk-logo-*).
import React, { useEffect, useId, useState } from 'react';

export const MARK_VIEWBOX = '200 290 490 410';

// Seconds between light sweeps across the front face (SVG animation can't read CSS vars).
const SWEEP_SECONDS = 4.5;

// Traced from the supplied logo artwork (symbol only, no lettering).
export const MARK_PATHS = [
  // upper swoosh
  'M232,582 C204,556 200,520 238,489 L362,404 C398,381 422,373 446,373 C482,373 524,390 595,427 L595,458 C595,478 586,488 568,488 C522,468 482,454 444,456 C404,458 366,478 262,541 C245,552 235,566 232,582 Z',
  // corner flag
  'M565,376 L680,299 L680,438 C672,470 642,497 602,497 C590,497 580,495 572,492 C592,490 601,480 601,462 L601,376 Z',
  // lower-left swoosh
  'M242,592 C232,580 236,562 258,548 L286,531 C344,566 404,601 470,632 C498,645 524,652 548,653 C518,674 482,691 442,691 C402,691 364,676 302,637 Z',
  // lower-right swoosh
  'M446,610 C502,608 544,588 604,543 L680,468 L680,506 C680,540 662,572 622,602 L552,648 C520,640 484,626 446,610 Z',
];
export const MARK_BARS = [
  { x: 413, y: 488, width: 27, height: 83, rx: 4 },
  { x: 470, y: 488, width: 27, height: 83, rx: 4 },
];

function MarkShapes(props) {
  return (
    <g {...props}>
      {MARK_PATHS.map((d) => <path key={d} d={d} />)}
      {MARK_BARS.map((r) => <rect key={r.x} {...r} />)}
    </g>
  );
}

/** Flat mark: the fallback, and what slow devices / reduced motion get. */
export function FlatMark({ size = 28 }) {
  return (
    <svg className="logo-flat" width={size} height={size} viewBox={MARK_VIEWBOX} aria-hidden="true" focusable="false">
      <MarkShapes style={{ fill: 'var(--dk-logo-flat)' }} />
    </svg>
  );
}

// ---- When to animate ------------------------------------------------------------------
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Low-end device / data saver / no 3D support -> flat logo. */
export function isLowEndDevice() {
  if (typeof navigator === 'undefined') return true;
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8; // GB, Chromium only
  const saveData = navigator.connection?.saveData === true;
  const has3D = typeof CSS !== 'undefined' && CSS.supports?.('transform-style', 'preserve-3d');
  return cores <= 2 || memory <= 2 || saveData || !has3D;
}

function useAnimate3D(force) {
  const [ok, setOk] = useState(() => force ?? (!prefersReducedMotion() && !isLowEndDevice()));
  useEffect(() => {
    if (force !== undefined) { setOk(force); return undefined; }
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const update = () => setOk(!mq.matches && !isLowEndDevice());
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, [force]);
  return ok;
}

/**
 * 3D animated mark. Same footprint as the flat one (size x size).
 * `animate` forces 3D on/off (preview page); leave undefined for automatic.
 * `maxLayers` only matters for large still renders (app icons); keep the default in the UI.
 */
export default function Logo3D({ size = 28, animate, maxLayers = 14 }) {
  const on = useAnimate3D(animate);
  const uid = useId().replace(/:/g, '');
  if (!on) return <FlatMark size={size} />;

  // Extrusion depth scales with size; one layer per ~1.5px of depth, capped.
  const depth = Math.max(3, Math.round(size * 0.16));
  const layers = Math.min(maxLayers, Math.max(4, Math.round(depth / 1.5)));
  const step = depth / layers;

  return (
    <span className="logo3d" style={{ width: size, height: size, '--logo3d-size': `${size}px` }} aria-hidden="true">
      <span className="logo3d-float">
        <span className="logo3d-spin">
          {Array.from({ length: layers }, (_, i) => {
            const t = i / (layers - 1); // 0 = back, 1 = just behind the face
            return (
              <svg
                key={i} className="logo3d-layer" viewBox={MARK_VIEWBOX}
                style={{ transform: `translateZ(${(-depth + i * step).toFixed(2)}px)`, '--t': t.toFixed(3) }}
              >
                <MarkShapes className="logo3d-side" />
              </svg>
            );
          })}
          <svg className="logo3d-layer logo3d-face" viewBox={MARK_VIEWBOX}>
            <defs>
              <linearGradient id={`face-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--dk-logo-face-light)' }} />
                <stop offset="1" style={{ stopColor: 'var(--dk-logo-face-dark)' }} />
              </linearGradient>
              <radialGradient id={`gloss-${uid}`} cx="0.3" cy="0.2" r="0.7">
                <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={`sweep-${uid}`} x1="0" y1="0" x2="1" y2="0.35">
                <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
                <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
                <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
                <animateTransform
                  attributeName="gradientTransform" type="translate"
                  values="-1.2 0; -1.2 0; 1.2 0" keyTimes="0; 0.45; 1"
                  dur={`${SWEEP_SECONDS}s`} repeatCount="indefinite"
                />
              </linearGradient>
            </defs>
            <MarkShapes fill={`url(#face-${uid})`} />
            <MarkShapes fill={`url(#gloss-${uid})`} />
            <MarkShapes fill={`url(#sweep-${uid})`} />
          </svg>
        </span>
      </span>
    </span>
  );
}
