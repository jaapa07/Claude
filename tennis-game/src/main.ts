import * as THREE from 'three';
import { Renderer } from './render/renderer';
import { Assets, CORE_ASSETS } from './core/assets';
import { Audio } from './core/audio';
import { Input } from './core/input';
import { Save } from './core/save';
import { renderPortraits } from './render/portraits';
import { Session } from './game/session';
import { Venue } from './world/venue';
import { Athlete, type AnimName } from './game/athlete';
import { PLAYERS, VENUES, type PlayerDef, type VenueDef, type DifficultyId } from './data/content';
import { defaultConfig, type MatchConfig } from './game/rules';
import * as S from './ui/screens';
import { isTouch, isMobile, enterFullscreen, registerServiceWorker, FpsGovernor } from './core/platform';

const stage = document.getElementById('stage')!;
const R = new Renderer(stage);
let session: Session | null = null;
let paused = false;
let mode: 'menu' | 'match' | 'training' = 'menu';
let matchStart = 0;

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
const governor = new FpsGovernor((sc) => R.setDynamicScale(sc), isMobile ? 0.55 : 0.7);
// ------------------------------------------------------------------ 3D showcase on the player-select screen
const SHOW_AT = new THREE.Vector3(0, 0, 12.6);
let showcase: { a: Athlete; id: string; t: number } | null = null;
function clearShowcase() {
  if (!showcase) return;
  R.scene.remove(showcase.a.root);
  showcase = null;
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
  session.cam.set({ kind: 'track', from: new V(0.35, 1.25, SHOW_AT.z + 5.2), target: () => new V(-0.12, 0.98, SHOW_AT.z), fov: 30 }, false);
};
function updateShowcase(dt: number) {
  if (!showcase) return;
  const s = showcase;
  s.t += dt;
  const a = s.a;
  if (a.oneShot && a.oneShotDone()) { a.releaseOneShot(0.45); a.play('idle', { fade: 0.45 }); }
  a.root.rotation.y = 0.15 + Math.sin(s.t * 0.6) * 0.22;
  if (session) session.match.ball.mesh.visible = false;
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
  Venue.crowdDensity = o.quality === 'low' ? 0.35 : o.quality === 'medium' ? 0.65 : 1;
  Venue.shadowSize = o.quality === 'high' ? 2048 : 1024;
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
    exhibition: () => S.exhibitionSetup((setup) => {
      S.playerSelect('EXIBIÇÃO', (p1) => {
        S.playerSelect('EXIBIÇÃO', (p2) => startExhibition(p1, p2, setup), toMenu, { exclude: p1.id, who: setup.twoPlayers ? 'Jogador 2: escolha seu tenista' : 'Escolha o adversário' });
      }, toMenu);
    }, toMenu),
    training: () => S.playerSelect('TREINO', (p) => startTraining(p), toMenu),
    options: () => S.optionsScreen(toMenu, applyOptions),
    credits: () => S.creditsScreen(toMenu),
  });
}

function playMatch(p1: PlayerDef, p2: PlayerDef, venue: VenueDef, cfg: MatchConfig, difficulty: DifficultyId, p2Human: boolean, subtitle: string, onEnd: (won: boolean, s: Session) => void) {
  S.vsScreen(p1, p2, venue, subtitle, () => {
    document.getElementById('fade')!.classList.add('on');
    setTimeout(() => {
      endSession();
      mode = 'match';
      Input.twoKeyboards = p2Human;
      session = new Session(R, { p1, p2, venue, cfg, difficulty, p2Human, intro: true }, S.ui());
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

function startExhibition(p1: PlayerDef, p2: PlayerDef, setup: S.ExhibitionSetup) {
  const cfg: MatchConfig = { ...defaultConfig(), sets: setup.sets, gamesPerSet: setup.games, tiebreakAt: setup.games };
  playMatch(p1, p2, setup.venue, cfg, setup.difficulty, setup.twoPlayers, `${setup.sets === 1 ? 'SET ÚNICO' : 'MELHOR DE 3'} · ${setup.games} GAMES`, (won, s) => {
    const st = matchStats(s);
    const sets = s.match.score.setHistory;
    Audio.music('music_victory');
    S.resultsScreen({ a: p1, b: p2, winner: won ? 0 : 1, sets, ...st, title: setup.twoPlayers ? `${(won ? p1 : p2).short} VENCE!` : won ? 'VITÓRIA!' : 'DERROTA', lose: !won && !setup.twoPlayers }, [
      ['REVANCHE', () => startExhibition(p1, p2, setup)],
      ['MENU PRINCIPAL', () => { endSession(); toMenu(); }],
    ]);
  });
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

// ------------------------------------------------------------------ training: target practice
function startTraining(me: PlayerDef) {
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
        S.resultsScreen({ a: me, b: coach, winner: 0, sets: [], time: '1:00', stats: [{ label: 'Pontos', a: score, b: '' }, { label: 'Recorde', a: best, b: isRecord ? 'NOVO!' : '' }, { label: 'Medalha', a: medal, b: '' }], title: isRecord ? 'NOVO RECORDE!' : 'FIM DO TREINO', lose: false }, [
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
  (window as unknown as { __game: unknown }).__game = { get session() { return session; }, R, simulate: (sec: number) => { for (let t = 0; t < sec && session; t += 1 / 60) session.update(1 / 60); },
    touch: (t: Parameters<typeof Input.setTouch>[0]) => Input.setTouch(t),
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
