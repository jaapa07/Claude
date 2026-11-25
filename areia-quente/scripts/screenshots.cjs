// Percorre as telas do jogo (build em dist/) no Chromium headless e salva screenshots em docs/screenshots/.
// Uso: npm run build && node scripts/screenshots.cjs [lista,de,cenas]
// Os arquivos são servidos direto do disco por interceptação de rotas (sem servidor HTTP).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'docs', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route('http://game.local/**', (route) => {
    const u = new URL(route.request().url());
    let f = path.join(DIST, decodeURIComponent(u.pathname));
    if (f.endsWith('/')) f += 'index.html';
    if (!f.startsWith(DIST) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: 'nf' });
    route.fulfill({ status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || 'application/octet-stream' });
  });
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('pageerror:', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors.push(m.text()); console.log('console.error:', m.text()); } });
  const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('shot', name); };
  const want = (n) => !only || only.includes(n);
  const G = (fn, arg) => page.evaluate(fn, arg);
  const waitScene = async (s, ms = 120000) => page.waitForFunction((s) => window.__game?.flow.scene === s, s, { timeout: ms });
  const waitState = async (s, ms = 120000) => page.waitForFunction((s) => window.__game?.flow.match?.state === s, s, { timeout: ms });

  await page.goto('http://game.local/index.html');
  if (want('boot')) { await sleep(400); await shot('01_boot'); }
  await waitScene('title');
  await sleep(1500);
  if (want('title')) await shot('02_title');
  await G(() => window.__game.flow.mainMenu());
  await sleep(2500);
  if (want('menu')) await shot('03_menu');
  if (want('ctrl')) { await G(() => window.__game.flow.controlSelect()); await sleep(800); await shot('04_controls'); }
  await G(() => { const f = window.__game.flow; f.setup.homeDevices = []; f.setup.awayDevices = []; f.teamSelect(false); });
  await sleep(2500);
  if (want('teams')) await shot('05_team_select');
  // partida 1: Copacabana, dia, CPU x CPU
  await G(() => { const f = window.__game.flow; f.tick = undefined; f.setup.arena = 'copacabana'; f.loading(); });
  await sleep(1200);
  if (want('loading')) await shot('06_loading');
  await waitScene('match');
  await G(() => (window.__game.speed = 5));
  await sleep(2000);
  if (want('intro')) await shot('07_intro_flyover');
  await sleep(4000);
  if (want('intro')) await shot('08_intro_warmup');
  await sleep(4500);
  if (want('intro')) await shot('09_intro_lineup');
  await waitState('kickoff');
  await sleep(1500);
  if (want('match')) await shot('10_kickoff');
  await waitState('play');
  await sleep(6000);
  if (want('match')) await shot('11_match_day');
  // força Modo Fogo
  await G(() => { const m = window.__game.flow.match; m.teams[0].heat = 1; m.activateFire(m.teams[0]); });
  await sleep(1500);
  if (want('fire')) await shot('12_fire_mode');
  // força um gol para ver comemoração e replay
  await G(() => { const m = window.__game.flow.match; const p = m.teams[0].players[4]; m.ball.owner = null; m.ball.place(14, 0, 1.2); p.pos.set(13, 0, 0.4); m.queueKick(p, 'volley', 0.9, null, null); });
  await page.waitForFunction(() => window.__game.flow.match.state === 'goal', null, { timeout: 15000 }).catch(() => console.log('sem gol forçado'));
  await sleep(1200);
  if (want('goal')) await shot('13_goal_celebration');
  await page.waitForFunction(() => window.__game.flow.match.state === 'replay', null, { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  if (want('replay')) await shot('14_replay');
  // intervalo
  await G(() => { const m = window.__game.flow.match; if (m.state === 'replay') { m.replay.playing = false; } m.state = 'play'; m.clock = m.periodLen - 0.5; });
  await waitState('halftime', 30000).catch(() => console.log('sem intervalo'));
  await sleep(3500);
  if (want('halftime')) await shot('15_halftime');
  // pausa
  await G(() => { const m = window.__game.flow.match; m.endHalftime(); });
  await sleep(2500);
  if (want('pause')) { await G(() => window.__game.flow.pause()); await sleep(600); await shot('16_pause'); await G(() => window.__game.flow.unpause()); }
  // fim de jogo
  await G(() => { const m = window.__game.flow.match; m.period = 3; m.state = 'play'; m.clock = m.periodLen - 0.3; });
  await page.waitForFunction(() => window.__game.flow.screen?.classList.contains('results') || document.querySelector('.results'), null, { timeout: 30000 }).catch(() => console.log('sem resultado'));
  await sleep(1500);
  if (want('results')) await shot('17_results');

  // partida 2: noite
  for (const [arena, name] of [['lagoa', '18_match_night'], ['dunas', '19_match_sunset']]) {
    if (!want('night') && name.includes('night')) continue;
    if (!want('sunset') && name.includes('sunset')) continue;
    await G((a) => { const f = window.__game.flow; f.endMatch(); f.setup.arena = a; f.setup.homeDevices = []; f.setup.awayDevices = []; f.setup.mode = 'friendly'; f.loading(); }, arena);
    await waitScene('match');
    await G(() => { const m = window.__game.flow.match; m.hud.cinema(false); m.hud.show(true); m.beginKickoff(m.kickoffTeam); });
    await waitState('play', 60000).catch(() => {});
    await sleep(5000);
    await shot(name);
  }
  // treino
  if (want('training')) {
    await G(() => { const f = window.__game.flow; f.endMatch(); f.setup.mode = 'training'; f.setup.arena = 'copacabana'; f.setup.homeDevices = ['kb']; f.startMatch(); });
    await sleep(3000);
    await G(() => window.__game.flow.match.trainerCross());
    await sleep(900);
    await shot('20_training');
  }
  // copa e troféu
  if (want('cup')) {
    await G(() => { const f = window.__game.flow; f.endMatch(); f.setup.home = f.setup.home; f.cupNew(); f.tick = undefined; f.cupStart(); });
    await sleep(2500);
    await shot('21_cup_bracket');
    await G(() => { const f = window.__game.flow; f.tick = undefined; f.cup.team = f.setup.home.id; f.trophyScene(); });
    await waitScene('trophy', 120000);
    await sleep(5000);
    await shot('22_trophy');
  }
  if (want('options')) { await G(() => { const f = window.__game.flow; f.tick = undefined; f.options(); }); await sleep(800); await shot('23_options'); }
  if (want('credits')) { await G(() => { const f = window.__game.flow; f.tick = undefined; f.credits(); }); await sleep(6000); await shot('24_credits'); }
  if (want('extras')) {
    await G(() => { const f = window.__game.flow; f.tick = undefined; f.challenges(); }); await waitScene('challenges'); await sleep(1500); await shot('25_challenges');
    await G(() => { const f = window.__game.flow; f.tick = undefined; f.achievements(); }); await waitScene('achievements'); await sleep(1500); await shot('26_achievements');
    for (const [k, name] of [['pk', '27_mini_penalties'], ['juggle', '28_mini_juggle'], ['target', '29_mini_target']]) {
      await G((k) => window.__game.flow.startMini(k), k);
      await page.waitForFunction(() => window.__game.flow.match?.mini && window.__game.flow.scene === 'match', null, { timeout: 120000 });
      await sleep(2500);
      if (k === 'juggle') { await G(() => { const m = window.__game.flow.match; m.doTrick(m.mini.me); }); await sleep(1200); }
      if (k === 'target') { await G(() => { const m = window.__game.flow.match; m.mini.shots = 5; }); await sleep(800); }
      await shot(name);
    }
    await G(() => window.__game.flow.mainMenu());
  }
  console.log('erros:', errors.length);
  fs.writeFileSync(path.join(OUT, 'errors.txt'), errors.join('\n'));
  await b.close();
})();
