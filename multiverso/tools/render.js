// render.js: film page -> numbered JPEG frames, via headless Chromium. The page contract is
// window.READY, window.TOTAL, window.seek(t) and canvas#film (1080x1920). Every frame depends on t alone.
//   node tools/render.js 1 out/ep1/frames                    all frames of episode 1 at 30 fps
//   node tools/render.js 1 out/ep1/frames --from 0 --to 900  a slice (run slices in parallel)
//   node tools/render.js 1 out/stills --at 3,14.5             stills only (at_3.00.jpg ...)
//   node tools/render.js 1 out/ep1 --cues                     only dump LINES/SFX/MUSIC to cues.json
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.wav': 'audio/wav' };
(async () => {
  const a = process.argv.slice(2);
  const opt = (k, d) => a.includes(k) ? Number(a[a.indexOf(k) + 1]) : d;
  const ep = a[0], out = path.resolve(a[1]), fps = opt('--fps', 30), q = opt('--quality', 92);
  const at = a.includes('--at') ? a[a.indexOf('--at') + 1].split(',').map(Number) : null;
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(String(e.stack || e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/film.html?ep=${ep}&render=1`);
  try { await page.waitForFunction('window.READY === true', null, { timeout: 180000 }); }
  catch (e) { console.log('page never became READY: ' + errors.slice(0, 3).join(' | ')); process.exit(1); }
  if (a.includes('--cues')) {
    const cues = await page.evaluate('({total: window.TOTAL, lines: window.LINES, sfx: window.SFX, music: window.MUSIC})');
    fs.writeFileSync(path.join(out, 'cues.json'), JSON.stringify(cues, null, 1)); console.log('cues ->', path.join(out, 'cues.json'));
    await browser.close(); srv.close(); return;
  }
  const total = await page.evaluate('window.TOTAL'), nAll = Math.round(total * fps);
  const k0 = opt('--from', 0), k1 = Math.min(opt('--to', nAll), nAll);
  const times = at || Array.from({ length: Math.max(0, k1 - k0) }, (_, i) => (i + k0) / fps);
  const t0 = Date.now();
  for (let k = 0; k < times.length; k++) {
    const data = await page.evaluate(([t, q]) => { window.seek(t); return document.getElementById('film').toDataURL('image/jpeg', q); }, [times[k], q / 100]);
    const name = at ? `at_${times[k].toFixed(2)}.jpg` : `f${String(k + k0).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(out, name), Buffer.from(data.split(',', 2)[1], 'base64'));
    if (!at && k % 150 === 0) console.log(`ep${ep} frame ${k + k0} (${k}/${times.length}) ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  if (errors.length) console.log('PAGE ERRORS: ' + errors.slice(0, 5).join(' | '));
  await browser.close(); srv.close();
  console.log(`done: ${times.length} images in ${out} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
})();
