// Dev-only page to review the 3D logo on its own: http://localhost:5173/logo-preview.html
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles.css';
import './theme-dark.css';
import Logo3D, { FlatMark } from './components/Logo3D.jsx';
import { BrandMark } from './components/Brand.jsx';

const SIZES = [
  { size: 24, where: 'Results header' },
  { size: 28, where: 'Login / slide gate header' },
  { size: 30, where: 'Feed top bar' },
  { size: 40, where: 'Laptop backdrop' },
  { size: 56, where: 'Loading screen' },
];

const box = { background: 'var(--dk-surface-2)', borderRadius: 14, padding: 16 };
const label = { fontSize: 12, color: 'var(--dk-muted)' };

function Preview() {
  const [animate, setAnimate] = useState(true);
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(120% 55% at 50% -8%, var(--dk-glow), transparent 70%), #000', color: '#fff', fontFamily: 'var(--dk-font)', padding: '24px 16px 48px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'grid', gap: 20 }}>
        <div>
          <p style={{ margin: 0, ...label }}>Doomscroll Tax · logo preview</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 600 }}>3D logo (CSS 3D, layered SVG)</h1>
        </div>

        <div style={{ ...box, display: 'grid', placeItems: 'center', padding: '40px 16px' }}>
          <Logo3D size={200} animate={animate} />
        </div>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
          <input type="checkbox" checked={!animate} onChange={(e) => setAnimate(!e.target.checked)} />
          Show the flat fallback (reduced motion / slow devices)
        </label>

        <div style={{ ...box, display: 'grid', gap: 14 }}>
          <span style={label}>At the real sizes used in the app: 3D, flat fallback, current logo</span>
          {SIZES.map(({ size, where }) => (
            <div key={size} style={{ display: 'grid', gridTemplateColumns: '64px 64px 64px 1fr', alignItems: 'center', gap: 8 }}>
              <Logo3D size={size} animate={animate} />
              <FlatMark size={size} />
              <BrandMark size={size} />
              <span style={label}>{size}px · {where}</span>
            </div>
          ))}
        </div>

        <div style={{ ...box, display: 'grid', gap: 18 }}>
          <span style={label}>In context (same position and size as today)</span>
          <div className="brand"><Logo3D size={28} animate={animate} /><span className="brand-name">Doomscroll Tax</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Logo3D size={30} animate={animate} /><span className="wordmark">刷屏税</span></div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Preview />);
