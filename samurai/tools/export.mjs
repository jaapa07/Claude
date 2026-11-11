// Exportação determinística para MP4 (1080×1920, 60 fps, H.264 + AAC).
//   node tools/export.mjs                 → os 5 episódios
//   node tools/export.mjs --ep 2          → só o episódio 2
//   node tools/export.mjs --series        → também junta tudo em out/serie-completa.mp4
//   node tools/export.mjs --audio          → refaz só o áudio dos MP4 existentes (sem re-renderizar o vídeo)
//   opções: --workers 4  --scale 1  --crf 17  --from 0 --to 1200 (faixa de frames)  --keep (mantém os JPEG)
// Cada frame é desenhado a partir de t = frame/60, sem depender do frame anterior; por isso vários
// navegadores renderizam faixas diferentes em paralelo e o resultado é idêntico ao de um só.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../server.mjs';

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { console.error('Playwright não encontrado. Instale com: npm i -D playwright && npx playwright install chromium'); process.exit(1); }
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[i + 1]); };
const has = (bin) => spawnSync(bin, ['-version']).status === 0;
if (!has('ffmpeg')) { console.error('ffmpeg não encontrado no PATH: os frames podem ser gerados, mas não o MP4.'); process.exit(1); }

const eps = arg('ep') ? String(arg('ep')).split(',').map(Number) : [1, 2, 3, 4, 5];
const workers = arg('audio') ? 1 : Number(arg('workers', 4)), scale = Number(arg('scale', 1)), crf = String(arg('crf', 17));
const OUT = path.join(ROOT, 'out'); fs.mkdirSync(OUT, { recursive: true });
const port = 5180 + Math.floor(Math.random() * 400), server = await startServer(port);
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'];
const browsers = [];                                                // um navegador (e um processo de GPU) por trabalhador

async function openPage() {
  const browser = await chromium.launch({ args: arg('gpu') ? [] : GL }); browsers.push(browser);
  const page = await browser.newPage({ viewport: { width: Math.round(1080 * scale), height: Math.round(1920 * scale) }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('[erro na página]', e.message); process.exit(1); });
  await page.goto(`http://localhost:${port}/?render=1&scale=${scale}`);
  await page.waitForFunction(() => window.__sam?.ready, null, { timeout: 180000 });
  if (scale !== 1) await page.evaluate((s) => { document.getElementById('stage').style.transform = `scale(${s})`; }, scale);
  return page;
}
const pages = await Promise.all([...Array(workers)].map(openPage));
const info = await pages[0].evaluate(() => ({ frames: window.__sam.frames, fps: window.__sam.fps, episodes: window.__sam.episodes }));
const made = [];
for (const ep of eps.filter((e) => e <= info.episodes)) {
  if (arg('audio')) {                                                 // refaz só a trilha de um MP4 já renderizado
    const wav = path.join(OUT, `ep${ep}.wav`), mp4 = path.join(OUT, `ep${ep}.mp4`), tmp = path.join(OUT, `ep${ep}.tmp.mp4`);
    fs.writeFileSync(wav, Buffer.from(await pages[0].evaluate((e) => window.__sam.audioWavBase64(e), ep), 'base64'));
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(1);
    fs.renameSync(tmp, mp4); fs.rmSync(wav); console.log(`ep${ep}: áudio refeito em ${mp4}`); continue;
  }
  const dir = path.join(OUT, 'frames', `ep${ep}`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const from = Number(arg('from', 0)), to = Number(arg('to', info.frames)), t0 = Date.now(); let done = 0;
  const wav = path.join(OUT, `ep${ep}.wav`);
  fs.writeFileSync(wav, Buffer.from(await pages[0].evaluate((e) => window.__sam.audioWavBase64(e), ep), 'base64'));
  let next = from;                                                    // fila compartilhada: cada navegador pega o próximo frame livre
  await Promise.all(pages.map(async (page) => {
    for (;;) { const f = next++; if (f >= to) return;
      await page.evaluate(([e, n]) => window.__sam.renderFrame(e, n), [ep, f]);
      await page.screenshot({ path: path.join(dir, String(f - from).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 96 });
      if (++done % 60 === 0) process.stdout.write(`\rep${ep}: ${done}/${to - from} frames · ${(done / ((Date.now() - t0) / 1000)).toFixed(1)} fps de render   `);
    }
  }));
  const mp4 = path.join(OUT, `ep${ep}.mp4`);
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(info.fps), '-i', path.join(dir, '%05d.jpg'), '-ss', String(from / info.fps), '-i', wav,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(info.fps), '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
  if (!arg('keep')) fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(wav, { force: true });
  console.log(`\nep${ep}: ${mp4} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); made.push(mp4);
}
await Promise.all(browsers.map((b) => b.close())); server.close();
if (arg('series')) {
  const all = [1, 2, 3, 4, 5].map((e) => path.join(OUT, `ep${e}.mp4`)).filter((f) => fs.existsSync(f)), list = path.join(OUT, 'serie.txt');
  fs.writeFileSync(list, all.map((f) => `file '${f}'`).join('\n'));
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(OUT, 'serie-completa.mp4')], { stdio: 'inherit' });
  fs.rmSync(list); console.log('série completa:', path.join(OUT, 'serie-completa.mp4'));
}
