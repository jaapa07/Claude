// Drives the real game in headless Chromium: boot, title, menus, start an exhibition, play, screenshot.
const { chromium, devices } = require('playwright');
(async () => {
  const [url, outDir, steps] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const dev = process.env.DEVICE ? devices[process.env.DEVICE] : null;
  const ctx = await b.newContext(dev ? { ...dev, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!/GPU stall|GL Driver/.test(t)) errs.push(t.slice(0, 300)); } });
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(url);
  const t0 = Date.now();
  await p.waitForSelector('.title', { timeout: 240000 }).catch(() => errs.push('no title'));
  console.log('boot ms', Date.now() - t0);
  let n = 0;
  const shot = async (name) => { await p.screenshot({ path: `${outDir}/${String(n++).padStart(2, '0')}_${name}.png` }); };
  for (const s of (steps || '').split('|').filter(Boolean)) {
    const k = s.indexOf(':');
    const cmd = k < 0 ? s : s.slice(0, k), arg = k < 0 ? '' : s.slice(k + 1);
    if (cmd === 'shot') await shot(arg);
    else if (cmd === 'key') await p.keyboard.press(arg);
    else if (cmd === 'down') await p.keyboard.down(arg);
    else if (cmd === 'up') await p.keyboard.up(arg);
    else if (cmd === 'tap') { const [x, y] = arg.split(',').map(Number); await p.touchscreen.tap(x, y); }
    else if (cmd === 'tapsel') { await p.locator(arg).first().tap({ timeout: 20000, force: true }).catch((e) => errs.push('tap ' + e.message.slice(0, 100))); }
    else if (cmd === 'wait') await p.waitForTimeout(+arg);
    else if (cmd === 'eval') console.log('eval', await p.evaluate(arg).catch((e) => 'EVAL ERROR ' + e.message));
    else if (cmd === 'evalfile') console.log('eval', await p.evaluate(require('fs').readFileSync(arg, 'utf8')).catch((e) => 'EVAL ERROR ' + e.message));
  }
  console.log('errors:', errs.slice(0, 20).join('\n'));
  await b.close();
})();
