import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Fonts are bundled (not Google Fonts) so the demo works offline and on mainland networks.
import '@fontsource/lora/500.css';
import '@fontsource/lora/600.css';
import '@fontsource/lora/700.css';
import '@fontsource-variable/inter';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
