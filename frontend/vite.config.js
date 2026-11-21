import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api and /media are forwarded to the backend on port 8787.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
      '/media': 'http://localhost:8787',
    },
  },
});
