// UI theme switch. ONE value decides the whole look:
//
//   frontend/.env  ->  VITE_UI_THEME=dark       new black look + 3D logo (default)
//                      VITE_UI_THEME=original   the old cream UI, exactly as before
//
// Vite reads .env at startup and restarts the dev server when it changes.
//
// How it works: in "dark" mode main.jsx sets <html data-theme="dark">, and every rule in
// theme-dark.css is scoped to that attribute. In "original" mode the attribute is never set,
// so theme-dark.css matches nothing and styles.css (the untouched original theme) is all
// that applies.

// Browser-tab icon: a still of the 3D logo (generated with the Android icons). Dark theme only,
// so the original theme keeps index.html exactly as it was.
import logoIcon from './assets/logo-3d-icon.png';

const raw = String(import.meta.env.VITE_UI_THEME || 'dark').trim().toLowerCase();

export const UI_THEME = raw === 'original' ? 'original' : 'dark';
export const IS_DARK_THEME = UI_THEME === 'dark';

/** Called once from main.jsx before the first render. */
export function applyTheme() {
  if (!IS_DARK_THEME) return; // original: leave the document exactly as it was
  document.documentElement.dataset.theme = 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#000000');
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/png';
  icon.href = logoIcon;
  document.head.append(icon);
}
