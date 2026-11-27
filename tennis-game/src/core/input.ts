// Unified input: keyboard (two layouts for local 2P), gamepads, and on-screen touch buttons.
export type Action = 'shot' | 'slice' | 'lob' | 'pause' | 'confirm' | 'back' | 'up' | 'down' | 'left' | 'right';

export interface PadState {
  x: number; // -1..1 (right +)
  y: number; // -1..1 (up/forward +)
  shot: boolean; slice: boolean; lob: boolean;
}

const KEYMAPS = [
  { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], shot: ['KeyJ', 'Space'], slice: ['KeyK'], lob: ['KeyL'] },
  { up: ['Numpad8'], down: ['Numpad5'], left: ['Numpad4'], right: ['Numpad6'], shot: ['Numpad1'], slice: ['Numpad2'], lob: ['Numpad3'] },
];

class InputManager {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private touch: PadState = { x: 0, y: 0, shot: false, slice: false, lob: false };
  private padPrev: boolean[][] = [];
  private listeners: ((a: Action) => void)[] = [];
  twoKeyboards = false;

  init() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      const a = this.keyToUi(e.code);
      if (a && !e.repeat) this.emit(a);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  private keyToUi(code: string): Action | null {
    if (code === 'Escape' || code === 'KeyP') return 'pause';
    if (code === 'Enter' || code === 'Space' || code === 'KeyJ') return 'confirm';
    if (code === 'Backspace' || code === 'KeyK') return 'back';
    if (code === 'ArrowUp' || code === 'KeyW') return 'up';
    if (code === 'ArrowDown' || code === 'KeyS') return 'down';
    if (code === 'ArrowLeft' || code === 'KeyA') return 'left';
    if (code === 'ArrowRight' || code === 'KeyD') return 'right';
    return null;
  }

  onAction(f: (a: Action) => void) { this.listeners.push(f); return () => { this.listeners = this.listeners.filter((x) => x !== f); }; }
  private emit(a: Action) { for (const l of [...this.listeners]) l(a); }
  /** Fire a UI action from on-screen buttons. */
  trigger(a: Action) { this.emit(a); }

  isDown(code: string) { return this.down.has(code); }
  wasPressed(code: string) { return this.pressed.has(code); }

  /** Called once per frame after gameplay has read input. */
  endFrame() {
    this.pressed.clear();
  }

  setTouch(s: Partial<PadState>) { Object.assign(this.touch, s); }

  pollGamepads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    pads.forEach((p, i) => {
      if (!p) return;
      const prev = this.padPrev[i] ?? [];
      const b = p.buttons.map((x) => x.pressed);
      if (b[9] && !prev[9]) this.emit('pause');
      if (b[0] && !prev[0]) this.emit('confirm');
      if (b[1] && !prev[1]) this.emit('back');
      if (b[12] && !prev[12]) this.emit('up');
      if (b[13] && !prev[13]) this.emit('down');
      if (b[14] && !prev[14]) this.emit('left');
      if (b[15] && !prev[15]) this.emit('right');
      const ay = p.axes[1] ?? 0, ax = p.axes[0] ?? 0;
      const pa = (this as unknown as { axPrev: number[][] }).axPrev ?? ((this as unknown as { axPrev: number[][] }).axPrev = []);
      const prevA = pa[i] ?? [0, 0];
      if (ay < -0.6 && prevA[1] >= -0.6) this.emit('up');
      if (ay > 0.6 && prevA[1] <= 0.6) this.emit('down');
      if (ax < -0.6 && prevA[0] >= -0.6) this.emit('left');
      if (ax > 0.6 && prevA[0] <= 0.6) this.emit('right');
      pa[i] = [ax, ay];
      this.padPrev[i] = b;
    });
  }

  /** Read the controller of a human player (0 or 1). */
  read(player: 0 | 1): PadState {
    const s: PadState = { x: 0, y: 0, shot: false, slice: false, lob: false };
    const km = KEYMAPS[this.twoKeyboards ? player : 0];
    const any = (codes: string[]) => codes.some((c) => this.down.has(c));
    if (player === 0 || this.twoKeyboards) {
      s.x = (any(km.right) ? 1 : 0) - (any(km.left) ? 1 : 0);
      s.y = (any(km.up) ? 1 : 0) - (any(km.down) ? 1 : 0);
      s.shot = any(km.shot); s.slice = any(km.slice); s.lob = any(km.lob);
    }
    if (player === 0) {
      s.x = s.x || this.touch.x; s.y = s.y || this.touch.y;
      s.shot ||= this.touch.shot; s.slice ||= this.touch.slice; s.lob ||= this.touch.lob;
    }
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const p = pads[this.twoKeyboards ? player : player];
    if (p) {
      const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
      const ax = dz(p.axes[0] ?? 0), ay = dz(p.axes[1] ?? 0);
      const dpx = (p.buttons[15]?.pressed ? 1 : 0) - (p.buttons[14]?.pressed ? 1 : 0);
      const dpy = (p.buttons[12]?.pressed ? 1 : 0) - (p.buttons[13]?.pressed ? 1 : 0);
      if (ax || dpx) s.x = ax || dpx;
      if (ay || dpy) s.y = -ay || dpy;
      s.shot ||= !!p.buttons[0]?.pressed; s.slice ||= !!p.buttons[1]?.pressed; s.lob ||= !!(p.buttons[2]?.pressed || p.buttons[3]?.pressed);
    }
    const len = Math.hypot(s.x, s.y);
    if (len > 1) { s.x /= len; s.y /= len; }
    return s;
  }
}

export const Input = new InputManager();
