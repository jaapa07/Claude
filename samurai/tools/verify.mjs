// Prova de determinismo: renderiza os mesmos frames em dois navegadores independentes, em ordens diferentes,
// e compara os pixels. uso: node tools/verify.mjs [ep] [frames separados por vírgula]
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { startServer } from '../server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const ep = Number(process.argv[2] ?? 1), frames = (process.argv[3] ?? '30,333,700,1010,1199').split(',').map(Number);
const server = await startServer(5177);
async function run(order) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  await page.goto('http://localhost:5177/?render=1&scale=0.5'); await page.waitForFunction(() => window.__sam?.ready, null, { timeout: 180000 });
  await page.evaluate(() => { document.getElementById('stage').style.transform = 'scale(0.5)'; });
  const out = {};
  for (const f of order) { await page.evaluate(([e, n]) => window.__sam.renderFrame(e, n), [ep, f]); out[f] = crypto.createHash('sha256').update(await page.screenshot({ type: 'png' })).digest('hex').slice(0, 16); }
  await browser.close(); return out;
}
const a = await run(frames), b = await run([...frames].reverse());
let ok = true; for (const f of frames) { const same = a[f] === b[f]; ok &&= same; console.log(`ep${ep} frame ${String(f).padStart(4)}  ${a[f]}  ${b[f]}  ${same ? 'IDÊNTICO' : 'DIFERENTE'}`); }
server.close(); console.log(ok ? 'Determinístico: sim' : 'Determinístico: NÃO'); process.exit(ok ? 0 : 1);
