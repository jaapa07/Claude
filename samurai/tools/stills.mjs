// Stills de conferência: node tools/stills.mjs <ep> <t1,t2,...> [pasta] [escala]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import { startServer } from '../server.mjs';
const [ep = '1', times = '1,5,10', out = 'out/stills', scale = '0.5'] = process.argv.slice(2);
const server = await startServer(5199);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: Number(scale) });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 600)); });
page.on('pageerror', (e) => { console.log('[pageerror]', e.message); process.exit(1); });
await page.goto('http://localhost:5199/?render=1&scale=' + scale, { waitUntil: 'load' });
await page.waitForFunction(() => window.__sam?.ready, null, { timeout: 120000 });
fs.mkdirSync(out, { recursive: true });
for (const ts of times.split(',')) {
  const t = Number(ts), t0 = Date.now();
  await page.evaluate(([e, f]) => window.__sam.renderFrame(e, f), [Number(ep), Math.round(t * 60)]);
  await page.screenshot({ path: `${out}/ep${ep}_${t.toFixed(2).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`ep${ep} t=${ts} ${Date.now() - t0}ms`);
}
await browser.close(); server.close();
