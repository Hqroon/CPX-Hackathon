import React from 'react';
import logo from '../assets/see-see-logo.png';
// Dark theme shows the 3D logo; VITE_UI_THEME=original keeps the PNG artwork below, unchanged.
import { IS_DARK_THEME } from '../theme.js';
import Logo3D from './Logo3D.jsx';

export const BRAND = { cn: '看看', en: 'See See', full: '看看 See See' };

// Frame the original artwork. The icon viewport excludes the English lettering.
export function BrandMark({ size = 28 }) {
  if (IS_DARK_THEME) return <Logo3D size={size} />;
  return (
    <svg className="brand-mark" width={size} height={size}
      viewBox="190 240 510 510" aria-hidden="true" focusable="false">
      <image href={logo} width="1536" height="1024" />
    </svg>
  );
}

export function HomeLogo() {
  if (IS_DARK_THEME) {
    // Same box as the artwork (see .home-logo); 3D mark + the lockup's lettering.
    return (
      <span className="home-logo home-logo-3d" role="img" aria-label={BRAND.full}>
        <Logo3D size={44} />
        <span className="home-logo-text" aria-hidden="true">
          <span className="home-logo-cn" lang="zh">{BRAND.cn}</span>
          <span className="home-logo-en">{BRAND.en}</span>
        </span>
      </span>
    );
  }
  return (
    <svg className="home-logo" viewBox="190 280 1100 430"
      role="img" aria-label={BRAND.full}>
      <image href={logo} width="1536" height="1024" />
    </svg>
  );
}

export function Wordmark({ tone = 'dark', size = 'md' }) {
  return (
    <span className={'wordmark-stack ' + tone + ' ' + size} lang="zh" aria-label={BRAND.cn}>
      <span className="wm-cn" aria-hidden="true">{BRAND.cn}</span>
    </span>
  );
}

export default function TopBar({ right = null }) {
  return (
    <div className="top-bar">
      <div className="brand"><BrandMark size={32} /><Wordmark /></div>
      {right}
    </div>
  );
}
