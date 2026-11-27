const { chromium } = require('playwright');
(async () => {
  const [url, out, w, h] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w || 1400, height: +h || 800 } });
  p.on('console', m => console.log('console:', m.text().slice(0, 600)));
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(url);
  await p.waitForFunction(() => window.done === true, null, { timeout: 120000 }).catch(e => console.log('timeout'));
  await p.screenshot({ path: out });
  await b.close();
})();
