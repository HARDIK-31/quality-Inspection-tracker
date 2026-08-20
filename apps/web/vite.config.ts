import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Dev and preview only. Docker uses nginx for this.
  const apiProxyTarget = env.API_PROXY_TARGET || 'http://localhost:4000';

  const proxy = {
    '/api': {
      target: apiProxyTarget,
      changeOrigin: true,
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    server: { host: true, port: 5173, proxy },
    preview: { host: true, port: 4173, proxy },
    build: { outDir: 'dist', sourcemap: false },
  };
});
