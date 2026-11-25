import { platform } from './Platform';
import { settings } from './Save';

export type Action = 'pass' | 'shoot' | 'lob' | 'trick' | 'sprint' | 'tackle' | 'fire' | 'pause';
export const ACTIONS: Action[] = ['pass', 'shoot', 'lob', 'trick', 'sprint', 'tackle', 'fire', 'pause'];
export type DeviceId = 'kb' | 'pad0' | 'pad1' | 'pad2' | 'pad3';

export type PadState = { mx: number; my: number; buttons: Record<Action, boolean> };

// Xbox/padrão: A=0 B=1 X=2 Y=3 LB=4 RB=5 LT=6 RT=7 Back=8 Start=9
const PAD_MAP: Record<Action, number> = { pass: 0, shoot: 1, lob: 2, trick: 3, fire: 5, sprint: 7, tackle: 6, pause: 9 };

/** Teclado + Gamepad API. Cada dispositivo vira um "controle" que pode ser atribuído a um time. */
class InputSys {
  private down = new Set<string>();
  private tapped = new Set<string>(); // teclas pressionadas desde o último quadro (toques rápidos não se perdem)
  private prev = new Map<DeviceId, Record<Action, boolean>>();
  private cur = new Map<DeviceId, PadState>();
  private menuPrev = { up: false, down: false, left: false, right: false, ok: false, back: false, start: false };
  menu = { up: false, down: false, left: false, right: false, ok: false, back: false, start: false };
  lastKey: string | null = null;
  /** borda esquerda/direita só do teclado (-1/0/1), para telas onde cada dispositivo age por si */
  kbDir = 0;
  private kbPrevL = false;
  private kbPrevR = false;
  private repeatT = 0;
  private heldDir = '';
  /** joystick virtual da tela de toque (null = solto) */
  private stick: { x: number; y: number } | null = null;
  /** aparelho com tela de toque (iPhone/Android/iPad) */
  /** versão Celular: controles de toque na tela */
  readonly touch = platform.mobile;

  constructor() {
    addEventListener('keydown', (e) => {
      this.down.add(e.code);
      this.tapped.add(e.code);
      this.lastKey = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => { this.down.clear(); this.tapped.clear(); });
  }

  /** Tecla virtual (botões de toque): entra no mesmo fluxo do teclado, inclusive toques rápidos. */
  virtualKey(code: string, isDown: boolean) {
    if (isDown) { this.down.add(code); this.tapped.add(code); } else this.down.delete(code);
  }
  /** Joystick virtual: vetor (-1..1) ou null ao soltar. */
  setStick(v: { x: number; y: number } | null) { this.stick = v; }

  devices(): DeviceId[] {
    const out: DeviceId[] = ['kb'];
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < Math.min(4, pads.length); i++) if (pads[i]) out.push(`pad${i}` as DeviceId);
    return out;
  }

  update(dt: number) {
    for (const d of this.devices()) {
      const s = this.read(d);
      const p = this.cur.get(d);
      if (p) this.prev.set(d, p.buttons);
      this.cur.set(d, s);
    }
    // navegação de menus: qualquer dispositivo
    const any = (f: (s: PadState, d: DeviceId) => boolean) => this.devices().some((d) => f(this.cur.get(d)!, d));
    const k = (c: string) => this.down.has(c) || this.tapped.has(c);
    const raw = {
      up: k('ArrowUp') || k('KeyW') || any((s, d) => d !== 'kb' && s.my < -0.6),
      down: k('ArrowDown') || k('KeyS') || any((s, d) => d !== 'kb' && s.my > 0.6),
      left: k('ArrowLeft') || k('KeyA') || any((s, d) => d !== 'kb' && s.mx < -0.6),
      right: k('ArrowRight') || k('KeyD') || any((s, d) => d !== 'kb' && s.mx > 0.6),
      ok: k('Enter') || k('Space') || k('KeyJ') || any((s, d) => d !== 'kb' && s.buttons.pass),
      back: k('Escape') || k('Backspace') || any((s, d) => d !== 'kb' && s.buttons.shoot),
      start: k('Enter') || any((s, d) => d !== 'kb' && s.buttons.pause),
    };
    // repetição automática para direções seguradas
    const dir = raw.up ? 'up' : raw.down ? 'down' : raw.left ? 'left' : raw.right ? 'right' : '';
    let rep = false;
    if (dir && dir === this.heldDir) { this.repeatT -= dt; if (this.repeatT <= 0) { rep = true; this.repeatT = 0.12; } }
    else { this.heldDir = dir; this.repeatT = 0.4; }
    for (const key of Object.keys(raw) as (keyof typeof raw)[]) {
      this.menu[key] = (raw[key] && !this.menuPrev[key]) || (rep && key === dir);
      this.menuPrev[key] = raw[key];
    }
    const kl = this.down.has('ArrowLeft') || this.down.has('KeyA') || this.tapped.has('ArrowLeft') || this.tapped.has('KeyA');
    const kr = this.down.has('ArrowRight') || this.down.has('KeyD') || this.tapped.has('ArrowRight') || this.tapped.has('KeyD');
    this.kbDir = kl && !this.kbPrevL ? -1 : kr && !this.kbPrevR ? 1 : 0;
    this.kbPrevL = kl; this.kbPrevR = kr;
    this.tapped.clear();
  }

  private read(d: DeviceId): PadState {
    const b = {} as Record<Action, boolean>;
    if (d === 'kb') {
      const K = settings.data.keys;
      let mx = 0, my = 0;
      const has = (c: string) => this.down.has(c) || this.tapped.has(c);
      if (this.down.has(K.left) || this.down.has('ArrowLeft')) mx -= 1;
      if (this.down.has(K.right) || this.down.has('ArrowRight')) mx += 1;
      if (this.down.has(K.up) || this.down.has('ArrowUp')) my -= 1;
      if (this.down.has(K.down) || this.down.has('ArrowDown')) my += 1;
      const l = Math.hypot(mx, my) || 1;
      for (const a of ACTIONS) b[a] = has(K[a]);
      // joystick de toque: direção analógica; empurrado até a borda = corrida automática
      if (this.stick && Math.hypot(this.stick.x, this.stick.y) > 0.15) {
        const m = Math.min(1, Math.hypot(this.stick.x, this.stick.y));
        const ang = Math.atan2(this.stick.y, this.stick.x);
        if (m > 0.93) b.sprint = true;
        return { mx: Math.cos(ang) * Math.min(1, m * 1.15), my: Math.sin(ang) * Math.min(1, m * 1.15), buttons: b };
      }
      if (this.down.has('ShiftRight')) b.sprint = true;
      return { mx: mx / l, my: my / l, buttons: b };
    }
    const pad = navigator.getGamepads()[+d.slice(3)];
    if (!pad) return { mx: 0, my: 0, buttons: Object.fromEntries(ACTIONS.map((a) => [a, false])) as Record<Action, boolean> };
    let mx = pad.axes[0] ?? 0, my = pad.axes[1] ?? 0;
    if (pad.buttons[14]?.pressed) mx = -1;
    if (pad.buttons[15]?.pressed) mx = 1;
    if (pad.buttons[12]?.pressed) my = -1;
    if (pad.buttons[13]?.pressed) my = 1;
    const m = Math.hypot(mx, my);
    if (m < 0.22) { mx = 0; my = 0; } else if (m > 1) { mx /= m; my /= m; }
    for (const a of ACTIONS) b[a] = !!pad.buttons[PAD_MAP[a]]?.pressed || (a === 'sprint' && (pad.buttons[7]?.value ?? 0) > 0.4);
    return { mx, my, buttons: b };
  }

  state(d: DeviceId): PadState {
    return this.cur.get(d) ?? { mx: 0, my: 0, buttons: Object.fromEntries(ACTIONS.map((a) => [a, false])) as Record<Action, boolean> };
  }
  pressed(d: DeviceId, a: Action) {
    return !!this.cur.get(d)?.buttons[a] && !this.prev.get(d)?.[a];
  }
  released(d: DeviceId, a: Action) {
    return !this.cur.get(d)?.buttons[a] && !!this.prev.get(d)?.[a];
  }
  held(d: DeviceId, a: Action) {
    return !!this.cur.get(d)?.buttons[a];
  }
  anyKeyCode(): string | null {
    const k = this.lastKey;
    this.lastKey = null;
    return k;
  }
}

export const input = new InputSys();
