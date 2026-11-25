// Teste de controle humano: simula teclado no Chromium e verifica que as ações têm efeito na partida.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIST = path.resolve(__dirname, '..', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  await p.route('http://game.local/**', (r) => { const f = path.join(DIST, decodeURIComponent(new URL(r.request().url()).pathname)); if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || 'application/octet-stream' }); });
  const errs = []; p.on('pageerror', (e) => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await p.goto('http://game.local/index.html');
  await p.waitForFunction(() => window.__game?.flow.scene === 'title', null, { timeout: 120000 });
  // navegação real pelos menus com o teclado
  const scene = () => p.evaluate(() => window.__game.flow.scene);
  const until = (sc) => p.waitForFunction((sc) => window.__game.flow.scene === sc && !window.__game.flow.busy, sc, { timeout: 60000 });
  await p.keyboard.press('Enter'); await until('menu'); console.log('ENTER no título ->', await scene());
  await p.keyboard.press('Enter'); await until('ctrl'); console.log('ENTER em Amistoso ->', await scene());
  await p.keyboard.press('Enter'); await until('teams'); console.log('ENTER nos controles ->', await scene());
  await sleep(500);
  await p.keyboard.press('ArrowRight'); await sleep(1500);
  console.log('time da casa após →:', await p.evaluate(() => window.__game.flow.setup.home.id));
  await p.keyboard.press('Enter');
  for (let i = 0; i < 30; i++) { await sleep(4000); const sc = await scene(); console.log('...', sc); if (sc === 'match') break; }
  await p.waitForFunction(() => window.__game?.flow.match, null, { timeout: 120000 });
  // pula a intro com START (Enter)
  await sleep(1500); await p.keyboard.press('Enter');
  await p.waitForFunction(() => ['kickoff', 'play'].includes(window.__game.flow.match.state), null, { timeout: 60000 });
  const S = () => p.evaluate(() => { const m = window.__game.flow.match; const me = m.all.find((x) => x.device); return { st: m.state, me: me?.data.short, pos: me && me.pos.toArray().map((v) => +v.toFixed(1)), owner: m.ball.owner?.data.short ?? '-', shots: m.teams[0].shots, style: m.teams[0].stylePts, fire: m.teams[0].fire > 0, paused: m.paused }; });
  console.log('início', JSON.stringify(await S()));
  await p.keyboard.press('KeyJ'); await sleep(2500); // saída de bola: passe
  console.log('após passe (J)', JSON.stringify(await S()));
  await p.keyboard.down('KeyD'); await p.keyboard.down('ShiftLeft'); await sleep(3000); await p.keyboard.up('ShiftLeft'); await p.keyboard.up('KeyD');
  console.log('após correr (D+Shift)', JSON.stringify(await S()));
  // garante a bola com o jogador controlado e testa firula, chute e Modo Fogo
  await p.evaluate(() => { const m = window.__game.flow.match; const me = m.all.find((x) => x.device); m.ball.owner = null; m.ball.place(me.pos.x + 0.5, me.pos.z); m.takeBall(me); m.teams[0].heat = 1; });
  await sleep(300);
  await p.keyboard.press('KeyE'); await sleep(500);
  console.log('após Modo Fogo (E)', JSON.stringify(await S()));
  await p.keyboard.press('KeyI'); await p.waitForFunction(() => window.__game.flow.match.teams[0].stylePts > 5 || window.__game.flow.match.pendingSombrero, null, { timeout: 20000 }).catch(() => console.log('firula sem efeito'));
  console.log('após firula (I)', JSON.stringify(await S()));
  await p.evaluate(() => { const m = window.__game.flow.match; const me = m.all.find((x) => x.device); m.ball.owner = null; m.ball.place(me.pos.x + 0.5, me.pos.z); m.takeBall(me); });
  await p.keyboard.down('KeyK'); await sleep(700); await p.keyboard.up('KeyK'); await sleep(1500);
  console.log('após chute (K segurado)', JSON.stringify(await S()));
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => window.__game.flow.match.paused, null, { timeout: 20000 }).catch(() => console.log('pausa não detectada'));
  console.log('após ESC', JSON.stringify(await S()), 'tela:', await p.evaluate(() => document.querySelector('.overlay h1')?.textContent));
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !window.__game.flow.match.paused, null, { timeout: 20000 }).catch(() => console.log('não despausou'));
  console.log('após Continuar', JSON.stringify(await S()));
  console.log('ERROS', errs.length, errs.slice(0, 3));
  await b.close();
})();
