// render.js: exporta o filme quadro a quadro, de forma determinística (independe da velocidade da máquina).
//   node tools/render.js --at 3,8,12.5 [--tag nome]   quadros avulsos em out/stills/ (ou out/nome/)
//   node tools/render.js [--fps 60] [--from 0 --to 100] [--out out/video.mp4]   vídeo (sem áudio se --noaudio)
//   node tools/render.js --audio                   só a trilha, em out/audio.wav
// Precisa de: Node, Playwright (com Chromium) e ffmpeg no PATH.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.dirname(__dirname), a = process.argv.slice(2);
const opt = (k, d) => a.includes(k) ? a[a.indexOf(k) + 1] : d;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

(async () => {
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(p.endsWith(path.sep) ? p + 'index.html' : p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html?render=1`);
  try { await page.waitForFunction('window.READY === true || window.BOOT_ERROR', null, { timeout: 180000 }); } catch { /* cai no relatório abaixo */ }
  const bootErr = await page.evaluate('window.BOOT_ERROR || null');
  if (bootErr || !(await page.evaluate('window.READY === true'))) { console.log('a página não ficou pronta:', bootErr, errors.slice(0, 8).join('\n')); process.exit(1); }
  const total = await page.evaluate('window.TOTAL'), out = path.join(ROOT, 'out'); fs.mkdirSync(out, { recursive: true });
  const grab = async (t, q) => Buffer.from((await page.evaluate(([t, q]) => { window.seek(t); return window.frameJPEG(q); }, [t, q])).split(',')[1], 'base64');

  if (a.includes('--at')) {
    const dir = path.join(out, opt('--tag', 'stills')); fs.mkdirSync(dir, { recursive: true });
    for (const t of opt('--at').split(',').map(Number)) fs.writeFileSync(path.join(dir, `at_${t.toFixed(2).padStart(6, '0')}.jpg`), await grab(t, 0.9));
  } else if (a.includes('--audio')) {
    fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(await page.evaluate('window.audioWavBase64()'), 'base64')); console.log('out/audio.wav');
  } else {
    const fps = +opt('--fps', 60), k0 = Math.round(+opt('--from', 0) * fps), k1 = Math.round(Math.min(total, +opt('--to', total)) * fps), file = opt('--out', path.join(out, 'video.mp4'));
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', opt('--crf', '18'), '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let k = k0; k < k1; k++) {
      const buf = await grab(k / fps, 0.95); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((k - k0) % 120 === 0) console.log(`quadro ${k - k0}/${k1 - k0}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log(file);
  }
  if (errors.length) console.log('AVISOS DA PÁGINA:\n' + [...new Set(errors)].slice(0, 10).join('\n'));
  await browser.close(); srv.close();
})();
