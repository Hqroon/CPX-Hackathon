// Soft, flat illustrations drawn for this app (no third-party art).
import React from 'react';

/** Crescent moon inside a circle: the logo mark. */
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#8E97FD" />
      <path d="M20.5 8.5a8.5 8.5 0 1 0 3 11.6A7 7 0 0 1 20.5 8.5z" fill="#fff" />
    </svg>
  );
}

/** Gate hero: a stack of lecture slides on a soft blob, with a moon and sparkles. */
export function SlidesArt() {
  return (
    <svg viewBox="0 0 320 220" width="100%" height="100%" aria-hidden="true">
      <path d="M58 120c-14-52 30-98 92-100 66-2 128 22 132 82 4 58-46 104-118 104-58 0-92-34-106-86z" fill="#EEF0FF" />
      <circle cx="262" cy="46" r="18" fill="#FFDB9D" />
      <circle cx="270" cy="40" r="15" fill="#EEF0FF" />
      <g fill="#8E97FD">
        <path d="M60 52l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
        <path d="M282 150l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity=".7" />
        <circle cx="96" cy="190" r="3" opacity=".5" />
      </g>
      {/* back slide */}
      <g transform="rotate(-10 150 120)">
        <rect x="92" y="62" width="130" height="92" rx="12" fill="#FFC97E" />
        <rect x="106" y="78" width="52" height="8" rx="4" fill="#fff" opacity=".8" />
      </g>
      {/* middle slide */}
      <g transform="rotate(5 170 120)">
        <rect x="104" y="70" width="130" height="92" rx="12" fill="#6CB28E" />
        <rect x="118" y="86" width="60" height="8" rx="4" fill="#fff" opacity=".8" />
      </g>
      {/* front slide */}
      <rect x="96" y="84" width="136" height="96" rx="12" fill="#fff" stroke="#E4E6FF" strokeWidth="2" />
      <rect x="110" y="98" width="70" height="9" rx="4.5" fill="#3F414E" />
      <rect x="110" y="115" width="108" height="6" rx="3" fill="#D9DCF5" />
      <rect x="110" y="127" width="92" height="6" rx="3" fill="#D9DCF5" />
      <rect x="110" y="139" width="100" height="6" rx="3" fill="#D9DCF5" />
      <rect x="110" y="156" width="40" height="12" rx="6" fill="#8E97FD" />
      <circle cx="212" cy="160" r="10" fill="#FA6E5A" />
      <path d="M208 160l3 3 5-6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Caught-up hero: crescent moon, clouds and stars on navy. */
export function MoonArt() {
  return (
    <svg viewBox="0 0 320 230" width="100%" height="100%" aria-hidden="true">
      <circle cx="160" cy="112" r="96" fill="#1B2A63" opacity=".55" />
      <circle cx="160" cy="112" r="70" fill="#22337A" opacity=".6" />
      <path d="M178 46a66 66 0 1 0 54 90 56 56 0 0 1-54-90z" fill="#FFDB9D" />
      <circle cx="140" cy="96" r="8" fill="#F5C77E" />
      <circle cx="170" cy="140" r="5" fill="#F5C77E" />
      <circle cx="122" cy="134" r="4" fill="#F5C77E" />
      {/* sleepy face */}
      <path d="M138 116q6 5 12 0M162 116q6 5 12 0" stroke="#3F414E" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M150 130q6 4 12 0" stroke="#3F414E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* clouds */}
      <g fill="#8E97FD">
        <path d="M60 182a18 18 0 0 1 30-14 22 22 0 0 1 40 8 14 14 0 0 1 2 28H66a14 14 0 0 1-6-22z" />
      </g>
      <g fill="#B6BDFF">
        <path d="M196 176a16 16 0 0 1 28-10 20 20 0 0 1 36 8 12 12 0 0 1 0 24h-58a12 12 0 0 1-6-22z" />
      </g>
      <g fill="#fff">
        <path d="M58 52l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        <path d="M262 70l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
        <circle cx="96" cy="30" r="2" />
        <circle cx="236" cy="28" r="2.4" />
        <circle cx="286" cy="128" r="2" />
        <circle cx="34" cy="120" r="2" />
      </g>
    </svg>
  );
}
