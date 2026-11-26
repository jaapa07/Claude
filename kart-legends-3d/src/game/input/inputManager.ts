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

/** Ações de pilotagem de um jogador (a pausa é comum aos dois). */
export type DriveAction = Exclude<ActionId, 'pause'>;
export type KeyLayout = Readonly<Record<DriveAction, readonly string[]>>;

/**
 * Teclas fixas da tela dividida (dois jogadores no mesmo teclado). O remapeamento de 1 jogador não vale aqui,
 * para que os dois lados nunca disputem a mesma tecla. Esc (ou a tecla de pausa) pausa o jogo para os dois.
 */
export const TWO_PLAYER_KEYS: readonly [KeyLayout, KeyLayout] = [
  { accelerate: ['KeyW'], brake: ['KeyS'], left: ['KeyA'], right: ['KeyD'], item: ['KeyQ'], drift: ['KeyE'], reset: ['KeyR'] },
  { accelerate: ['ArrowUp'], brake: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], item: ['Enter', 'NumpadEnter'], drift: ['ShiftRight'], reset: ['Backspace'] },
];
const TWO_PLAYER_CODES: ReadonlySet<string> = new Set(TWO_PLAYER_KEYS.flatMap((l) => Object.values(l).flat()));

/**
 * Qual gamepad (índice em `navigator.getGamepads()`) controla cada jogador. Um jogador: o primeiro conectado.
 * Dois jogadores: 1º controle → Jogador 1 e 2º → Jogador 2; com um controle só, ele vai para o Jogador 2 e o
 * Jogador 1 joga no teclado.
 */
export function assignPads(connected: readonly number[], players: number): (number | null)[] {
  if (players < 2) return [connected[0] ?? null];
  if (connected.length >= 2) return [connected[0]!, connected[1]!];
  if (connected.length === 1) return [null, connected[0]!];
  return [null, null];
}

/** Estado de leitura de um jogador: direção suavizada do teclado e o objeto devolvido (sem alocação). */
interface Reader { keySteer: number; lastReadAt: number; state: InputState }
const newReader = (): Reader => ({ keySteer: 0, lastReadAt: -1, state: { throttle: 0, brake: 0, steer: 0, drift: false, item: false, reset: false } });

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
  /** Todas as teclas seguradas (mapeadas ou não): base dos leitores da tela dividida. */
  private readonly raw = new Set<string>();
  /** Jogadores humanos na corrida atual (2 = tela dividida, teclas fixas por jogador). */
  private players = 1;
  private readonly codeToAction = new Map<string, ActionId>();
  private readonly actionDown: Record<ActionId, number> = {
    accelerate: 0, brake: 0, left: 0, right: 0, drift: 0, item: 0, pause: 0, reset: 0,
  };
  private sensitivity = 1;
  private gamepadEnabled = true;
  private unsubscribe: (() => void) | null = null;
  private pausePressed = false;
  private readonly padStartHeld = new Map<number, boolean>();
  private gameplayActive = false;
  private readonly readers: [Reader, Reader] = [newReader(), newReader()];
  /** Controles de toque (celular): valores escritos pela camada `TouchControls`. */
  private readonly touch = { throttle: 0, brake: 0, steer: 0, drift: false, item: false, reset: false, driftPad: false, dir: 0 };
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
    this.raw.add(e.code);
    const action = this.codeToAction.get(e.code);
    if (this.gameplayActive && (action || (this.players >= 2 && TWO_PLAYER_CODES.has(e.code)))) e.preventDefault?.();
    if (!action) return;
    if (this.down.has(e.code)) return;
    this.down.add(e.code);
    this.actionDown[action] += 1;
    if (action === 'pause' && !e.repeat) this.pausePressed = true;
  };

  private readonly onKeyUp = (e: KeyLikeEvent): void => {
    this.raw.delete(e.code);
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
    if (!active) for (const r of this.readers) r.keySteer = 0;
  }

  /**
   * Quantos humanos estão na corrida: 1 (padrão: teclas remapeáveis, toque e o primeiro gamepad) ou 2 (tela
   * dividida: `TWO_PLAYER_KEYS` e um gamepad por jogador, ver `assignPads`).
   */
  setPlayerCount(count: number): void {
    const n = count >= 2 ? 2 : 1;
    if (n === this.players) return;
    this.players = n;
    for (const r of this.readers) { r.keySteer = 0; r.lastReadAt = -1; }
  }

  get playerCount(): number {
    return this.players;
  }

  /** Solta todas as teclas (perda de foco, troca de tela). */
  releaseAll(): void {
    this.down.clear();
    this.raw.clear();
    for (const a of ACTION_IDS) this.actionDown[a] = 0;
    for (const r of this.readers) { r.keySteer = 0; r.lastReadAt = -1; }
  }

  isActionDown(action: ActionId): boolean {
    return this.actionDown[action] > 0;
  }

  /**
   * Comandos do jogador para um passo de simulação (com dois jogadores, os do Jogador 1). Devolve SEMPRE o
   * mesmo objeto (sem alocação): copie os campos se precisar guardá-los.
   */
  read(): InputState {
    if (this.players >= 2) return this.readPlayer(0);
    const a = this.actionDown;
    return this.compose(this.readers[0], (k) => a[k] > 0, true, this.activePad());
  }

  /**
   * Comandos de um jogador (`slot` 0 = Jogador 1, 1 = Jogador 2). Com um jogador só, `readPlayer(0)` é `read()`
   * e o Jogador 2 fica parado. Devolve sempre o mesmo objeto por jogador.
   */
  readPlayer(slot: number): InputState {
    if (this.players < 2) {
      if (slot === 0) return this.read();
      const r = this.readers[1];
      Object.assign(r.state, { throttle: 0, brake: 0, steer: 0, drift: false, item: false, reset: false });
      return r.state;
    }
    const s = slot === 1 ? 1 : 0;
    const layout = TWO_PLAYER_KEYS[s];
    const raw = this.raw;
    return this.compose(this.readers[s], (k) => layout[k].some((code) => raw.has(code)), false, this.padForSlot(s));
  }

  /** Índices dos gamepads de cada jogador (para a interface e os testes). */
  padAssignment(): (number | null)[] {
    if (!this.gamepadEnabled) return this.players >= 2 ? [null, null] : [null];
    const connected: number[] = [];
    const pads = this.getGamepads();
    for (let i = 0; i < pads.length; i++) if (pads[i]?.connected) connected.push(i);
    return assignPads(connected, this.players);
  }

  private padForSlot(slot: number): PadLike | null {
    const idx = this.padAssignment()[slot];
    if (idx === null || idx === undefined) return null;
    return this.getGamepads()[idx] ?? null;
  }

  /** Junta teclado (direção suavizada), toque (só 1 jogador) e gamepad num `InputState`. */
  private compose(r: Reader, key: (action: DriveAction) => boolean, useTouch: boolean, pad: PadLike | null): InputState {
    const s = r.state;
    const now = this.now();
    const dt = r.lastReadAt < 0 ? 1 / 60 : Math.min(0.1, Math.max(0, (now - r.lastReadAt) / 1000));
    r.lastReadAt = now;
    const t = this.touch;

    // Teclado: direção digital suavizada; a sensibilidade define a rapidez do esterço.
    const dir = Math.max(-1, Math.min(1, (key('right') ? 1 : 0) - (key('left') ? 1 : 0) + (useTouch ? t.dir : 0)));
    if (dir !== 0) {
      // Inverter o sentido parte do centro, sem esperar o retorno.
      if (r.keySteer * dir < 0) r.keySteer = 0;
      r.keySteer += dir * (dt / KEY_STEER_RISE) * this.sensitivity;
      if (r.keySteer > 1) r.keySteer = 1;
      else if (r.keySteer < -1) r.keySteer = -1;
    } else if (r.keySteer !== 0) {
      const step = dt / KEY_STEER_RETURN;
      r.keySteer = Math.abs(r.keySteer) <= step ? 0 : r.keySteer - Math.sign(r.keySteer) * step;
    }

    let throttle = key('accelerate') ? 1 : 0;
    let brake = key('brake') ? 1 : 0;
    let steer = r.keySteer;
    let drift = key('drift');
    let item = key('item');
    let reset = key('reset');

    if (useTouch) {
      // Botão de drift do polegar esquerdo (modo manual): segurar também acelera.
      if (t.brake > 0) throttle = 0;
      else throttle = Math.max(throttle, t.throttle, t.driftPad ? 1 : 0);
      brake = Math.max(brake, t.brake);
      if (Math.abs(t.steer) > Math.abs(steer)) steer = t.steer;
      drift = drift || t.drift || t.driftPad;
      item = item || t.item;
      reset = reset || t.reset;
    }

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
  setTouch(values: Partial<{ throttle: number; brake: number; steer: number; drift: boolean; item: boolean; reset: boolean; driftPad: boolean; dir: number }>): void {
    Object.assign(this.touch, values);
  }

  /** Solta todos os comandos de toque. */
  clearTouch(): void {
    Object.assign(this.touch, { throttle: 0, brake: 0, steer: 0, drift: false, item: false, reset: false, driftPad: false, dir: 0 });
  }

  /** Botão de pausa na tela (toque). */
  requestPause(): void {
    this.pausePressed = true;
  }

  /** `true` uma única vez por toque na tecla de pausa ou no Start do gamepad (de qualquer jogador). */
  consumePausePressed(): boolean {
    const pads = this.getGamepads();
    const idx = this.players >= 2 ? this.padAssignment() : [this.activePadIndex()];
    for (const i of idx) {
      if (i === null || i === undefined) continue;
      const pad = pads[i];
      const start = !!pad && pad.connected && pressed(pad, PAD.START);
      if (start && !this.padStartHeld.get(i)) this.pausePressed = true;
      this.padStartHeld.set(i, start);
    }
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
    const i = this.activePadIndex();
    return i === null ? null : this.getGamepads()[i] ?? null;
  }

  private activePadIndex(): number | null {
    if (!this.gamepadEnabled) return null;
    const pads = this.getGamepads();
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (p && p.connected) return i;
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
