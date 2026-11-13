// Stills de conferência: node tools/stills.mjs <t1,t2,...> [pasta] [escala]   (tempos absolutos em segundos)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { startServer, GL } from './server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [times = '1,5,10', out = 'out/stills', scale = '0.5'] = process.argv.slice(2);
const server = await startServer(5300 + Math.floor(Math.random() * 300));
const browser = await chromium.launch({ args: GL });
const page = await browser.newPage({ viewport: { width: Math.round(1080 * scale), height: Math.round(1920 * scale) } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 500)); });
page.on('pageerror', (e) => { console.log('[pageerror]', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')); process.exit(1); });
await page.goto(server.url + '?render=1&scale=' + scale); await page.waitForFunction(() => window.__film?.ready, null, { timeout: 240000 });
fs.mkdirSync(out, { recursive: true });
for (const ts of times.split(',')) { const t = Number(ts); await page.evaluate((f) => window.__film.renderFrame(f), Math.round(t * 60)); await page.screenshot({ path: `${out}/t_${t.toFixed(2).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 88 }); }
await browser.close(); await server.close();
