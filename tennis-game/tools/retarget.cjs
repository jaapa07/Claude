const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://localhost:5173/tools/retarget.html');
  await p.waitForFunction(() => window.done === true);
  const jobs = JSON.parse(process.argv[2]);
  const clips = [];
  for (const j of jobs) { const s = await p.evaluate(([f, n, o]) => window.retarget(f, n, o), [j.file, j.name, j.opts || {}]); clips.push(JSON.parse(s)); console.log(j.name, s.length); }
  fs.writeFileSync(process.argv[3], JSON.stringify(clips));
  await b.close();
})();
