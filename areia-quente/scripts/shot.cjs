// Uso: node scripts/shot.cjs <caminho-relativo-com-query> <saida.png> [largura] [altura]
// Serve os arquivos do projeto direto do disco (sem servidor HTTP) via interceptação de rotas
// do Playwright, espera document.title === 'done' e salva um screenshot.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
(async () => {
  const [rel, out, w = '1400', h = '1000'] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  await p.route('http://local/**', (route) => {
    const u = new URL(route.request().url());
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: 'nf' });
    route.fulfill({ status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || 'application/octet-stream' });
  });
  p.on('console', (m) => console.log('console:', m.text()));
  p.on('pageerror', (e) => console.log('err:', e.message));
  await p.goto('http://local/' + rel);
  await p.waitForFunction(() => document.title === 'done', { timeout: 90000 }).catch(() => console.log('timeout'));
  const c = await p.$('canvas');
  await (c || p).screenshot({ path: out });
  await b.close();
})();
