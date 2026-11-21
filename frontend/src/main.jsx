import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Font is bundled (not Google Fonts) so the demo works offline and on mainland networks.
import '@fontsource-variable/shantell-sans/full.css'; // handwriting-based, with informality + bounce axes
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
