import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Font is bundled (not Google Fonts) so the demo works offline and on mainland networks.
import '@fontsource-variable/dm-sans';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
