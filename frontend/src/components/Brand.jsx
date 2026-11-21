// 看看 See See: brand mark, stacked wordmark and the top bar for the light screens.
import React from 'react';

export const BRAND = { cn: '看看', en: 'See See', full: '看看 See See' };

/** Square mark with 看 (kàn, "to look"). */
export function BrandMark({ size = 28 }) {
  return (
    <span
      className="brand-mark"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.56) }}
      aria-hidden="true"
    >
      看
    </span>
  );
}

/** 看看 on top, See See underneath. tone: 'dark' (light screens) or 'light' (on video). */
export function Wordmark({ tone = 'dark', size = 'md' }) {
  return (
    <span className={`wordmark-stack ${tone} ${size}`} aria-label={BRAND.full}>
      <span className="wm-cn" aria-hidden="true">{BRAND.cn}</span>
      <span className="wm-en" aria-hidden="true">{BRAND.en}</span>
    </span>
  );
}

export default function TopBar({ right = null }) {
  return (
    <div className="top-bar">
      <div className="brand">
        <BrandMark size={32} />
        <Wordmark />
      </div>
      {right}
    </div>
  );
}
