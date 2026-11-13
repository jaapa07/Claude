// Prova de determinismo: renderiza os mesmos quadros em dois navegadores independentes, em ordens opostas,
// e compara os pixels. uso: node tools/verify.mjs [quadros separados por vírgula]
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { startServer, GL } from './server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const frames = (process.argv[2] ?? '20,480,900,1350,1700,2300,2750,3100,3700,4150,4600,5000,5380').split(',').map(Number);
const server = await startServer(5700 + Math.floor(Math.random() * 200));
async function run(order) {
  const browser = await chromium.launch({ args: GL }), page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  await page.goto(server.url + '?render=1&scale=0.5'); await page.waitForFunction(() => window.__film?.ready, null, { timeout: 300000 });
  const out = {}; for (const f of order) { await page.evaluate((n) => window.__film.renderFrame(n), f); out[f] = crypto.createHash('sha256').update(await page.screenshot({ type: 'png' })).digest('hex').slice(0, 16); }
  await browser.close(); return out;
}
const a = await run(frames), b = await run([...frames].reverse());
let ok = true; for (const f of frames) { const same = a[f] === b[f]; ok &&= same; console.log(`quadro ${String(f).padStart(4)} (${(f / 60).toFixed(2).padStart(5)} s)  ${a[f]}  ${b[f]}  ${same ? 'IDÊNTICO' : 'DIFERENTE'}`); }
await server.close(); console.log(ok ? 'Determinístico: sim' : 'Determinístico: NÃO'); process.exit(ok ? 0 : 1);
