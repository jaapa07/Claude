import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public',
  server: { host: true },
  build: { rollupOptions: { input: { index: 'index.html', pc: 'pc.html', celular: 'celular.html' } }, target: 'es2022', chunkSizeWarningLimit: 2000, assetsInlineLimit: 0, assetsDir: 'bundle' },
});
