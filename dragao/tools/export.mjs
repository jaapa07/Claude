// tools/export.mjs — deterministic frame-by-frame export with headless Chromium + ffmpeg.
//
//   node tools/export.mjs --ep 1                 # out/ep1.mp4  (1080x1920, 60 fps, AAC)
//   node tools/export.mjs --all                  # out/ep1..ep5.mp4 + out/o-dragao-que-tinha-medo-de-fogo.mp4
//   node tools/export.mjs --ep 2 --fps 30 --scale 0.5     # quicker draft
//   node tools/export.mjs --stills 1:0,1:5.5,2:0 --scale 0.5   # PNG/JPEG stills into out/stills
//   node tools/export.mjs --ep 1 --workers 3     # split the frames across parallel browsers
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally or via npm i playwright
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'out');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const FPS = Number(arg('fps', 60)), SCALE = Number(arg('scale', 1)), WORKERS = Number(arg('workers', 2)), Q = Number(arg('quality', 0.93));
const CRF = String(arg('crf', 18));
fs.mkdirSync(OUT, { recursive: true });

// static server on a free port
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const URL0 = `http://127.0.0.1:${server.address().port}/index.html?render=1&scale=${SCALE}`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 600, height: 1000 } });
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(URL0);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 0, polling: 500 });
  const err = await page.evaluate(() => window.__error); if (err) throw new Error(err);
  return page;
}
const grab = (page, T) => page.evaluate(([T, q]) => { window.__render.frame(T); return document.getElementById('view').toDataURL('image/jpeg', q).split(',')[1]; }, [T, Q]);

function ffmpeg(args) {
  const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  p.done = new Promise((res, rej) => p.on('close', (c) => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  return p;
}

async function renderSegment(T0, nFrames, file, label) {
  const page = await openPage();
  const ff = ffmpeg(['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p', '-r', String(FPS), file]);
  const t0 = Date.now();
  for (let f = 0; f < nFrames; f++) {
    const b64 = await grab(page, T0 + f / FPS);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 30 === 0) process.stdout.write(`\r${label} ${f}/${nFrames} (${((Date.now() - t0) / (f + 1)).toFixed(0)} ms/quadro)   `);
  }
  ff.stdin.end(); await ff.done; await page.close();
}

async function exportRange(T0, T1, name, audioEp) {
  const n = Math.round((T1 - T0) * FPS), per = Math.ceil(n / WORKERS), parts = [];
  const tmp = path.join(OUT, 'tmp'); fs.mkdirSync(tmp, { recursive: true });
  await Promise.all([...Array(WORKERS)].map(async (_, w) => {
    const a = w * per, k = Math.min(per, n - a); if (k <= 0) return;
    const f = path.join(tmp, `${name}.part${w}.mp4`); parts[w] = f;
    await renderSegment(T0 + a / FPS, k, f, `${name}[${w}]`);
  }));
  // audio straight from the page's OfflineAudioContext mix
  const page = await openPage();
  const wav = await page.evaluate((ep) => { const u8 = window.__render.wav(ep); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }, audioEp);
  await page.close();
  const wavFile = path.join(tmp, `${name}.wav`); fs.writeFileSync(wavFile, Buffer.from(wav, 'base64'));
  const list = path.join(tmp, `${name}.txt`); fs.writeFileSync(list, parts.filter(Boolean).map((p) => `file '${p}'`).join('\n'));
  const out = path.join(OUT, `${name}.mp4`);
  const ff = ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-ss', String(audioEp == null ? T0 : T0 - audioEp * 20), '-i', wavFile, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  ff.stdin.end(); await ff.done;
  console.log(`\n✔ ${path.relative(ROOT, out)}`);
  return out;
}

try {
  if (arg('stills')) {
    const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
    const page = await openPage();
    for (const s of String(arg('stills')).split(',')) {
      const [ep, t] = s.split(':').map(Number); const T = (ep - 1) * 20 + t;
      fs.writeFileSync(path.join(dir, `ep${ep}_${t.toFixed(2)}.jpg`), Buffer.from(await grab(page, T), 'base64'));
      console.log('still', ep, t);
    }
  } else if (arg('all')) {
    const files = [];
    for (let e = 1; e <= 5; e++) files.push(await exportRange((e - 1) * 20, e * 20, `ep${e}`, e - 1));
    const list = path.join(OUT, 'tmp', 'all.txt'); fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
    const ff = ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(OUT, 'o-dragao-que-tinha-medo-de-fogo.mp4')]); ff.stdin.end(); await ff.done;
    console.log('✔ out/o-dragao-que-tinha-medo-de-fogo.mp4');
  } else {
    const e = Number(arg('ep', 1));
    const from = Number(arg('from', 0)), to = Number(arg('to', 20));
    await exportRange((e - 1) * 20 + from, (e - 1) * 20 + to, arg('name', `ep${e}`), e - 1);
  }
} finally { await browser.close(); server.close(); }
