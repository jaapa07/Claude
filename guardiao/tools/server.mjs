// Sobe o Vite (modo dev) por código, para as ferramentas de render usarem exatamente o mesmo app.
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export async function startServer(port) {
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port, strictPort: false, hmr: false, watch: null }, optimizeDeps: { include: ['three', 'gsap', 'react', 'react-dom/client'] } });
  await server.listen(); const url = server.resolvedUrls.local[0];
  return { url, close: () => server.close() };
}
export const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'];
