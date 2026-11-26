import { input } from '../core/Input';
import { settings } from '../core/Save';
import type { Flow } from './Flow';

/**
 * Controles de toque (iPhone/Android/iPad): joystick virtual à esquerda e botões de ação à direita.
 * Tudo vira "teclas virtuais" do dispositivo de teclado, então a lógica da partida não muda.
 */
type Btn = { el: HTMLElement; action: string; ids: Set<number> };
type Mode = 'atk' | 'sup' | 'def';

const ACTIONS: [string, string, string][] = [
  // ação, rótulo, classe de posição
  ['shoot', 'CHUTE', 'b-shoot'],
  ['pass', 'PASSE', 'b-pass'],
  ['lob', 'LENÇOL', 'b-lob'],
  ['tackle', 'CARRINHO', 'b-tackle'],
  ['press', 'MARCAR', 'b-press'],
  ['trick', 'FIRULA', 'b-trick'],
  ['sprint', 'CORRER', 'b-sprint'],
  ['fire', 'FOGO', 'b-fire'],
];
/** dica mostrada quando o jogador toca num botão que não pode agir agora */
const HINTS: Record<string, string> = {
  shoot: 'Chegue na bola para chutar', pass: 'Sem a bola: toque perto dela', lob: 'Só com a bola', trick: 'Só com a bola nos pés',
  fire: 'Faça jogadas de estilo para encher a barra do FOGO', tackle: 'Chegue perto do adversário', press: '', sprint: '',
};

export class TouchControls {
  root: HTMLElement;
  private stickBase: HTMLElement;
  private stickKnob: HTMLElement;
  private stickId: number | null = null;
  private origin = { x: 0, y: 0 };
  private btns: Btn[] = [];
  private byPointer = new Map<number, Btn>();
  private skip: HTMLElement;
  private pauseBtn: HTMLElement;
  private hint: HTMLElement;
  private hintT = 0;
  private visible = false;
  /** layout dos botões: ATAQUE (com a bola), APOIO (companheiro com a bola) ou DEFESA */
  mode: Mode = 'atk';
  private pendingSince = 0;
  private avail: Record<string, boolean> = {};
  /** registro de toques (para o QA e para depurar em aparelho real com ?toques) */
  log: string[] = [];

  constructor(private flow: Flow) {
    document.documentElement.classList.add('touch');
    const r = (this.root = document.createElement('div'));
    r.id = 'touch';
    r.innerHTML = `<div class="t-zone"></div><div class="t-stick"><div class="t-knob"></div></div>
      <div class="t-btns">${ACTIONS.map(([a, l, c]) => `<div class="t-btn ${c}" data-a="${a}"><span>${l}</span></div>`).join('')}</div>
      <div class="t-hint"></div>
      <div class="t-top"><div class="t-skip">PULAR ▶▶</div><div class="t-pause">❚❚</div></div>`;
    document.getElementById('app')!.appendChild(r);
    this.stickBase = r.querySelector('.t-stick')!;
    this.stickKnob = r.querySelector('.t-knob')!;
    this.skip = r.querySelector('.t-skip')!;
    this.pauseBtn = r.querySelector('.t-pause')!;
    this.hint = r.querySelector('.t-hint')!;

    // joystick: o toque em qualquer ponto da metade esquerda vira o centro do direcional
    const zone = r.querySelector('.t-zone') as HTMLElement;
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.stickId !== null) return;
      this.stickId = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch { /* iOS antigo */ }
      this.origin = { x: e.clientX, y: e.clientY };
      this.stickBase.style.left = `${e.clientX}px`;
      this.stickBase.style.top = `${e.clientY}px`;
      this.stickBase.classList.add('on');
      this.moveStick(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === this.stickId) { e.preventDefault(); this.moveStick(e.clientX, e.clientY); } });
    const end = (e: PointerEvent) => { if (e.pointerId === this.stickId) this.releaseStick(); };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    // botões: a área inteira do canto direito recebe o toque e escolhe o botão visível mais próximo
    // (dedo grosso entre dois botões ainda acerta um deles). Cada dedo fica preso ao botão que tocou.
    const pad = r.querySelector('.t-btns') as HTMLElement;
    r.querySelectorAll<HTMLElement>('.t-btn').forEach((el) => this.btns.push({ el, action: el.dataset.a!, ids: new Set() }));
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const b = this.pick(e.clientX, e.clientY);
      if (!b) return;
      try { pad.setPointerCapture(e.pointerId); } catch { /* iOS antigo */ }
      this.byPointer.set(e.pointerId, b);
      b.ids.add(e.pointerId);
      this.setBtn(b);
      this.log.push(`${b.action}:${this.avail[b.action] === false ? 'off' : 'on'}`);
      if (this.log.length > 60) this.log.shift();
      if (this.avail[b.action] === false && HINTS[b.action]) this.showHint(HINTS[b.action]);
      if (settings.data.vibrate !== false) navigator.vibrate?.(8);
    });
    const up = (e: PointerEvent) => {
      const b = this.byPointer.get(e.pointerId);
      if (!b) return;
      this.byPointer.delete(e.pointerId);
      b.ids.delete(e.pointerId);
      this.setBtn(b);
    };
    pad.addEventListener('pointerup', up);
    pad.addEventListener('pointercancel', up);
    this.skip.addEventListener('pointerdown', (e) => { e.preventDefault(); this.tap('Enter'); });
    this.pauseBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.tap(settings.data.keys.pause); });
  }

  /** botão visível mais próximo do toque (até 1,7× o raio dele) */
  private pick(x: number, y: number): Btn | null {
    let best: Btn | null = null, bd = Infinity;
    for (const b of this.btns) {
      if (getComputedStyle(b.el).pointerEvents === 'none') continue; // escondido neste modo
      const r = b.el.getBoundingClientRect();
      const rad = r.width / 2, d = Math.hypot(x - (r.left + rad), y - (r.top + r.height / 2));
      const score = d / Math.max(rad, 1);
      if (score < 1.7 && score < bd) { bd = score; best = b; }
    }
    return best;
  }
  private key(action: string) { return action === 'press' ? 'TouchPress' : settings.data.keys[action]; }
  private tap(code: string) { input.virtualKey(code, true); input.virtualKey(code, false); }
  private setBtn(b: Btn) {
    const on = b.ids.size > 0;
    b.el.classList.toggle('on', on);
    input.virtualKey(this.key(b.action), on);
  }
  private showHint(text: string) {
    this.log.push('hint');
    this.hint.textContent = text;
    this.hint.classList.add('on');
    this.hintT = performance.now();
  }
  private moveStick(x: number, y: number) {
    const R = Math.max(44, Math.min(innerWidth, innerHeight) * 0.14);
    let dx = x - this.origin.x, dy = y - this.origin.y;
    const d = Math.hypot(dx, dy);
    // dedo passou muito da borda: o centro acompanha (não "trava" o direcional)
    if (d > R * 1.6) {
      const k = (d - R * 1.6) / d;
      this.origin.x += dx * k; this.origin.y += dy * k;
      this.stickBase.style.left = `${this.origin.x}px`; this.stickBase.style.top = `${this.origin.y}px`;
      dx = x - this.origin.x; dy = y - this.origin.y;
    }
    const m = Math.hypot(dx, dy), c = Math.min(m, R);
    const kx = m ? (dx / m) * c : 0, ky = m ? (dy / m) * c : 0;
    this.stickKnob.style.transform = `translate(${kx}px, ${ky}px)`;
    input.setStick({ x: dx / R, y: dy / R });
  }
  private releaseStick() {
    this.stickId = null;
    this.stickBase.classList.remove('on');
    this.stickBase.style.left = ''; this.stickBase.style.top = '';
    this.stickKnob.style.transform = '';
    input.setStick(null);
  }
  private releaseAll() {
    if (this.stickId !== null) this.releaseStick();
    this.byPointer.clear();
    for (const b of this.btns) if (b.ids.size) { b.ids.clear(); this.setBtn(b); }
  }
  private label(a: string, t: string) {
    const el = this.btns.find((b) => b.action === a)!.el.firstElementChild as HTMLElement;
    if (el.textContent !== t) el.textContent = t;
  }

  /** Chamado a cada quadro: mostra os controles só durante a partida e adapta rótulos/disponibilidade ao lance. */
  update() {
    const f = this.flow, m = f.match;
    const show = f.scene === 'match' && !!m && !m.paused;
    if (show !== this.visible) {
      this.visible = show;
      this.root.classList.toggle('on', show);
      if (!show) this.releaseAll();
    }
    if (this.hintT && performance.now() - this.hintT > 1400) { this.hint.classList.remove('on'); this.hintT = 0; }
    if (!show || !m) return;
    const sz = String([0.82, 1, 1.2][settings.data.touchSize ?? 1]);
    if (this.root.style.getPropertyValue('--ts') !== sz) this.root.style.setProperty('--ts', sz);
    const st = m.state;
    const skippable = st === 'intro' || st === 'replay' || st === 'halftime' || st === 'goal';
    this.skip.classList.toggle('on', skippable);
    this.pauseBtn.classList.toggle('on', !['intro', 'fulltime', 'done', 'halftime'].includes(st));
    // controles de jogo somem em cenas que não são jogadas
    this.root.classList.toggle('cine', ['intro', 'replay', 'halftime', 'fulltime', 'done', 'goal'].includes(st));
    const tm = m.teams.find((t) => t.players.some((p) => p.device === 'kb'));
    const me = tm?.players.find((p) => p.device === 'kb');
    const b = m.ball, owner = b.owner;
    const hasBall = !!me && owner === me;
    const taker = !!me && (st === 'kickoff' || st === 'setpiece') && m.sp?.taker === me;
    // saque/cobrança esperando o jogador: os botões de passe e chute piscam
    this.root.classList.toggle('wait', taker);
    if (st !== 'play' && st !== 'kickoff' && st !== 'setpiece') return;

    // modo do layout
    const set = st !== 'play';
    const want: Mode = !tm || hasBall || taker ? 'atk'
      : set ? ((m.sp?.team ?? m.kickoffTeam) === tm ? 'sup' : 'def')
      : owner ? (owner.team === tm ? 'sup' : 'def')
      // bola solta: se o último toque foi do meu time (passe, chute, firula em andamento) continua ATAQUE
      : b.lastTouch?.team === tm ? 'atk' : 'def';
    const now = performance.now();
    const holding = this.btns.some((x) => x.ids.size > 0);
    if (want !== this.mode) {
      this.pendingSince ||= now;
      // espera a posse "firmar" (evita piscar em dividida) e não troca botão debaixo do dedo por muito tempo
      if (now - this.pendingSince > (holding ? 600 : 150)) {
        this.mode = want; this.pendingSince = 0;
        this.root.classList.remove('atk', 'sup', 'def'); void this.root.offsetWidth;
        this.root.classList.add(want, 'swap'); setTimeout(() => this.root.classList.remove('swap'), 260);
      }
    } else this.pendingSince = 0;
    if (!this.root.classList.contains(this.mode)) this.root.classList.add(this.mode);
    const training = m.opts.mode === 'training';
    this.root.classList.toggle('training', training);

    // o que cada botão faz agora (rótulo) e se pode agir (aceso/apagado)
    const near = !!me && (m.nearLooseBall(me) || m.aerialChance(me));
    const gkHold = hasBall && b.held;
    const mateCpu = !!owner && owner.team === tm && owner !== me && !owner.device;
    const heat = tm ? Math.min(1, tm.heat) : 0;
    this.root.style.setProperty('--heat', heat.toFixed(2));
    const av = this.avail;
    if (this.mode === 'atk') {
      this.label('shoot', gkHold ? 'LANÇAR' : 'CHUTE');
      this.label('pass', 'PASSE');
      this.label('lob', 'LENÇOL');
      this.label('trick', 'FIRULA');
      av.shoot = hasBall || taker || near; av.pass = hasBall || taker || near; av.lob = av.pass && !gkHold; av.trick = hasBall && !gkHold;
    } else if (this.mode === 'sup') {
      this.label('shoot', 'CHUTE');
      this.label('pass', 'PEDIR');
      this.label('lob', 'PEDIR ALTO');
      av.shoot = near; av.pass = mateCpu && !set; av.lob = mateCpu && !set; av.trick = false;
    } else {
      this.label('shoot', 'CHUTE');
      this.label('pass', 'TROCAR');
      this.label('lob', 'CRUZAR');
      av.shoot = near; av.pass = true; av.trick = false; av.lob = training;
    }
    av.tackle = !hasBall && !set;
    av.press = !hasBall && !set;
    av.sprint = true;
    av.fire = !!tm && tm.heat >= 1 && tm.fire <= 0;
    for (const x of this.btns) x.el.classList.toggle('off', av[x.action] === false);
    // bola aérea ao alcance: CHUTE pisca (hora da bicicleta/voleio)
    this.root.classList.toggle('aerial', m.aerialCue);
  }
}

/** Ajustes de navegador para iPhone: sem zoom de pinça/duplo toque, sem rolagem elástica, aviso de girar. */
export function setupMobileBrowser() {
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', prevent, { passive: false } as AddEventListenerOptions);
  document.addEventListener('gesturechange', prevent, { passive: false } as AddEventListenerOptions);
  document.addEventListener('dblclick', prevent, { passive: false });
  document.addEventListener('touchmove', (e) => {
    // só deixa rolar listas que realmente rolam (menus/tabelas)
    for (let el = e.target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
      if (el.id === 'touch' || el.id === 'view') break;
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 2) return;
    }
    e.preventDefault();
  }, { passive: false });
  const rot = document.createElement('div');
  rot.id = 'rotate';
  rot.innerHTML = '<div class="phone"></div><b>Gire o aparelho</b><span>Rei da Praia é jogado na horizontal</span>';
  document.getElementById('app')!.appendChild(rot);
  // depois de girar, o iOS às vezes informa o tamanho antigo: força novo cálculo
  addEventListener('orientationchange', () => setTimeout(() => dispatchEvent(new Event('resize')), 350));
}
