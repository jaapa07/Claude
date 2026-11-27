import { Input, type Action } from '../core/input';
import { Audio } from '../core/audio';
import { PLAYERS, VENUES, DIFFICULTY, type PlayerDef, type VenueDef, type DifficultyId } from '../data/content';
import { Portraits } from '../render/portraits';
import { Save } from '../core/save';

export const ui = () => document.getElementById('ui')!;
const h = (html: string) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild as HTMLElement; };

/** Generic keyboard/gamepad/mouse navigation for a list of focusable elements. */
export function navigable(items: HTMLElement[], opts: { onConfirm: (i: number) => void; onBack?: () => void; onMove?: (i: number) => void; onLeftRight?: (i: number, dir: -1 | 1) => void; columns?: number; start?: number; isEnabled?: (i: number) => boolean }) {
  let sel = opts.start ?? 0;
  const cols = opts.columns ?? 1;
  const paint = () => items.forEach((el, i) => el.classList.toggle('sel', i === sel));
  const move = (n: number) => {
    if (n < 0 || n >= items.length || n === sel) return;
    sel = n;
    paint();
    Audio.play('ui_move', { vol: 0.6 });
    opts.onMove?.(sel);
  };
  const off = Input.onAction((a: Action) => {
    if (a === 'up') move(sel - cols);
    else if (a === 'down') move(sel + cols);
    else if (a === 'left') { if (cols > 1) move(sel - 1); else if (opts.onLeftRight) { opts.onLeftRight(sel, -1); Audio.play('ui_move', { vol: 0.6 }); } }
    else if (a === 'right') { if (cols > 1) move(sel + 1); else if (opts.onLeftRight) { opts.onLeftRight(sel, 1); Audio.play('ui_move', { vol: 0.6 }); } }
    else if (a === 'confirm') { if (opts.isEnabled && !opts.isEnabled(sel)) { Audio.play('ui_back'); return; } Audio.play('ui_ok', { vol: 0.8 }); opts.onConfirm(sel); }
    else if (a === 'back' || a === 'pause') { if (opts.onBack) { Audio.play('ui_back', { vol: 0.8 }); opts.onBack(); } }
  });
  items.forEach((el, i) => {
    el.addEventListener('mouseenter', () => move(i));
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (i !== sel) move(i);
      if (opts.isEnabled && !opts.isEnabled(i)) { Audio.play('ui_back'); return; }
      const t = ev.target as HTMLElement;
      if (opts.onLeftRight && t.closest('.v')) { const r = (t.closest('.v') as HTMLElement).getBoundingClientRect(); opts.onLeftRight(i, ev.clientX < r.left + r.width / 2 ? -1 : 1); Audio.play('ui_move', { vol: 0.6 }); return; }
      Audio.play('ui_ok', { vol: 0.8 });
      opts.onConfirm(i);
    });
  });
  paint();
  opts.onMove?.(sel);
  return { off, get sel() { return sel; } };
}

/** Add a screen with staggered entrance animation (and a stripe wipe for full screens). */
function mount(el: HTMLElement) {
  const groups = ['.item', '.card', '.venue', '.opt', 'table.st tr', '.stat', '.res-head .p', '.controls-grid > *', '.credits > *'];
  for (const sel of groups) el.querySelectorAll<HTMLElement>(sel).forEach((n, i) => n.style.setProperty('--i', String(i)));
  el.classList.add('enter');
  if (el.classList.contains('screen') || el.classList.contains('menu')) wipe();
  ui().appendChild(el);
  return el;
}

/** Remove a screen with a short exit animation. */
export function leave(el: HTMLElement) {
  el.style.pointerEvents = 'none';
  const a = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-30px) skewX(-4deg)' }], { duration: 180, easing: 'ease-in' });
  a.onfinish = () => el.remove();
}

/** Diagonal stripe wipe across the screen (menu transitions). */
export function wipe() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const w = document.createElement('div');
  w.className = 'wipe';
  w.innerHTML = '<i></i><i></i><i></i>';
  document.getElementById('app')!.appendChild(w);
  [...w.children].forEach((b, i) => (b as HTMLElement).animate(
    [{ transform: 'translateX(-130%) skewX(-24deg)' }, { transform: 'translateX(0%) skewX(-24deg)', offset: 0.45 }, { transform: 'translateX(130%) skewX(-24deg)' }],
    { duration: 520, delay: i * 55, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'both' },
  ));
  setTimeout(() => w.remove(), 760);
}
const flag = (c: [string, string, string]) => `<span class="fl">${c.map((x) => `<i style="background:${x}"></i>`).join('')}</span>`;

// ------------------------------------------------------------------ loading
export function loadingScreen() {
  const tips = [
    'Aperte o botão de golpe ANTES da bola chegar: quanto mais cedo, mais forte e preciso.',
    'Direcional no momento do contato escolhe o canto. Para cima = mais fundo.',
    'Slice + para baixo faz uma deixadinha.',
    'No saibro a bola quica alto e lento. Na grama, baixo e rápido.',
    'No saque, aperte de novo quando o medidor estiver no topo.',
    'Lob contra quem sobe à rede!',
  ];
  const el = mount(h(`<div class="loading"><div class="inner"><img src="assets/ui/logo.svg" alt="GRAND SLAM ARCADE"/><div class="lball"><b></b><s></s></div><div class="bar"><i></i></div><div class="tip">${tips[Math.floor(Math.random() * tips.length)]}</div></div></div>`));
  return {
    set(f: number) { (el.querySelector('.bar i') as HTMLElement).style.width = `${Math.round(f * 100)}%`; },
    close() { el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).onfinish = () => el.remove(); },
  };
}

// ------------------------------------------------------------------ title
export function titleScreen(onStart: () => void) {
  const touch = document.documentElement.classList.contains('is-touch');
  const el = mount(h(`<div class="title"><img class="logo" src="assets/ui/logo.svg" alt="GRAND SLAM ARCADE"/><div class="press">${touch ? 'TOQUE PARA JOGAR' : 'PRESSIONE ENTER'}</div><div class="copy">© GOLD CIRCUIT TOUR · JOGO ORIGINAL · ASSETS CC0/CC-BY (ver Créditos)</div></div>`));
  let done = false;
  const go = () => { if (done) return; done = true; off(); el.classList.add('out'); setTimeout(() => el.remove(), 380); Audio.unlock(); Audio.play('ui_start'); onStart(); };
  const off = Input.onAction((a) => { if (a === 'confirm' || a === 'pause') go(); });
  el.addEventListener('click', go);

}

// ------------------------------------------------------------------ main menu
export function mainMenu(cb: { arcade: () => void; exhibition: () => void; training: () => void; options: () => void; credits: () => void }) {
  const entries: [string, string, () => void][] = [
    ['ARCADE', 'Cinco partidas e o chefe final', cb.arcade],
    ['EXIBIÇÃO', 'Regras, arena e adversário livres · 1P ou 2P', cb.exhibition],
    ['TREINO', 'Minigame de precisão com alvos', cb.training],
    ['OPÇÕES', 'Áudio, gráficos e controles', cb.options],
    ['CRÉDITOS', 'Assets e licenças', cb.credits],
  ];
  const el = mount(h(`<div class="menu"><div class="col"><img class="head" src="assets/ui/logo.svg"/>${entries.map(([t, s]) => `<button class="item">${t}<small>${s}</small></button>`).join('')}</div><div class="hint"><b>↑↓</b> escolher <b>ENTER</b> confirmar</div></div>`));
  const items = [...el.querySelectorAll('.item')] as HTMLElement[];
  const nav = navigable(items, { start: Save.data.lastMenu ?? 0, onConfirm: (i) => { Save.data.lastMenu = i; Save.flush(); nav.off(); leave(el); entries[i][2](); } });
}

// ------------------------------------------------------------------ player select
export const MenuHooks: { preview: ((p: PlayerDef | null) => void) | null } = { preview: null };

export function playerSelect(title: string, onPick: (p: PlayerDef) => void, onBack: () => void, opts: { exclude?: string; who?: string } = {}) {
  const list = PLAYERS.filter((p) => p.id !== opts.exclude);
  const unlocked = (p: PlayerDef) => !p.unlock || Save.data.unlocked.includes(p.id);
  const el = mount(h(`<div class="screen"><h1><span>${title}</span></h1><div class="sub">${opts.who ?? 'Escolha seu tenista'}</div>
    <div class="select ${window.innerWidth >= 1000 && window.innerHeight >= 600 ? 'showcase' : ''}"><div class="grid">${list.map((p) => `<div class="card ${unlocked(p) ? '' : 'locked'}"><img src="${Portraits.get(p.id)?.head ?? ''}"/>${flag(p.flagColors)}<div class="nm">${unlocked(p) ? p.short : '???'}</div></div>`).join('')}</div>
    <div class="info"></div></div><div class="hint"><b>←↑→↓</b> escolher <b>ENTER</b> confirmar <b>ESC</b> voltar</div><button class="backbtn">◀ VOLTAR</button></div>`));
  const info = el.querySelector('.info') as HTMLElement;
  const stat = (n: string, v: number) => `<div class="stat"><span>${n}</span><div class="b"><i style="width:${v}%"></i></div><b>${v}</b></div>`;
  const show = (i: number) => {
    const p = list[i];
    if (!unlocked(p)) { info.innerHTML = `<h2>???</h2><div class="style">Bloqueado</div><div class="quote">${p.unlock}</div>`; MenuHooks.preview?.(null); return; }
    MenuHooks.preview?.(p);
    info.animate([{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,1,.3,1)' });
    info.innerHTML = `<h2>${p.name}</h2><div class="ctry">${p.country}</div><div class="style">${p.style}</div>
      ${stat('FORÇA', p.stats.power)}${stat('VELOCIDADE', p.stats.speed)}${stat('SAQUE', p.stats.serve)}${stat('VOLEIO', p.stats.volley)}${stat('TÉCNICA', p.stats.technique)}
      <div class="quote">“${p.catchphrase}”</div>`;
  };
  const cards = [...el.querySelectorAll('.card')] as HTMLElement[];
  const cols = getComputedStyle(el.querySelector('.grid')!).gridTemplateColumns.split(' ').filter(Boolean).length || 3;
  const back = () => { nav.off(); leave(el); onBack(); };
  const nav = navigable(cards, {
    columns: cols, onMove: show, isEnabled: (i) => unlocked(list[i]),
    onConfirm: (i) => { nav.off(); leave(el); MenuHooks.preview?.(null); onPick(list[i]); },
    onBack: () => { MenuHooks.preview?.(null); back(); },
  });
  el.querySelector('.backbtn')!.addEventListener('click', () => { Audio.play('ui_back'); MenuHooks.preview?.(null); back(); });
}

// ------------------------------------------------------------------ exhibition setup
export interface ExhibitionSetup { venue: VenueDef; games: number; sets: 1 | 3; difficulty: DifficultyId; twoPlayers: boolean }
export function exhibitionSetup(onGo: (s: ExhibitionSetup) => void, onBack: () => void) {
  const st = Save.data.exhibition;
  let vi = Math.max(0, VENUES.findIndex((v) => v.id === st.venue));
  const gamesOpts = [1, 2, 3, 4, 6];
  const diffs: DifficultyId[] = ['easy', 'normal', 'hard'];
  const el = mount(h(`<div class="screen"><h1><span>EXIBIÇÃO</span></h1><div class="sub">Escolha a arena e as regras</div>
    <div class="venues">${VENUES.map((v) => `<div class="venue"><img src="assets/ui/crest_${v.id}.svg"/><div class="vn">${v.name}</div><div class="vs">${v.surfaceName}</div></div>`).join('')}</div>
    <div class="opts">
      <div class="opt" data-k="games"><span>GAMES POR SET</span><span class="v"></span></div>
      <div class="opt" data-k="sets"><span>SETS</span><span class="v"></span></div>
      <div class="opt" data-k="diff"><span>DIFICULDADE</span><span class="v"></span></div>
      <div class="opt" data-k="mode"><span>JOGADORES</span><span class="v"></span></div>
      <button class="item go">JOGAR!</button>
    </div><div class="hint"><b>←→</b> alterar <b>↑↓</b> navegar <b>ENTER</b> confirmar</div><button class="backbtn">◀ VOLTAR</button></div>`));
  const venues = [...el.querySelectorAll('.venue')] as HTMLElement[];
  const paintV = () => venues.forEach((v, i) => v.classList.toggle('vsel', i === vi) || v.classList.toggle('sel', i === vi));
  const paintOpts = () => {
    (el.querySelector('[data-k="games"] .v') as HTMLElement).textContent = String(st.games);
    (el.querySelector('[data-k="sets"] .v') as HTMLElement).textContent = st.sets === 1 ? 'SET ÚNICO' : 'MELHOR DE 3';
    (el.querySelector('[data-k="diff"] .v') as HTMLElement).textContent = DIFFICULTY[st.difficulty as DifficultyId].name.toUpperCase();
    (el.querySelector('[data-k="mode"] .v') as HTMLElement).textContent = st.twoPlayers ? '1P vs 2P (local)' : '1P vs COM';
  };
  const rows = [el.querySelector('.venues') as HTMLElement, ...el.querySelectorAll('.opt'), el.querySelector('.go') as HTMLElement] as HTMLElement[];
  paintV(); paintOpts();
  venues.forEach((v, i) => v.addEventListener('click', () => { vi = i; paintV(); Audio.play('ui_move'); }));
  const nav = navigable(rows, {
    onLeftRight: (i, d) => {
      if (i === 0) { vi = (vi + d + VENUES.length) % VENUES.length; paintV(); }
      else if (i === 1) st.games = gamesOpts[(gamesOpts.indexOf(st.games) + d + gamesOpts.length) % gamesOpts.length];
      else if (i === 2) st.sets = st.sets === 1 ? 3 : 1;
      else if (i === 3) st.difficulty = diffs[(diffs.indexOf(st.difficulty as DifficultyId) + d + diffs.length) % diffs.length];
      else if (i === 4) st.twoPlayers = !st.twoPlayers;
      paintOpts();
    },
    onConfirm: (i) => {
      if (i !== 5 && i !== 0) return;
      st.venue = VENUES[vi].id;
      Save.flush();
      nav.off(); leave(el);
      onGo({ venue: VENUES[vi], games: st.games, sets: st.sets as 1 | 3, difficulty: st.difficulty as DifficultyId, twoPlayers: st.twoPlayers });
    },
    onBack: () => { nav.off(); leave(el); onBack(); },
  });
  el.querySelector('.backbtn')!.addEventListener('click', () => { Audio.play('ui_back'); nav.off(); leave(el); onBack(); });
}

// ------------------------------------------------------------------ VS screen
export function vsScreen(a: PlayerDef, b: PlayerDef, v: VenueDef, sub: string, done: () => void) {
  const el = mount(h(`<div class="vs-screen">
    <div class="vs-half l"><img src="${Portraits.get(a.id)?.body}"/><div class="vs-name"><small>${a.country}</small>${a.short}</div></div>
    <div class="vs-half r"><img src="${Portraits.get(b.id)?.body}"/><div class="vs-name"><small>${b.country}</small>${b.short}</div></div>
    <div class="vs-streaks"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="vs-mid"><div class="vs">VS</div></div><div class="vs-flash"></div>
    <div class="vs-bottom"><img src="assets/ui/crest_${v.id}.svg"/><span>${v.name} · ${v.surfaceName.toUpperCase()} · ${sub}</span></div></div>`));
  el.querySelector('.l')!.animate([{ transform: 'translateX(-60%)' }, { transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,1,.3,1)' });
  el.querySelector('.r')!.animate([{ transform: 'translateX(60%)' }, { transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,1,.3,1)' });
  el.querySelector('.vs')!.animate([{ transform: 'scale(4) rotate(-12deg)', opacity: 0 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], { duration: 380, delay: 350, fill: 'both', easing: 'cubic-bezier(.3,1.6,.5,1)' });
  el.querySelector('.vs-flash')!.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { opacity: 0 }], { duration: 500, delay: 700, fill: 'both' });
  el.animate([{ transform: 'none' }, { transform: 'translate(-8px,5px)' }, { transform: 'translate(7px,-6px)' }, { transform: 'translate(-4px,3px)' }, { transform: 'none' }], { duration: 300, delay: 720 });
  el.querySelectorAll('.vs-half img').forEach((im, i) => (im as HTMLElement).animate([{ transform: `translateX(${i ? 30 : -30}%) scale(1.15)`, filter: 'brightness(3)' }, { transform: 'none', filter: 'brightness(1)' }], { duration: 650, delay: 120, fill: 'both', easing: 'cubic-bezier(.2,1,.3,1)' }));
  el.querySelectorAll('.vs-name').forEach((n, i) => (n as HTMLElement).animate([{ opacity: 0, transform: `translateY(30px) skewX(-10deg)` }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 520 + i * 120, fill: 'both', easing: 'cubic-bezier(.2,1,.3,1)' }));
  Audio.play('jingle_point', { vol: 0.8 });
  let fin = false;
  const finish = () => { if (fin) return; fin = true; off(); el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).onfinish = () => { el.remove(); done(); }; };
  const off = Input.onAction((x) => { if (x === 'confirm') finish(); });
  el.addEventListener('click', finish);
  setTimeout(finish, 3200);
}

// ------------------------------------------------------------------ pause
export function pauseMenu(onResume: () => void, onQuit: () => void, onOptions: () => void) {
  const el = mount(h(`<div class="overlay"><div class="panel"><h2>PAUSA</h2>
    <button class="item">CONTINUAR</button><button class="item">CONTROLES</button><button class="item">OPÇÕES</button><button class="item">DESISTIR</button></div></div>`));
  const items = [...el.querySelectorAll('.item')] as HTMLElement[];
  const close = () => { nav.off(); leave(el); };
  const nav = navigable(items, {
    onConfirm: (i) => {
      if (i === 0) { close(); onResume(); }
      if (i === 1) { close(); controlsPanel(() => pauseMenu(onResume, onQuit, onOptions)); }
      if (i === 2) { close(); onOptions(); }
      if (i === 3) { close(); onQuit(); }
    },
    onBack: () => { close(); onResume(); },
  });
}

export function controlsPanel(onClose: () => void) {
  const el = mount(h(`<div class="overlay"><div class="panel"><h2>CONTROLES</h2><div class="controls-grid">
    <b>MOVER</b><span>WASD / Setas · Analógico</span>
    <b>GOLPE (top spin)</b><span>J ou Espaço · Botão A</span>
    <b>SLICE</b><span>K · Botão B (com ↓ = deixadinha)</span>
    <b>LOB</b><span>L · Botão X/Y</span>
    <b>SAQUE</b><span>Golpe para lançar a bola, golpe de novo no topo do medidor</span>
    <b>DIREÇÃO</b><span>Direcional no momento do contato (↑ fundo, ↓ curto)</span>
    <b>PAUSA</b><span>ESC · Start</span>
    <b>2P LOCAL</b><span>Teclado numérico (8456 + 1 2 3) ou 2º controle</span>
    </div><button class="item" style="margin-top:14px">VOLTAR</button></div></div>`));
  const nav = navigable([el.querySelector('.item') as HTMLElement], { onConfirm: () => { nav.off(); leave(el); onClose(); }, onBack: () => { nav.off(); leave(el); onClose(); } });
}

// ------------------------------------------------------------------ results
export function resultsScreen(r: { a: PlayerDef; b: PlayerDef; winner: 0 | 1; sets: [number, number][]; stats: { label: string; a: string | number; b: string | number }[]; time: string; title: string; lose: boolean }, buttons: [string, () => void][]) {
  const el = mount(h(`<div class="overlay"><div class="panel results">
    <div class="result-title ${r.lose ? 'lose' : ''}">${r.title}</div>
    <div class="res-head">
      <div class="p ${r.winner === 0 ? 'win' : ''}"><img src="${Portraits.get(r.a.id)?.head}"/><div class="nm">${r.a.short}</div></div>
      <div class="score">${r.sets.map((s) => `${s[0]}-${s[1]}`).join('  ')}<small>TEMPO ${r.time}</small></div>
      <div class="p ${r.winner === 1 ? 'win' : ''}"><img src="${Portraits.get(r.b.id)?.head}"/><div class="nm">${r.b.short}</div></div>
    </div>
    <table class="st">${r.stats.map((s) => `<tr><td>${s.a}</td><td>${s.label}</td><td>${s.b}</td></tr>`).join('')}</table>
    <div style="margin-top:14px">${buttons.map(([t]) => `<button class="item">${t}</button>`).join('')}</div></div></div>`));
  const items = [...el.querySelectorAll('.item')] as HTMLElement[];
  // count up the statistics
  el.querySelectorAll<HTMLElement>('table.st td:nth-child(1), table.st td:nth-child(3)').forEach((td, k) => {
    const m = /^(\d+)(.*)$/.exec(td.textContent ?? '');
    if (!m) return;
    const target = +m[1], suffix = m[2];
    const t0 = performance.now() + 300 + k * 30;
    const tick = (now: number) => { const f = Math.min(1, Math.max(0, (now - t0) / 700)); td.textContent = `${Math.round(target * (1 - (1 - f) ** 3))}${suffix}`; if (f < 1) requestAnimationFrame(tick); };
    td.textContent = `0${suffix}`;
    requestAnimationFrame(tick);
  });
  const nav = navigable(items, { onConfirm: (i) => { nav.off(); leave(el); buttons[i][1](); } });
}

// ------------------------------------------------------------------ options
export function optionsScreen(onBack: () => void, apply: () => void) {
  const o = Save.data.options;
  const el = mount(h(`<div class="overlay"><div class="panel"><h2>OPÇÕES</h2><div class="opts" style="margin:0">
    ${['music', 'sfx', 'voice', 'crowd'].map((k) => `<div class="opt" data-k="${k}"><span>${{ music: 'MÚSICA', sfx: 'EFEITOS', voice: 'VOZ', crowd: 'PÚBLICO' }[k]}</span><span class="slider"><span class="b"><i></i></span><span class="v"></span></span></div>`).join('')}
    <div class="opt" data-k="quality"><span>GRÁFICOS</span><span class="v"></span></div>
    <div class="opt" data-k="hud"><span>TAMANHO DO HUD</span><span class="v"></span></div>
    <div class="opt" data-k="shake"><span>TREMOR DE TELA</span><span class="v"></span></div>
    <div class="opt" data-k="touch"><span>BOTÕES DE TOQUE</span><span class="v"></span></div>
    <div class="opt" data-k="assist"><span>ASSISTÊNCIA</span><span class="v"></span></div>
    <div class="opt" data-k="hints"><span>MARCA DA BOLA</span><span class="v"></span></div>
    <button class="item">VOLTAR</button></div></div></div>`));
  const rows = [...el.querySelectorAll('.opt'), el.querySelector('.item')] as HTMLElement[];
  const keys = ['music', 'sfx', 'voice', 'crowd', 'quality', 'hud', 'shake', 'touch', 'assist', 'hints'] as const;
  const paint = () => {
    for (const k of ['music', 'sfx', 'voice', 'crowd'] as const) {
      const r = el.querySelector(`[data-k="${k}"]`)!;
      (r.querySelector('.b i') as HTMLElement).style.width = `${o.volume[k] * 100}%`;
      (r.querySelector('.v') as HTMLElement).textContent = String(Math.round(o.volume[k] * 10));
    }
    (el.querySelector('[data-k="quality"] .v') as HTMLElement).textContent = { low: 'BAIXA', medium: 'MÉDIA', high: 'ALTA' }[o.quality];
    (el.querySelector('[data-k="hud"] .v') as HTMLElement).textContent = `${Math.round(o.hudScale * 100)}%`;
    (el.querySelector('[data-k="shake"] .v') as HTMLElement).textContent = o.shake ? 'LIGADO' : 'DESLIGADO';
    (el.querySelector('[data-k="assist"] .v') as HTMLElement).textContent = o.assist ? 'LIGADA' : 'DESLIGADA';
    (el.querySelector('[data-k="hints"] .v') as HTMLElement).textContent = o.hints ? 'LIGADA' : 'DESLIGADA';
    (el.querySelector('[data-k="touch"] .v') as HTMLElement).textContent = o.touch === 'auto' ? 'AUTOMÁTICO' : o.touch === 'on' ? 'SEMPRE' : 'NUNCA';
  };
  paint();
  const nav = navigable(rows, {
    onLeftRight: (i, d) => {
      const k = keys[i];
      if (!k) return;
      if (k === 'quality') { const q = ['low', 'medium', 'high'] as const; o.quality = q[(q.indexOf(o.quality) + d + 3) % 3]; }
      else if (k === 'hud') o.hudScale = Math.max(0.7, Math.min(1.4, o.hudScale + d * 0.1));
      else if (k === 'shake') o.shake = !o.shake;
      else if (k === 'assist') o.assist = !o.assist;
      else if (k === 'hints') o.hints = !o.hints;
      else if (k === 'touch') { const t = ['auto', 'on', 'off'] as const; o.touch = t[(t.indexOf(o.touch) + d + 3) % 3]; }
      else { o.volume[k] = Math.max(0, Math.min(1, Math.round((o.volume[k] + d * 0.1) * 10) / 10)); }
      paint(); apply(); Save.flush();
    },
    onConfirm: (i) => { if (i === rows.length - 1) { nav.off(); leave(el); onBack(); } },
    onBack: () => { nav.off(); leave(el); onBack(); },
  });
}

// ------------------------------------------------------------------ credits
export async function creditsScreen(onBack: () => void) {
  const md = await (await fetch('assets/CREDITS.md')).text().catch(() => '');
  const html = md.split('\n').map((l) => {
    if (l.startsWith('## ')) return `<h3>${l.slice(3)}</h3>`;
    if (l.startsWith('# ')) return '';
    if (l.startsWith('- ')) return `<p>${l.slice(2).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[(.+?)\]\((.+?)\)/g, '$1 <small>($2)</small>')}</p>`;
    return l.trim() ? `<p>${l}</p>` : '';
  }).join('');
  const el = mount(h(`<div class="overlay"><div class="panel" style="width:min(900px,94vw)"><h2>CRÉDITOS</h2><div class="credits">${html}</div><button class="item" style="margin-top:10px">VOLTAR</button></div></div>`));
  const nav = navigable([el.querySelector('.item') as HTMLElement], { onConfirm: () => { nav.off(); leave(el); onBack(); }, onBack: () => { nav.off(); leave(el); onBack(); } });
  const box = el.querySelector('.credits') as HTMLElement;
  const off = Input.onAction((a) => { if (a === 'down') box.scrollTop += 80; if (a === 'up') box.scrollTop -= 80; });
  el.addEventListener('remove', off);
}

// ------------------------------------------------------------------ arcade ladder
export function arcadeLadder(stage: number, ladder: { p: PlayerDef; v: VenueDef }[], me: PlayerDef, done: () => void) {
  const el = mount(h(`<div class="screen"><h1><span>ARCADE</span></h1><div class="sub">Partida ${stage + 1} de ${ladder.length}</div>
    <div class="venues" style="grid-template-columns:repeat(${ladder.length}, minmax(0,1fr))">${ladder.map((l, i) => `<div class="venue ${i === stage ? 'sel' : ''}" style="${i < stage ? 'opacity:.45' : ''}">
      <img src="${i <= stage || !l.p.unlock ? Portraits.get(l.p.id)?.head : ''}" style="width:100%;max-width:none;aspect-ratio:1;object-fit:cover;${i > stage && l.p.unlock ? 'filter:brightness(0)' : ''}"/>
      <div class="vn">${i > stage && l.p.unlock ? '???' : l.p.short}</div><div class="vs">${l.v.name}</div>${i < stage ? '<div class="vn" style="color:#39e36b">VENCIDO</div>' : ''}</div>`).join('')}</div>
    <div class="sub" style="margin-top:20px">Jogando com <b style="color:#f5c542">${me.name}</b></div>
    <button class="item go">CONTINUAR</button></div>`));
  const nav = navigable([el.querySelector('.go') as HTMLElement], { onConfirm: () => { nav.off(); leave(el); done(); } });
}

// ------------------------------------------------------------------ touch controls
export function touchControls(enabled: boolean) {
  let el = document.querySelector('.touch') as HTMLElement | null;
  if (!el) {
    el = mount(h(`<div class="touch"><div class="stick"><i></i></div><div class="tbtns"><button data-b="shot">GOLPE</button><button data-b="slice">SLICE</button><button data-b="lob">LOB</button></div></div>`));
    const stick = el.querySelector('.stick') as HTMLElement, knob = stick.querySelector('i') as HTMLElement;
    let id: number | null = null;
    const upd = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect();
      let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      knob.style.transform = `translate(${x * r.width * 0.3}px, ${y * r.height * 0.3}px)`;
      Input.setTouch({ x, y: -y });
    };
    stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(e.pointerId); upd(e); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) upd(e); });
    const end = () => { id = null; knob.style.transform = ''; Input.setTouch({ x: 0, y: 0 }); };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    el.querySelectorAll('.tbtns button').forEach((b) => {
      const k = (b as HTMLElement).dataset.b as 'shot' | 'slice' | 'lob';
      const up = () => { b.classList.remove('down'); Input.setTouch({ [k]: false }); };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); (b as HTMLElement).setPointerCapture((e as PointerEvent).pointerId); Input.setTouch({ [k]: true }); navigator.vibrate?.(12); });
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }
  el.classList.toggle('on', enabled);
}
