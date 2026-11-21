// Background logo: the live 3D logo (same as the welcome page), large and faint, behind the
// content of every black non-reel page. Dark theme only; renders nothing for VITE_UI_THEME=original.
// Put it as the FIRST child of a page root (.screen, .modal-backdrop, .loading).
// Size: fits the page (share of width, capped by height) and follows resizes.
// Opacity / fit: --bg-logo-* variables in theme-dark.css.
import React, { useEffect, useRef, useState } from 'react';
import Logo3D from './Logo3D.jsx';
import { IS_DARK_THEME } from '../theme.js';

export default function BackgroundLogo() {
  const ref = useRef(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    if (!IS_DARK_THEME || !ref.current) return undefined;
    const el = ref.current;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const byWidth = width * (parseFloat(cs.getPropertyValue('--bg-logo-fit')) || 0.9);
      const byHeight = height * (parseFloat(cs.getPropertyValue('--bg-logo-max-h')) || 0.6);
      setSize(Math.max(0, Math.round(Math.min(byWidth, byHeight))));
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  if (!IS_DARK_THEME) return null;
  return (
    <div ref={ref} className="bg-logo" aria-hidden="true">
      {size > 0 && <Logo3D size={size} maxLayers={24} />}
    </div>
  );
}
