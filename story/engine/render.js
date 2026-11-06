// render.js: the Node twin of render.py (this machine has Playwright for Node, not for Python).
// film page -> numbered JPEG frames. Same page contract: window.READY, window.TOTAL, window.seek(t), canvas#film 1080x1920.
//   node engine/render.js part1/film.html part1/frames             every frame at 30 fps (f00000.jpg ...)
//   node engine/render.js part1/film.html part1/stills --at 0,3.5   only these moments (at_0.00.jpg ...)
//   node engine/render.js "part1/film.html#cover" part1/cover       the page's cover mode, one still
//   options: --fps 30 --quality 90 --from N --to M --force
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const FUNC = new Set(("a an the to of at for from with by into onto under about after before until behind through and or but nor so if as than that this these those is are was were be been it its it's i i'm you you're they're he she we they me him her us them my your his our their who which what when where while because " +
  "o os as um uma uns umas de do da dos das em no na nos nas num numa pra pro pras pros para por pelo pela pelos pelas com sem e ou mas nem que se seu sua seus suas meu minha meus minhas teu tua nosso nossa ao aos à às lhe me te não já até sobre entre quando onde como porque mais muito").split(' '));
const PART = new Set('in on up off out down back away over'.split(' '));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css' };

(async () => {
  const a = process.argv.slice(2);
  if (a.length < 2) { console.log('usage: node engine/render.js PAGE OUT [--at t1,t2] [--from N --to M]'); process.exit(1); }
  const opt = (k, d) => a.includes(k) ? Number(a[a.indexOf(k) + 1]) : d;
  const fps = opt('--fps', 30), q = opt('--quality', 90);
  const [pagePath, frag] = a[0].split('#'); const out = a[1];
  let at = a.includes('--at') ? a[a.indexOf('--at') + 1].split(',').map(Number) : (frag ? [0] : null);
  const abs = path.resolve(pagePath); let root = path.dirname(abs);
  while (!fs.existsSync(path.join(root, 'engine')) && path.dirname(root) !== root) root = path.dirname(root);
  const rel = path.relative(root, abs).split(path.sep).join('/');
  const srv = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
    fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}/${rel}` + (frag ? '#' + frag : '');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  try { await page.waitForFunction('window.READY === true', null, { timeout: 180000 }); }
  catch (e) { console.log('the page never set window.READY = true. Page errors: ' + errors.slice(0, 3).join(' | ')); process.exit(1); }
  const total = await page.evaluate('window.TOTAL');
  const chunks = await page.evaluate('(window.CHUNKS || []).map(c => (c.words || []).map(w => String(w.w || w)))');
  const strip = s => s.toLowerCase().replace(/^[.,!?;:"'…]+|[.,!?;:"'…]+$/g, '');
  const bad = chunks.filter(c => c.length && (FUNC.has(strip(c[c.length - 1])) || (c.length === 1 && PART.has(c[0].toLowerCase())))).map(c => c.join(' '));
  if (!chunks.length) console.log("CAPTION CHECK: the page has no window.CHUNKS");
  else if (bad.length && at === null && !a.includes('--force')) { console.log('CAPTION CHUNK FAIL: ' + bad.slice(0, 10).join(' | ')); process.exit(1); }
  else console.log(`caption chunks: ${chunks.length}, ${bad.length} ending on a function word${bad.length ? ': ' + bad.join(' | ') : ''}`);
  const nAll = Math.round(total * fps), k0 = opt('--from', 0), k1 = opt('--to', nAll);
  const times = at !== null ? at : Array.from({ length: Math.max(0, Math.min(k1, nAll) - k0) }, (_, i) => (i + k0) / fps);
  console.log(`page ready, TOTAL = ${total.toFixed(2)} s, ${times.length} images`);
  const t0 = Date.now();
  for (let k = 0; k < times.length; k++) {
    const t = times[k];
    const data = await page.evaluate(([t, q]) => { window.seek(t); return document.getElementById('film').toDataURL('image/jpeg', q); }, [t, q / 100]);
    const name = at !== null ? `at_${t.toFixed(2)}.jpg` : `f${String(k + k0).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(out, name), Buffer.from(data.split(',', 2)[1], 'base64'));
    if (at === null && k % 150 === 0) console.log(`frame ${k}/${times.length}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  if (errors.length) console.log('PAGE ERRORS: ' + errors.slice(0, 5).join(' | '));
  await browser.close(); srv.close();
  console.log(`done: ${times.length} images in ${out} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
})();
