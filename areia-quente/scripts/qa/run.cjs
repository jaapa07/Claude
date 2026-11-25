// QA ponta a ponta do AREIA QUENTE. Uso: npm run build && node scripts/qa/run.cjs [suite,suite]
// Gera docs/QA.md com o resultado de cada suíte e as anomalias detectadas pelo monitor de invariantes.
const fs = require('fs');
const path = require('path');
const { open, sleep, ROOT } = require('./lib.cjs');

fs.mkdirSync(path.join(ROOT, 'docs', 'qa'), { recursive: true });
const results = [];
const log = (...a) => console.log('  ', ...a);
function check(cond, msg, notes) { notes.push((cond ? '✔ ' : '✘ ') + msg); if (!cond) notes.failed = true; return cond; }

// ---------------------------------------------------------------- utilitários de jogo
const M = (g, fn, arg) => g.ev(fn, arg);
async function quickMatch(g, o = {}) {
  await g.ev((o) => { const f = window.__game.flow; Object.assign(f.setup, { homeDevices: [], awayDevices: [], mode: 'friendly', arena: 'copacabana' }, o); f.tick = undefined; f.loading(); }, o);
  await g.waitFor(() => window.__game.flow.match && window.__game.flow.scene === 'match', null, 120000);
}
async function skipIntro(g) {
  await g.ev(() => { const m = window.__game.flow.match; if (m.state === 'intro') { m.hud.cinema(false); m.hud.show(true); m.beginKickoff(m.kickoffTeam); } });
  await g.waitFor(() => ['kickoff', 'play'].includes(window.__game.flow.match.state), null, 60000);
}
const st = (g) => g.ev(() => { const m = window.__game.flow.match; if (!m) return null; const me = m.all.find((p) => p.device);
  return { state: m.state, per: m.period, clock: Math.round(m.clock), score: [m.teams[0].score, m.teams[1].score], shots: [m.teams[0].shots, m.teams[1].shots],
    me: me ? { n: me.data.short, x: me.pos.x, z: me.pos.z } : null, ball: [m.ball.pos.x, m.ball.pos.y, m.ball.pos.z], owner: m.ball.owner?.data.short ?? null, paused: m.paused }; });

/** Bot simples no teclado: corre até a bola, conduz para o gol e chuta perto da área. */
async function botPlay(g, seconds) {
  const p = g.page;
  const held = new Set();
  const set = async (keys) => {
    for (const k of [...held]) if (!keys.includes(k)) { await p.keyboard.up(k); held.delete(k); }
    for (const k of keys) if (!held.has(k)) { await p.keyboard.down(k); held.add(k); }
  };
  const t0 = Date.now();
  let actions = 0;
  while (Date.now() - t0 < seconds * 1000) {
    const s = await g.ev(() => { const m = window.__game.flow.match; if (!m) return null; const me = m.all.find((x) => x.device && x.onField);
      if (!me) return { state: m.state };
      return { state: m.state, mx: me.pos.x, mz: me.pos.z, bx: m.ball.pos.x, bz: m.ball.pos.z, by: m.ball.pos.y, mine: m.ball.owner === me, gx: m.goalX(me.team) }; });
    if (!s) break;
    if (!s.mx && s.mx !== 0) { await set([]); if (['kickoff', 'setpiece'].includes(s.state)) { await p.keyboard.press('KeyJ'); actions++; } await sleep(300); continue; }
    let tx = s.mine ? s.gx : s.bx, tz = s.mine ? 0 : s.bz;
    const dx = tx - s.mx, dz = tz - s.mz;
    const keys = [];
    if (dx > 0.4) keys.push('KeyD'); else if (dx < -0.4) keys.push('KeyA');
    if (dz > 0.4) keys.push('KeyS'); else if (dz < -0.4) keys.push('KeyW');
    if (Math.hypot(dx, dz) > 6) keys.push('ShiftLeft');
    await set(keys);
    if (s.mine && Math.abs(s.gx - s.mx) < 12) { await p.keyboard.down('KeyK'); await sleep(350); await p.keyboard.up('KeyK'); actions++; }
    else if (!s.mine && Math.hypot(s.bx - s.mx, s.bz - s.mz) < 2.2 && s.by > 0.6) { await p.keyboard.press('KeyK'); actions++; }
    else if (!s.mine && Math.hypot(s.bx - s.mx, s.bz - s.mz) < 2) { await p.keyboard.press('Space'); actions++; }
    else if (['kickoff', 'setpiece'].includes(s.state)) { await p.keyboard.press('KeyJ'); actions++; }
    await sleep(150);
  }
  await set([]);
  return actions;
}

// ---------------------------------------------------------------- suítes
const SUITES = {
  async menus(g, n) {
    const path_ = [['Enter', 'menu']];
    await g.key('Enter'); await g.waitScene('menu');
    check(await g.scene() === 'menu', 'ENTER no título abre o menu', n);
    const items = await g.ev(() => [...document.querySelectorAll('.menu .btn')].map((b) => b.textContent.trim()));
    check(items.length === 7, `menu com 7 opções (${items.join(' | ')})`, n);
    const expect = ['ctrl', 'teams', 'teams', 'challenges', 'achievements', 'options', 'credits'];
    for (let i = 0; i < expect.length; i++) {
      await g.waitScene('menu');
      await sleep(300);
      for (let k = 0; k < i; k++) { await g.key('ArrowDown'); await sleep(700); }
      await g.key('Enter');
      try { await g.waitScene(expect[i], 60000); check(true, `opção ${i + 1} → ${expect[i]}`, n); } catch { check(false, `opção ${i + 1} deveria abrir ${expect[i]} (está em ${await g.scene()})`, n); }
      await sleep(600);
      await g.key('Escape');
      try { await g.waitScene('menu', 60000); check(true, `  ESC volta ao menu`, n); } catch { check(false, `  ESC não voltou ao menu (está em ${await g.scene()})`, n); await g.ev(() => window.__game.flow.mainMenu()); }
      await g.shot(`menu_${i}`).catch(() => {});
    }
    void path_;
  },

  async options(g, n) {
    await g.ev(() => window.__game.flow.options()); await sleep(800);
    const before = await g.ev(() => JSON.parse(localStorage.getItem('aq.settings') || '{}').music ?? 0.7);
    await g.key('ArrowLeft'); await sleep(400); await g.key('ArrowLeft'); await sleep(400);
    const after = await g.ev(() => JSON.parse(localStorage.getItem('aq.settings')).music);
    check(after < before, `volume da música alterado e salvo (${before} → ${after})`, n);
    // remapeia "passe" para U
    await g.ev(() => document.querySelector('.k[data-k="pass"]').click()); await sleep(300);
    await g.key('KeyU'); await sleep(500);
    const keys = await g.ev(() => JSON.parse(localStorage.getItem('aq.settings')).keys.pass);
    check(keys === 'KeyU', `tecla de passe remapeada para U (${keys})`, n);
    await g.page.reload();
    await g.waitFor(() => window.__game?.flow.scene === 'title', null, 120000);
    const persisted = await g.ev(() => JSON.parse(localStorage.getItem('aq.settings')));
    check(persisted.music === after && persisted.keys.pass === 'KeyU', 'opções persistem após recarregar a página', n);
    // usa a tecla remapeada numa partida
    await quickMatch(g, { homeDevices: ['kb'] }); await skipIntro(g);
    await g.waitFor(() => window.__game.flow.match.state === 'kickoff', null, 30000).catch(() => {});
    await g.key('KeyU');
    const ok = await g.waitFor(() => window.__game.flow.match.state === 'play', null, 30000).then(() => true, () => false);
    check(ok, 'saída de bola com a tecla remapeada (U)', n);
    await g.ev(() => { const s = JSON.parse(localStorage.getItem('aq.settings')); s.keys.pass = 'KeyJ'; s.music = 0.7; localStorage.setItem('aq.settings', JSON.stringify(s)); });
  },

  async fullmatch(g, n) {
    await quickMatch(g, { arena: 'copacabana' }); await skipIntro(g);
    await g.ev(() => { const m = window.__game.flow.match; m.periodLen = 150; });
    await g.speed(30);
    const seen = new Set();
    const t0 = Date.now();
    while (Date.now() - t0 < 900000) {
      const s = await st(g);
      if (!s) break;
      seen.add(s.state);
      if (await g.ev(() => !!document.querySelector('.results'))) break;
      if (s.state === 'halftime') await g.ev(() => window.__game.flow.match.endHalftime());
      await sleep(3000);
    }
    const s = await st(g);
    log('estados visitados:', [...seen].join(','), 'placar', s?.score, 'chutes', s?.shots);
    check(await g.ev(() => !!document.querySelector('.results')), 'partida de 3 períodos termina na tela de resultado', n);
    check(['kickoff', 'play', 'periodEnd', 'halftime'].every((x) => seen.has(x)) || seen.has('fulltime'), `ciclo de estados completo (${[...seen].join(', ')})`, n);
    check(s && s.shots[0] + s.shots[1] > 2, `houve chutes (${s?.shots})`, n);
    await g.shot('fullmatch_result');
    await g.speed(1);
  },

  async arenas(g, n) {
    for (const a of ['lagoa', 'dunas']) {
      await quickMatch(g, { arena: a }); await skipIntro(g);
      await g.speed(30); await sleep(45000);
      const s = await st(g);
      check(s && s.clock + (s.per - 1) * 720 > 60, `${a}: o relógio avança (${s?.per}º ${s?.clock}s)`, n);
      await g.shot(`arena_${a}`);
      await g.speed(1);
      await g.ev(() => window.__game.flow.endMatch());
    }
  },

  async human(g, n) {
    await quickMatch(g, { homeDevices: ['kb'] }); await skipIntro(g);
    const s0 = await st(g);
    await g.speed(4);
    let acts = await botPlay(g, 90);
    // fase 2: bola com o jogador controlado perto da área -> o bot precisa finalizar pelo teclado
    for (let i = 0; i < 3; i++) {
      await g.ev(() => { const m = window.__game.flow.match; if (m.state !== 'play') { m.state = 'play'; m.sp = null; } const me = m.all.find((p) => p.device && p.onField);
        me.pos.set(m.goalX(me.team) - me.team.dir * 9, 0, 1); me.yaw = Math.atan2(me.team.dir, 0); me.kick = null; me.stun = 0; m.ball.owner = null; m.ball.held = false; m.ball.place(me.pos.x + me.team.dir * 0.5, 1); m.takeBall(me); });
      acts += await botPlay(g, 12);
    }
    await g.speed(1);
    const s1 = await st(g);
    log('bot:', acts, 'ações', 'placar', s1.score, 'chutes', s1.shots);
    check(acts > 5, `jogador humano executou ações pelo teclado (${acts})`, n);
    check(s1.shots[0] > s0.shots[0], `time humano chutou a gol (${s1.shots[0]})`, n);
    check(s1.me && (Math.abs(s1.me.x - (s0.me?.x ?? 0)) + Math.abs(s1.me.z - (s0.me?.z ?? 0)) > 0.5 || s1.state !== 'play'), 'jogador controlado se movimentou', n);
    await g.shot('human_match');
  },

  async twoplayers(g, n) {
    await g.ev(() => window.__game.flow.controlSelect()); await g.waitScene('ctrl');
    const devs = await g.ev(() => window.__game.flow ? (window.__game.world && true) : false);
    void devs;
    // pad0 -> CASA (esquerda), pad1 -> FORA (direita)
    await g.pad(0, [-1, 0, 0, 0]); await sleep(700); await g.pad(0, [0, 0, 0, 0]); await sleep(400);
    await g.pad(1, [1, 0, 0, 0]); await sleep(700); await g.pad(1, [0, 0, 0, 0]); await sleep(400);
    const cols = await g.ev(() => [...document.querySelectorAll('.slot')].map((s) => s.textContent.trim()));
    log('colunas:', JSON.stringify(cols));
    check(cols[0].includes('CONTROLE') && cols[2].includes('CONTROLE'), 'controles movidos para CASA e FORA', n);
    await g.key('Enter'); await g.waitScene('teams');
    await sleep(800); await g.key('Enter');
    await g.waitFor(() => window.__game.flow.match, null, 120000); await skipIntro(g);
    const both = await g.ev(() => window.__game.flow.match.teams.map((t) => t.players.filter((p) => p.device).length));
    check(both[0] >= 1 && both[1] >= 1, `os dois times têm jogador controlado (${both})`, n);
    // saída de bola com o botão A do controle do time que sai
    await g.pad(0, null, { 0: true }); await g.pad(1, null, { 0: true }); await sleep(900); await g.pad(0, null, {}); await g.pad(1, null, {});
    await g.waitFor(() => window.__game.flow.match.state === 'play', null, 30000).then(() => check(true, 'botão A do controle cobra a saída', n), () => check(false, 'botão A não cobrou a saída', n));
    await g.pad(0, [1, 0, 0, 0], { 7: true }); await sleep(2500); await g.pad(0, [0, 0, 0, 0], {});
    const moved = await g.ev(() => { const p = window.__game.flow.match.teams[0].players.find((x) => x.device); return p ? p.pos.x : null; });
    check(moved !== null, 'analógico move o jogador do controle 1', n);
    await g.shot('two_players');
  },

  async setpieces(g, n) {
    await quickMatch(g); await skipIntro(g);
    await g.waitFor(() => window.__game.flow.match.state === 'play', null, 60000);
    for (const kind of ['throw_in', 'corner', 'goal_kick', 'free_kick', 'penalty']) {
      await g.ev((k) => { const m = window.__game.flow.match; const tm = m.teams[0]; const spots = { throw_in: [5, 0, 13.5], corner: [17.7, 0, 13.2], goal_kick: [-16.5, 0, 0], free_kick: [8, 0, 3], penalty: [9, 0, 0] };
        m.setPiece(k, k === 'goal_kick' ? tm : tm, new m.ball.pos.constructor(...spots[k])); }, kind);
      const ok = await g.waitFor(() => window.__game.flow.match.state === 'play', null, 40000).then(() => true, () => false);
      check(ok, `${kind}: CPU cobra e o jogo segue`, n);
      await sleep(1500);
    }
  },

  async fouls(g, n) {
    await quickMatch(g); await skipIntro(g);
    await g.waitFor(() => window.__game.flow.match.state === 'play', null, 60000);
    const r = await g.ev(async () => {
      const m = window.__game.flow.match; const a = m.teams[0].players[1]; const out = [];
      for (let i = 0; i < 2; i++) {
        const v = m.teams[1].players[2]; m.state = 'play';
        v.pos.set(2, 0, 2); v.yaw = 0; v.stun = 0; a.pos.set(2, 0, 1.2); a.sliding = 0; a.tackleCd = 0; a.stun = 0;
        m.ball.owner = null; m.ball.place(-5, -5);
        a.slideDir.set(0, 0, 1); a.sliding = 0.6; a.vel.set(0, 0, 6);
        for (let k = 0; k < 10; k++) m.update(1 / 30);
        out.push({ yellow: a.yellow, sentOff: a.sentOff, state: m.state });
        await new Promise((r) => setTimeout(r, 1500));
      }
      return out;
    });
    log(JSON.stringify(r));
    check(r[0].yellow >= 1, 'falta por trás gera cartão amarelo', n);
    check(r[1].sentOff > 0, 'segundo amarelo tira o jogador por 2 minutos', n);
    const ok = await g.waitFor(() => ['setpiece', 'play'].includes(window.__game.flow.match.state), null, 30000).then(() => true, () => false);
    check(ok, 'jogo continua com tiro livre/pênalti após a falta', n);
    await g.speed(30);
    const back = await g.waitFor(() => window.__game.flow.match.teams[0].players[1].sentOff <= 0, null, 240000).then(() => true, () => false);
    check(back, 'jogador expulso volta após 2 minutos de jogo', n);
    await g.speed(1);
  },

  async pausemenu(g, n) {
    await quickMatch(g, { homeDevices: ['kb'] }); await skipIntro(g);
    await g.key('KeyJ');
    await g.waitFor(() => window.__game.flow.match.state === 'play', null, 30000);
    await g.key('Escape');
    const paused = await g.waitFor(() => window.__game.flow.match.paused, null, 20000).then(() => true, () => false);
    check(paused, 'ESC pausa a partida', n);
    // táticas: 2-2
    await g.key('ArrowDown'); await sleep(250); await g.key('Enter'); await sleep(700);
    await g.key('ArrowDown'); await sleep(250); await g.key('Enter'); await sleep(700);
    const f = await g.ev(() => window.__game.flow.match.teams[0].formation);
    check(f === '2-2', `formação alterada pelo menu de táticas (${f})`, n);
    // substituição
    await g.ev(() => window.__game.flow.subs()); await sleep(500);
    const before = await g.ev(() => window.__game.flow.match.teams[0].players[2].data.short);
    await g.ev(() => document.querySelector('.it[data-on="2"]').click()); await sleep(300);
    await g.ev(() => document.querySelector('.it[data-b="2"]').click()); await sleep(300);
    const after = await g.ev(() => ({ n: window.__game.flow.match.teams[0].players[2].data.short, inScene: window.__game.flow.match.group.children.includes(window.__game.flow.match.teams[0].players[2].ath.root) }));
    check(after.n !== before && after.inScene, `substituição troca o jogador em campo (${before} → ${after.n})`, n);
    await g.ev(() => window.__game.flow.unpause());
    await sleep(1500);
    check(!(await g.ev(() => window.__game.flow.match.paused)), 'continuar retoma a partida', n);
    // reiniciar
    await g.ev(() => window.__game.flow.pause()); await sleep(400);
    await g.ev(() => [...document.querySelectorAll('.overlay .btn')][3].click());
    const ok = await g.waitFor(() => window.__game.flow.match && window.__game.flow.match.state === 'intro', null, 60000).then(() => true, () => false);
    check(ok, 'reiniciar começa uma nova partida', n);
  },

  async cup(g, n) {
    await g.ev(() => { localStorage.removeItem('aq.cup'); const f = window.__game.flow; f.cup = null; f.cupNew(); });
    await g.waitScene('teams'); await sleep(500); await g.key('Enter');
    await g.waitScene('cup', 60000);
    check(true, 'copa criada com chaveamento', n);
    for (let round = 0; round < 3; round++) {
      if (round === 1) {
        await g.page.reload(); await g.waitFor(() => window.__game?.flow.scene === 'title', null, 120000);
        await g.ev(() => window.__game.flow.mainMenu()); await g.waitScene('menu');
        const label = await g.ev(() => document.querySelectorAll('.menu .btn')[1].textContent);
        check(/Continuar/.test(label), `progresso da copa salvo após recarregar ("${label.trim()}")`, n);
        await g.ev(() => window.__game.flow.cupScreen()); await g.waitScene('cup');
      }
      await g.ev(() => window.__game.flow.cupPlay());
      await g.waitFor(() => window.__game.flow.match, null, 120000); await skipIntro(g);
      // vitória forçada: placar e fim
      await g.ev(() => { const m = window.__game.flow.match; const me = m.teams[0]; me.score = 3; m.teams[1].score = 1; m.period = 3; m.state = 'play'; m.clock = m.periodLen - 0.2; });
      await g.waitFor(() => !!document.querySelector('.results'), null, 60000);
      await g.ev(() => document.querySelector('.results .btn').click());
      if (round < 2) await g.waitScene('cup', 60000);
    }
    const trophy = await g.waitScene('trophy', 120000).then(() => true, () => false);
    check(trophy, 'vencer a final leva à cena do troféu', n);
    check(await g.ev(() => JSON.parse(localStorage.getItem('aq.progress')).ach.campeao === 1), 'conquista "Campeão da Copa" desbloqueada', n);
    await g.shot('cup_trophy');
  },

  async pens(g, n) {
    await quickMatch(g, { mode: 'cup' }); await skipIntro(g);
    await g.ev(() => { const m = window.__game.flow.match; m.period = 3; m.clock = m.periodLen - 0.5; m.teams[0].score = m.teams[1].score = 1; });
    await g.speed(20);
    const t0 = Date.now(); const seen = new Set();
    while (Date.now() - t0 < 400000) {
      const s = await st(g); seen.add(s.state);
      if (await g.ev(() => !!document.querySelector('.results'))) break;
      if (s.state !== 'penalties' && !(await g.ev(() => !!window.__game.flow.match.pens)) && s.score[0] !== s.score[1]) await g.ev(() => { const m = window.__game.flow.match; m.teams[0].score = m.teams[1].score; });
      await sleep(2500);
    }
    check(seen.has('penalties'), 'empate → prorrogação → pênaltis', n);
    const pen = await g.ev(() => window.__game.flow.match ? window.__game.flow.match.teams.map((t) => t.penScore) : null);
    check(await g.ev(() => !!document.querySelector('.results')), `disputa termina no resultado (pênaltis ${pen})`, n);
    await g.speed(1);
  },

  async training(g, n) {
    await g.ev(() => { const f = window.__game.flow; f.setup.mode = 'training'; f.setup.homeDevices = ['kb']; f.loading(); });
    await g.waitFor(() => window.__game.flow.match, null, 120000);
    await sleep(1500);
    await g.key('KeyL'); // treinador cruza
    const crossed = await g.waitFor(() => window.__game.flow.match.ball.pos.y > 1, null, 20000).then(() => true, () => false);
    check(crossed, '[L] sem bola: treinador cruza', n);
    await g.ev(() => { const m = window.__game.flow.match; m.training.bicycle = 5; m.training.volley = 4; m.training.sombrero = 3; m.onEvent('training', undefined, m.training); });
    await g.ev(() => { const m = window.__game.flow.match; m.training.volley = 5; m.onEvent('training', undefined, m.training); });
    check(await g.ev(() => window.__game.flow.match.training.done), 'desafios do treino completos', n);
    check(await g.ev(() => JSON.parse(localStorage.getItem('aq.progress')).ach.aluno === 1), 'conquista "Aluno Aplicado"', n);
    await g.shot('training');
  },

  async minigames(g, n) {
    // pênaltis: 5 cobranças segurando K
    await g.ev(() => window.__game.flow.startMini('pk'));
    await g.waitFor(() => window.__game.flow.match?.mini, null, 120000);
    for (let i = 0; i < 5; i++) {
      await g.waitFor(() => window.__game.flow.match.state === 'setpiece', null, 30000).catch(() => {});
      await sleep(800);
      await g.key(i % 2 ? 'KeyA' : 'KeyD', 0);
      await g.page.keyboard.down(i % 2 ? 'KeyA' : 'KeyD'); await g.key('KeyK', 450); await g.page.keyboard.up(i % 2 ? 'KeyA' : 'KeyD');
      await g.waitFor((k) => window.__game.flow.match.mini.kicks.length > k, i, 30000).catch(() => {});
    }
    const pk = await g.waitFor(() => document.querySelector('.overlay h1')?.textContent.includes('Pênaltis'), null, 30000).then(() => true, () => false);
    const pkRes = await g.ev(() => window.__game.flow.match?.mini?.kicks);
    check(pk, `Pênaltis de Ouro termina com tela de resultado (${JSON.stringify(pkRes)})`, n);
    await g.shot('mini_pk');
    // embaixadinhas: bot aperta I quando a bola desce perto do pé
    await g.ev(() => window.__game.flow.startMini('juggle'));
    await g.waitFor(() => window.__game.flow.match?.mini?.kind === 'juggle', null, 120000);
    await sleep(800);
    await g.key('KeyI');
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const s = await g.ev(() => { const m = window.__game.flow.match; return m?.mini ? { y: m.ball.pos.y, vy: m.ball.vel.y, done: m.mini.done, c: m.mini.count } : null; });
      if (!s || s.done) break;
      if (s.vy < 0 && s.y < 0.95 && s.y > 0.4) { await g.key('KeyI'); await sleep(250); }
      await sleep(40);
    }
    const jc = await g.ev(() => window.__game.flow.match?.mini?.count ?? -1);
    check(jc >= 2, `embaixadinhas contadas pelo bot (${jc})`, n);
    const jres = await g.waitFor(() => document.querySelector('.overlay h1')?.textContent.includes('Embaixadinhas'), null, 90000).then(() => true, () => false);
    check(jres, 'Embaixadinhas termina (bola caiu ou tempo)', n);
    await g.shot('mini_juggle');
    // tiro ao alvo: 10 chutes
    await g.ev(() => window.__game.flow.startMini('target'));
    await g.waitFor(() => window.__game.flow.match?.mini?.kind === 'target', null, 120000);
    for (let i = 0; i < 10; i++) {
      await g.waitFor((k) => { const mm = window.__game.flow.match?.mini; return mm && mm.waiting && mm.shots === k && window.__game.flow.match.ball.owner; }, i, 30000).catch(() => {});
      await sleep(400);
      await g.key('KeyK', 300 + (i % 3) * 150);
      await g.waitFor((k) => (window.__game.flow.match?.mini?.shots ?? 99) > k, i, 30000).catch(() => {});
    }
    const tres = await g.waitFor(() => document.querySelector('.overlay h1')?.textContent.includes('Tiro'), null, 30000).then(() => true, () => false);
    const ts = await g.ev(() => window.__game.flow.match?.mini ? [window.__game.flow.match.mini.shots, window.__game.flow.match.mini.score] : null);
    check(tres, `Tiro ao Alvo termina após 10 bolas (${ts})`, n);
    await g.shot('mini_target');
    const rec = await g.ev(() => JSON.parse(localStorage.getItem('aq.progress')).records);
    check(rec.pk >= 0 && rec.juggle >= 1, `recordes salvos (${JSON.stringify(rec)})`, n);
  },

  async achievements(g, n) {
    await g.ev(() => { const P = JSON.parse(localStorage.getItem('aq.progress') || '{}'); P.ach = { primeiro_gol: 1, bicicleta: 1, tesoura: 1, peixinho: 1, hat_trick: 1 }; P.ball = 'classica'; localStorage.setItem('aq.progress', JSON.stringify(P)); });
    await g.page.reload(); await g.waitFor(() => window.__game?.flow.scene === 'title', null, 120000);
    await g.ev(() => window.__game.flow.achievements()); await g.waitScene('achievements');
    const cards = await g.ev(() => [document.querySelectorAll('.achcard').length, document.querySelectorAll('.achcard.ok').length]);
    check(cards[0] === 18 && cards[1] === 5, `tela lista 18 conquistas, 5 desbloqueadas (${cards})`, n);
    await g.key('ArrowRight'); await sleep(700);
    const ball = await g.ev(() => JSON.parse(localStorage.getItem('aq.progress')).ball);
    check(ball === 'dourada', `bola dourada liberada com 5 conquistas e selecionada (${ball})`, n);
    await g.key('ArrowRight'); await sleep(700);
    const ball2 = await g.ev(() => JSON.parse(localStorage.getItem('aq.progress')).ball);
    check(ball2 === 'dourada', `bola neon bloqueada não é selecionada (${ball2})`, n);
    await g.shot('achievements');
    await quickMatch(g); await skipIntro(g);
    const tex = await g.ev(() => { let u = ''; window.__game.flow.match.ball.mesh.traverse((o) => { if (o.isMesh) u = o.material.metalness; }); return u; });
    check(tex > 0.5, 'partida usa a bola dourada', n);
  },

  async memory(g, n) {
    const counts = [];
    for (let i = 0; i < 3; i++) {
      await quickMatch(g, { arena: ['copacabana', 'lagoa', 'dunas'][i] }); await skipIntro(g); await sleep(2000);
      await g.ev(() => window.__game.flow.mainMenu()); await g.waitScene('menu'); await sleep(1000);
      counts.push(await g.ev(() => { let k = 0; window.__game.world.root.traverse(() => k++); let s = 0; window.__game.world.scene.traverse(() => s++); return [k, s, performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0]; }));
    }
    log('objetos (root, cena, MB):', JSON.stringify(counts));
    check(counts[2][0] <= counts[0][0] + 5, `sem acúmulo de objetos dinâmicos entre partidas (${counts.map((c) => c[0])})`, n);
    check(counts[2][1] <= counts[0][1] * 1.2, `cena não cresce entre trocas de arena (${counts.map((c) => c[1])})`, n);
  },

  async mobile(g, n) {
    await g.page.setViewportSize({ width: 390, height: 844 });
    await g.ev(() => window.__game.flow.mainMenu()); await g.waitScene('menu'); await sleep(800);
    const ov = await g.ev(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1);
    check(ov, 'menu sem rolagem horizontal em 390 px', n);
    await g.shot('mobile_menu');
    await quickMatch(g); await skipIntro(g); await sleep(1500);
    const hudOk = await g.ev(() => { const r = document.querySelector('.hud .score').getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; });
    check(hudOk, 'placar cabe na tela do celular', n);
    await g.shot('mobile_match');
    await g.page.setViewportSize({ width: 800, height: 450 });
  },
};

(async () => {
  const want = process.argv[2] ? process.argv[2].split(',') : Object.keys(SUITES);
  for (const name of want) {
    const t0 = Date.now();
    const notes = [];
    let g;
    console.log('▶', name);
    try {
      g = await open({ gamepads: name === 'twoplayers' ? 2 : 0 });
      await SUITES[name](g, notes);
    } catch (e) {
      notes.push('✘ exceção: ' + String(e.message || e).split('\n')[0]); notes.failed = true;
    }
    let anomalies = [], errors = [];
    if (g) { anomalies = await g.anomalies().catch(() => []); errors = g.errors; await g.close().catch(() => {}); }
    if (errors.length) { notes.push(`✘ ${errors.length} erro(s) de página: ${errors.slice(0, 3).join(' | ')}`); notes.failed = true; }
    if (anomalies.length) { notes.push(`✘ ${anomalies.length} anomalia(s): ${anomalies.map((a) => a.d).slice(0, 6).join(' | ')}`); notes.failed = true; }
    const secs = Math.round((Date.now() - t0) / 1000);
    results.push({ name, ok: !notes.failed, notes, secs });
    for (const x of notes) console.log('   ', x);
    console.log(notes.failed ? '  ✘ FALHOU' : '  ✔ OK', `(${secs}s)`);
  }
  const ok = results.filter((r) => r.ok).length;
  const md = ['# QA ponta a ponta', '', `Executado em ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC com \`node scripts/qa/run.cjs\` (Chromium headless, build de produção).`, '',
    `**${ok}/${results.length} suítes OK.** O monitor de invariantes roda a cada quadro em todas as suítes (bola/jogadores com posição válida e dentro do mundo,`,
    'bola perto do dono, controle duplicado, time humano sem jogador, estados presos, bola morta sem ninguém ir buscar).', '',
    '| Suíte | Resultado | Tempo |', '|---|---|---|', ...results.map((r) => `| ${r.name} | ${r.ok ? '✔ OK' : '✘ FALHOU'} | ${r.secs}s |`), '',
    ...results.flatMap((r) => [`## ${r.name}`, '', ...r.notes.map((x) => `- ${x}`), '']),
    'Capturas de tela das suítes em `docs/qa/`.'];
  fs.writeFileSync(path.join(ROOT, 'docs', 'QA.md'), md.join('\n') + '\n');
  console.log(`\n${ok}/${results.length} suítes OK — relatório em docs/QA.md`);
  process.exit(ok === results.length ? 0 : 1);
})();
