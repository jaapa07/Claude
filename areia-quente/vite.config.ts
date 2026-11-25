import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public',
  server: { host: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000, assetsInlineLimit: 0, assetsDir: 'bundle' },
});
