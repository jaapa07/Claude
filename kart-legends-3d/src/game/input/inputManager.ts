import { ACTION_IDS, useSettingsStore } from '@/app/settingsStore';
import type { ActionId, Bindings } from '@/app/settingsStore';
import type { InputState } from '@/game/core/types';

/** Alvo mínimo de eventos (window no navegador; um alvo falso nos testes). */
export interface InputEventTarget {
  addEventListener(type: string, listener: (event: never) => void, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: (event: never) => void, options?: boolean | EventListenerOptions): void;
}

export interface KeyLikeEvent {
  code: string;
  repeat?: boolean;
  preventDefault?: () => void;
  stopImmediatePropagation?: () => void;
}

/** Bordas (um disparo por toque, com repetição nas direções) do gamepad para navegar nos menus. */
export interface MenuPadState { up: boolean; down: boolean; left: boolean; right: boolean; confirm: boolean; back: boolean }

export class CaptureCancelledError extends Error {
  constructor() {
    super('Remapeamento cancelado');
    this.name = 'CaptureCancelledError';
  }
}

/** Mapeamento "standard" da Gamepad API. */
export const PAD = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9,
  UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, AXIS_X: 0, AXIS_Y: 1,
} as const;

export const PAD_HELP: ReadonlyArray<{ action: string; buttons: string }> = [
  { action: 'Acelerar', buttons: 'A ou RT' },
  { action: 'Frear / ré', buttons: 'B ou LT' },
  { action: 'Direção', buttons: 'Alavanca esquerda ou direcional' },
  { action: 'Drift', buttons: 'X ou RB' },
  { action: 'Usar item', buttons: 'Y ou LB' },
  { action: 'Pausar', buttons: 'Start' },
  { action: 'Recuperar veículo', buttons: 'Back / Select' },
];

const DEADZONE = 0.18;
/** Segundos para o teclado ir do centro ao esterço total com sensibilidade 1. */
const KEY_STEER_RISE = 0.14;
const KEY_STEER_RETURN = 0.08;
const MENU_REPEAT_FIRST_MS = 380;
const MENU_REPEAT_MS = 140;

type PadLike = Pick<Gamepad, 'buttons' | 'axes' | 'connected'>;

function pressed(pad: PadLike, index: number): boolean {
  const b = pad.buttons[index];
  return !!b && (b.pressed || b.value > 0.5);
}
function analog(pad: PadLike, index: number): number {
  const b = pad.buttons[index];
  if (!b) return 0;
  // Gatilhos informam `value` 0..1; botões digitais só `pressed`.
  return b.value > 0 ? Math.min(1, b.value) : b.pressed ? 1 : 0;
}

class InputManager {
  /** Relógio em ms; substituível nos testes. */
  now: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  /** Fonte de gamepads; substituível nos testes. */
  getGamepads: () => ReadonlyArray<PadLike | null> = () => {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return [];
    try {
      return navigator.getGamepads();
    } catch {
      return [];
    }
  };

  private target: InputEventTarget | null = null;
  private readonly down = new Set<string>();
  private readonly codeToAction = new Map<string, ActionId>();
  private readonly actionDown: Record<ActionId, number> = {
    accelerate: 0, brake: 0, left: 0, right: 0, drift: 0, item: 0, pause: 0, reset: 0,
  };
  private sensitivity = 1;
  private gamepadEnabled = true;
  private unsubscribe: (() => void) | null = null;
  private pausePressed = false;
  private padStartHeld = false;
  private gameplayActive = false;
  private keySteer = 0;
  private lastReadAt = -1;
  /** Controles de toque (celular): valores escritos pela camada `TouchControls`. */
  private readonly touch = { throttle: 0, brake: 0, steer: 0, drift: false, item: false, reset: false };
  private readonly state: InputState = { throttle: 0, brake: 0, steer: 0, drift: false, item: false, reset: false };
  private capture: { resolve: (code: string) => void; reject: (err: Error) => void } | null = null;

  private readonly menu: MenuPadState = { up: false, down: false, left: false, right: false, confirm: false, back: false };
  private menuDir: 'up' | 'down' | 'left' | 'right' | null = null;
  private menuNextAt = 0;
  private menuConfirmHeld = true;
  private menuBackHeld = true;

  private readonly onKeyDown = (e: KeyLikeEvent): void => {
    if (this.capture) {
      e.preventDefault?.();
      e.stopImmediatePropagation?.();
      const { resolve, reject } = this.capture;
      this.capture = null;
      if (e.code === 'Escape') reject(new CaptureCancelledError());
      else resolve(e.code);
      return;
    }
    const action = this.codeToAction.get(e.code);
    if (!action) return;
    if (this.gameplayActive) e.preventDefault?.();
    if (this.down.has(e.code)) return;
    this.down.add(e.code);
    this.actionDown[action] += 1;
    if (action === 'pause' && !e.repeat) this.pausePressed = true;
  };

  private readonly onKeyUp = (e: KeyLikeEvent): void => {
    if (!this.down.delete(e.code)) return;
    const action = this.codeToAction.get(e.code);
    if (action && this.actionDown[action] > 0) this.actionDown[action] -= 1;
  };

  private readonly onBlur = (): void => {
    this.releaseAll();
  };

  /** Começa a ouvir teclado (idempotente). `target` padrão: `window`. */
  attach(target?: InputEventTarget): void {
    if (this.target) this.detach();
    const t = target ?? (typeof window !== 'undefined' ? (window as unknown as InputEventTarget) : null);
    if (!t) return;
    this.target = t;
    this.applySettings(useSettingsStore.getState());
    this.unsubscribe = useSettingsStore.subscribe((s) => this.applySettings(s));
    // Fase de captura: o remapeamento intercepta a tecla antes de qualquer outro ouvinte.
    t.addEventListener('keydown', this.onKeyDown as (event: never) => void, true);
    t.addEventListener('keyup', this.onKeyUp as (event: never) => void, true);
    t.addEventListener('blur', this.onBlur as (event: never) => void);
  }

  detach(): void {
    const t = this.target;
    if (t) {
      t.removeEventListener('keydown', this.onKeyDown as (event: never) => void, true);
      t.removeEventListener('keyup', this.onKeyUp as (event: never) => void, true);
      t.removeEventListener('blur', this.onBlur as (event: never) => void);
    }
    this.target = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.cancelCapture();
    this.releaseAll();
    this.pausePressed = false;
  }

  /**
   * Com a corrida ativa (e não pausada) o gerenciador chama `preventDefault` nas teclas mapeadas,
   * para que setas/espaço não rolem a página nem acionem botões.
   */
  setGameplayActive(active: boolean): void {
    this.gameplayActive = active;
    if (!active) this.keySteer = 0;
  }

  /** Solta todas as teclas (perda de foco, troca de tela). */
  releaseAll(): void {
    this.down.clear();
    for (const a of ACTION_IDS) this.actionDown[a] = 0;
    this.keySteer = 0;
    this.lastReadAt = -1;
  }

  isActionDown(action: ActionId): boolean {
    return this.actionDown[action] > 0;
  }

  /**
   * Comandos do jogador para um passo de simulação. Devolve SEMPRE o mesmo objeto (sem alocação):
   * copie os campos se precisar guardá-los.
   */
  read(): InputState {
    const s = this.state;
    const a = this.actionDown;
    const now = this.now();
    const dt = this.lastReadAt < 0 ? 1 / 60 : Math.min(0.1, Math.max(0, (now - this.lastReadAt) / 1000));
    this.lastReadAt = now;

    // Teclado: direção digital suavizada; a sensibilidade define a rapidez do esterço.
    const dir = (a.right > 0 ? 1 : 0) - (a.left > 0 ? 1 : 0);
    if (dir !== 0) {
      // Inverter o sentido parte do centro, sem esperar o retorno.
      if (this.keySteer * dir < 0) this.keySteer = 0;
      this.keySteer += dir * (dt / KEY_STEER_RISE) * this.sensitivity;
      if (this.keySteer > 1) this.keySteer = 1;
      else if (this.keySteer < -1) this.keySteer = -1;
    } else if (this.keySteer !== 0) {
      const step = dt / KEY_STEER_RETURN;
      this.keySteer = Math.abs(this.keySteer) <= step ? 0 : this.keySteer - Math.sign(this.keySteer) * step;
    }

    let throttle = a.accelerate > 0 ? 1 : 0;
    let brake = a.brake > 0 ? 1 : 0;
    let steer = this.keySteer;
    let drift = a.drift > 0;
    let item = a.item > 0;
    let reset = a.reset > 0;

    const t = this.touch;
    if (t.brake > 0) throttle = 0;
    else throttle = Math.max(throttle, t.throttle);
    brake = Math.max(brake, t.brake);
    if (Math.abs(t.steer) > Math.abs(steer)) steer = t.steer;
    drift = drift || t.drift;
    item = item || t.item;
    reset = reset || t.reset;

    const pad = this.activePad();
    if (pad) {
      throttle = Math.max(throttle, pressed(pad, PAD.A) ? 1 : 0, analog(pad, PAD.RT));
      brake = Math.max(brake, pressed(pad, PAD.B) ? 1 : 0, analog(pad, PAD.LT));
      let x = pad.axes[PAD.AXIS_X] ?? 0;
      const mag = Math.abs(x);
      if (mag < DEADZONE) x = 0;
      else {
        // Curva de resposta: sensibilidade alta = linear; baixa = mais precisão perto do centro.
        const n = (mag - DEADZONE) / (1 - DEADZONE);
        x = Math.sign(x) * Math.min(1, Math.pow(n, 1.5 / this.sensitivity));
      }
      if (pressed(pad, PAD.LEFT)) x = -1;
      else if (pressed(pad, PAD.RIGHT)) x = 1;
      if (Math.abs(x) > Math.abs(steer)) steer = x;
      drift = drift || pressed(pad, PAD.X) || pressed(pad, PAD.RB);
      item = item || pressed(pad, PAD.Y) || pressed(pad, PAD.LB);
      reset = reset || pressed(pad, PAD.BACK);
    }

    s.throttle = throttle;
    s.brake = brake;
    s.steer = steer;
    s.drift = drift;
    s.item = item;
    s.reset = reset;
    return s;
  }

  /** Atualiza os comandos de toque (só os campos informados). */
  setTouch(values: Partial<{ throttle: number; brake: number; steer: number; drift: boolean; item: boolean; reset: boolean }>): void {
    Object.assign(this.touch, values);
  }

  /** Solta todos os comandos de toque. */
  clearTouch(): void {
    Object.assign(this.touch, { throttle: 0, brake: 0, steer: 0, drift: false, item: false, reset: false });
  }

  /** Botão de pausa na tela (toque). */
  requestPause(): void {
    this.pausePressed = true;
  }

  /** `true` uma única vez por toque na tecla de pausa ou no Start do gamepad. */
  consumePausePressed(): boolean {
    const pad = this.activePad();
    const start = !!pad && pressed(pad, PAD.START);
    if (start && !this.padStartHeld) this.pausePressed = true;
    this.padStartHeld = start;
    const was = this.pausePressed;
    this.pausePressed = false;
    return was;
  }

  /** Navegação de menus pelo gamepad. Devolve SEMPRE o mesmo objeto; chame uma vez por quadro. */
  readMenuPad(): MenuPadState {
    const m = this.menu;
    m.up = m.down = m.left = m.right = m.confirm = m.back = false;
    const pad = this.activePad();
    if (!pad) {
      this.menuDir = null;
      this.menuConfirmHeld = true;
      this.menuBackHeld = true;
      return m;
    }
    const x = pad.axes[PAD.AXIS_X] ?? 0;
    const y = pad.axes[PAD.AXIS_Y] ?? 0;
    let dir: typeof this.menuDir = null;
    if (pressed(pad, PAD.UP) || y < -0.6) dir = 'up';
    else if (pressed(pad, PAD.DOWN) || y > 0.6) dir = 'down';
    else if (pressed(pad, PAD.LEFT) || x < -0.6) dir = 'left';
    else if (pressed(pad, PAD.RIGHT) || x > 0.6) dir = 'right';
    const now = this.now();
    if (dir === null) this.menuDir = null;
    else if (dir !== this.menuDir) {
      this.menuDir = dir;
      this.menuNextAt = now + MENU_REPEAT_FIRST_MS;
      m[dir] = true;
    } else if (now >= this.menuNextAt) {
      this.menuNextAt = now + MENU_REPEAT_MS;
      m[dir] = true;
    }
    const confirm = pressed(pad, PAD.A);
    const back = pressed(pad, PAD.B);
    m.confirm = confirm && !this.menuConfirmHeld;
    m.back = back && !this.menuBackHeld;
    this.menuConfirmHeld = confirm;
    this.menuBackHeld = back;
    return m;
  }

  isGamepadConnected(): boolean {
    for (const p of this.getGamepads()) if (p && p.connected) return true;
    return false;
  }

  /**
   * Remapeamento: resolve com o `code` da próxima tecla pressionada (que não chega a mais ninguém).
   * Esc ou `cancelCapture()` rejeitam com `CaptureCancelledError`.
   */
  captureNextKey(): Promise<string> {
    this.cancelCapture();
    if (!this.target) return Promise.reject(new Error('inputManager.attach() não foi chamado'));
    return new Promise<string>((resolve, reject) => {
      this.capture = { resolve, reject };
    });
  }

  cancelCapture(): void {
    const c = this.capture;
    this.capture = null;
    c?.reject(new CaptureCancelledError());
  }

  isCapturing(): boolean {
    return this.capture !== null;
  }

  private activePad(): PadLike | null {
    if (!this.gamepadEnabled) return null;
    const pads = this.getGamepads();
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (p && p.connected) return p;
    }
    return null;
  }

  private applySettings(s: { bindings: Bindings; sensitivity: number; gamepadEnabled: boolean }): void {
    this.sensitivity = s.sensitivity;
    this.gamepadEnabled = s.gamepadEnabled;
    this.codeToAction.clear();
    for (const action of ACTION_IDS) for (const code of s.bindings[action]) this.codeToAction.set(code, action);
    // Teclas seguradas durante a troca de mapeamento são soltas para não ficarem "presas".
    this.down.clear();
    for (const a of ACTION_IDS) this.actionDown[a] = 0;
  }
}

export type { InputManager };
export const inputManager = new InputManager();
