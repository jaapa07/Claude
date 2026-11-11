// film.html -> nifi.mp4 (1080x1080, 60 fps, 26 s). A página expõe window.seek(t), window.TOTAL e window.CUES.
//   node render.js                 vídeo completo (quadros -> ffmpeg) + cues.json, depois: python3 sfx.py
//   node render.js --at 1.8,6.9    só estes instantes, como PNG em stills/
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');

(async () => {
  const a = process.argv.slice(2), FPS = 60, dir = __dirname;
  const at = a.includes('--at') ? a[a.indexOf('--at') + 1].split(',').map(Number) : null;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
  await page.goto('file://' + path.join(dir, 'film.html'));
  await page.waitForFunction('window.READY === true');
  const total = await page.evaluate('window.TOTAL');
  fs.writeFileSync(path.join(dir, 'cues.json'), JSON.stringify({ total, ...(await page.evaluate('window.CUES')) }));

  if (at) {
    fs.mkdirSync(path.join(dir, 'stills'), { recursive: true });
    for (const t of at) { await page.evaluate(t => window.seek(t), t); await page.screenshot({ path: path.join(dir, 'stills', `at_${t.toFixed(2)}.png`) }); }
  } else {
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', path.join(dir, 'silent.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(total * FPS), t0 = Date.now();
    for (let k = 0; k < n; k++) {
      await page.evaluate(t => window.seek(t), k / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 97 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (k % 240 === 0) console.log(`quadro ${k}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log('silent.mp4 pronto');
  }
  await browser.close();
})();
