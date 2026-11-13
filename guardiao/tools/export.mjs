// Exportação determinística para MP4 (1080×1920, 60 fps, H.264 + AAC).
//   node tools/export.mjs                 → filme completo (90 s) em out/guardiao-das-estrelas.mp4
//   node tools/export.mjs --seq 2         → só a sequência 2 (18 s) em out/seq2.mp4
//   node tools/export.mjs --split         → filme completo + as cinco sequências separadas
//   node tools/export.mjs --audio         → refaz só o áudio do MP4 já renderizado
//   opções: --workers 4  --scale 1  --crf 20  --from <frame> --to <frame>  --keep (mantém os JPEG)  --gpu
// Cada quadro é desenhado a partir de T = quadro/60, sem depender do anterior: vários navegadores renderizam
// quadros diferentes em paralelo e o resultado é idêntico ao de um só.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, GL, ROOT } from './server.mjs';

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { console.error('Playwright não encontrado. Instale com: npm i -D playwright && npx playwright install chromium'); process.exit(1); }
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] === undefined || process.argv[i + 1].startsWith('--') ? true : process.argv[i + 1]); };
if (spawnSync('ffmpeg', ['-version']).status !== 0) { console.error('ffmpeg não encontrado no PATH: sem ele não é possível gerar o MP4.'); process.exit(1); }
const FPS = 60, SEQ = 18 * FPS, TOTAL = 5 * SEQ, seq = arg('seq') ? Number(arg('seq')) : 0;
const from = Number(arg('from', seq ? (seq - 1) * SEQ : 0)), to = Number(arg('to', seq ? seq * SEQ : TOTAL));
const workers = arg('audio') ? 1 : Number(arg('workers', 4)), scale = Number(arg('scale', 1)), crf = String(arg('crf', 20));
const OUT = path.join(ROOT, 'out'), name = seq ? `seq${seq}` : (from === 0 && to === TOTAL ? 'guardiao-das-estrelas' : `trecho-${from}-${to}`), mp4 = path.join(OUT, name + '.mp4'), dir = path.join(OUT, 'frames', name);
fs.mkdirSync(OUT, { recursive: true });
const server = await startServer(5400 + Math.floor(Math.random() * 300)), browsers = [];
async function openPage() {
  const browser = await chromium.launch({ args: arg('gpu') ? [] : GL }); browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: Math.round(1080 * scale), height: Math.round(1920 * scale) }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('[erro na página]', e.message); process.exit(1); });
  await page.goto(`${server.url}?render=1&scale=${scale}`); await page.waitForFunction(() => window.__film?.ready, null, { timeout: 300000 });
  return page;
}
const pages = await Promise.all([...Array(workers)].map(openPage));
const wav = path.join(OUT, name + '.wav');
fs.writeFileSync(wav, Buffer.from(await pages[0].evaluate(([a, b]) => window.__film.audioWavBase64(a, b), [from / FPS, to / FPS]), 'base64'));
const enc = ['-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-maxrate', '12M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-r', String(FPS)], aenc = ['-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'];
const run = (args) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); if (r.status !== 0) process.exit(1); };
if (arg('audio')) { const tmp = mp4.replace('.mp4', '.tmp.mp4'); run(['-i', mp4, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', ...aenc, '-shortest', tmp]); fs.renameSync(tmp, mp4); console.log('áudio refeito em', mp4); }
else {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now(); let next = from, done = 0;
  await Promise.all(pages.map(async (page) => {                         // fila compartilhada: cada navegador pega o próximo quadro livre
    for (;;) { const f = next++; if (f >= to) return;
      await page.evaluate((n) => window.__film.renderFrame(n), f);
      await page.screenshot({ path: path.join(dir, String(f - from).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 96 });
      if (++done % 60 === 0) process.stdout.write(`\r${done}/${to - from} quadros · ${(done / ((Date.now() - t0) / 1000)).toFixed(2)} fps de render   `);
    }
  }));
  run(['-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-i', wav, ...enc, ...aenc, '-shortest', mp4]);
  console.log(`\n${mp4} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  if (arg('split') && from === 0 && to === TOTAL) for (let s = 1; s <= 5; s++) {   // as cinco sequências, a partir dos mesmos quadros
    const sw = path.join(OUT, `seq${s}.wav`); fs.writeFileSync(sw, Buffer.from(await pages[0].evaluate(([a, b]) => window.__film.audioWavBase64(a, b), [(s - 1) * 18, s * 18]), 'base64'));
    run(['-framerate', String(FPS), '-start_number', String((s - 1) * SEQ), '-i', path.join(dir, '%05d.jpg'), '-i', sw, '-frames:v', String(SEQ), ...enc, ...aenc, '-shortest', path.join(OUT, `seq${s}.mp4`)]); fs.rmSync(sw); console.log(`out/seq${s}.mp4`);
  }
  if (!arg('keep')) fs.rmSync(dir, { recursive: true, force: true });
}
fs.rmSync(wav, { force: true });
await Promise.all(browsers.map((b) => b.close())); await server.close();
