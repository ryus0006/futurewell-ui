import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4200,
    // Mirrors production, where nginx proxies /api/ to the backend service.
    // Keeps requests same-origin in development too, so no CORS anywhere and
    // the same relative URLs work in both environments.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
