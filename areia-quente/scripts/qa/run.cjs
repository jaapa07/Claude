// QA ponta a ponta do REI DA PRAIA. Uso: npm run build && node scripts/qa/run.cjs [suite,suite]
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
/** Espera a CPU agir: acelera o tempo de jogo durante a espera (o headless roda a poucos quadros por segundo). */
async function waitPlay(g, ms = 90000) {
  await g.speed(6);
  const ok = await g.waitFor(() => window.__game.flow.match?.state === 'play', null, ms).then(() => true, () => false);
  await g.speed(1);
  return ok;
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
    // duplo clique de mouse em "Opções" não pode enfileirar duas transições
    await g.waitFor(() => !window.__game.flow.busy, null, 60000);
    const opt = await g.page.$$('.mainmenu .mtile');
    await opt[6].dblclick();
    await g.waitScene('options', 60000); await sleep(2500);
    const fades = await g.ev(() => window.__game.flow.fadeLog.filter((x) => x.endsWith('início')).length);
    check(fades === 2, `duplo clique gera uma única transição (${fades - 1})`, n);
    await g.key('Escape'); await g.waitScene('menu', 60000);
    const items = await g.ev(() => [...document.querySelectorAll('.mainmenu .mtile')].map((b) => b.textContent.trim()));
    check(items.length === 8, `menu com 8 opções (${items.join(' | ')})`, n);
    const expect = ['ctrl', 'teams', 'teams', 'teams', 'challenges', 'achievements', 'options', 'credits'];
    for (let i = 0; i < expect.length; i++) {
      await g.waitScene('menu');
      await sleep(300);
      for (let k = 0; k < i; k++) { await g.key('ArrowRight'); await sleep(700); }
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
    const ok = await g.waitFor(() => window.__game.flow.match.state === 'play', null, 60000).then(() => true, () => false);
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
    check(cols[0].includes('TECLADO'), 'teclado não é arrastado pelo analógico dos controles', n);
    await g.key('Enter'); await g.waitScene('teams');
    await sleep(800); await g.key('Enter');
    await g.waitFor(() => window.__game.flow.match, null, 120000); await skipIntro(g);
    const both = await g.ev(() => window.__game.flow.match.teams.map((t) => t.players.filter((p) => p.device).length));
    check(both[0] >= 1 && both[1] >= 1, `os dois times têm jogador controlado (${both})`, n);
    // saída de bola com o botão A do controle do time que sai
    // aciona o dispositivo que controla o batedor da saída (teclado ou controle)
    const dev = await g.ev(() => { const m = window.__game.flow.match; return m.sp?.taker?.device ?? null; });
    if (dev && dev.startsWith('pad')) { const i = +dev.slice(3); await g.pad(i, null, { 0: true }); await sleep(900); await g.pad(i, null, {}); }
    else await g.key('KeyJ');
    await g.speed(4);
    await g.waitFor(() => window.__game.flow.match.state === 'play', null, 60000).then(() => check(true, `saída cobrada pelo dispositivo do batedor (${dev})`, n), () => check(false, `saída não cobrada (${dev})`, n));
    await g.speed(1);
    await g.pad(0, [1, 0, 0, 0], { 7: true }); await sleep(2500); await g.pad(0, [0, 0, 0, 0], {});
    const moved = await g.ev(() => { const p = window.__game.flow.match.teams[0].players.find((x) => x.device); return p ? p.pos.x : null; });
    check(moved !== null, 'analógico move o jogador do controle 1', n);
    await g.shot('two_players');
  },

  async setpieces(g, n) {
    await quickMatch(g); await skipIntro(g);
    await waitPlay(g);
    for (const kind of ['throw_in', 'corner', 'goal_kick', 'free_kick', 'penalty']) {
      await g.ev((k) => { const m = window.__game.flow.match; const tm = m.teams[0]; const spots = { throw_in: [5, 0, 13.5], corner: [17.7, 0, 13.2], goal_kick: [-16.5, 0, 0], free_kick: [8, 0, 3], penalty: [9, 0, 0] };
        m.setPiece(k, k === 'goal_kick' ? tm : tm, new m.ball.pos.constructor(...spots[k])); }, kind);
      const ok = await waitPlay(g);
      const info = await g.ev(() => { const m = window.__game.flow.match; return `${m.state} sp=${m.sp?.kind ?? '-'} t=${m.sp?.t?.toFixed(1) ?? '-'}`; });
      check(ok, `${kind}: CPU cobra e o jogo segue (${info})`, n);
      await sleep(1500);
    }
  },

  async fouls(g, n) {
    await quickMatch(g); await skipIntro(g);
    await waitPlay(g);
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
    const ok = await waitPlay(g);
    check(ok, 'jogo continua (cobrança executada) após a falta', n);
    await g.speed(30);
    const back = await g.waitFor(() => window.__game.flow.match.teams[0].players[1].sentOff <= 0, null, 240000).then(() => true, () => false);
    check(back, 'jogador expulso volta após 2 minutos de jogo', n);
    await g.speed(1);
  },

  async pausemenu(g, n) {
    await quickMatch(g, { homeDevices: ['kb'] }); await skipIntro(g);
    await g.key('KeyJ');
    await waitPlay(g);
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
        const label = await g.ev(() => document.querySelectorAll('.mainmenu .mtile')[1].textContent);
        check(/Continuar/.test(label), `progresso da copa salvo após recarregar ("${label.trim()}")`, n);
        await g.ev(() => window.__game.flow.cupScreen()); await g.waitScene('cup');
      }
      await g.ev(() => window.__game.flow.cupPlay());
      await g.waitFor(() => window.__game.flow.match, null, 120000); await skipIntro(g);
      // vitória forçada: placar e fim
      await g.ev(() => { const m = window.__game.flow.match; const me = m.teams[0]; me.score = 3; m.teams[1].score = 1; m.period = 3; m.state = 'play'; m.clock = m.periodLen - 0.2; });
      await g.speed(6);
      await g.waitFor(() => !!document.querySelector('.results'), null, 120000);
      await g.speed(1);
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
    // pênaltis: 5 cobranças segurando K (mira com A/D)
    await g.ev(() => window.__game.flow.startMini('pk'));
    await g.waitFor(() => window.__game.flow.match?.mini, null, 120000);
    await g.speed(3);
    for (let i = 0; i < 5; i++) {
      await g.waitFor((k) => { const m = window.__game.flow.match; return m.state === 'setpiece' && m.mini.waiting && m.mini.kicks.length === k; }, i, 60000).catch(() => {});
      await sleep(600);
      const side = i % 2 ? 'KeyA' : 'KeyD';
      await g.page.keyboard.down(side); await g.key('KeyK', 500); await g.page.keyboard.up(side);
      await g.waitFor((k) => window.__game.flow.match.mini.kicks.length > k, i, 60000).catch(() => {});
    }
    const pk = await g.waitFor(() => document.querySelector('.overlay h1')?.textContent.includes('Pênaltis'), null, 60000).then(() => true, () => false);
    const pkRes = await g.ev(() => window.__game.flow.match?.mini?.kicks);
    check(pk && pkRes.length === 5, `Pênaltis de Ouro: 5 cobranças pelo teclado e tela de resultado (${JSON.stringify(pkRes)})`, n);
    await g.shot('mini_pk');
    await g.speed(1);
    // embaixadinhas: bot dentro da página reage a cada quadro (dispara a tecla I quando a bola desce perto do pé)
    await g.ev(() => window.__game.flow.startMini('juggle'));
    await g.waitFor(() => window.__game.flow.match?.mini?.kind === 'juggle' && window.__game.flow.scene === 'match', null, 120000);
    await sleep(800);
    await g.ev(() => {
      const fire = () => { addEventListener; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI' })); setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyI' })), 30); };
      fire();
      let cool = 0;
      const loop = () => { const m = window.__game.flow.match; if (!m?.mini || m.mini.done) return;
        cool--; if (cool <= 0 && m.ball.vel.y < 0 && m.ball.pos.y < 0.95 && m.ball.pos.y > 0.45 && !m.mini.me.kick) { fire(); cool = 3; }
        requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    });
    // depois de 10 toques encurta o cronômetro (60 s de jogo levariam ~10 min no headless) para testar o fim por tempo
    await g.waitFor(() => (window.__game.flow.match?.mini?.count ?? 0) >= 10 || window.__game.flow.match?.mini?.done, null, 300000).catch(() => {});
    await g.ev(() => { const mm = window.__game.flow.match?.mini; if (mm && !mm.done) mm.time = Math.min(mm.time, 1.5); });
    const jres = await g.waitFor(() => document.querySelector('.overlay h1')?.textContent.includes('Embaixadinhas'), null, 300000).then(() => true, () => false);
    const jc = await g.ev(() => window.__game.flow.match?.mini?.count ?? -1);
    check(jc >= 5, `embaixadinhas encadeadas pelo bot (${jc})`, n);
    check(jres, 'Embaixadinhas termina (bola caiu ou tempo)', n);
    await g.shot('mini_juggle');
    // tiro ao alvo: 10 chutes
    await g.ev(() => window.__game.flow.startMini('target'));
    await g.waitFor(() => window.__game.flow.match?.mini?.kind === 'target' && window.__game.flow.scene === 'match', null, 120000);
    await g.speed(3);
    for (let i = 0; i < 10; i++) {
      await g.waitFor((k) => { const mm = window.__game.flow.match?.mini; return mm && mm.waiting && mm.shots === k && window.__game.flow.match.ball.owner; }, i, 60000).catch(() => {});
      await sleep(300);
      await g.key('KeyK', 300 + (i % 3) * 150);
      await g.waitFor((k) => (window.__game.flow.match?.mini?.shots ?? 99) > k, i, 60000).catch(() => {});
    }
    const tres = await g.waitFor(() => document.querySelector('.overlay h1')?.textContent.includes('Tiro'), null, 60000).then(() => true, () => false);
    const ts = await g.ev(() => window.__game.flow.match?.mini ? [window.__game.flow.match.mini.shots, window.__game.flow.match.mini.score] : null);
    check(tres, `Tiro ao Alvo termina após 10 bolas (${ts})`, n);
    await g.shot('mini_target');
    await g.speed(1);
    const rec = await g.ev(() => JSON.parse(localStorage.getItem('aq.progress')).records);
    check(rec.juggle >= 5 && rec.target > 0, `recordes salvos (${JSON.stringify(rec)})`, n);
  },

  async achievements(g, n) {
    await g.ev(() => { const P = JSON.parse(localStorage.getItem('aq.progress') || '{}'); P.ach = { primeiro_gol: 1, bicicleta: 1, tesoura: 1, peixinho: 1, hat_trick: 1 }; P.ball = 'classica'; localStorage.setItem('aq.progress', JSON.stringify(P)); });
    await g.page.reload(); await g.waitFor(() => window.__game?.flow.scene === 'title', null, 120000);
    await g.ev(() => window.__game.flow.achievements()); await g.waitScene('achievements');
    const cards = await g.ev(() => [document.querySelectorAll('.achcard').length, document.querySelectorAll('.achcard.ok').length]);
    check(cards[0] === 20 && cards[1] === 5, `tela lista 20 conquistas, 5 desbloqueadas (${cards})`, n);
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

  async career(g, n) {
    await g.ev(() => { localStorage.removeItem('aq.career'); const f = window.__game.flow; f.career = null; f.tick = undefined; f.teamSelect(false, false, true); });
    await g.waitScene('teams'); await sleep(600);
    await g.key('ArrowRight'); await sleep(900);
    await g.key('Enter');
    await g.waitScene('career', 60000);
    const c0 = await g.ev(() => JSON.parse(localStorage.getItem('aq.career')));
    check(!!c0 && c0.season.teams.length === 8 && c0.season.rounds.length === 7, `carreira criada (${c0?.team}, 8 times, 7 rodadas)`, n);
    check(await g.ev(() => document.querySelectorAll('.ctable tr').length === 9), 'tabela da liga com 8 seleções', n);
    await g.shot('career_hub');
    // joga a 1ª rodada (vitória forçada no fim do 3º período)
    await g.ev(() => window.__game.flow.careerPlay());
    await g.waitFor(() => window.__game.flow.match, null, 120000); await skipIntro(g);
    const boosted = await g.ev(() => window.__game.flow.match.teams[0].id === JSON.parse(localStorage.getItem('aq.career')).team);
    check(boosted, 'partida da carreira usa a seleção do jogador', n);
    await g.ev(() => { const m = window.__game.flow.match; m.teams[0].score = 4; m.teams[0].players[4].goals = 3; m.teams[1].score = 1; m.period = 3; m.state = 'play'; m.clock = m.periodLen - 0.2; });
    await g.speed(6);
    await g.waitFor(() => !!document.querySelector('.results'), null, 120000);
    await g.speed(1);
    await g.ev(() => document.querySelector('.results .btn').click());
    await g.waitScene('career', 60000);
    const c1 = await g.ev(() => JSON.parse(localStorage.getItem('aq.career')));
    check(c1.season.round === 1 && c1.points > c0.points, `rodada 1 registrada e pontos de evolução ganhos (${c0.points} → ${c1.points})`, n);
    const myRow = await g.ev(() => document.querySelector('.ctable tr.me')?.textContent);
    check(/3$/.test(myRow.trim()) || myRow.includes('3'), `vitória vale 3 pontos na tabela (${myRow})`, n);
    // elenco: compra de atributo
    await g.ev(() => window.__game.flow.careerSquad()); await g.waitScene('careersquad');
    await g.key('Enter'); await sleep(800);
    const c2 = await g.ev(() => JSON.parse(localStorage.getItem('aq.career')));
    check(c2.points === c1.points - 1 && Object.keys(c2.bonus).length === 1, `evolução gasta 1 ponto e melhora o atributo (${JSON.stringify(c2.bonus)})`, n);
    await g.shot('career_squad');
    // resto da temporada: marca a vitória do jogador e usa o botão "Simular" do hub para a CPU
    await g.ev(async () => {
      const f = window.__game.flow, C = f.career;
      for (let k = 0; k < 40 && C.season.phase !== 'done'; k++) {
        const x = C.season;
        const pool = x.phase === 'league' ? x.rounds[x.round] : x.phase === 'semis' ? x.semis : [x.final];
        const mf = pool.find((q) => q && (q.a === C.team || q.b === C.team) && !q.played);
        if (mf) { mf.ga = mf.a === C.team ? 2 : 1; mf.gb = mf.a === C.team ? 1 : 2; mf.played = true; }
        while (f.busy) await new Promise((r) => setTimeout(r, 100));
        f.careerHub();
        document.querySelector('.careerhub .btn').click();
        await new Promise((r) => setTimeout(r, 200));
        while (f.busy) await new Promise((r) => setTimeout(r, 100));
      }
      f.careerHub();
    });
    const c3 = await g.ev(() => window.__game.flow.career);
    check(c3.season.phase === 'done' && c3.history.length === 1, `temporada concluída e registrada no histórico (${c3.history[0]?.pos}º)`, n);
    await g.shot('career_season_end');
    await g.ev(() => document.querySelector('.careerhub .btn').click());
    await g.waitFor(() => window.__game.flow.career.season.n === 2, null, 30000).catch(() => {});
    await g.waitScene('career', 60000);
    const c4 = await g.ev(() => window.__game.flow.career);
    check(c4.season.n === 2 && c4.season.phase === 'league', 'segunda temporada começa', n);
    await g.waitFor(() => !window.__game.flow.busy, null, 60000);
    await g.ev(() => window.__game.flow.careerHistory()); await sleep(1500);
    await g.waitScene('careerhistory');
    check(await g.ev(() => document.querySelectorAll('.squad tr').length >= 2), 'histórico lista a temporada', n);
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

  /** iPhone deitado: só toque, sem teclado. Do título até jogar com joystick/botões, pausa e aviso de girar. */
  async iphone(g, n) {
    const tap = async (sel) => { const c = await g.center(sel); if (!c) throw new Error('não achei ' + sel); await g.page.touchscreen.tap(c.x, c.y); };
    const noOverflow = () => g.ev(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1);
    check(await g.ev(() => window.__game.input.touch && !!document.getElementById('touch')), 'detecta tela de toque e cria os controles', n);
    check(await g.ev(() => document.querySelector('.press').textContent.includes('TOQUE')), 'título pede "TOQUE PARA COMEÇAR"', n);
    check(await g.ev(() => document.querySelector('.plat')?.textContent === 'VERSÃO CELULAR'), 'título mostra "VERSÃO CELULAR"', n);
    await g.shot('iphone_title');
    await tap('.title-screen'); await g.waitScene('menu');
    check(true, 'toque no título abre o menu', n);
    check(await noOverflow(), 'menu sem rolagem da página', n);
    await g.shot('iphone_menu');
    await tap('.mainmenu .mtile'); await g.waitScene('teams');
    check(true, 'Amistoso vai direto para a seleção de times (sem tela de controles)', n);
    const go = await g.center('.tbar .go');
    check(go && go.vis && go.y + go.h / 2 <= 391 && go.x + go.w / 2 <= 845, 'botão COMEÇAR visível na tela', n);
    // trocar o time tocando nas setas
    const before = await g.ev(() => window.__game.flow.setup.home.id);
    await tap('.tcard.l .arrow[data-d="1"]'); await sleep(400);
    check((await g.ev(() => window.__game.flow.setup.home.id)) !== before, 'toque na seta troca a seleção', n);
    check(await noOverflow(), 'seleção de times cabe na tela', n);
    await g.shot('iphone_teams');
    await g.ev(() => { window.__game.flow.setup.arena = 'copacabana'; });
    await tap('.tbar .go');
    await g.waitFor(() => window.__game.flow.scene === 'match' && window.__game.flow.match, null, 180000);
    check(true, 'COMEÇAR inicia a partida', n);
    await g.waitFor(() => document.querySelector('#touch .t-skip.on'), null, 60000);
    check(true, 'botão PULAR aparece na apresentação', n);
    for (let i = 0; i < 12 && (await g.ev(() => window.__game.flow.match.state)) === 'intro'; i++) { await tap('#touch .t-skip'); await sleep(700); }
    check((await g.ev(() => window.__game.flow.match.state)) !== 'intro', 'PULAR encerra a apresentação', n);
    // saque: o jogador humano toca em PASSE (o botão pisca)
    await g.speed(6);
    await g.waitFor(() => ['kickoff', 'play'].includes(window.__game.flow.match.state), null, 90000);
    await g.speed(1);
    if ((await g.ev(() => window.__game.flow.match.state)) === 'kickoff') {
      await g.waitFor(() => document.getElementById('touch').classList.contains('wait') || window.__game.flow.match.state === 'play', null, 30000).catch(() => {});
      check(await g.ev(() => document.getElementById('touch').classList.contains('wait') || window.__game.flow.match.state === 'play'), 'no saque o botão PASSE pisca', n);
      for (let i = 0; i < 8 && (await g.ev(() => window.__game.flow.match.state)) === 'kickoff'; i++) { await tap('#touch .b-pass'); await sleep(600); }
    }
    check(await waitPlay(g), 'bola em jogo', n);
    check(await g.ev(() => { const t = document.getElementById('touch'); return t.classList.contains('on') && !t.classList.contains('cine'); }), 'joystick e botões visíveis durante o jogo', n);
    const btnsIn = await g.ev(() => [...document.querySelectorAll('#touch .t-btn')].filter((b) => +getComputedStyle(b).opacity > 0.5).every((b) => { const r = b.getBoundingClientRect(); return r.width >= 40 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1; }));
    check(btnsIn, 'todos os botões dentro da tela e com no mínimo 40 px', n);
    await g.shot('iphone_match');
    // joystick: arrasta o dedo para a direita e segura
    const me0 = await g.ev(() => { const p = window.__game.flow.match.all.find((x) => x.device === 'kb'); return p && { x: p.pos.x, z: p.pos.z }; });
    check(!!me0, 'jogador controlado pela tela de toque', n);
    await g.touch('touchStart', [{ x: 150, y: 290, id: 1 }]);
    for (let k = 1; k <= 5; k++) { await g.touch('touchMove', [{ x: 150 + k * 18, y: 290 - k * 4, id: 1 }]); await sleep(60); }
    const stick = await g.ev(() => { const s = window.__game.input.state('kb'); return { mx: s.mx, my: s.my }; });
    check(stick.mx > 0.5, `joystick move para a direita (mx=${stick.mx.toFixed(2)})`, n);
    await g.shot('iphone_stick');
    // segundo dedo no CHUTE enquanto o primeiro segura o joystick (multitoque) — em modo ATAQUE
    await g.ev(() => { const m = window.__game.flow.match; m.sp = null; m.state = 'play'; m.stateT = 0; m.takeBall(m.all.find((x) => x.device === 'kb')); });
    await g.waitFor(() => document.getElementById('touch').classList.contains('atk'), null, 20000).catch(() => {});
    await sleep(500);
    const sh = await g.center('#touch .b-shoot');
    await g.touch('touchStart', [{ x: 240, y: 270, id: 1 }, { x: sh.x, y: sh.y, id: 2 }]);
    await sleep(250);
    const both = await g.ev(() => { const i = window.__game.input; return { held: i.held('kb', 'shoot'), mx: i.state('kb').mx }; });
    check(both.held && both.mx > 0.5, 'multitoque: joystick + CHUTE ao mesmo tempo', n);
    await g.touch('touchEnd', []);
    await sleep(300);
    const rel = await g.ev(() => { const i = window.__game.input; return { held: i.held('kb', 'shoot'), mx: i.state('kb').mx }; });
    check(!rel.held && Math.abs(rel.mx) < 0.01, 'soltar os dedos solta joystick e botão', n);
    await g.speed(4); await sleep(1500); await g.speed(1);
    const me1 = await g.ev(() => { const p = window.__game.flow.match.all.find((x) => x.device === 'kb'); return p && { x: p.pos.x, z: p.pos.z }; });
    check(me1 && Math.hypot(me1.x - me0.x, me1.z - me0.z) > 0.5, 'jogador se moveu com o joystick', n);
    // ATAQUE x DEFESA: entrega a bola para mim e depois para o adversário e confere o layout dos botões
    const layout = () => g.ev(() => { const r = document.getElementById('touch'); const vis = (c) => getComputedStyle(document.querySelector('#touch .' + c)).opacity > 0.5;
      return { atk: r.classList.contains('atk'), def: r.classList.contains('def'), pass: document.querySelector('#touch .b-pass span').textContent,
        tackle: vis('b-tackle'), trick: vis('b-trick'), lob: vis('b-lob'), shoot: vis('b-shoot'), big: document.querySelector('#touch .b-tackle').getBoundingClientRect().width }; });
    await g.ev(() => { const m = window.__game.flow.match; m.sp = null; m.state = 'play'; m.stateT = 0; m.takeBall(m.all.find((x) => x.device === 'kb')); });
    await g.waitFor(() => document.getElementById('touch').classList.contains('atk'), null, 20000).catch(() => {});
    await sleep(350);
    const A1 = await layout();
    check(A1.atk && A1.pass === 'PASSE' && A1.trick && A1.lob && !A1.tackle, `ATAQUE: PASSE/CHUTE/LENÇOL/FIRULA, sem CARRINHO (${JSON.stringify(A1)})`, n);
    await g.shot('iphone_ataque');
    await g.ev(() => { const m = window.__game.flow.match; const me = m.all.find((x) => x.device === 'kb'); const op = m.all.find((x) => x.team !== me.team && x.onField && !x.isGK); m.sp = null; m.state = 'play'; m.stateT = 0; m.takeBall(op); });
    await g.waitFor(() => document.getElementById('touch').classList.contains('def'), null, 20000).catch(() => {});
    await sleep(700);
    const D1 = await layout();
    check(D1.def && D1.pass === 'TROCAR' && D1.tackle && !D1.trick && !D1.lob && D1.big > A1.big, `DEFESA: CARRINHO grande, TROCAR, sem FIRULA/LENÇOL (${JSON.stringify(D1)})`, n);
    await g.shot('iphone_defesa');
    // pausa pelo botão e volta tocando em "Continuar"
    await g.waitFor(() => document.querySelector('#touch .t-pause.on'), null, 60000);
    await tap('#touch .t-pause');
    await g.waitFor(() => window.__game.flow.match.paused, null, 20000);
    check(await g.ev(() => !document.getElementById('touch').classList.contains('on')), 'pausa esconde os controles de toque', n);
    await g.shot('iphone_pause');
    await tap('.overlay .btn');
    await g.waitFor(() => !window.__game.flow.match.paused, null, 20000);
    check(await g.ev(() => document.getElementById('touch').classList.contains('on')), 'continuar devolve os controles', n);
    // retrato: aviso de girar
    await g.page.setViewportSize({ width: 390, height: 844 }); await sleep(800);
    check(await g.ev(() => getComputedStyle(document.getElementById('rotate')).display !== 'none'), 'na vertical aparece "Gire o aparelho"', n);
    await g.shot('iphone_portrait');
    await g.page.setViewportSize({ width: 844, height: 390 }); await sleep(500);
    check(await g.ev(() => getComputedStyle(document.getElementById('rotate')).display === 'none'), 'na horizontal o aviso some', n);
    // opções da versão celular: tamanho dos botões e vibração, sem remapear teclas
    await g.ev(() => { const f = window.__game.flow; f.mainMenu(); f.options(); }); await g.waitScene('options');
    const op = await g.ev(() => ({ txt: document.querySelector('.options').textContent, keys: !!document.querySelector('.options .keys') }));
    check(op.txt.includes('Botões na tela') && op.txt.includes('Vibração') && op.txt.includes('Versão do jogo') && !op.keys, 'opções do celular: botões, vibração, troca de versão; sem teclas', n);
    await g.shot('iphone_options');
    // a página da versão PC no mesmo aparelho não mostra controles de toque
    await g.page.goto('http://game.local/pc.html');
    await g.waitFor(() => window.__game?.flow.scene === 'title', null, 180000);
    const pc = await g.ev(() => ({ touch: window.__game.input.touch, overlay: !!document.getElementById('touch'), plat: document.querySelector('.plat')?.textContent }));
    check(!pc.touch && !pc.overlay && pc.plat === 'VERSÃO PC', 'pc.html: versão PC sem controles de toque', n);
  },

  /** Bateria de toques: cada botão, em cada situação (ATAQUE / APOIO / DEFESA), com toque rápido e segurado, medindo o efeito no jogo. */
  async toques(g, n) {
    let tid = 10;
    const ctr = (cls) => g.center('#touch .' + cls);
    const press = async (x, y, hold = 0) => { const id = tid++; await g.touch('touchStart', [{ x, y, id }]); if (hold) await sleep(hold); await g.touch('touchEnd', []); };
    const tapBtn = async (cls, hold = 0) => { const c = await ctr(cls); if (!c) throw new Error('sem botão ' + cls); await press(c.x, c.y, hold); };
    const until = (fn, arg, ms = 25000) => g.waitFor(fn, arg, ms).then(() => true, () => false);
    // cenários montados dentro do jogo
    const scene = (kind) => g.ev((kind) => {
      const m = window.__game.flow.match, b = m.ball;
      const me0 = m.all.find((x) => x.device === 'kb');
      const tm = me0.team, opp = tm.opp, dir = tm.dir;
      m.sp = null; m.state = 'play'; m.stateT = 0; m.paused = false;
      for (const p of m.all) { p.kick = null; p.stun = 0; p.sliding = 0; p.vel.set(0, 0, 0); }
      // adversários longe (exceto no cenário de defesa)
      opp.field.forEach((o, i) => { if (!o.isGK) { o.pos.set(-dir * 14, 0, -8 + i * 5); o.sync(); } });
      const me = me0;
      me.pos.set(0, 0, 0); me.yaw = Math.atan2(dir, 0); me.sync();
      b.owner = null; b.held = false; b.vel.set(0, 0, 0); b.pos.set(0, 0.11, 0); b.lastTouch = null; m.passTo = null;
      if (kind === 'atk') { m.takeBall(me); }
      if (kind === 'sup') { const mate = tm.field.find((x) => x !== me && !x.isGK); mate.pos.set(-dir * 6, 0, 3); mate.sync(); m.takeBall(mate); }
      if (kind === 'def') { const o = opp.field.find((x) => !x.isGK); o.pos.set(dir * 2.2, 0, 0.4); o.vel.set(0, 0, 0); o.sync(); m.takeBall(o); }
      if (kind === 'deffar') { const o = opp.field.find((x) => !x.isGK); o.pos.set(dir * 9, 0, 4); o.sync(); m.takeBall(o); }
      window.__qaMe = me;
      return { dir };
    }, kind);
    const mode = () => g.ev(() => window.__game.touch.mode);
    const waitMode = (md) => until((md) => window.__game.touch.mode === md && !document.getElementById('touch').classList.contains('swap'), md, 15000);

    // ---- chega na partida pelo toque
    const tap = async (sel) => { const c = await g.center(sel); await g.page.touchscreen.tap(c.x, c.y); };
    await tap('.title-screen'); await g.waitScene('menu');
    await tap('.mainmenu .mtile'); await g.waitScene('teams');
    await g.ev(() => { window.__game.flow.setup.arena = 'copacabana'; });
    await tap('.tbar .go');
    await g.waitFor(() => window.__game.flow.scene === 'match' && window.__game.flow.match, null, 180000);
    await g.ev(() => { const m = window.__game.flow.match; m.hud.cinema(false); m.hud.show(true); m.beginKickoff(m.kickoffTeam); });
    await g.waitFor(() => ['kickoff', 'play'].includes(window.__game.flow.match.state), null, 60000);
    await sleep(800);
    // troca automática desligada nos testes de botão (testada à parte no fim)
    await g.ev(() => { window.__qaSettings = window.__game.settings; window.__qaSettings.autoSwitch = false; });

    // ---- ATAQUE (com a bola)
    await scene('atk'); check(await waitMode('atk'), 'ATAQUE: layout aparece com a bola', n);
    await tapBtn('b-pass');
    check(await until(() => { const m = window.__game.flow.match; return m.ball.lastTouch === window.__qaMe && m.ball.owner !== window.__qaMe && m.ball.speed > 2; }), 'PASSE (toque rápido) passa a bola', n);
    await scene('atk'); await waitMode('atk');
    const dir = (await scene('atk')).dir; await waitMode('atk');
    await tapBtn('b-shoot');
    const s1 = await until((d) => { const b = window.__game.flow.match.ball; return b.lastTouch === window.__qaMe && b.speed > 6 && Math.sign(b.vel.x) === d; }, dir);
    const v1 = await g.ev(() => window.__game.flow.match.ball.speed);
    check(s1, `CHUTE (toque rápido) chuta para o gol (${v1.toFixed(1)} m/s)`, n);
    await scene('atk'); await waitMode('atk');
    let maxHold = 0;
    const c = await ctr('b-shoot'); const id = tid++;
    await g.touch('touchStart', [{ x: c.x, y: c.y, id }]);
    for (let k = 0; k < 8; k++) { await sleep(150); maxHold = Math.max(maxHold, await g.ev(() => window.__qaMe.shootHold)); }
    await g.touch('touchEnd', []);
    const s2 = await until(() => { const b = window.__game.flow.match.ball; return b.lastTouch === window.__qaMe && b.speed > 6; });
    check(s2 && maxHold > 0.2, `CHUTE segurado carrega a força (${Math.round(maxHold * 100)}%) e chuta`, n);
    await scene('atk'); await waitMode('atk');
    await tapBtn('b-lob');
    check(await until(() => { const b = window.__game.flow.match.ball; return b.lastTouch === window.__qaMe && b.pos.y > 0.9; }), 'LENÇOL levanta a bola', n);
    await scene('atk'); await waitMode('atk');
    await tapBtn('b-trick');
    check(await until(() => { const k = window.__qaMe.kick; return !!k && ['juggle', 'sombrero_flick'].includes(k.kind) || window.__game.flow.match.ball.pos.y > 0.5; }), 'FIRULA faz embaixadinha/chapéu', n);
    // CORRER: segura o joystick e compara a velocidade com e sem CORRER
    await scene('atk'); await waitMode('atk');
    await g.ev(() => window.__game.input.setStick({ x: 0.6, y: 0 }));
    await sleep(1500);
    const vWalk = await g.ev(() => window.__qaMe.vel.length());
    const sc = await ctr('b-sprint'); const sid = tid++;
    await g.touch('touchStart', [{ x: sc.x, y: sc.y, id: sid }]); await sleep(1500);
    const vRun = await g.ev(() => window.__qaMe.vel.length());
    await g.touch('touchEnd', []); await g.ev(() => window.__game.input.setStick(null));
    check(vRun > vWalk * 1.1, `CORRER aumenta a velocidade (${vWalk.toFixed(1)} → ${vRun.toFixed(1)} m/s)`, n);
    // FOGO: apagado sem barra (com dica); aceso e funcionando com a barra cheia
    await scene('atk'); await waitMode('atk');
    await g.ev(() => { const m = window.__game.flow.match; window.__qaMe.team.heat = 0; window.__qaMe.team.fire = 0; });
    await sleep(400);
    check(await g.ev(() => document.querySelector('#touch .b-fire').classList.contains('off')), 'FOGO apagado com a barra vazia', n);
    await tapBtn('b-fire'); await sleep(300);
    check(await g.ev(() => window.__game.touch.log.includes('hint') && document.querySelector('#touch .t-hint').textContent.length > 5), 'tocar em botão apagado mostra uma dica', n);
    await g.ev(() => { window.__qaMe.team.heat = 1; }); await sleep(500);
    await tapBtn('b-fire');
    check(await until(() => window.__qaMe.team.fire > 0), 'FOGO com a barra cheia ativa o Modo Fogo', n);
    await g.ev(() => { window.__qaMe.team.fire = 0; });
    await g.shot('toques_ataque');

    // ---- companheiro ganha a bola: o controle passa para ele e o layout continua ATAQUE
    await scene('sup');
    check(await until(() => { const m = window.__game.flow.match; return m.ball.owner && m.ball.owner.device === 'kb'; }), 'companheiro com a bola recebe o controle', n);
    check(await waitMode('atk'), 'layout ATAQUE para quem está com a bola', n);
    // passe em voo do meu time: layout não pula para DEFESA
    await scene('atk'); await waitMode('atk');
    await tapBtn('b-pass'); await sleep(250);
    check((await mode()) === 'atk', 'passe em andamento mantém o layout ATAQUE', n);

    // ---- DEFESA (adversário com a bola)
    await scene('def'); check(await waitMode('def'), 'DEFESA: layout aparece com o adversário na bola', n);
    await sleep(900);
    const ld = await g.ev(() => ({ pass: document.querySelector('#touch .b-pass span').textContent, press: getComputedStyle(document.querySelector('#touch .b-press')).opacity > 0.5, tackle: document.querySelector('#touch .b-tackle').getBoundingClientRect().width }));
    check(ld.pass === 'TROCAR' && ld.press && ld.tackle > 60, `TROCAR, MARCAR e CARRINHO grande (${JSON.stringify(ld)})`, n);
    await g.shot('toques_defesa');
    await tapBtn('b-tackle');
    check(await until(() => window.__qaMe.sliding > 0 || (window.__qaMe.kick && /tackle/.test(window.__qaMe.kick.kind))), 'CARRINHO dá o carrinho', n);
    await scene('deffar'); await waitMode('def');
    const d0 = await g.ev(() => { const o = window.__game.flow.match.ball.owner; return o ? o.pos.distanceTo(window.__qaMe.pos) : 99; });
    const pc = await ctr('b-press'); const pid = tid++;
    await g.ev(() => { const o = window.__game.flow.match.ball.owner; window.__qaOpp = o; o.vel.set(0, 0, 0); });
    await g.touch('touchStart', [{ x: pc.x, y: pc.y, id: pid }]); await sleep(2500);
    const d1 = await g.ev(() => window.__qaOpp.pos.distanceTo(window.__qaMe.pos));
    await g.touch('touchEnd', []);
    check(d1 < d0 - 1, `MARCAR corre sozinho até o adversário (${d0.toFixed(1)} → ${d1.toFixed(1)} m)`, n);
    await scene('deffar'); await waitMode('def'); await sleep(600);
    const before = await g.ev(() => window.__game.flow.match.all.find((x) => x.device === 'kb').data.id);
    await tapBtn('b-pass');
    check(await until((b) => window.__game.flow.match.all.find((x) => x.device === 'kb')?.data.id !== b, before), 'TROCAR troca o jogador controlado', n);

    // ---- toques imprecisos e rápidos
    await scene('atk'); await waitMode('atk');
    const a = await ctr('b-pass'), bS = await ctr('b-shoot');
    const logN = await g.ev(() => window.__game.touch.log.length);
    await press((a.x + bS.x) / 2, (a.y + bS.y) / 2 + 6);
    await sleep(300);
    check((await g.ev(() => window.__game.touch.log.length)) > logN, 'toque entre dois botões aciona o mais próximo', n);
    await scene('atk'); await waitMode('atk');
    for (let k = 0; k < 6; k++) await tapBtn('b-trick');
    await sleep(600);
    check((await g.ev(() => window.__game.touch.log.filter((x) => x.startsWith('trick')).length)) >= 6, 'seis toques rápidos seguidos são todos registrados', n);
    // dois dedos: joystick + botão, e dois botões ao mesmo tempo
    await scene('atk'); await waitMode('atk');
    const sp = await ctr('b-sprint'), sh = await ctr('b-shoot');
    await g.touch('touchStart', [{ x: 150, y: 290, id: 90 }]);
    await g.touch('touchMove', [{ x: 230, y: 290, id: 90 }]);
    await g.touch('touchStart', [{ x: 230, y: 290, id: 90 }, { x: sp.x, y: sp.y, id: 91 }]);
    await g.touch('touchStart', [{ x: 230, y: 290, id: 90 }, { x: sp.x, y: sp.y, id: 91 }, { x: sh.x, y: sh.y, id: 92 }]);
    await sleep(300);
    const three = await g.ev(() => { const i = window.__game.input; return { mx: i.state('kb').mx, run: i.held('kb', 'sprint'), shoot: i.held('kb', 'shoot') }; });
    await g.touch('touchEnd', []);
    check(three.mx > 0.5 && three.run && three.shoot, `três dedos: joystick + CORRER + CHUTE (${JSON.stringify(three)})`, n);
    await sleep(300);
    check(await g.ev(() => !window.__game.input.held('kb', 'sprint') && !window.__game.input.held('kb', 'shoot')), 'soltar todos os dedos solta tudo', n);
    // troca automática: adversário com a bola longe de mim e perto de um companheiro
    await g.ev(() => { window.__qaSettings.autoSwitch = true; });
    await scene('deffar');
    await g.ev(() => { const m = window.__game.flow.match; const me = window.__qaMe; const o = m.ball.owner; const mate = me.team.field.find((x) => x !== me && !x.isGK); mate.pos.copy(o.pos).add({ x: -me.team.dir * 1.5, y: 0, z: 0 }); mate.sync(); me.pos.set(-me.team.dir * 8, 0, -5); me.sync(); });
    check(await until(() => window.__game.flow.match.all.find((x) => x.device === 'kb') !== window.__qaMe), 'troca automática passa o controle para quem está perto da bola', n);
    const log = await g.ev(() => window.__game.touch.log.join(' '));
    n.push('  registro de toques: ' + log.slice(0, 400));
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
      g = await open({ gamepads: name === 'twoplayers' ? 2 : 0, iphone: name === 'iphone' || name === 'toques' });
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
  // acumula com rodadas anteriores (por suíte) para o relatório final
  const store = path.join(ROOT, 'docs', 'qa', 'results.json');
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(store, 'utf8')); } catch { /* primeira rodada */ }
  for (const r of results) prev[r.name] = { ...r, at: new Date().toISOString() };
  if (!process.env.QA_NO_MERGE) fs.writeFileSync(store, JSON.stringify(prev, null, 1));
  const order = Object.keys(SUITES);
  results.splice(0, results.length, ...order.filter((k) => prev[k]).map((k) => prev[k]));
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
