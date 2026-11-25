// Biblioteca do QA ponta a ponta: abre o build (dist/) no Chromium headless servindo os arquivos do disco,
// injeta um monitor de invariantes no jogo e oferece utilitários de espera/teclado/gamepad falso.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIST = path.join(ROOT, 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Monitor rodado dentro da página a cada quadro: registra anomalias com deduplicação. */
function monitorSource() {
  const qa = (window.__qa = { anomalies: [], seen: new Set(), frames: 0, stateT: 0, lastState: '', deadT: 0, maxObjs: 0 });
  const add = (k, d) => { if (qa.seen.has(k)) return; qa.seen.add(k); qa.anomalies.push({ k, d, t: performance.now() }); };
  const fin = (v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
  const tick = () => {
    const g = window.__game;
    if (g) {
      qa.frames++;
      const m = g.flow.match;
      let n = 0; g.world.root.traverse(() => n++); qa.maxObjs = Math.max(qa.maxObjs, n);
      if (m && !m.paused) {
        const b = m.ball;
        if (!fin(b.pos) || !fin(b.vel)) add('ball-nan', 'posição/velocidade da bola inválida');
        if (Math.abs(b.pos.x) > 40 || Math.abs(b.pos.z) > 30 || b.pos.y > 80 || b.pos.y < -1) add('ball-oob', `bola fora do mundo ${b.pos.toArray().map((v) => v.toFixed(1))} estado=${m.state}`);
        for (const p of m.all) {
          if (!p.onField) continue;
          if (!fin(p.pos)) add('player-nan:' + p.data.id, 'jogador com posição inválida');
          if (Math.abs(p.pos.x) > 21 || Math.abs(p.pos.z) > 17) add('player-oob:' + p.data.id, `${p.data.short} fora da área ${p.pos.x.toFixed(1)},${p.pos.z.toFixed(1)}`);
          if (p.stun > 6) add('stun-long:' + p.data.id, `${p.data.short} atordoado por ${p.stun.toFixed(1)}s`);
        }
        if (b.owner && !b.owner.onField) add('owner-offfield', 'dono da bola fora de campo');
        if (b.owner && !b.held && b.owner.pos.distanceTo(b.pos) > 3) add('owner-far', `bola longe do dono (${b.owner.pos.distanceTo(b.pos).toFixed(1)} m) estado=${m.state}`);
        for (const tm of m.teams) {
          const devs = tm.players.filter((p) => p.device).map((p) => p.device);
          if (new Set(devs).size !== devs.length) add('dup-device', 'mesmo controle em dois jogadores');
          if (tm.human && m.state === 'play' && devs.length === 0 && m.opts.mode !== 'training') add('no-control:' + tm.id, 'time humano sem jogador controlado');
        }
        // estados presos
        if (m.state !== qa.lastState) { qa.lastState = m.state; qa.stateT = 0; }
        qa.stateT += 1 / 60 * (g.speed || 1);
        const limits = { kickoff: 25, setpiece: 25, goal: 15, replay: 20, periodEnd: 10, penalties: 25, fulltime: 30, intro: 40, halftime: 40 };
        if (limits[m.state] && m.stateT > limits[m.state] && !m.teams.some((t) => t.human)) add('stuck:' + m.state, `estado ${m.state} preso há ${m.stateT.toFixed(0)}s`);
        // bola morta: parada, sem dono, em jogo, por muito tempo
        if (m.state === 'play' && !b.owner && b.speed < 0.3 && m.opts.mode !== 'training') { qa.deadT += 1 / 60 * (g.speed || 1); if (qa.deadT > 10) add('dead-ball', `bola parada e sem dono por ${qa.deadT.toFixed(0)}s em ${b.pos.toArray().map((v) => v.toFixed(1))}`); }
        else qa.deadT = 0;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function open(opts = {}) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: opts.w || 800, height: opts.h || 450 } });
  const page = await ctx.newPage();
  await page.route('http://game.local/**', (r) => {
    const f = path.join(DIST, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || 'application/octet-stream' });
  });
  if (opts.gamepads) {
    // gamepads falsos controláveis pelo teste: window.__pads[i] = { axes:[x,y], buttons:{idx:true} }
    await page.addInitScript((n) => {
      window.__pads = [...Array(n)].map(() => ({ axes: [0, 0, 0, 0], buttons: {} }));
      navigator.getGamepads = () => window.__pads.map((p, i) => ({ id: 'QA Pad ' + i, index: i, connected: true, mapping: 'standard', timestamp: performance.now(),
        axes: p.axes, buttons: [...Array(17)].map((_, k) => ({ pressed: !!p.buttons[k], value: p.buttons[k] ? 1 : 0, touched: !!p.buttons[k] })) }));
    }, opts.gamepads);
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(monitorSource);
  await page.goto('http://game.local/index.html' + (opts.query || ''));
  await page.waitForFunction(() => window.__game?.flow.scene === 'title', null, { timeout: 180000 });
  const api = {
    page, errors, browser: b,
    ev: (fn, arg) => page.evaluate(fn, arg),
    scene: () => page.evaluate(() => window.__game.flow.scene),
    waitScene: (s, ms = 90000) => page.waitForFunction((s) => window.__game.flow.scene === s && !window.__game.flow.busy, s, { timeout: ms }),
    waitFor: (fn, arg, ms = 60000) => page.waitForFunction(fn, arg, { timeout: ms }),
    key: async (k, hold = 0) => { if (hold) { await page.keyboard.down(k); await sleep(hold); await page.keyboard.up(k); } else await page.keyboard.press(k); },
    pad: (i, axes, buttons) => page.evaluate(([i, a, bt]) => { if (a) window.__pads[i].axes = a; if (bt) window.__pads[i].buttons = bt; }, [i, axes, buttons]),
    anomalies: () => page.evaluate(() => window.__qa.anomalies),
    clearAnomalies: () => page.evaluate(() => { window.__qa.anomalies = []; window.__qa.seen = new Set(); }),
    speed: (s) => page.evaluate((s) => (window.__game.speed = s), s),
    shot: (name) => page.screenshot({ path: path.join(ROOT, 'docs', 'qa', name + '.png') }),
    close: () => b.close(),
  };
  return api;
}

module.exports = { open, sleep, ROOT };
