import * as THREE from 'three';
import { World, arenaDefs } from '../game/World';
import { Athlete, ATHLETE_URL } from '../game/Athlete';
import { assets, A, type Item } from '../core/Assets';
import { audio } from '../core/Audio';
import { input, type DeviceId } from '../core/Input';
import { settings, cupStore, DEFAULT_KEYS, type CupState } from '../core/Save';
import { t, tips } from '../core/Strings';
import { Match, type MatchOpts, type MatchResult } from '../match/Match';
import type { Team, Formation } from '../match/Team';
import TEAMS from '../data/teams.json';
import CREDITS from '../data/credits.json';
import { progress, ACH, BALLS, type AchId } from '../core/Progress';
import type { MiniKind, MiniResult } from '../match/MiniGames';

type TeamData = (typeof TEAMS.teams)[number];
const teams = TEAMS.teams;
const html = (s: string) => { const d = document.createElement('div'); d.className = 'screen'; d.innerHTML = s; return d; };

/** Navegação por teclado/controle numa lista de botões (também funciona com mouse). */
class Nav {
  i = 0;
  constructor(public items: HTMLElement[], public back?: () => void, public horiz = false) { this.mark(); items.forEach((it, k) => it.addEventListener('mouseenter', () => { this.i = k; this.mark(); })); }
  mark() { this.items.forEach((it, k) => it.classList.toggle('sel', k === this.i)); }
  update() {
    const m = input.menu;
    const prev = this.horiz ? m.left : m.up, next = this.horiz ? m.right : m.down;
    if (prev) { this.i = (this.i - 1 + this.items.length) % this.items.length; this.mark(); audio.play('ui_move', 0.5); }
    if (next) { this.i = (this.i + 1) % this.items.length; this.mark(); audio.play('ui_move', 0.5); }
    if (m.ok) { audio.play('ui_ok', 0.6); this.items[this.i]?.click(); return true; }
    if (m.back && this.back) { audio.play('ui_back', 0.6); this.back(); return true; }
    return false;
  }
}

export const CORE_ITEMS: Item[] = [
  { kind: 'gltf', url: ATHLETE_URL }, { kind: 'gltf', url: 'models/props/ball.glb' }, { kind: 'gltf', url: 'models/props/cone.glb' },
  { kind: 'gltf', url: 'models/props/trophy.glb' },
  ...['vfx/light_01.png', 'vfx/blob_shadow.png', 'vfx/puff_5x5.png', 'vfx/smoke_04.png', 'vfx/spark_04.png', 'vfx/star_06.png', 'vfx/flame_04.png',
    'vfx/confetti.png', 'vfx/explosion_3x3.png', 'vfx/circle_05.png', 'vfx/footprint.png', 'vfx/trace_01.png'].map((url) => ({ kind: 'tex' as const, url })),
];

export class Flow {
  world: World;
  ui = document.getElementById('ui')!;
  fadeEl = document.getElementById('fade')!;
  screen?: HTMLElement;
  nav?: Nav;
  match?: Match;
  scene = 'boot';
  show: Athlete[] = [];
  showBall?: THREE.Object3D;
  trophy?: THREE.Object3D;
  t = 0;
  tick?: (dt: number) => void;
  setup = {
    home: teams[0] as TeamData, away: teams[1] as TeamData, homeKit: 'home' as 'home' | 'away', awayKit: 'home' as 'home' | 'away',
    arena: 'copacabana', homeDevices: ['kb'] as DeviceId[], awayDevices: [] as DeviceId[], mode: 'friendly' as 'friendly' | 'cup' | 'training' | 'mini', mini: 'pk' as MiniKind,
  };
  cup: CupState | null = cupStore.load();
  private busy = false;

  constructor(world: World) { this.world = world; }

  // ------------------------------------------------------------------ utilidades
  private mount(el: HTMLElement) {
    this.screen?.remove();
    this.screen = el;
    this.ui.appendChild(el);
  }
  private async fade<T>(fn: () => T | Promise<T>) {
    // transições em sequência: se outra estiver em andamento, espera em vez de descartar
    while (this.busy) await new Promise((r) => setTimeout(r, 40));
    this.busy = true;
    this.fadeEl.className = 'on';
    await new Promise((r) => setTimeout(r, 470));
    await fn();
    this.fadeEl.className = 'out';
    await new Promise((r) => setTimeout(r, 470));
    this.fadeEl.className = '';
    this.busy = false;
  }
  private clearShow() {
    for (const a of this.show) a.dispose();
    this.show = [];
    this.showBall?.removeFromParent(); this.showBall = undefined;
    this.trophy?.removeFromParent(); this.trophy = undefined;
  }
  private endMatch() {
    this.match?.dispose();
    this.match = undefined;
    audio.crowd(false);
  }
  private kit(team: TeamData, kit: string, i: number) { return `textures/kits/${team.id}_${kit}_${i}.webp`; }

  update(dt: number) {
    this.t += dt;
    if (this.match) this.match.update(dt);
    else this.world.update(dt);
    for (const a of this.show) a.update(dt);
    this.tick?.(dt);
    if (!this.busy) this.nav?.update();
  }

  // ------------------------------------------------------------------ boot
  async boot() {
    const el = html(`<div class="screen boot"><img class="logo" src="${A('ui/logo.png')}"><div class="bar"><i></i></div><div class="pct title">0%</div></div>`);
    this.mount(el);
    const bar = el.querySelector('.bar i') as HTMLElement, pct = el.querySelector('.pct') as HTMLElement;
    await assets.loadAll([...CORE_ITEMS, ...World.arenaItems('copacabana')], (f) => { bar.style.width = `${f * 100}%`; pct.textContent = `${Math.round(f * 100)}%`; });
    this.world.setArena('copacabana');
    audio.init();
    this.title();
  }

  // ------------------------------------------------------------------ título
  title() {
    this.scene = 'title';
    this.clearShow();
    this.mount(html(`<div class="screen title-screen"><img class="logo" src="${A('ui/logo.png')}"><div class="press">${t('press_start')}</div>
      <div class="copy">Areia Quente · jogo original · assets CC0 (Kenney, Poly Haven, ambientCG, OpenGameArt)</div></div>`));
    this.nav = undefined;
    let ang = 0;
    this.tick = (dt) => {
      ang += dt * 0.06;
      const c = this.world.camera;
      c.position.set(Math.sin(ang) * 36, 21 + Math.sin(ang * 0.7) * 4, Math.cos(ang) * 36);
      c.lookAt(0, 2, 0);
      if (input.menu.start || input.menu.ok) { audio.unlock(); audio.play('ui_ok'); this.fade(() => this.mainMenu()); this.tick = undefined; }
    };
    this.screen!.addEventListener('click', () => { audio.unlock(); this.fade(() => this.mainMenu()); this.tick = undefined; });
  }

  // ------------------------------------------------------------------ menu principal
  mainMenu() {
    this.scene = 'menu';
    this.endMatch();
    this.clearShow();
    this.world.setArena('copacabana');
    audio.playMusic('menu');
    const opts: [string, string, () => void][] = [
      [t('menu_friendly'), 'Partida rápida contra a CPU ou um amigo.', () => { this.setup.mode = 'friendly'; this.fade(() => this.controlSelect()); }],
      [this.cup && !this.cup.done ? t('menu_continue_cup') : t('menu_cup'), '8 seleções, mata-mata até a grande final.', () => this.fade(() => (this.cup && !this.cup.done ? this.cupScreen() : this.cupNew()))],
      [t('menu_training'), 'Bicicletas, chapéus e voleios sem pressão.', () => { this.setup.mode = 'training'; this.fade(() => this.teamSelect(true)); }],
      ['Desafios da Praia', 'Pênaltis de Ouro, Embaixadinhas e Tiro ao Alvo. Bata seus recordes!', () => this.fade(() => this.challenges())],
      [`Conquistas (${progress.count()}/${Object.keys(ACH).length})`, 'Conquistas, estatísticas de carreira e bolas desbloqueáveis.', () => this.fade(() => this.achievements())],
      [t('menu_options'), 'Volume, duração, dificuldade, gráficos e controles.', () => this.fade(() => this.options())],
      [t('menu_credits'), 'Quem fez a areia esquentar.', () => this.fade(() => this.credits())],
    ];
    const el = html(`<div class="screen menu"><div class="col"><img class="logo" src="${A('ui/logo.png')}">${opts.map(([n]) => `<button class="btn"><span>${n}</span></button>`).join('')}<div class="desc"></div></div><div></div></div>`);
    this.mount(el);
    const btns = [...el.querySelectorAll('.btn')] as HTMLElement[];
    btns.forEach((b, i) => b.addEventListener('click', opts[i][2]));
    const desc = el.querySelector('.desc') as HTMLElement;
    this.nav = new Nav(btns);
    // vitrine 3D: craque fazendo embaixadinhas na areia
    const p = new Athlete(this.kit(teams[0], 'home', 4));
    p.root.position.set(1.5, 0, 3); p.root.rotation.y = -0.5; p.play('freestyle', 0);
    const p2 = new Athlete(this.kit(teams[7], 'home', 7));
    p2.root.position.set(4.4, 0, 1.2); p2.root.rotation.y = -0.9; p2.play('warmup_jacks', 0);
    this.world.root.add(p.root, p2.root); this.show.push(p, p2);
    const ball = assets.gltf('models/props/ball.glb').scene.clone(true);
    this.world.root.add(ball); this.showBall = ball;
    this.tick = (dt) => {
      desc.textContent = opts[this.nav!.i][1];
      const c = this.world.camera;
      c.position.set(-1.2 + Math.sin(this.t * 0.2) * 0.4, 1.9, 9.5); c.lookAt(2.4, 1.5, 2);
      const ph = (p.actionTime % 0.72) / 0.72;
      const fx = new THREE.Vector3(Math.sin(-0.5), 0, Math.cos(-0.5));
      ball.position.set(1.5 + fx.x * 0.5, 0.35 + Math.abs(Math.sin(ph * Math.PI * 2)) * 0.9, 3 + fx.z * 0.5);
      ball.rotation.x += dt * 6;
    };
  }

  // ------------------------------------------------------------------ controles
  controlSelect() {
    this.scene = 'ctrl';
    const el = html(`<div class="screen ctrl"><h1 class="title">${t('ctrl_title')}</h1><div class="cols"><div><h2>${t('home')}</h2><div class="slot" data-s="-1"></div></div>
      <div><h2>${t('cpu')}</h2><div class="slot" data-s="0"></div></div><div><h2>${t('away')}</h2><div class="slot" data-s="1"></div></div></div>
      <div class="hint">${t('ctrl_hint')} · <img src="${A('ui/input/key_enter.png')}"> ${t('play')} · <img src="${A('ui/input/key_escape.png')}"> ${t('back')}</div></div>`);
    this.mount(el);
    this.nav = undefined;
    const pos = new Map<DeviceId, number>();
    for (const d of this.setup.homeDevices) pos.set(d, -1);
    for (const d of this.setup.awayDevices) pos.set(d, 1);
    const render = () => {
      const devs = input.devices();
      for (const d of devs) if (!pos.has(d)) pos.set(d, d === 'kb' ? -1 : 0);
      el.querySelectorAll('.slot').forEach((s) => (s.innerHTML = ''));
      devs.forEach((d, i) => {
        const slot = el.querySelector(`.slot[data-s="${pos.get(d)}"]`)!;
        slot.insertAdjacentHTML('beforeend', `<div class="dev"><img src="${A(d === 'kb' ? 'ui/input/keyboard.png' : 'ui/input/controller.png')}"><b>${d === 'kb' ? 'TECLADO' : 'CONTROLE ' + (i)}</b></div>`);
      });
    };
    render();
    let last = 0;
    this.tick = () => {
      if (input.devices().length !== last) { last = input.devices().length; render(); }
      let changed = false;
      for (const d of input.devices()) {
        const s = input.state(d);
        const k = d === 'kb' ? input.kbDir : (Math.abs(s.mx) > 0.6 ? Math.sign(s.mx) : 0);
        const key = `__ax_${d}` as const;
        const prev = (this as any)[key] ?? 0;
        if (k !== 0 && prev === 0) { pos.set(d, THREE.MathUtils.clamp((pos.get(d) ?? 0) + k, -1, 1)); changed = true; audio.play('ui_move', 0.5); }
        (this as any)[key] = d === 'kb' ? 0 : k;
      }
      if (changed) render();
      if (input.menu.ok || input.menu.start) {
        this.setup.homeDevices = input.devices().filter((d) => pos.get(d) === -1);
        this.setup.awayDevices = input.devices().filter((d) => pos.get(d) === 1);
        audio.play('ui_ok');
        this.tick = undefined;
        this.fade(() => this.teamSelect(false));
      } else if (input.menu.back) { audio.play('ui_back'); this.tick = undefined; this.fade(() => this.mainMenu()); }
    };
  }

  // ------------------------------------------------------------------ seleção de times
  teamSelect(training: boolean, cupMode = false) {
    this.scene = 'teams';
    audio.playMusic('select');
    this.clearShow();
    let hi = teams.indexOf(this.setup.home), ai = teams.indexOf(this.setup.away);
    if (ai === hi) ai = (hi + 1) % teams.length;
    let focus = 0;
    const statRow = (k: string, v: number) => `<div><span>${t(k)}</span><span>${[1, 2, 3, 4, 5].map((i) => `<img src="${A(i <= v ? 'ui/star.png' : 'ui/star_empty.png')}">`).join('')}</span></div>`;
    const card = (side: 'l' | 'r') => `<div class="tcard panel ${side}"><div class="side">${side === 'l' ? t('home') : t('away')}</div>
      <div class="row"><span class="arrow" data-d="-1">◀</span><img class="em"><span class="arrow" data-d="1">▶</span></div>
      <div class="name"></div><div class="nick"></div><img class="flag"><div class="stats"></div><div class="kit"><div class="sw" data-k="home"></div><div class="sw" data-k="away"></div></div></div>`;
    const el = html(`<div class="screen teamsel"><h1 class="title">${training ? t('training_title') : t('team_select')}</h1>${card('l')}${training || cupMode ? '' : card('r')}
      <div class="arena-pick">${arenaDefs.map((a) => `<div class="a" data-a="${a.id}">${a.name}</div>`).join('')}</div>
      <div class="hint"><img src="${A('ui/input/key_arrows.png')}">times/uniformes · <img src="${A('ui/input/key_enter.png')}">${t('start_match')} · <img src="${A('ui/input/key_escape.png')}">${t('back')}</div></div>`);
    this.mount(el);
    this.nav = undefined;
    const cards = [...el.querySelectorAll('.tcard')] as HTMLElement[];
    const models: Athlete[] = [];
    const fill = (c: HTMLElement, team: TeamData, kit: string) => {
      (c.querySelector('.em') as HTMLImageElement).src = A(`ui/emblems/${team.id}.png`);
      (c.querySelector('.flag') as HTMLImageElement).src = A(`ui/flags/${team.id}.png`);
      c.querySelector('.name')!.textContent = team.name;
      c.querySelector('.nick')!.textContent = team.nick;
      c.querySelector('.stats')!.innerHTML = statRow('attack', team.stats.ataque) + statRow('defense', team.stats.defesa) + statRow('technique', team.stats.tecnica) + statRow('speed', team.stats.velocidade);
      const sws = c.querySelectorAll('.sw') as NodeListOf<HTMLElement>;
      sws[0].style.background = team.home.shirt; sws[0].style.borderColor = team.home.shorts;
      sws[1].style.background = team.away.shirt; sws[1].style.borderColor = team.away.shorts;
      sws.forEach((s) => s.classList.toggle('on', s.dataset.k === kit));
    };
    const refresh = () => {
      this.setup.home = teams[hi]; this.setup.away = teams[ai];
      fill(cards[0], teams[hi], this.setup.homeKit);
      if (cards[1]) fill(cards[1], teams[ai], this.setup.awayKit);
      cards.forEach((c, i) => c.classList.toggle('focus', i === focus));
      // evita uniformes iguais
      if (!training && teams[hi].id !== teams[ai].id && this.setup.homeKit === this.setup.awayKit) {
        const a = teams[hi][this.setup.homeKit].shirt, b = teams[ai][this.setup.awayKit].shirt;
        if (a === b) this.setup.awayKit = this.setup.awayKit === 'home' ? 'away' : 'home';
      }
      if (models[0]) models[0].setKit(this.kit(teams[hi], this.setup.homeKit, 4));
      if (models[1]) models[1].setKit(this.kit(teams[ai], this.setup.awayKit, 4));
      el.querySelectorAll('.arena-pick .a').forEach((a) => a.classList.toggle('on', (a as HTMLElement).dataset.a === this.setup.arena));
    };
    for (let i = 0; i < cards.length; i++) {
      const m = new Athlete(i === 0 ? this.kit(teams[hi], this.setup.homeKit, 4) : this.kit(teams[ai], this.setup.awayKit, 4));
      m.root.position.set(cards.length === 1 ? 0 : i === 0 ? -1.5 : 1.5, 0, 2);
      m.play(i === 0 ? 'idle_ready' : 'idle', 0);
      this.world.root.add(m.root); this.show.push(m); models.push(m);
    }
    cards.forEach((c, i) => {
      c.querySelectorAll('.arrow').forEach((a) => a.addEventListener('click', () => { focus = i; step(+(a as HTMLElement).dataset.d!); }));
      c.querySelectorAll('.sw').forEach((s) => s.addEventListener('click', () => { if (i === 0) this.setup.homeKit = (s as HTMLElement).dataset.k as any; else this.setup.awayKit = (s as HTMLElement).dataset.k as any; refresh(); }));
    });
    el.querySelectorAll('.arena-pick .a').forEach((a) => a.addEventListener('click', () => { this.setup.arena = (a as HTMLElement).dataset.a!; refresh(); }));
    const step = (d: number) => {
      if (focus === 0) hi = (hi + d + teams.length) % teams.length; else ai = (ai + d + teams.length) % teams.length;
      if (!training && hi === ai) { if (focus === 0) hi = (hi + d + teams.length) % teams.length; else ai = (ai + d + teams.length) % teams.length; }
      audio.play('ui_move', 0.6);
      models[focus]?.play(Math.random() < 0.5 ? 'celebrate_fist' : 'wave', 0.15);
      refresh();
    };
    refresh();
    let row = 0; // 0 = time, 1 = uniforme, 2 = arena
    this.tick = (dt) => {
      const c = this.world.camera;
      c.position.set(0, 1.7, 8); c.lookAt(0, 1.25, 2);
      models.forEach((m, i) => { m.root.rotation.y = Math.sin(this.t * 0.6 + i) * 0.5; if (m.locked <= 0 && !m.isLoco() && m.current !== 'idle_ready') m.play(i === 0 ? 'idle_ready' : 'idle', 0.3); });
      const M = input.menu;
      if (M.up) { row = (row + 2) % 3; audio.play('ui_move', 0.4); }
      if (M.down) { row = (row + 1) % 3; audio.play('ui_move', 0.4); }
      if (M.left || M.right) {
        const d = M.left ? -1 : 1;
        if (row === 0) step(d);
        else if (row === 1) { if (focus === 0) this.setup.homeKit = this.setup.homeKit === 'home' ? 'away' : 'home'; else this.setup.awayKit = this.setup.awayKit === 'home' ? 'away' : 'home'; refresh(); audio.play('ui_move', 0.5); }
        else { const i = arenaDefs.findIndex((a) => a.id === this.setup.arena); this.setup.arena = arenaDefs[(i + d + arenaDefs.length) % arenaDefs.length].id; refresh(); audio.play('ui_move', 0.5); }
      }
      if (input.pressed('kb', 'trick') || (input.devices()[1] && input.pressed(input.devices()[1], 'trick'))) { focus = cards.length > 1 ? 1 - focus : 0; refresh(); }
      cards.forEach((cc, i) => cc.style.outline = i === focus ? `3px solid ${row === 0 ? '#ffb81f' : row === 1 ? '#7fd2ff' : '#fff'}` : 'none');
      el.querySelector('.arena-pick')!.setAttribute('style', row === 2 ? 'filter:drop-shadow(0 0 10px #ffb81f)' : '');
      if (M.ok || M.start) {
        audio.play('ui_ok'); this.tick = undefined;
        if (cupMode) { this.fade(() => this.cupStart()); return; }
        if (training) { this.setup.mode = 'training'; this.setup.homeDevices = ['kb', ...input.devices().filter((d) => d !== 'kb')]; this.setup.awayDevices = []; }
        this.fade(() => { void this.loading(); });
      } else if (M.back) { audio.play('ui_back'); this.tick = undefined; this.fade(() => (training || cupMode ? this.mainMenu() : this.controlSelect())); }
      void dt;
    };
  }

  // ------------------------------------------------------------------ carregamento
  async loading(label?: string) {
    this.scene = 'loading';
    this.clearShow();
    const s = this.setup;
    const arena = arenaDefs.find((a) => a.id === s.arena)!;
    const tip = tips()[(Math.random() * tips().length) | 0];
    const mode = label ?? (s.mode === 'training' ? t('menu_training').toUpperCase() : t('friendly'));
    const el = html(`<div class="screen loading"><div class="stripe"></div><div class="mode">${mode}</div><div class="city">${arena.name.toUpperCase()} · ${arena.city}</div>
      <div class="vs"><div><img src="${A(`ui/flags/${s.home.id}.png`)}"><b>${s.home.id}</b></div>${s.mode === 'training' || s.mode === 'mini' ? '' : `<div class="x">VS</div><div><img src="${A(`ui/flags/${s.away.id}.png`)}"><b>${s.away.id}</b></div>`}</div>
      <div class="tipbox panel"><b>${t('tip')}</b>${tip}</div><div class="bar"><i></i></div></div>`);
    this.mount(el);
    this.nav = undefined;
    // herói em pose dinâmica (chute congelado) em estúdio
    if (this.world.arena) this.world.arena.visible = false;
    this.world.crowd.forEach((c) => (c.visible = false));
    const prevBg = this.world.scene.background, prevFog = this.world.scene.fog;
    this.world.scene.background = new THREE.Color(0x0b2e66); this.world.scene.fog = null;
    const hero = new Athlete(this.kit(s.home, s.homeKit, 4));
    hero.root.position.set(1.15, 0, 0); hero.root.rotation.y = -1.2; hero.play('shot', 0); hero.mixer.setTime(0.3); hero.currentAction!.paused = true;
    const ball = assets.gltf('models/props/ball.glb').scene.clone(true); ball.position.set(0.55, 0.35, 0.3);
    this.world.root.add(hero.root, ball);
    const c = this.world.camera;
    c.position.set(0, 1.05, 4.4); c.lookAt(0.2, 1.0, 0);
    const bar = el.querySelector('.bar i') as HTMLElement;
    const items: Item[] = [...World.arenaItems(s.arena)];
    const kitUrls: string[] = [];
    for (let i = 0; i < 10; i++) { kitUrls.push(this.kit(s.home, s.homeKit, i)); if (s.mode !== 'training' && s.mode !== 'mini') kitUrls.push(this.kit(s.away, s.awayKit, i)); }
    kitUrls.push('textures/kits/referee_0.webp', 'textures/kits/referee_1.webp', ...[0, 1, 2, 3].map((i) => `textures/kits/dancer_${i}.webp`));
    items.push(...kitUrls.map((url) => ({ kind: 'tex' as const, url })));
    const t0 = performance.now();
    await assets.loadAll(items, (f) => (bar.style.width = `${f * 100}%`));
    const minT = 2200 - (performance.now() - t0);
    if (minT > 0) await new Promise((r) => setTimeout(r, minT));
    hero.dispose(); ball.removeFromParent();
    this.world.scene.background = prevBg; this.world.scene.fog = prevFog;
    if (this.world.arena) this.world.arena.visible = true;
    this.world.crowd.forEach((cc) => (cc.visible = true));
    await this.fade(() => this.startMatch());
  }

  // ------------------------------------------------------------------ partida
  startMatch() {
    const s = this.setup;
    this.scene = 'match';
    this.clearShow();
    this.screen?.remove(); this.screen = undefined; this.nav = undefined;
    this.world.setArena(s.arena);
    const solo = s.mode === 'training' || s.mode === 'mini';
    const opts: MatchOpts = { home: s.home, away: solo ? teams[(teams.indexOf(s.home) + 1) % teams.length] : s.away,
      homeKit: s.homeKit, awayKit: solo ? 'home' : s.awayKit, arena: s.arena, homeDevices: s.homeDevices, awayDevices: s.awayDevices, mode: s.mode, noDraw: s.mode === 'cup',
      mini: s.mode === 'mini' ? s.mini : undefined };
    const m = new Match(this.world, opts);
    this.match = m;
    m.onEnd = (r) => this.results(r);
    m.onHalftime = (on) => this.halftimePanel(on);
    if (s.mode !== 'mini') progress.visitArena(s.arena);
    m.onEvent = (e, p, x) => this.achEvent(m, e, p, x);
    if (m.mini) {
      m.mini.onEnd = (r) => this.miniResult(r);
      m.start(false);
    } else if (s.mode === 'training') {
      const upd = (tr: typeof m.training) => {
        const lines = [{ text: `${t('ch_bicycle')} (${Math.min(5, tr.bicycle)}/5)`, ok: tr.bicycle >= 5 }, { text: `${t('ch_sombrero')} (${Math.min(3, tr.sombrero)}/3)`, ok: tr.sombrero >= 3 },
          { text: `${t('ch_volley')} (${Math.min(5, tr.volley)}/5)`, ok: tr.volley >= 5 }];
        m.hud.challenge([...lines, { text: '[L] sem bola: treinador cruza · [ESC] menu', ok: false }]);
        if (lines.every((l) => l.ok) && !tr.done) { tr.done = true; m.hud.big(t('ch_done'), true); m.fx.confettiBurst(new THREE.Vector3(0, 0, 0), 300, 20); audio.playMusic('victory'); }
      };
      m.onEvent = (e, p, x) => { if (e === 'training') { upd(x); if (x.done) progress.add('aluno'); } this.achEvent(m, e, p, x); };
      m.start(false);
      upd(m.training);
    } else m.start(true);
    this.tick = () => {
      if (!this.match) return;
      const pausePressed = input.devices().some((d) => input.pressed(d, 'pause'));
      if (pausePressed && ['play', 'kickoff', 'setpiece'].includes(this.match.state) && !this.match.paused) this.pause();
      else if (pausePressed && this.match.state === 'intro') { /* START pula a intro */ }
    };
  }

  pause() {
    const m = this.match!;
    m.paused = true;
    audio.play('ui_pop');
    const training = m.opts.mode === 'training' || m.opts.mode === 'mini';
    const opts: [string, () => void][] = training
      ? [[t('resume'), () => this.unpause()], [t('quit'), () => { this.unpause(); this.fade(() => this.mainMenu()); }]]
      : [[t('resume'), () => this.unpause()], [t('tactics'), () => this.tactics()], [t('subs'), () => this.subs()], [t('restart'), () => { this.unpause(); this.fade(() => { this.endMatch(); this.startMatch(); }); }],
        [t('quit'), () => { this.unpause(); this.fade(() => this.mainMenu()); }]];
    const el = html(`<div class="screen overlay"><div class="box panel"><h1 class="title">${t('pause')}</h1>${opts.map(([n]) => `<button class="btn"><span>${n}</span></button>`).join('')}</div></div>`);
    this.mount(el);
    const btns = [...el.querySelectorAll('.btn')] as HTMLElement[];
    btns.forEach((b, i) => b.addEventListener('click', opts[i][1]));
    this.nav = new Nav(btns, () => this.unpause());
  }
  unpause() {
    if (!this.match) return;
    this.match.paused = false;
    this.screen?.remove(); this.screen = undefined; this.nav = undefined;
  }

  private humanTeam(): Team | null { return this.match ? (this.match.teams.find((tm) => tm.human) ?? null) : null; }

  tactics() {
    const tm = this.humanTeam() ?? this.match!.teams[0];
    const fs: Formation[] = ['1-2-1', '2-2', '1-1-2'];
    const desc: Record<Formation, string> = { '1-2-1': 'Losango: equilíbrio total', '2-2': 'Quadrado: defesa sólida', '1-1-2': 'Dois pivôs: pressão no ataque' };
    const el = html(`<div class="screen overlay"><div class="box panel"><h1 class="title">${t('formation')}</h1>${fs.map((f) => `<button class="btn"><span>${f} — ${desc[f]}</span></button>`).join('')}</div></div>`);
    this.mount(el);
    const btns = [...el.querySelectorAll('.btn')] as HTMLElement[];
    btns.forEach((b, i) => b.addEventListener('click', () => { tm.formation = fs[i]; this.pause(); }));
    const nav = new Nav(btns, () => this.pause()); nav.i = fs.indexOf(tm.formation); nav.mark(); this.nav = nav;
  }

  subs() {
    const m = this.match!;
    const tm = this.humanTeam() ?? m.teams[0];
    let pickOn = -1;
    const render = () => {
      const el = html(`<div class="screen overlay subs"><div class="box panel"><h1 class="title">${t('subs')}</h1><div class="row">
        <div class="list">${tm.players.map((p, i) => `<div class="it ${pickOn === i ? 'pick' : ''}" data-on="${i}"><span>${p.data.number} ${p.data.short}</span><span>${p.data.pos} · ${Math.round(p.stamina * 100)}%</span></div>`).join('')}</div>
        <div class="list">${tm.bench.map((p, i) => `<div class="it" data-b="${i}"><span>${p.data.number} ${p.data.short}</span><span>${p.data.pos} · ${Math.round(p.stamina * 100)}%</span></div>`).join('')}</div></div>
        <button class="btn small"><span>${t('back')}</span></button></div></div>`);
      this.mount(el);
      const items = [...el.querySelectorAll('.it'), el.querySelector('.btn')!] as HTMLElement[];
      items.forEach((it) => it.addEventListener('click', () => {
        if (it.dataset.on) { pickOn = +it.dataset.on; audio.play('ui_tick'); render(); }
        else if (it.dataset.b && pickOn >= 0) { m.substitute(tm, pickOn, +it.dataset.b); m.hud.msg(`${t('sub_in')}: ${tm.players[pickOn].data.short}`); pickOn = -1; render(); }
        else if (it.classList.contains('btn')) this.pause();
      }));
      const nav = new Nav(items, () => this.pause());
      this.nav = nav;
    };
    render();
  }

  halftimePanel(on: boolean) {
    if (!on) { this.screen?.remove(); this.screen = undefined; return; }
    const m = this.match!;
    const [h, a] = m.teams;
    const tot = h.possT + a.possT || 1;
    const row = (k: string, x: string | number, y: string | number) => `<tr><td>${x}</td><td class="k">${k}</td><td>${y}</td></tr>`;
    this.mount(html(`<div class="screen halftime"><div class="box panel"><h1 class="title">${t('halftime')} · ${h.score} × ${a.score}</h1>
      <table class="stats-table">${row(t('possession'), Math.round((h.possT / tot) * 100) + '%', Math.round((a.possT / tot) * 100) + '%')}${row(t('shots'), h.shots, a.shots)}
      ${row(t('style_pts'), h.stylePts, a.stylePts)}${row(t('fouls'), h.fouls, a.fouls)}</table><div class="hint" style="position:static;margin-top:10px">${t('skip')}</div></div></div>`));
  }

  // ------------------------------------------------------------------ resultado
  results(r: MatchResult) {
    const m = this.match!;
    this.achResult(r);
    const [h, a] = [r.home, r.away];
    const humanSide = h.human ? h : a.human ? a : h;
    const won = r.winner === humanSide;
    const verdict = r.winner ? `${r.winner.data.name.toUpperCase()} ${t('winner')}` : t('draw');
    const tot = h.possT + a.possT || 1;
    const row = (k: string, x: string | number, y: string | number) => `<tr><td>${x}</td><td class="k">${k}</td><td>${y}</td></tr>`;
    const inCup = this.setup.mode === 'cup';
    const btns: [string, () => void][] = inCup ? [[t('next_match'), () => this.fade(() => this.cupAfter(r))]]
      : [[t('restart'), () => this.fade(() => { this.endMatch(); void this.loading(); })], [t('back_menu'), () => this.fade(() => this.mainMenu())]];
    const el = html(`<div class="screen results"><div class="col panel" style="padding:26px 30px;margin-left:4vw">
      <div class="verdict">${verdict}</div>
      <div class="sc"><img src="${A(`ui/emblems/${h.id}.png`)}">${h.score}<span style="opacity:.6">×</span>${a.score}<img src="${A(`ui/emblems/${a.id}.png`)}"></div>
      ${r.pens ? `<div class="mom">${t('penalties')}: <b>${h.penScore} × ${a.penScore}</b></div>` : ''}
      <table class="stats-table">${row(t('possession'), Math.round((h.possT / tot) * 100) + '%', Math.round((a.possT / tot) * 100) + '%')}${row(t('shots'), h.shots, a.shots)}${row(t('style_pts'), h.stylePts, a.stylePts)}${row(t('fouls'), h.fouls, a.fouls)}</table>
      <div class="mom">${t('man_of_match')}: <b>${r.mom.data.name}</b> (${r.mom.team.data.name}) · ${r.mom.goals} gol(s) · ${r.mom.style} pts</div>
      ${btns.map(([n]) => `<button class="btn"><span>${n}</span></button>`).join('')}</div><div></div></div>`);
    this.mount(el);
    const bs = [...el.querySelectorAll('.btn')] as HTMLElement[];
    bs.forEach((b, i) => b.addEventListener('click', btns[i][1]));
    this.nav = new Nav(bs);
    void won; void m;
  }

  // ------------------------------------------------------------------ copa
  cupNew() {
    this.setup.mode = 'cup';
    this.setup.homeDevices = ['kb', ...input.devices().filter((d) => d !== 'kb')];
    this.setup.awayDevices = [];
    this.teamSelect(false, true);
  }
  cupStart() {
    const me = this.setup.home.id;
    const all = [me, ...teams.map((x) => x.id).filter((x) => x !== me).sort(() => Math.random() - 0.5)];
    const r0 = [0, 1, 2, 3].map((i) => ({ a: all[i * 2], b: all[i * 2 + 1] }));
    this.cup = { team: me, kit: this.setup.homeKit, rounds: [r0, [], []], round: 0, done: false };
    cupStore.save(this.cup);
    this.cupScreen();
  }
  cupScreen() {
    this.scene = 'cup';
    this.endMatch();
    this.clearShow();
    audio.playMusic('select');
    const c = this.cup!;
    const T = (id: string) => teams.find((x) => x.id === id)!;
    const match = (mm: CupState['rounds'][0][0] | undefined) => {
      if (!mm) return `<div class="m"><div><span>—</span></div><div><span>—</span></div></div>`;
      const line = (id: string, g?: number, p?: number) => `<div class="${mm.winner ? (mm.winner === id ? 'w' : 'l') : ''}"><span><img src="${A(`ui/flags/${id}.png`)}"> ${T(id).name}</span><b>${g ?? ''}${p !== undefined ? ` (${p})` : ''}</b></div>`;
      return `<div class="m ${mm.a === c.team || mm.b === c.team ? 'me' : ''}">${line(mm.a, mm.ga, mm.pa)}${line(mm.b, mm.gb, mm.pb)}</div>`;
    };
    const names = [t('quarter'), t('semi'), t('final')];
    const cols = [0, 1, 2].map((r) => `<div class="round"><h3>${names[r]}</h3>${[...Array(4 >> r)].map((_, i) => match(c.rounds[r][i])).join('')}</div>`);
    const champ = `<div class="round"><h3>${t('champion')}</h3>${c.champion ? `<div class="m me"><div><span><img src="${A(`ui/flags/${c.champion}.png`)}"> ${T(c.champion).name}</span></div></div>` : '<div class="m"><div><span>?</span></div></div>'}</div>`;
    const eliminated = c.done && c.champion !== c.team;
    const el = html(`<div class="screen cup"><h1 class="title">${t('menu_cup')}</h1><div class="bracket">${cols.join('')}${champ}<div class="trophy"><img src="${A('ui/logo.png')}" style="width:180px"></div></div>
      ${c.done ? `<div class="verdict title" style="font-size:34px;color:#ffb81f">${eliminated ? t('eliminated') : t('champion')}</div>` : ''}
      <div style="display:flex;gap:16px">${c.done ? '' : `<button class="btn"><span>${t('play')}</span></button>`}<button class="btn"><span>${t('back_menu')}</span></button></div></div>`);
    this.mount(el);
    const bs = [...el.querySelectorAll('.btn')] as HTMLElement[];
    if (!c.done) bs[0].addEventListener('click', () => this.cupPlay());
    bs[bs.length - 1].addEventListener('click', () => this.fade(() => this.mainMenu()));
    this.nav = new Nav(bs, () => this.fade(() => this.mainMenu()), true);
    let ang = 0;
    this.tick = (dt) => { ang += dt * 0.05; const cam = this.world.camera; cam.position.set(Math.sin(ang) * 40, 22, Math.cos(ang) * 40); cam.lookAt(0, 0, 0); };
  }
  cupPlay() {
    const c = this.cup!;
    const mm = c.rounds[c.round].find((x) => x.a === c.team || x.b === c.team)!;
    const opp = mm.a === c.team ? mm.b : mm.a;
    this.setup.home = teams.find((x) => x.id === c.team)!;
    this.setup.away = teams.find((x) => x.id === opp)!;
    this.setup.homeKit = c.kit;
    this.setup.awayKit = this.setup.away.home.shirt === this.setup.home[c.kit].shirt ? 'away' : 'home';
    this.setup.mode = 'cup';
    this.setup.arena = arenaDefs[c.round % 3].id;
    if (c.round === 2) this.setup.arena = 'lagoa';
    this.tick = undefined;
    const names = [t('quarter'), t('semi'), t('final')];
    this.fade(() => { void this.loading(`${t('menu_cup').toUpperCase()} · ${names[c.round].toUpperCase()}`); });
  }
  cupAfter(r: MatchResult) {
    const c = this.cup!;
    const round = c.rounds[c.round];
    const T = (id: string) => teams.find((x) => x.id === id)!;
    for (const mm of round) {
      if (mm.winner) continue;
      if (mm.a === c.team || mm.b === c.team) {
        const meHome = r.home.id === c.team;
        const myG = meHome ? r.home.score : r.away.score, opG = meHome ? r.away.score : r.home.score;
        const myP = meHome ? r.home.penScore : r.away.penScore, opP = meHome ? r.away.penScore : r.home.penScore;
        const meA = mm.a === c.team;
        mm.ga = meA ? myG : opG; mm.gb = meA ? opG : myG;
        if (r.pens) { mm.pa = meA ? myP : opP; mm.pb = meA ? opP : myP; }
        mm.winner = r.winner ? r.winner.id : c.team;
      } else {
        // simulação ponderada pela força das seleções
        const sa = T(mm.a).stats, sb = T(mm.b).stats;
        const pa = sa.ataque + sa.tecnica + sa.velocidade, pb = sb.ataque + sb.tecnica + sb.velocidade;
        const goals = (atk: number, def: number) => Math.max(0, Math.round(2 + atk / 5 - def / 4 + Math.random() * 4 - 1));
        mm.ga = goals(pa, sb.defesa); mm.gb = goals(pb, sa.defesa);
        if (mm.ga === mm.gb) { mm.pa = 3; mm.pb = 2 + (Math.random() < 0.5 ? 2 : 0); }
        mm.winner = mm.ga > mm.gb || (mm.ga === mm.gb && (mm.pa ?? 0) > (mm.pb ?? 0)) ? mm.a : mm.b;
      }
    }
    const alive = round.some((mm) => mm.winner === c.team);
    if (c.round < 2) {
      const ws = round.map((mm) => mm.winner!);
      c.rounds[c.round + 1] = [...Array(ws.length / 2)].map((_, i) => ({ a: ws[i * 2], b: ws[i * 2 + 1] }));
    }
    if (!alive) {
      // simula o resto do torneio
      c.done = true;
      let rr = c.round + 1;
      while (rr <= 2) {
        for (const mm of c.rounds[rr]) { mm.ga = 1 + ((Math.random() * 4) | 0); mm.gb = (Math.random() * 4) | 0; if (mm.ga === mm.gb) mm.ga++; mm.winner = mm.a; }
        if (rr < 2) { const ws = c.rounds[rr].map((mm) => mm.winner!); c.rounds[rr + 1] = [...Array(ws.length / 2)].map((_, i) => ({ a: ws[i * 2], b: ws[i * 2 + 1] })); }
        rr++;
      }
      c.champion = c.rounds[2][0].winner;
    } else if (c.round === 2) {
      c.done = true; c.champion = c.team;
      progress.add('campeao');
      cupStore.save(c);
      void this.trophyScene();
      return;
    } else c.round++;
    cupStore.save(c);
    this.cupScreen();
  }

  async trophyScene() {
    this.endMatch();
    this.clearShow();
    audio.playMusic('victory');
    const c = this.cup!;
    const team = teams.find((x) => x.id === c.team)!;
    await assets.loadAll([...World.arenaItems('lagoa'), ...[...Array(10)].map((_, i) => ({ kind: 'tex' as const, url: this.kit(team, c.kit, i) }))]);
    this.scene = 'trophy';
    this.world.setArena('lagoa');
    const ps: Athlete[] = [];
    for (let i = 0; i < 7; i++) {
      const a = new Athlete(this.kit(team, c.kit, i));
      const ang = (i / 7) * Math.PI - Math.PI / 2;
      const k = i === 0 ? 4 : i === 4 ? 0 : i; // capitão = pivô (índice 4)
      a.setKit(this.kit(team, c.kit, k));
      a.root.position.set(i === 0 ? 0 : Math.sin(ang) * 2.6, 0, i === 0 ? 2.4 : Math.cos(ang) * 1.3 - 0.6);
      a.root.rotation.y = 0;
      a.play(i === 0 ? 'celebrate_trophy' : ['celebrate_samba', 'celebrate_fist', 'clap', 'celebrate_point_sky', 'dance_1', 'wave'][i % 6], 0);
      this.world.root.add(a.root); ps.push(a); this.show.push(a);
    }
    const tr = assets.gltf('models/props/trophy.glb').scene.clone(true);
    tr.scale.setScalar(1.1);
    this.world.root.add(tr); this.trophy = tr;
    const el = html(`<div class="screen" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:5vh">
      <div class="title" style="font-size:80px;color:#ffb81f;text-shadow:0 6px 0 #7a3b00">${t('champion')}</div><div class="title" style="font-size:34px">${team.name.toUpperCase()}</div>
      <button class="btn" style="position:absolute;bottom:6vh"><span>${t('back_menu')}</span></button></div>`);
    this.mount(el);
    const b = el.querySelector('.btn') as HTMLElement;
    b.addEventListener('click', () => this.fade(() => this.mainMenu()));
    this.nav = new Nav([b]);
    const fx = new (class { })();
    void fx;
    let ang = 0, conf = 0;
    const head = new THREE.Vector3();
    this.tick = (dt) => {
      ang += dt * 0.25;
      const cam = this.world.camera;
      cam.position.set(Math.sin(ang) * 1.8, 2.2, 7.8 + Math.cos(ang) * 0.6); cam.lookAt(0, 2.1, 1);
      ps[0].worldOf(ps[0].head, head);
      tr.position.copy(head).add(new THREE.Vector3(0, 0.55, 0));
      tr.rotation.y += dt * 0.8;
      conf -= dt;
      this.world.excitement = 1.2;
      if (conf <= 0) { conf = 0.15; }
    };
  }

  // ------------------------------------------------------------------ conquistas (ganchos)
  private achEvent(m: Match, e: string, p?: any, x?: any) {
    const human = (tm: any) => !!tm && tm.human;
    if (m.opts.mode === 'mini') return;
    if (e === 'goal' && x && !x.own && human(x.team)) {
      progress.add('primeiro_gol');
      if (x.kind === 'bicycle_kick') progress.add('bicicleta');
      if (x.kind === 'scissor_kick') progress.add('tesoura');
      if (x.kind === 'diving_header') progress.add('peixinho');
      if (p && p.goals >= 3) progress.add('hat_trick');
    }
    if (e === 'sombrero' && p && human(p.team)) progress.add('chapeu');
    if (e === 'fire' && human(x)) progress.add('fogo');
    if (e === 'combo' && human(x)) progress.add('combo');
  }
  private achResult(r: MatchResult) {
    const me = r.home.human ? r.home : r.away.human ? r.away : null;
    if (!me) return;
    const opp = me === r.home ? r.away : r.home;
    const st = progress.data.stats;
    st.matches++; st.goals += me.score; st.conceded += opp.score; st.styleBest = Math.max(st.styleBest, me.stylePts);
    if (r.winner === me) {
      st.wins++;
      progress.add('veterano');
      if (me.score - opp.score >= 5) progress.add('goleada');
      if (opp.score === 0) progress.add('muralha');
      if (r.pens) progress.add('sangue_frio');
    } else if (!r.winner) st.draws++; else st.losses++;
    progress.save();
  }

  // ------------------------------------------------------------------ desafios da praia (minijogos)
  challenges() {
    this.scene = 'challenges';
    this.endMatch();
    this.clearShow();
    audio.playMusic('select');
    const R = progress.data.records;
    const list: [MiniKind, string, string, string][] = [
      ['pk', 'Pênaltis de Ouro', '5 cobranças contra um goleiro cada vez melhor.', `Recorde: ${R.pk}/5`],
      ['juggle', 'Embaixadinhas', 'Mantenha a bola no ar o máximo que puder em 60 s.', `Recorde: ${R.juggle}`],
      ['target', 'Tiro ao Alvo', '10 bolas, alvos nos cantos do gol e um alvo móvel.', `Recorde: ${R.target} pts`],
    ];
    const el = html(`<div class="screen menu"><div class="col"><h1 class="title" style="font-size:40px;margin:0 0 8px">Desafios da Praia</h1>
      ${list.map(([, n, , r]) => `<button class="btn"><span>${n} <small style="opacity:.7;font-size:16px">· ${r}</small></span></button>`).join('')}
      <button class="btn"><span>${t('back')}</span></button><div class="desc"></div></div><div></div></div>`);
    this.mount(el);
    const btns = [...el.querySelectorAll('.btn')] as HTMLElement[];
    const desc = el.querySelector('.desc') as HTMLElement;
    btns.forEach((b, i) => b.addEventListener('click', () => {
      if (i === list.length) { this.fade(() => this.mainMenu()); return; }
      this.startMini(list[i][0]);
    }));
    this.nav = new Nav(btns, () => this.fade(() => this.mainMenu()));
    const p = new Athlete(this.kit(this.setup.home, this.setup.homeKit, 4));
    p.root.position.set(1.8, 0, 3); p.root.rotation.y = -0.6; p.play('juggle', 0);
    this.world.root.add(p.root); this.show.push(p);
    this.tick = () => {
      desc.textContent = this.nav!.i < list.length ? list[this.nav!.i][2] : '';
      const c = this.world.camera; c.position.set(-1.2, 1.9, 9.5); c.lookAt(2.4, 1.5, 2);
    };
  }
  startMini(kind: MiniKind) {
    this.setup.mode = 'mini';
    this.setup.mini = kind;
    this.setup.homeDevices = ['kb', ...input.devices().filter((d) => d !== 'kb')].slice(0, 1) as DeviceId[];
    this.setup.awayDevices = [];
    this.setup.arena = kind === 'pk' ? 'lagoa' : kind === 'juggle' ? 'dunas' : 'copacabana';
    this.tick = undefined;
    const names = { pk: 'PÊNALTIS DE OURO', juggle: 'EMBAIXADINHAS', target: 'TIRO AO ALVO' };
    this.fade(() => { void this.loading(names[kind]); });
  }
  miniResult(r: MiniResult) {
    const stars = [0, 1, 2].map((i) => `<img src="${A(i < r.stars ? 'ui/star.png' : 'ui/star_empty.png')}" style="width:64px">`).join('');
    const btns: [string, () => void][] = [['Jogar de novo', () => this.fade(() => { this.endMatch(); this.startMini(r.kind); })],
      ['Desafios da Praia', () => this.fade(() => this.challenges())], [t('back_menu'), () => this.fade(() => this.mainMenu())]];
    const el = html(`<div class="screen overlay"><div class="box panel" style="align-items:center;text-align:center">
      <h1 class="title">${{ pk: 'Pênaltis de Ouro', juggle: 'Embaixadinhas', target: 'Tiro ao Alvo' }[r.kind]}</h1>
      <div>${stars}</div><div class="title" style="font-size:44px;color:#ffb81f">${r.label}</div>
      ${r.best ? '<div class="title" style="color:#0fc48f">NOVO RECORDE!</div>' : `<div>Recorde: ${r.record}</div>`}
      ${btns.map(([n]) => `<button class="btn"><span>${n}</span></button>`).join('')}</div></div>`);
    this.mount(el);
    const bs = [...el.querySelectorAll('.btn')] as HTMLElement[];
    bs.forEach((b, i) => b.addEventListener('click', btns[i][1]));
    this.nav = new Nav(bs);
    if (r.stars >= 3) audio.playMusic('victory');
  }

  // ------------------------------------------------------------------ conquistas (tela)
  achievements() {
    this.scene = 'achievements';
    this.endMatch();
    this.clearShow();
    const st = progress.data.stats, R = progress.data.records;
    const ids = Object.keys(ACH) as AchId[];
    let ballI = Math.max(0, BALLS.findIndex((b) => b.id === progress.data.ball));
    const render = () => {
      const b = BALLS[ballI];
      const el = html(`<div class="screen ach"><div class="box panel">
        <h1 class="title">Conquistas <small>${progress.count()}/${ids.length}</small></h1>
        <div class="achgrid">${ids.map((id) => {
          const a = ACH[id], v = progress.data.ach[id] ?? 0, ok = progress.has(id);
          return `<div class="achcard ${ok ? 'ok' : ''}"><img src="${A(ok ? 'ui/star.png' : 'ui/star_empty.png')}"><div><b>${a.name}</b><span>${a.desc}</span>${a.goal > 1 ? `<i><u style="width:${(v / a.goal) * 100}%"></u></i>` : ''}</div></div>`;
        }).join('')}</div>
        <div class="achfoot"><div class="career"><b class="title">Carreira</b> ${st.matches} jogos · ${st.wins}V ${st.draws}E ${st.losses}D · ${st.goals} gols pró · ${st.conceded} contra ·
          recordes: pênaltis ${R.pk}/5, embaixadinhas ${R.juggle}, alvo ${R.target}</div>
          <div class="ballpick"><span class="arrow" data-d="-1">◀</span><div><b class="title">Bola da partida</b><div>${b.name} ${b.unlocked() ? (b.id === progress.data.ball ? '✔' : '') : '🔒 ' + b.need}</div></div><span class="arrow" data-d="1">▶</span></div>
          <button class="btn small"><span>${t('back')}</span></button></div></div></div>`);
      this.mount(el);
      el.querySelectorAll('.arrow').forEach((a) => a.addEventListener('click', () => step(+(a as HTMLElement).dataset.d!)));
      el.querySelector('.btn')!.addEventListener('click', () => { this.tick = undefined; this.fade(() => this.mainMenu()); });
      // bola giratória
      this.showBall?.removeFromParent();
      const ball = assets.gltf('models/props/ball.glb').scene.clone(true);
      ball.scale.setScalar(4);
      ball.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mt = (m.material as THREE.MeshStandardMaterial).clone(); m.material = mt;
        assets.texAsync(b.tex).then((tx) => { tx.flipY = false; tx.needsUpdate = true; mt.map = tx; mt.needsUpdate = true; });
        if (b.id === 'dourada') { mt.metalness = 0.75; mt.roughness = 0.25; } if (!b.unlocked()) mt.color.set(0x333333); } });
      ball.position.set(2.6, 1.3, 3); this.world.root.add(ball); this.showBall = ball;
    };
    const step = (d: number) => {
      ballI = (ballI + d + BALLS.length) % BALLS.length;
      if (BALLS[ballI].unlocked()) { progress.data.ball = BALLS[ballI].id; progress.save(); }
      audio.play('ui_move', 0.6);
      render();
    };
    render();
    this.nav = undefined;
    this.tick = (dt) => {
      const c = this.world.camera; c.position.set(0, 1.6, 9); c.lookAt(1.6, 1.3, 3);
      if (this.showBall) this.showBall.rotation.y += dt * 1.2;
      const M = input.menu;
      if (M.left || M.right) step(M.left ? -1 : 1);
      if (M.back || M.ok) { this.tick = undefined; audio.play('ui_back'); this.fade(() => this.mainMenu()); }
    };
  }

  // ------------------------------------------------------------------ opções
  options() {
    this.scene = 'options';
    const S = settings.data;
    type Opt = { k: string; get: () => string; step: (d: number) => void };
    const vol = (k: 'music' | 'sfx' | 'crowd'): Opt => ({ k: `volume_${k}`, get: () => `${Math.round(S[k] * 10)}`, step: (d) => { S[k] = THREE.MathUtils.clamp(Math.round(S[k] * 10 + d) / 10, 0, 1); audio.refreshVolumes(); } });
    const optsL: Opt[] = [vol('music'), vol('sfx'), vol('crowd'),
      { k: 'period_len', get: () => `${S.periodMinutes} min`, step: (d) => { const a = [2, 3, 5]; S.periodMinutes = a[(a.indexOf(S.periodMinutes) + d + 3) % 3]; } },
      { k: 'difficulty', get: () => t(['diff_easy', 'diff_normal', 'diff_hard'][S.difficulty]), step: (d) => { S.difficulty = ((S.difficulty + d + 3) % 3) as 0 | 1 | 2; } },
      { k: 'quality', get: () => t(['q_low', 'q_mid', 'q_high'][S.quality]) + ' (reinicia)', step: (d) => { S.quality = ((S.quality + d + 3) % 3) as 0 | 1 | 2; } }];
    const labels: Record<string, string> = { up: 'Cima', down: 'Baixo', left: 'Esquerda', right: 'Direita', pass: 'Passe / trocar', shoot: 'Chute', lob: 'Lençol', trick: 'Firula', sprint: 'Correr', tackle: 'Carrinho', fire: 'Modo Fogo', pause: 'Pausa' };
    let waiting: string | null = null;
    let sel = 0;
    const render = () => {
      const el = html(`<div class="screen options"><div class="box panel"><h1 class="title" style="text-align:center;margin:0 0 10px">${t('menu_options')}</h1>
        ${optsL.map((o, i) => `<div class="opt ${sel === i ? 'sel' : ''}" data-i="${i}"><span>${t(o.k)}</span><span class="v">◀ ${o.get()} ▶</span></div>`).join('')}
        <h2 class="title" style="font-size:20px;margin:16px 0 4px">${t('controls')}</h2><div style="opacity:.8">${t('remap_hint')}</div>
        <div class="keys">${Object.keys(DEFAULT_KEYS).map((k) => `<div class="k ${waiting === k ? 'wait' : ''}" data-k="${k}"><span>${labels[k]}</span><b>${waiting === k ? '...' : S.keys[k].replace('Key', '')}</b></div>`).join('')}</div>
        <div style="display:flex;gap:12px;margin-top:14px"><button class="btn small" data-a="reset"><span>Padrão</span></button><button class="btn small ${sel === optsL.length ? 'sel' : ''}" data-a="back"><span>${t('back')}</span></button></div></div></div>`);
      this.mount(el);
      el.querySelectorAll('.opt').forEach((o) => o.addEventListener('click', (e) => { sel = +(o as HTMLElement).dataset.i!; const r = (o as HTMLElement).getBoundingClientRect(); optsL[sel].step((e as MouseEvent).clientX > r.left + r.width / 2 ? 1 : -1); settings.save(); render(); }));
      el.querySelectorAll('.k').forEach((k) => k.addEventListener('click', () => { waiting = (k as HTMLElement).dataset.k!; input.anyKeyCode(); render(); }));
      el.querySelector('[data-a=reset]')!.addEventListener('click', () => { S.keys = { ...DEFAULT_KEYS }; settings.save(); render(); });
      el.querySelector('[data-a=back]')!.addEventListener('click', () => { settings.save(); this.tick = undefined; this.fade(() => this.mainMenu()); });
    };
    render();
    this.nav = undefined;
    this.tick = () => {
      if (waiting) {
        const k = input.anyKeyCode();
        if (k) { if (k !== 'Escape' || waiting === 'pause') S.keys[waiting] = k; waiting = null; settings.save(); render(); }
        return;
      }
      const M = input.menu;
      if (M.up) { sel = (sel + optsL.length) % (optsL.length + 1); render(); audio.play('ui_move', 0.4); }
      if (M.down) { sel = (sel + 1) % (optsL.length + 1); render(); audio.play('ui_move', 0.4); }
      if ((M.left || M.right) && sel < optsL.length) { optsL[sel].step(M.left ? -1 : 1); settings.save(); render(); audio.play('ui_tick', 0.5); }
      if ((M.ok && sel === optsL.length) || M.back) { settings.save(); audio.play('ui_back'); this.tick = undefined; this.fade(() => this.mainMenu()); }
    };
  }

  // ------------------------------------------------------------------ créditos
  credits() {
    this.scene = 'credits';
    const sections = CREDITS.sections.map((s) => `<h2>${s.title}</h2>${s.items.map((i) => `<p>${i}</p>`).join('')}`).join('');
    const el = html(`<div class="screen credits"><div class="roll"><img src="${A('ui/logo.png')}" style="width:420px"><h2>${t('credits_title')}</h2>${sections}<h2>Obrigado por jogar!</h2></div></div>`);
    this.mount(el);
    this.nav = undefined;
    audio.playMusic('halftime');
    this.tick = () => { if (input.menu.back || input.menu.ok) { this.tick = undefined; audio.play('ui_back'); this.fade(() => this.mainMenu()); } };
  }
}
