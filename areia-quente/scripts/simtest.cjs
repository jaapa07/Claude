// Teste de fumaça: partida CPU x CPU acelerada; registra placar/estado e falha se houver erros de página.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIST = path.resolve(__dirname, '..', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg' };
(async () => {
  const secs = +(process.argv[2] || 90), arena = process.argv[3] || 'copacabana';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  await p.route('http://game.local/**', (r) => { const f = path.join(DIST, decodeURIComponent(new URL(r.request().url()).pathname)); if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || 'application/octet-stream' }); });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://game.local/index.html');
  await p.waitForFunction(() => window.__game?.flow.scene === 'title', null, { timeout: 120000 });
  await p.evaluate((a) => { const f = window.__game.flow; f.setup.homeDevices = []; f.setup.awayDevices = []; f.setup.arena = a; f.setup.mode = 'friendly'; f.loading(); }, arena);
  await p.waitForFunction(() => window.__game?.flow.match, null, { timeout: 120000 });
  await p.evaluate(() => { window.__game.speed = 12; window.__goals = []; const m = window.__game.flow.match; m.onEvent = (e, pl, x) => { if (e === 'goal') window.__goals.push({ kind: x.kind, own: x.own, by: pl?.data.short, gk: pl ? +(m.teams.find((t) => t !== pl.team).gk.pos.x.toFixed(1)) : 0, from: m.lastKick ? +m.lastKick.by.pos.x.toFixed(1) : null }); if (e === 'save') window.__saves = (window.__saves || 0) + 1; }; });
  const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await p.evaluate(() => { const m = window.__game.flow.match; if (!m) return { scene: window.__game.flow.scene };
      return { st: m.state, per: m.period, clk: Math.round(m.clock), sc: `${m.teams[0].score}-${m.teams[1].score}`, sh: `${m.teams[0].shots}/${m.teams[1].shots}`, ball: m.ball.pos.toArray().map((v) => +v.toFixed(1)), own: m.ball.owner?.data.short ?? '-', held: m.ball.held, sty: `${m.teams[0].stylePts}/${m.teams[1].stylePts}` }; });
    console.log(JSON.stringify(s));
  }
  console.log('GOLS', JSON.stringify(await p.evaluate(() => window.__goals)), 'DEFESAS', await p.evaluate(() => window.__saves || 0));
  console.log('ERROS', errs.length, errs.slice(0, 5).join(' | '));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
