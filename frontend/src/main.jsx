import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Fonts are bundled (not Google Fonts) so the demo works offline and on mainland networks.
import '@fontsource/lora/500.css';
import '@fontsource/lora/600.css';
import '@fontsource/lora/700.css';
import '@fontsource-variable/inter';
import './styles.css';
// UI theme: VITE_UI_THEME=dark | original (see src/theme.js). theme-dark.css only applies
// when <html data-theme="dark"> is set, so "original" renders styles.css alone, as before.
import './theme-dark.css';
import { applyTheme } from './theme.js';

applyTheme();

createRoot(document.getElementById('root')).render(<App />);
