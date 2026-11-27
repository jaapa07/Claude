import { Input } from '../core/input';
import { Audio } from '../core/audio';
import { PLAYERS, type PlayerDef } from '../data/content';
import { Portraits } from '../render/portraits';
import { CATEGORY, COUNTRIES, ROUND_NAMES, SEASON, rankOf, type CareerData, type EventDef } from '../game/career';
import { navigable, ui, leave, MenuHooks } from './screens';

const h = (html: string) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild as HTMLElement; };
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const money = (n: number) => '$ ' + n.toLocaleString('pt-BR');
function mount(el: HTMLElement) {
  el.querySelectorAll<HTMLElement>('.item, .opt, .ev, .stat').forEach((n, i) => n.style.setProperty('--i', String(i)));
  el.classList.add('enter');
  ui().appendChild(el);
  return el;
}

// ------------------------------------------------------------------ create your player
const HAIRS: Record<'m' | 'f', (string | null)[]> = { m: ['hair_simpleparted', 'hair_buzzed', 'hair_long', null], f: ['hair_long', 'hair_buns', 'hair_buzzed'] };
const SKINS = ['#f5d9c4', '#e9c09a', '#d9a77c', '#a86b42', '#7a4a2c', '#5a3620'];
const HAIRC = ['#111111', '#2b1a10', '#6b4a2a', '#c9a15a', '#e2c27a', '#a33a12'];
const COLORS = ['#ffffff', '#111111', '#c1121f', '#ff5a1f', '#ffd400', '#2a9d8f', '#0a7d32', '#1aa7ec', '#0b3a8c', '#8338ec', '#ff4d8d', '#f5c542'];

export function createPlayer(onDone: (me: PlayerDef) => void, onBack: () => void) {
  const st = { name: 'Novo Talento', country: 0, body: 'm' as 'm' | 'f', hair: 0, skin: 1, hairC: 1, shirt: 4, shorts: 8, shoes: 0, racket: 2 };
  let ver = 0;
  const build = (): PlayerDef => {
    const c = COUNTRIES[st.country];
    const last = st.name.trim().split(/\s+/).pop() || 'TALENTO';
    return {
      id: `me_${ver}`, name: st.name.trim() || 'Novo Talento', short: last.toUpperCase().slice(0, 12), country: c.name, flag: c.code, flagColors: c.colors,
      style: 'Revelação do circuito', body: st.body, hair: HAIRS[st.body][st.hair % HAIRS[st.body].length], skin: st.skin > 3 ? 'dark' : 'light', skinTint: SKINS[st.skin],
      hairColor: HAIRC[st.hairC], shirt: COLORS[st.shirt], shirtAccent: st.shirt === 0 ? '#111111' : '#ffffff', shorts: COLORS[st.shorts], shoes: COLORS[st.shoes], socks: '#ffffff',
      racket: COLORS[st.racket], sponsor: st.country % 6, stats: { power: 44, speed: 46, serve: 42, volley: 40, technique: 44 }, catchphrase: 'Um dia eu chego no topo.',
    };
  };
  const rows: [string, string, (d: number) => void, () => string][] = [
    ['country', 'PAÍS', (d) => (st.country = (st.country + d + COUNTRIES.length) % COUNTRIES.length), () => COUNTRIES[st.country].name],
    ['body', 'CORPO', () => { st.body = st.body === 'm' ? 'f' : 'm'; st.hair = 0; }, () => (st.body === 'm' ? 'MASCULINO' : 'FEMININO')],
    ['hair', 'CABELO', (d) => (st.hair = (st.hair + d + 4) % HAIRS[st.body].length), () => ['CURTO', 'RASPADO', 'LONGO', 'CARECA'][HAIRS.m.indexOf(HAIRS[st.body][st.hair % HAIRS[st.body].length])] ?? 'COQUE'],
    ['hairc', 'COR DO CABELO', (d) => (st.hairC = (st.hairC + d + HAIRC.length) % HAIRC.length), () => `<i class="sw" style="background:${HAIRC[st.hairC]}"></i>`],
    ['skin', 'PELE', (d) => (st.skin = (st.skin + d + SKINS.length) % SKINS.length), () => `<i class="sw" style="background:${SKINS[st.skin]}"></i>`],
    ['shirt', 'CAMISA', (d) => (st.shirt = (st.shirt + d + COLORS.length) % COLORS.length), () => `<i class="sw" style="background:${COLORS[st.shirt]}"></i>`],
    ['shorts', 'SHORT', (d) => (st.shorts = (st.shorts + d + COLORS.length) % COLORS.length), () => `<i class="sw" style="background:${COLORS[st.shorts]}"></i>`],
    ['shoes', 'TÊNIS', (d) => (st.shoes = (st.shoes + d + COLORS.length) % COLORS.length), () => `<i class="sw" style="background:${COLORS[st.shoes]}"></i>`],
    ['racket', 'RAQUETE', (d) => (st.racket = (st.racket + d + COLORS.length) % COLORS.length), () => `<i class="sw" style="background:${COLORS[st.racket]}"></i>`],
  ];
  const el = mount(h(`<div class="screen"><h1><span>NOVO TENISTA</span></h1><div class="sub">Crie o atleta que vai subir do nº 300 ao topo do ranking</div>
    <div class="select showcase"><div class="opts" style="max-width:520px;margin:0">
      <label class="opt namebox"><span>NOME</span><input id="pname" maxlength="22" value="${esc(st.name)}" autocomplete="off"/></label>
      ${rows.map(([k, l]) => `<div class="opt" data-k="${k}"><span>${l}</span><span class="v"></span></div>`).join('')}
      <button class="item go">COMEÇAR CARREIRA</button></div></div>
    <div class="hint"><b>←→</b> alterar <b>↑↓</b> navegar <b>ENTER</b> confirmar</div><button class="backbtn">◀ VOLTAR</button></div>`));
  const input = el.querySelector('#pname') as HTMLInputElement;
  const paint = () => { rows.forEach(([k, , , v]) => ((el.querySelector(`[data-k="${k}"] .v`) as HTMLElement).innerHTML = v())); ver++; MenuHooks.preview?.(build()); };
  input.addEventListener('input', () => { st.name = input.value; });
  input.addEventListener('keydown', (e) => e.stopPropagation());
  const items = [el.querySelector('.namebox') as HTMLElement, ...el.querySelectorAll<HTMLElement>('.opt[data-k]'), el.querySelector('.go') as HTMLElement];
  const nav = navigable(items, {
    onLeftRight: (i, d) => { if (i >= 1 && i <= rows.length) { rows[i - 1][2](d); paint(); } },
    onConfirm: (i) => {
      if (i === 0) { input.focus(); return; }
      if (i <= rows.length) { rows[i - 1][2](1); paint(); return; }
      nav.off(); leave(el); MenuHooks.preview?.(null); onDone(build());
    },
    onBack: () => { nav.off(); leave(el); MenuHooks.preview?.(null); onBack(); },
  });
  el.querySelector('.backbtn')!.addEventListener('click', () => { nav.off(); leave(el); MenuHooks.preview?.(null); onBack(); });
  paint();
}

// ------------------------------------------------------------------ career hub
export interface HubActions { play: () => void; friendly: () => void; train: () => void; evolve: () => void; partner: () => void; skip: () => void; quit: () => void }
export function careerHub(c: CareerData, a: HubActions) {
  const rank = rankOf(c.points);
  const ev = SEASON[c.week];
  const cat = CATEGORY[ev.category];
  const locked = rank > ev.minRank;
  const partner = c.partnerId ? PLAYERS.find((p) => p.id === c.partnerId) : null;
  const upcoming = SEASON.map((e, i) => ({ e, i })).slice(c.week, c.week + 5);
  const el = mount(h(`<div class="screen career">
    <h1><span>CIRCUITO · TEMPORADA ${c.season}</span></h1>
    <div class="chub">
      <div class="cme">
        <img src="${Portraits.get(c.me.id)?.head ?? ''}"/>
        <div><div class="cname">${esc(c.me.name)}</div><div class="ctry">${c.me.country}</div>
          <div class="crank">Nº <b>${rank}</b><small> do ranking · melhor ${Math.min(c.bestRank, rank)}</small></div>
          <div class="cline">${c.points.toLocaleString('pt-BR')} pts · ${money(c.money)} · ${c.titles.length} título(s)</div>
          ${c.statPoints ? `<div class="cline gold">${c.statPoints} ponto(s) de evolução para gastar</div>` : ''}</div>
      </div>
      <div class="cevents">${upcoming.map(({ e, i }) => `<div class="ev ${i === c.week ? 'now' : ''} ${e.category}"><b>${CATEGORY[e.category].label}</b><span>${esc(e.name)}</span><small>${e.doubles ? 'DUPLAS' : 'SIMPLES'} · ${e.minRank < 999 ? `ranking até ${e.minRank}` : 'aberto'}</small></div>`).join('')}</div>
    </div>
    <div class="opts cact">
      <button class="item">${locked ? 'TORNEIO BLOQUEADO' : 'JOGAR'} — ${esc(ev.name)}<small>${cat.label} · ${ev.doubles ? 'duplas' : 'simples'} · campeão leva ${cat.points[cat.points.length - 1]} pts e ${money(cat.prize[cat.prize.length - 1])}${locked ? ` · precisa estar no top ${ev.minRank}` : ''}</small></button>
      <button class="item">AMISTOSO<small>Jogo único contra um rival do seu nível: dinheiro e experiência</small></button>
      <button class="item">TREINO<small>Minigame de precisão: ganha pontos de evolução</small></button>
      <button class="item">EVOLUÇÃO<small>Distribua pontos nos atributos</small></button>
      <button class="item">PARCEIRO DE DUPLAS<small>${partner ? partner.name : 'Nenhum escolhido (sorteado no torneio)'}</small></button>
      <button class="item">PULAR SEMANA</button>
      <button class="item">SALVAR E SAIR</button>
    </div><button class="backbtn">◀ SAIR</button></div>`));
  const items = [...el.querySelectorAll<HTMLElement>('.cact .item')];
  const go = (f: () => void) => { nav.off(); leave(el); f(); };
  const nav = navigable(items, {
    isEnabled: (i) => !(i === 0 && locked),
    onConfirm: (i) => go([a.play, a.friendly, a.train, a.evolve, a.partner, a.skip, a.quit][i]),
    onBack: () => go(a.quit),
  });
  el.querySelector('.backbtn')!.addEventListener('click', () => go(a.quit));
}

// ------------------------------------------------------------------ tournament bracket
export function bracketScreen(ev: EventDef, round: number, opponents: PlayerDef[], results: (boolean | null)[], me: PlayerDef, partner: PlayerDef | null, onPlay: () => void, onQuit: () => void) {
  const names = ROUND_NAMES(ev.rounds);
  const el = mount(h(`<div class="screen"><h1><span>${CATEGORY[ev.category].label}</span></h1><div class="sub">${esc(ev.name)} · ${ev.doubles ? 'DUPLAS' : 'SIMPLES'}</div>
    <div class="bracket">${names.map((n, i) => `<div class="ev ${i === round ? 'now' : ''} ${results[i] === true ? 'won' : results[i] === false ? 'lost' : ''}"><b>${n}</b>
      <span>${i <= round ? esc(opponents[i]?.name ?? '?') : '???'}</span><small>${results[i] === true ? 'VENCEU' : results[i] === false ? 'PERDEU' : i === round ? 'PRÓXIMO JOGO' : ''}</small></div>`).join('')}</div>
    <div class="sub" style="margin-top:16px">Você: <b style="color:#f5c542">${esc(me.name)}</b>${partner ? ` com <b style="color:#3ff7ff">${esc(partner.name)}</b>` : ''}</div>
    <div class="opts" style="max-width:520px"><button class="item go">JOGAR ${names[round]}</button><button class="item">DESISTIR DO TORNEIO</button></div></div>`));
  const items = [...el.querySelectorAll<HTMLElement>('.item')];
  const nav = navigable(items, { onConfirm: (i) => { nav.off(); leave(el); (i === 0 ? onPlay : onQuit)(); } });
}

// ------------------------------------------------------------------ evolution (spend attribute points)
export function evolveScreen(c: CareerData, onBack: () => void) {
  const keys = ['power', 'speed', 'serve', 'volley', 'technique'] as const;
  const label = { power: 'FORÇA', speed: 'VELOCIDADE', serve: 'SAQUE', volley: 'VOLEIO', technique: 'TÉCNICA' };
  const el = mount(h(`<div class="overlay"><div class="panel"><h2>EVOLUÇÃO</h2><div class="sub pts"></div>
    <div class="opts" style="margin:0">${keys.map((k) => `<div class="opt" data-k="${k}"><span>${label[k]}</span><span class="slider"><span class="b"><i></i></span><span class="v"></span></span></div>`).join('')}
    <button class="item">VOLTAR</button></div></div></div>`));
  const paint = () => {
    (el.querySelector('.pts') as HTMLElement).textContent = `${c.statPoints} ponto(s) disponível(is) · → para gastar`;
    for (const k of keys) {
      const r = el.querySelector(`[data-k="${k}"]`)!;
      (r.querySelector('.b i') as HTMLElement).style.width = `${c.me.stats[k]}%`;
      (r.querySelector('.v') as HTMLElement).textContent = String(c.me.stats[k]);
    }
  };
  const rows = [...el.querySelectorAll<HTMLElement>('.opt'), el.querySelector('.item') as HTMLElement];
  const spend = (i: number) => {
    const k = keys[i];
    if (!k || c.statPoints <= 0 || c.me.stats[k] >= 99) { Audio.play('ui_back'); return; }
    c.me.stats[k] = Math.min(99, c.me.stats[k] + 2);
    c.statPoints--;
    Audio.play('jingle_point', { vol: 0.4 });
    paint();
  };
  const nav = navigable(rows, {
    onLeftRight: (i, d) => { if (d > 0) spend(i); },
    onConfirm: (i) => { if (i === keys.length) { nav.off(); leave(el); onBack(); } else spend(i); },
    onBack: () => { nav.off(); leave(el); onBack(); },
  });
  paint();
  void Input;
}

// ------------------------------------------------------------------ pick a doubles partner
export function partnerScreen(c: CareerData, onBack: () => void) {
  const list = PLAYERS.filter((p) => !p.unlock);
  const el = mount(h(`<div class="screen"><h1><span>PARCEIRO DE DUPLAS</span></h1><div class="sub">Quem joga ao seu lado nos torneios de duplas</div>
    <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));max-width:900px">${list.map((p) => `<div class="card ${c.partnerId === p.id ? 'sel' : ''}"><img src="${Portraits.get(p.id)?.head ?? ''}"/><div class="nm">${p.short}</div></div>`).join('')}</div>
    <button class="backbtn">◀ VOLTAR</button></div>`));
  const cards = [...el.querySelectorAll<HTMLElement>('.card')];
  const nav = navigable(cards, {
    columns: 4, start: Math.max(0, list.findIndex((p) => p.id === c.partnerId)),
    onConfirm: (i) => { c.partnerId = list[i].id; nav.off(); leave(el); onBack(); },
    onBack: () => { nav.off(); leave(el); onBack(); },
  });
  el.querySelector('.backbtn')!.addEventListener('click', () => { nav.off(); leave(el); onBack(); });
}

// ------------------------------------------------------------------ simple message panel
export function messagePanel(title: string, lines: string[], button: string, onOk: () => void) {
  const el = mount(h(`<div class="overlay"><div class="panel"><div class="result-title">${title}</div>${lines.map((l) => `<p class="cmsg">${l}</p>`).join('')}<button class="item">${button}</button></div></div>`));
  const nav = navigable([el.querySelector('.item') as HTMLElement], { onConfirm: () => { nav.off(); leave(el); onOk(); } });
}
