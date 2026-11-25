import { input } from '../core/Input';
import { settings } from '../core/Save';
import type { Flow } from './Flow';

/**
 * Controles de toque (iPhone/Android/iPad): joystick virtual à esquerda e botões de ação à direita.
 * Tudo vira "teclas virtuais" do dispositivo de teclado, então a lógica da partida não muda.
 */
type Btn = { el: HTMLElement; action: string; ids: Set<number> };

const ACTIONS: [string, string, string][] = [
  // ação, rótulo, classe de posição
  ['shoot', 'CHUTE', 'b-shoot'],
  ['pass', 'PASSE', 'b-pass'],
  ['lob', 'LENÇOL', 'b-lob'],
  ['tackle', 'CARRINHO', 'b-tackle'],
  ['trick', 'FIRULA', 'b-trick'],
  ['sprint', 'CORRER', 'b-sprint'],
  ['fire', 'FOGO', 'b-fire'],
];

export class TouchControls {
  root: HTMLElement;
  private stickBase: HTMLElement;
  private stickKnob: HTMLElement;
  private stickId: number | null = null;
  private origin = { x: 0, y: 0 };
  private btns: Btn[] = [];
  private skip: HTMLElement;
  private pauseBtn: HTMLElement;
  private visible = false;

  constructor(private flow: Flow) {
    document.documentElement.classList.add('touch');
    const r = (this.root = document.createElement('div'));
    r.id = 'touch';
    r.innerHTML = `<div class="t-zone"></div><div class="t-stick"><div class="t-knob"></div></div>
      <div class="t-btns">${ACTIONS.map(([a, l, c]) => `<div class="t-btn ${c}" data-a="${a}"><span>${l}</span></div>`).join('')}</div>
      <div class="t-top"><div class="t-skip">PULAR ▶▶</div><div class="t-pause">❚❚</div></div>`;
    document.getElementById('app')!.appendChild(r);
    this.stickBase = r.querySelector('.t-stick')!;
    this.stickKnob = r.querySelector('.t-knob')!;
    this.skip = r.querySelector('.t-skip')!;
    this.pauseBtn = r.querySelector('.t-pause')!;

    // joystick: o toque em qualquer ponto da metade esquerda vira o centro do direcional
    const zone = r.querySelector('.t-zone') as HTMLElement;
    zone.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      e.preventDefault();
      this.stickId = e.pointerId;
      zone.setPointerCapture?.(e.pointerId);
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
    zone.addEventListener('lostpointercapture', end);

    // botões: cada um aceita vários dedos (segurar CHUTE = força; deslizar o dedo para fora solta)
    r.querySelectorAll<HTMLElement>('.t-btn').forEach((el) => {
      const b: Btn = { el, action: el.dataset.a!, ids: new Set() };
      this.btns.push(b);
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); b.ids.add(e.pointerId); this.setBtn(b); navigator.vibrate?.(8); });
      const up = (e: PointerEvent) => { if (b.ids.delete(e.pointerId)) this.setBtn(b); };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    });
    this.skip.addEventListener('pointerdown', (e) => { e.preventDefault(); this.tap('Enter'); });
    this.pauseBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.tap(settings.data.keys.pause); });
  }

  private key(action: string) { return settings.data.keys[action]; }
  private tap(code: string) { input.virtualKey(code, true); input.virtualKey(code, false); }
  private setBtn(b: Btn) {
    const on = b.ids.size > 0;
    b.el.classList.toggle('on', on);
    input.virtualKey(this.key(b.action), on);
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
    for (const b of this.btns) if (b.ids.size) { b.ids.clear(); this.setBtn(b); }
  }

  /** Chamado a cada quadro: mostra os controles só durante a partida e adapta rótulos ao contexto. */
  update() {
    const f = this.flow, m = f.match;
    const show = f.scene === 'match' && !!m && !m.paused;
    if (show !== this.visible) {
      this.visible = show;
      this.root.classList.toggle('on', show);
      if (!show) this.releaseAll();
    }
    if (!show || !m) return;
    const st = m.state;
    const skippable = st === 'intro' || st === 'replay' || st === 'halftime' || st === 'goal';
    this.skip.classList.toggle('on', skippable);
    this.pauseBtn.classList.toggle('on', !['intro', 'fulltime', 'done', 'halftime'].includes(st));
    // controles de jogo somem em cenas que não são jogadas
    this.root.classList.toggle('cine', ['intro', 'replay', 'halftime', 'fulltime', 'done', 'goal'].includes(st));
    const tm = m.teams.find((t) => t.players.some((p) => p.device === 'kb'));
    const me = tm?.players.find((p) => p.device === 'kb');
    const owner = m.ball.owner;
    const hasBall = !!me && owner === me;
    const attacking = !!tm && owner?.team === tm;
    // saque/cobrança esperando o jogador: os botões de passe e chute piscam
    this.root.classList.toggle('wait', !!me && (st === 'kickoff' || st === 'setpiece') && (hasBall || m.sp?.taker === me));
    if (st !== 'play' && st !== 'kickoff' && st !== 'setpiece') return;
    const label = (a: string, t: string) => { const el = this.btns.find((b) => b.action === a)!.el.firstElementChild as HTMLElement; if (el.textContent !== t) el.textContent = t; };
    label('pass', hasBall || attacking ? 'PASSE' : 'TROCAR');
    label('lob', m.opts.mode === 'training' && !hasBall ? 'CRUZAR' : 'LENÇOL');
    this.root.classList.toggle('atk', hasBall);
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
  rot.innerHTML = '<div class="phone"></div><b>Gire o aparelho</b><span>Areia Quente é jogado na horizontal</span>';
  document.getElementById('app')!.appendChild(rot);
  // depois de girar, o iOS às vezes informa o tamanho antigo: força novo cálculo
  addEventListener('orientationchange', () => setTimeout(() => dispatchEvent(new Event('resize')), 350));
}
