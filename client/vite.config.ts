import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The new Knots client. Talks to the existing relay at http://localhost:3000
// via a dev proxy so the app can use same-origin relative URLs (/api/v1/*, /health).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true }
    }
  },
  build: {
    target: 'es2020',
    sourcemap: false
  }
});
