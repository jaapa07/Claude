import * as THREE from 'three';
import { Renderer } from './render/renderer';
import { Assets, CORE_ASSETS } from './core/assets';
import { Audio } from './core/audio';
import { Input } from './core/input';
import { Save } from './core/save';
import { renderPortraits, setPortraitRenderer } from './render/portraits';
import { Session } from './game/session';
import { CameraDirector } from './render/camera';
import { Venue } from './world/venue';
import { Athlete, type AnimName } from './game/athlete';
import { PLAYERS, VENUES, type PlayerDef, type VenueDef, type DifficultyId } from './data/content';
import { defaultConfig, type MatchConfig } from './game/rules';
import * as S from './ui/screens';
import * as C from './ui/career';
import { CATEGORY, SEASON, ROUND_NAMES, drawOpponent, loadCareer, newCareer, rankOf, rival, saveCareer, venueOf, type CareerData, type EventDef } from './game/career';
import { Portraits } from './render/portraits';
import { isTouch, isMobile, enterFullscreen, registerServiceWorker, FpsGovernor } from './core/platform';

const stage = document.getElementById('stage')!;
const R = new Renderer(stage);
setPortraitRenderer(R.renderer);
let session: Session | null = null;
let paused = false;
let mode: 'menu' | 'match' | 'training' = 'menu';
let matchStart = 0;

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
const governor = new FpsGovernor((sc) => R.setDynamicScale(sc), isMobile ? 0.55 : 0.7);
// ------------------------------------------------------------------ 3D showcase on the player-select screen
const SHOW_AT = new THREE.Vector3(0, 0, 12.6);
let showcase: { a: Athlete; id: string; t: number; shot?: Parameters<CameraDirector['set']>[0] } | null = null;
function clearShowcase() {
  if (!showcase) return;
  R.scene.remove(showcase.a.root);
  showcase.a.dispose();
  showcase = null;
  if (session) session.ballHidden = false;
  if (session) { for (const p of session.match.players) p.athlete.root.visible = true; session.match.ball.mesh.visible = true; }
}
S.MenuHooks.preview = (p) => {
  if (!session || !session.opts.demo) return;
  if (!p) {
    clearShowcase();
    session.cam.set({ kind: 'orbit', center: new THREE.Vector3(0, 0.5, 0), radius: 26, height: 9, speed: 0.06, angle: 0.6 }, false);
    return;
  }
  if (showcase?.id === p.id) return;
  const wide = window.innerWidth >= 1000 && window.innerHeight >= 600;
  if (!wide) return; // on phones the cards fill the screen; keep the arena orbit behind them
  clearShowcase();
  const a = new Athlete(p);
  a.root.position.copy(SHOW_AT);
  a.root.rotation.y = 0.15;
  a.play('idle', { fade: 0 });
  a.play((['fist_pump', 'cheer', 'point', 'fist_pump'] as AnimName[])[Math.floor(Math.random() * 4)], { fade: 0.12 });
  R.scene.add(a.root);
  showcase = { a, id: p.id, t: 0 };
  for (const q of session.match.players) q.athlete.root.visible = false; // the demo rally steps aside
  const V = THREE.Vector3;
  showcase.shot = { kind: 'track', from: new V(0.35, 1.25, SHOW_AT.z + 5.2), target: () => new V(-0.12, 0.98, SHOW_AT.z), fov: 30 };
  session.cam.set(showcase.shot, false);
};
function updateShowcase(dt: number) {
  if (!showcase) return;
  const s = showcase;
  s.t += dt;
  const a = s.a;
  if (a.oneShot && a.oneShotDone()) { a.releaseOneShot(0.45); a.play('idle', { fade: 0.45 }); }
  a.root.rotation.y = 0.15 + Math.sin(s.t * 0.6) * 0.22;
  if (session) {
    session.match.ball.mesh.visible = false;
    session.ballHidden = true;
    // the demo rally's own camera cuts (point won, replays) must not steal the shot from the showcase
    if (s.shot && session.cam.shot !== s.shot) session.cam.set(s.shot, false);
  }
  a.lookAt = R.camera.position;
  a.update(dt);
}

function frame() {
  requestAnimationFrame(frame);
  const raw = clock.getDelta();
  const dt = Math.min(raw, 0.05);
  if (session && mode !== 'menu' && !paused) governor.tick(raw);
  Input.pollGamepads();
  if (session && !paused) session.update(dt);
  updateShowcase(dt);
  if (session) R.render(dt);
  Input.endFrame();
}

function applyOptions() {
  const o = Save.data.options;
  for (const k of ['music', 'sfx', 'voice', 'crowd'] as const) Audio.setVolume(k, o.volume[k]);
  R.setQuality(o.quality);
  CameraDirector.mode = o.camera;
  Venue.crowdDensity = o.quality === 'low' ? 0.35 : o.quality === 'medium' ? 0.65 : 1;
  Venue.shadowSize = o.quality === 'high' ? 2048 : o.quality === 'medium' ? 1024 : isMobile ? 512 : 1024;
  document.documentElement.style.setProperty('--hud-scale', String(o.hudScale));
  const touch = o.touch === 'on' || (o.touch === 'auto' && isTouch);
  S.touchControls(touch && mode !== 'menu');
  document.querySelector('.pausebtn')?.classList.toggle('on', isTouch && mode !== 'menu');
}

// ------------------------------------------------------------------ background attract mode (AI vs AI)
function attract() {
  endSession();
  const v = VENUES[Math.floor(Math.random() * VENUES.length)];
  const a = PLAYERS[Math.floor(Math.random() * 8)];
  let b = PLAYERS[Math.floor(Math.random() * 8)];
  if (b.id === a.id) b = PLAYERS[(PLAYERS.indexOf(a) + 3) % 8];
  session = new Session(R, { p1: a, p2: b, venue: v, cfg: { ...defaultConfig(), gamesPerSet: 99 }, difficulty: 'hard', p2Human: false, demo: true }, S.ui());
  session.cam.set({ kind: 'orbit', center: new THREE.Vector3(0, 0.5, 0), radius: 26, height: 9, speed: 0.06, angle: 0.6 });
  // demo players are both AI
  session.match.players[0].human = false;
  session.match.players[0].diff = 'hard';
}

function endSession() {
  clearShowcase();
  if (session) { session.dispose(); session = null; }
  S.touchControls(false);
  document.querySelector('.pausebtn')?.classList.remove('on');
}

// ------------------------------------------------------------------ flows
function toMenu() {
  mode = 'menu';
  paused = false;
  Audio.music('music_menu');
  if (!session || !session.opts.demo) attract();
  S.mainMenu({
    arcade: () => S.playerSelect('ARCADE', (p) => startArcade(p), toMenu),
    career: () => startCareer(),
    exhibition: () => S.exhibitionSetup((setup) => {
      S.playerSelect('EXIBIÇÃO', (p1) => {
        const pickOpp = (partner?: PlayerDef) => S.playerSelect('EXIBIÇÃO', (p2) => {
          const rest = PLAYERS.filter((p) => !p.unlock && ![p1.id, p2.id, partner?.id].includes(p.id));
          startExhibition(p1, p2, setup, partner ? [partner, rest[Math.floor(Math.random() * rest.length)]] : undefined);
        }, toMenu, { exclude: p1.id, who: setup.twoPlayers ? 'Jogador 2: escolha seu tenista' : 'Escolha o adversário' });
        if (setup.doubles) S.playerSelect('DUPLAS', (partner) => pickOpp(partner), toMenu, { exclude: p1.id, who: 'Escolha seu parceiro de duplas' });
        else pickOpp();
      }, toMenu);
    }, toMenu),
    training: () => S.playerSelect('TREINO', (p) => startTraining(p), toMenu),
    options: () => S.optionsScreen(toMenu, applyOptions),
    credits: () => S.creditsScreen(toMenu),
  });
}

function playMatch(p1: PlayerDef, p2: PlayerDef, venue: VenueDef, cfg: MatchConfig, difficulty: DifficultyId, p2Human: boolean, subtitle: string, onEnd: (won: boolean, s: Session) => void, partners?: [PlayerDef, PlayerDef]) {
  const missing = [p1, p2, ...(partners ?? [])].filter((p) => !Portraits.has(p.id));
  if (missing.length) { renderPortraits(missing).then(() => playMatch(p1, p2, venue, cfg, difficulty, p2Human, subtitle, onEnd, partners)); return; }
  S.vsScreen(p1, p2, venue, subtitle, () => {
    document.getElementById('fade')!.classList.add('on');
    setTimeout(() => {
      endSession();
      mode = 'match';
      Input.twoKeyboards = p2Human;
      session = new Session(R, { p1, p2, venue, cfg, difficulty, p2Human, intro: true, partners }, S.ui());
      matchStart = performance.now();
      Audio.music(null);
      Audio.play('crowd_cheer', { vol: 0.5 });
      applyOptions();
      session.onFinished = (w) => onEnd(w === 0, session!);
      document.getElementById('fade')!.classList.remove('on');
    }, 380);
  });
}

function matchStats(s: Session) {
  const [a, b] = s.match.players;
  const ms = performance.now() - matchStart;
  const mm = Math.floor(ms / 60000), ss = Math.floor((ms % 60000) / 1000);
  return {
    time: `${mm}:${String(ss).padStart(2, '0')}`,
    stats: [
      { label: 'Pontos ganhos', a: a.stats.pointsWon, b: b.stats.pointsWon },
      { label: 'Aces', a: a.stats.aces, b: b.stats.aces },
      { label: 'Duplas faltas', a: a.stats.doubleFaults, b: b.stats.doubleFaults },
      { label: 'Winners', a: a.stats.winners, b: b.stats.winners },
      { label: 'Erros', a: a.stats.errors, b: b.stats.errors },
      { label: 'Smashes', a: a.stats.smashes, b: b.stats.smashes },
      { label: 'Pontos na rede', a: a.stats.netPoints, b: b.stats.netPoints },
      { label: 'Saque mais rápido', a: `${a.stats.maxServe} km/h`, b: `${b.stats.maxServe} km/h` },
    ],
  };
}

function startExhibition(p1: PlayerDef, p2: PlayerDef, setup: S.ExhibitionSetup, partners?: [PlayerDef, PlayerDef]) {
  const cfg: MatchConfig = { ...defaultConfig(), sets: setup.sets, gamesPerSet: setup.games, tiebreakAt: setup.games };
  playMatch(p1, p2, setup.venue, cfg, setup.difficulty, setup.twoPlayers, `${partners ? 'DUPLAS · ' : ''}${setup.sets === 1 ? 'SET ÚNICO' : 'MELHOR DE 3'} · ${setup.games} GAMES`, (won, s) => {
    const st = matchStats(s);
    const sets = s.match.score.setHistory;
    Audio.music('music_victory');
    S.resultsScreen({ a: p1, b: p2, winner: won ? 0 : 1, sets, ...st, title: setup.twoPlayers ? `${(won ? p1 : p2).short} VENCE!` : won ? 'VITÓRIA!' : 'DERROTA', lose: !won && !setup.twoPlayers }, [
      ['REVANCHE', () => startExhibition(p1, p2, setup, partners)],
      ['MENU PRINCIPAL', () => { endSession(); toMenu(); }],
    ]);
  }, partners);
}

// ------------------------------------------------------------------ arcade
function startArcade(me: PlayerDef) {
  const others = PLAYERS.filter((p) => p.id !== me.id && !p.unlock).sort(() => Math.random() - 0.5).slice(0, 4);
  const venues = [VENUES[0], VENUES[1], VENUES[2], VENUES[0]];
  const ladder = others.map((p, i) => ({ p, v: venues[i] }));
  ladder.push({ p: PLAYERS.find((p) => p.id === 'muro')!, v: VENUES[3] });
  const diffs: DifficultyId[] = ['easy', 'normal', 'normal', 'hard', 'boss'];
  const run = (stageI: number) => {
    endSession();
    attract();
    S.arcadeLadder(stageI, ladder, me, () => {
      const { p, v } = ladder[stageI];
      const cfg: MatchConfig = { ...defaultConfig(), sets: 1, gamesPerSet: stageI === 4 ? 3 : 2, tiebreakAt: stageI === 4 ? 3 : 2 };
      playMatch(me, p, v, cfg, diffs[stageI], false, `ARCADE ${stageI + 1}/5`, (won, s) => {
        const st = matchStats(s);
        if (won && stageI === ladder.length - 1) {
          Save.data.arcadeWins++;
          if (!Save.data.unlocked.includes('muro')) Save.data.unlocked.push('muro');
          Save.flush();
          Audio.music('music_victory');
          S.resultsScreen({ a: me, b: p, winner: 0, sets: s.match.score.setHistory, ...st, title: 'CAMPEÃO DO CIRCUITO!', lose: false }, [
            ['CRÉDITOS', () => { endSession(); S.creditsScreen(toMenu); }],
            ['MENU PRINCIPAL', () => { endSession(); toMenu(); }],
          ]);
          return;
        }
        if (won) {
          Audio.music('music_victory');
          S.resultsScreen({ a: me, b: p, winner: 0, sets: s.match.score.setHistory, ...st, title: 'VITÓRIA!', lose: false }, [['PRÓXIMA PARTIDA', () => run(stageI + 1)]]);
        } else {
          S.resultsScreen({ a: me, b: p, winner: 1, sets: s.match.score.setHistory, ...st, title: 'DERROTA', lose: true }, [
            ['CONTINUAR', () => run(stageI)],
            ['MENU PRINCIPAL', () => { endSession(); toMenu(); }],
          ]);
        }
      });
    });
  };
  run(0);
}

// ------------------------------------------------------------------ career (Circuito)
function startCareer() {
  const c = loadCareer();
  if (c) { Portraits.has(c.me.id) ? careerHome(c) : renderPortraits([c.me]).then(() => careerHome(c)); return; }
  C.createPlayer((me) => {
    const nc = newCareer(me);
    saveCareer(nc);
    renderPortraits([me]).then(() => C.messagePanel('BEM-VINDO AO CIRCUITO', [`${me.name} começa como nº ${rankOf(nc.points)} do mundo.`, 'Vença Challengers para entrar nos torneios GOLD e nos Grand Slams.', 'Treine e ganhe partidas para evoluir seus atributos.'], 'VAMOS', () => careerHome(nc)));
  }, toMenu);
}

function careerHome(c: CareerData) {
  mode = 'menu';
  if (!session || !session.opts.demo) attract();
  Audio.music('music_menu');
  c.bestRank = Math.min(c.bestRank, rankOf(c.points));
  saveCareer(c);
  C.careerHub(c, {
    play: () => careerEvent(c, SEASON[c.week], 0, [], []),
    friendly: () => careerFriendly(c),
    train: () => startTraining(c.me, (gained) => { c.statPoints += gained; saveCareer(c); careerHome(c); }),
    evolve: () => C.evolveScreen(c, () => { saveCareer(c); careerHome(c); }),
    partner: () => C.partnerScreen(c, () => { saveCareer(c); careerHome(c); }),
    skip: () => { advanceWeek(c); careerHome(c); },
    quit: () => { saveCareer(c); toMenu(); },
  });
}

function advanceWeek(c: CareerData) {
  c.week++;
  if (c.week >= SEASON.length) { c.week = 0; c.season++; c.points = Math.round(c.points * 0.7); } // ranking points age at season end
  saveCareer(c);
}

function careerPartner(c: CareerData, rankHint: number): PlayerDef {
  return PLAYERS.find((p) => p.id === c.partnerId) ?? rival(Math.max(1, rankHint), 7);
}

function careerEvent(c: CareerData, ev: EventDef, round: number, opps: PlayerDef[], results: (boolean | null)[]) {
  const salt = c.season * 100 + c.week;
  opps[round] ??= drawOpponent(ev, round, salt);
  const partner = ev.doubles ? careerPartner(c, rankOf(c.points)) : null;
  C.bracketScreen(ev, round, opps, results, c.me, partner, () => {
    const cat = CATEGORY[ev.category];
    const diff = cat.diff[Math.min(cat.diff.length - 1, round + (cat.diff.length - ev.rounds))];
    const cfg: MatchConfig = { ...defaultConfig(), sets: 1, gamesPerSet: cat.games, tiebreakAt: cat.games };
    const venue = venueOf(ev.venue);
    const oppPartner = ev.doubles ? drawOpponent(ev, round, salt + 991) : undefined;
    const names = ROUND_NAMES(ev.rounds);
    playMatch(c.me, opps[round], venue, cfg, diff, false, `${cat.label} · ${names[round]}`, (won, s) => {
      results[round] = won;
      const roundsWon = round + (won ? 1 : 0);
      const finished = !won || round === ev.rounds - 1;
      const st = matchStats(s);
      if (won) c.statPoints += 1;
      if (!finished) {
        Audio.music('music_victory');
        S.resultsScreen({ a: c.me, b: opps[round], winner: 0, sets: s.match.score.setHistory, ...st, title: `${names[round]}: VITÓRIA!`, lose: false }, [['PRÓXIMA RODADA', () => { endSession(); careerEvent(c, ev, round + 1, opps, results); }]]);
        return;
      }
      const idx = roundsWon + (cat.points.length - 1 - ev.rounds);
      const pts = cat.points[Math.max(0, idx)], prize = cat.prize[Math.max(0, idx)];
      const before = rankOf(c.points);
      c.points += pts; c.money += prize;
      const champion = won && round === ev.rounds - 1;
      if (champion) c.titles.push({ name: ev.name, category: ev.category, season: c.season });
      c.results.push({ event: ev.name, reached: champion ? 'CAMPEÃO' : names[round], season: c.season });
      const after = rankOf(c.points);
      advanceWeek(c);
      Audio.music('music_victory');
      S.resultsScreen({ a: c.me, b: opps[round], winner: won ? 0 : 1, sets: s.match.score.setHistory, ...st, title: champion ? 'CAMPEÃO!' : won ? 'VITÓRIA!' : 'ELIMINADO', lose: !won }, [['CONTINUAR', () => {
        endSession();
        C.messagePanel(champion ? `CAMPEÃO DO ${cat.label}!` : 'FIM DO TORNEIO', [`${ev.name}: ${champion ? 'título!' : names[round].toLowerCase()}`, `+${pts} pontos · +$ ${prize.toLocaleString('pt-BR')}`, `Ranking: nº ${before} → nº ${after}${after === 1 ? ' · NÚMERO 1 DO MUNDO!' : ''}`], 'CONTINUAR', () => careerHome(c));
      }]]);
    }, ev.doubles && partner && oppPartner ? [partner, oppPartner] : undefined);
  }, () => { advanceWeek(c); careerHome(c); });
}

function careerFriendly(c: CareerData) {
  const r = rankOf(c.points);
  const opp = rival(Math.max(1, Math.round(r * (0.6 + Math.random() * 0.8))), Date.now() % 1000);
  const venue = VENUES[Math.floor(Math.random() * VENUES.length)];
  const cfg: MatchConfig = { ...defaultConfig(), sets: 1, gamesPerSet: 2, tiebreakAt: 2 };
  playMatch(c.me, opp, venue, cfg, r > 150 ? 'easy' : r > 40 ? 'normal' : 'hard', false, 'AMISTOSO', (won, s) => {
    const prize = won ? 1500 : 400;
    c.money += prize;
    if (won) c.statPoints += 1;
    saveCareer(c);
    Audio.music('music_victory');
    S.resultsScreen({ a: c.me, b: opp, winner: won ? 0 : 1, sets: s.match.score.setHistory, ...matchStats(s), title: won ? 'VITÓRIA NO AMISTOSO' : 'DERROTA NO AMISTOSO', lose: !won }, [['VOLTAR AO CIRCUITO', () => { endSession(); careerHome(c); }]]);
  });
}

// ------------------------------------------------------------------ training: target practice
function startTraining(me: PlayerDef, onDone?: (score: number) => void) {
  const coach = PLAYERS.find((p) => p.id !== me.id)!;
  const venue = VENUES[0];
  document.getElementById('fade')!.classList.add('on');
  setTimeout(() => {
    endSession();
    mode = 'training';
    session = new Session(R, { p1: me, p2: coach, venue, cfg: defaultConfig(), difficulty: 'normal', p2Human: false }, S.ui());
    applyOptions();
    const m = session.match;
    m.training = true;
    session.hud?.el.querySelectorAll('.top, .score-box').forEach((e) => ((e as HTMLElement).style.visibility = 'hidden'));
    m.setupPoint();
    Audio.music('music_match');
    // targets
    const targets: { mesh: THREE.Mesh; x: number; z: number; r: number; pts: number }[] = [];
    const mk = (x: number, z: number, r: number, pts: number, color: string) => {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(r * 0.8, r, 48), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, transparent: true, opacity: 0.85, depthWrite: false }));
      const fill = new THREE.Mesh(new THREE.CircleGeometry(r * 0.8, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }));
      mesh.add(fill);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.02, z);
      R.scene.add(mesh);
      targets.push({ mesh, x, z, r, pts });
    };
    const layout = () => {
      for (const t of targets) R.scene.remove(t.mesh);
      targets.length = 0;
      mk((Math.random() < 0.5 ? -1 : 1) * (2.4 + Math.random() * 1.2), -(9 + Math.random() * 2), 0.9, 100, '#f5c542');
      mk((Math.random() - 0.5) * 4, -(4.5 + Math.random() * 2), 1.2, 50, '#3ff7ff');
      mk((Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2), -(10 + Math.random() * 1.2), 1.4, 30, '#ff4d5a');
    };
    layout();
    let score = 0, time = 60, combo = 0;
    const box = document.createElement('div');
    box.className = 'banner';
    box.style.top = '70px';
    box.innerHTML = '<div style="font-size:30px"></div>';
    S.ui().appendChild(box);
    const paint = () => ((box.firstElementChild as HTMLElement).textContent = `TREINO DE PRECISÃO · ${score} PTS · ${Math.ceil(time)}s${combo > 1 ? ` · COMBO x${combo}` : ''}`);
    paint();
    m.onTrainingLand = (p, inCourt) => {
      let hit = false;
      for (const t of targets) {
        if (Math.hypot(p.x - t.x, p.z - t.z) < t.r) {
          hit = true;
          combo++;
          const pts = t.pts * Math.min(combo, 4);
          score += pts;
          session!.hud?.call(`+${pts}`, combo > 1 ? `COMBO x${combo}` : 'NA MOSCA!', 'gold', 1);
          session!.fx.burst(new THREE.Vector3(t.x, 0.2, t.z), { n: 60, color: (t.mesh.material as THREE.MeshStandardMaterial).color, speed: 5, up: 1.4, size: 0.14, life: 0.9, grav: 4 });
          Audio.play('jingle_point', { vol: 0.6 });
          Audio.play('crowd_cheer', { vol: 0.35 });
          layout();
          break;
        }
      }
      if (!hit) { combo = 0; if (!inCourt) session!.hud?.call('FORA', '', 'red', 0.8); }
      paint();
    };
    const timer = setInterval(() => {
      if (paused || !session || session.match !== m) return;
      time -= 0.25;
      paint();
      if (time <= 0) {
        clearInterval(timer);
        box.remove();
        for (const t of targets) R.scene.remove(t.mesh);
        const best = Math.max(score, Save.data.records.trainingBest);
        const isRecord = score > Save.data.records.trainingBest;
        Save.data.records.trainingBest = best;
        Save.flush();
        const medal = score >= 1200 ? 'OURO' : score >= 600 ? 'PRATA' : score >= 250 ? 'BRONZE' : '—';
        const gained = onDone ? Math.max(1, Math.floor(score / 250)) : 0;
        S.resultsScreen({ a: me, b: coach, winner: 0, sets: [], time: '1:00', stats: [{ label: 'Pontos', a: score, b: '' }, { label: 'Recorde', a: best, b: isRecord ? 'NOVO!' : '' }, { label: 'Medalha', a: medal, b: '' }, ...(onDone ? [{ label: 'Evolução', a: `+${gained}`, b: '' }] : [])], title: isRecord ? 'NOVO RECORDE!' : 'FIM DO TREINO', lose: false },
          onDone ? [['VOLTAR AO CIRCUITO', () => { endSession(); onDone(gained); }]] : [
          ['DE NOVO', () => startTraining(me)],
          ['MENU PRINCIPAL', () => { endSession(); toMenu(); }],
        ]);
      }
    }, 250);
    session.onFinished = () => {};
    session.skipIntro();
    document.getElementById('fade')!.classList.remove('on');
  }, 380);
}

// ------------------------------------------------------------------ pause & skip
Input.onAction((a) => {
  if (mode === 'menu' || !session) return;
  if (a === 'pause' && !paused) {
    paused = true;
    session.match.paused = true;
    S.pauseMenu(
      () => { paused = false; session!.match.paused = false; },
      () => { paused = false; endSession(); toMenu(); },
      () => S.optionsScreen(() => { paused = false; session!.match.paused = false; }, applyOptions),
    );
  } else if ((a === 'confirm') && !paused) {
    session.requestSkip();
  }
});

// ------------------------------------------------------------------ boot
async function boot() {
  Save.load();
  Input.init();
  const load = S.loadingScreen();
  await Assets.loadAll({ ...CORE_ASSETS, hdr: VENUES.map((v) => `sky/${v.hdri}.jpg`) }, (f) => load.set(f * 0.85));
  await Assets.loadExtraClips('models/mixamo_clips.json'); // optional motion-capture moves
  await Audio.init();
  load.set(0.9);
  await renderPortraits(PLAYERS);
  load.set(1);
  applyOptions();
  frame();
  attract();
  load.close();
  S.titleScreen(() => { enterFullscreen(); toMenu(); });
  registerServiceWorker();
  // on-screen pause button and tap-to-skip (intro / replay / match end) for touch devices
  const pb = document.createElement('button');
  pb.className = 'pausebtn';
  pb.textContent = 'II';
  pb.setAttribute('aria-label', 'Pausa');
  pb.addEventListener('click', (e) => { e.stopPropagation(); Input.trigger('pause'); });
  S.ui().appendChild(pb);
  document.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button, .stick, .overlay, .panel')) return;
    if (mode === 'menu' || !session || paused) return;
    if (session.flow === 'intro' || session.flow === 'replay' || session.flow === 'matchEnd') session.requestSkip();
  });
  // expose for automated tests
  (window as unknown as { __game: unknown }).__game = { get session() { return session; }, R, simulate: (sec: number) => { for (let t = 0; t < sec && session; t += 1 / 60) { session.update(1 / 60); Input.endFrame(); } },
    touch: (t: Parameters<typeof Input.setTouch>[0]) => Input.setTouch(t),
    demoDoubles: (i: number) => { endSession(); session = new Session(R, { p1: PLAYERS[0], p2: PLAYERS[1], partners: [PLAYERS[5], PLAYERS[6]], venue: VENUES[i], cfg: defaultConfig(), difficulty: 'hard', p2Human: false }, S.ui()); session.skipIntro(); return 'ok'; },
    demoVenue: (i: number) => { endSession(); session = new Session(R, { p1: PLAYERS[i * 2 % 8], p2: PLAYERS[(i * 2 + 1) % 8], venue: VENUES[i], cfg: defaultConfig(), difficulty: 'hard', p2Human: false }, S.ui()); session.skipIntro(); return 'ok'; } };
}

boot().catch((e) => {
  console.error(e);
  const msg = e instanceof Error ? e.message : (e && (e as Event).type) ? `falha ao carregar ${((e as Event).target as HTMLImageElement | null)?.src ?? 'um arquivo'}` : String(e);
  const el = document.createElement('div');
  el.className = 'loading';
  el.innerHTML = '<div class="inner"><h2 style="font-family:Anton,sans-serif;letter-spacing:2px">ERRO AO CARREGAR</h2><p class="tip"></p><pre style="white-space:pre-wrap;color:#f88;font-size:12px;text-align:left;max-height:40vh;overflow:auto"></pre></div>';
  el.querySelector('.tip')!.textContent = msg;
  el.querySelector('pre')!.textContent = String((e as Error)?.stack ?? '');
  document.getElementById('ui')!.replaceChildren(el);
});
