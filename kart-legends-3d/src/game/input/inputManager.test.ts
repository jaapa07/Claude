import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installMemoryStorage } from '@/game/save/testUtils';
import type { InputEventTarget, KeyLikeEvent } from './inputManager';

const storage = installMemoryStorage();
const { DEFAULT_BINDINGS, SETTINGS_KEY, parseSettings, useSettingsStore } = await import('@/app/settingsStore');
const { CaptureCancelledError, PAD, TWO_PLAYER_KEYS, assignPads, inputManager } = await import('./inputManager');
const { keyLabel } = await import('./keyLabels');

type Listener = (event: KeyLikeEvent) => void;

/** Alvo de eventos falso: guarda os ouvintes e deixa o teste dispará-los. */
class FakeTarget implements InputEventTarget {
  listeners = new Map<string, Set<Listener>>();
  addEventListener(type: string, listener: (event: never) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(listener as Listener);
  }
  removeEventListener(type: string, listener: (event: never) => void): void {
    this.listeners.get(type)?.delete(listener as Listener);
  }
  fire(type: string, code = ''): { prevented: boolean; stopped: boolean } {
    const flags = { prevented: false, stopped: false };
    const event: KeyLikeEvent = {
      code,
      preventDefault: () => { flags.prevented = true; },
      stopImmediatePropagation: () => { flags.stopped = true; },
    };
    for (const l of [...(this.listeners.get(type) ?? [])]) l(event);
    return flags;
  }
  count(): number {
    return [...this.listeners.values()].reduce((n, s) => n + s.size, 0);
  }
}

interface FakePad { connected: boolean; buttons: Array<{ pressed: boolean; value: number; touched: boolean }>; axes: number[] }
function makePad(): FakePad {
  return { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] };
}
function press(pad: FakePad, index: number, value = 1): void {
  pad.buttons[index] = { pressed: value > 0.5, value, touched: value > 0 };
}

let target: FakeTarget;
let clock = 0;
let pads: Array<FakePad | null> = [];
/** Avança o relógio e lê, como a simulação faz a cada passo fixo. */
function step(ms = 1000 / 60, times = 1) {
  let s = inputManager.read();
  for (let i = 0; i < times; i++) {
    clock += ms;
    s = inputManager.read();
  }
  return s;
}

beforeEach(() => {
  storage.clear();
  useSettingsStore.getState().resetDefaults();
  target = new FakeTarget();
  clock = 1000;
  pads = [];
  inputManager.now = () => clock;
  inputManager.getGamepads = () => pads;
  inputManager.attach(target);
});
afterEach(() => { inputManager.detach(); inputManager.setPlayerCount(1); });

describe('bindings padrão', () => {
  it('seguem a especificação: WASD/setas, Espaço, Shift, Esc e R', () => {
    expect(DEFAULT_BINDINGS).toEqual({
      accelerate: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
      drift: ['Space'], item: ['ShiftLeft', 'ShiftRight'], pause: ['Escape'], reset: ['KeyR'],
    });
    expect(useSettingsStore.getState().bindings).toEqual(DEFAULT_BINDINGS);
  });

  it('nomes legíveis das teclas', () => {
    expect(['KeyW', 'ArrowLeft', 'Space', 'ShiftLeft', 'Escape', 'Digit7', 'F5'].map(keyLabel)).toEqual(['W', '←', 'Espaço', 'Shift esq.', 'Esc', '7', 'F5']);
  });
});

describe('leitura de teclado', () => {
  it('estado neutro sem teclas, e sempre o mesmo objeto (sem alocação)', () => {
    const a = inputManager.read();
    const b = inputManager.read();
    expect(a).toBe(b);
    expect(a).toEqual({ throttle: 0, brake: 0, steer: 0, drift: false, item: false, reset: false });
  });

  it('acelerar, frear, drift, item e recuperar pelas duas teclas de cada ação', () => {
    target.fire('keydown', 'KeyW');
    target.fire('keydown', 'Space');
    target.fire('keydown', 'ShiftRight');
    expect(step()).toMatchObject({ throttle: 1, brake: 0, drift: true, item: true, reset: false });
    target.fire('keyup', 'KeyW');
    target.fire('keyup', 'Space');
    target.fire('keyup', 'ShiftRight');
    target.fire('keydown', 'ArrowDown');
    target.fire('keydown', 'KeyR');
    expect(step()).toMatchObject({ throttle: 0, brake: 1, drift: false, item: false, reset: true });
  });

  it('duas teclas da mesma ação: soltar uma não solta a ação', () => {
    target.fire('keydown', 'KeyW');
    target.fire('keydown', 'ArrowUp');
    target.fire('keyup', 'KeyW');
    expect(step().throttle).toBe(1);
    target.fire('keyup', 'ArrowUp');
    expect(step().throttle).toBe(0);
  });

  it('direção: chega a ±1, volta ao centro e esquerda+direita se anulam', () => {
    target.fire('keydown', 'KeyD');
    const first = step().steer;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
    expect(step(1000 / 60, 30).steer).toBe(1);
    target.fire('keydown', 'KeyA');
    expect(step(1000 / 60, 30).steer).toBe(0);
    target.fire('keyup', 'KeyD');
    expect(step(1000 / 60, 30).steer).toBe(-1);
    target.fire('keyup', 'KeyA');
    expect(step(1000 / 60, 30).steer).toBe(0);
  });

  it('sensibilidade maior esterça mais rápido', () => {
    const steerAfter = (sensitivity: number): number => {
      useSettingsStore.getState().setSensitivity(sensitivity);
      inputManager.releaseAll();
      target.fire('keydown', 'ArrowRight');
      const v = step(1000 / 60, 3).steer;
      target.fire('keyup', 'ArrowRight');
      return v;
    };
    const slow = steerAfter(0.5);
    const normal = steerAfter(1);
    const fast = steerAfter(1.5);
    expect(slow).toBeGreaterThan(0);
    expect(normal).toBeGreaterThan(slow);
    expect(fast).toBeGreaterThan(normal);
    useSettingsStore.getState().setSensitivity(99);
    expect(useSettingsStore.getState().sensitivity).toBe(1.5);
  });

  it('perder o foco da janela solta todas as teclas', () => {
    target.fire('keydown', 'KeyW');
    target.fire('keydown', 'KeyD');
    step();
    target.fire('blur');
    expect(step()).toMatchObject({ throttle: 0, steer: 0 });
  });

  it('teclas mapeadas só têm preventDefault com a corrida ativa', () => {
    expect(target.fire('keydown', 'Space').prevented).toBe(false);
    target.fire('keyup', 'Space');
    inputManager.setGameplayActive(true);
    expect(target.fire('keydown', 'Space').prevented).toBe(true);
    expect(target.fire('keydown', 'KeyQ').prevented).toBe(false);
    inputManager.setGameplayActive(false);
  });

  it('detach remove os ouvintes e zera o estado', () => {
    target.fire('keydown', 'KeyW');
    inputManager.detach();
    expect(target.count()).toBe(0);
    expect(inputManager.read().throttle).toBe(0);
  });
});

describe('pausa', () => {
  it('consumePausePressed dispara uma vez por toque', () => {
    expect(inputManager.consumePausePressed()).toBe(false);
    target.fire('keydown', 'Escape');
    target.fire('keydown', 'Escape'); // repetição automática do teclado
    expect(inputManager.consumePausePressed()).toBe(true);
    expect(inputManager.consumePausePressed()).toBe(false);
    target.fire('keyup', 'Escape');
    target.fire('keydown', 'Escape');
    expect(inputManager.consumePausePressed()).toBe(true);
  });

  it('Start do gamepad pausa (uma vez enquanto segurado)', () => {
    const pad = makePad();
    pads = [pad];
    press(pad, PAD.START);
    expect(inputManager.consumePausePressed()).toBe(true);
    expect(inputManager.consumePausePressed()).toBe(false);
    press(pad, PAD.START, 0);
    expect(inputManager.consumePausePressed()).toBe(false);
    press(pad, PAD.START);
    expect(inputManager.consumePausePressed()).toBe(true);
  });
});

describe('remapeamento', () => {
  it('captureNextKey devolve a próxima tecla sem acioná-la no jogo', async () => {
    const pending = inputManager.captureNextKey();
    expect(inputManager.isCapturing()).toBe(true);
    const flags = target.fire('keydown', 'KeyW');
    expect(flags).toEqual({ prevented: true, stopped: true });
    await expect(pending).resolves.toBe('KeyW');
    expect(inputManager.isCapturing()).toBe(false);
    expect(inputManager.read().throttle).toBe(0);
  });

  it('Esc cancela a captura (e não pausa)', async () => {
    const pending = inputManager.captureNextKey();
    target.fire('keydown', 'Escape');
    await expect(pending).rejects.toBeInstanceOf(CaptureCancelledError);
    expect(inputManager.consumePausePressed()).toBe(false);
  });

  it('nova tecla passa a valer na hora; a antiga deixa de valer', () => {
    useSettingsStore.getState().setBinding('accelerate', 0, 'KeyI');
    expect(useSettingsStore.getState().bindings.accelerate).toEqual(['KeyI', 'ArrowUp']);
    target.fire('keydown', 'KeyW');
    expect(step().throttle).toBe(0);
    target.fire('keydown', 'KeyI');
    expect(step().throttle).toBe(1);
  });

  it('uma tecla nunca fica em duas ações: é retirada da ação anterior', () => {
    const s = useSettingsStore.getState();
    s.setBinding('drift', 0, 'KeyR');
    const b = useSettingsStore.getState().bindings;
    expect(b.drift).toEqual(['KeyR']);
    expect(b.reset).toEqual([]);
    s.setBinding('drift', 1, 'Space');
    expect(useSettingsStore.getState().bindings.drift).toEqual(['KeyR', 'Space']);
    target.fire('keydown', 'KeyR');
    expect(step()).toMatchObject({ drift: true, reset: false });
  });

  it('a única tecla de pausa não pode ser roubada nem removida', () => {
    const s = useSettingsStore.getState();
    s.setBinding('item', 0, 'Escape');
    expect(useSettingsStore.getState().bindings.pause).toEqual(['Escape']);
    expect(useSettingsStore.getState().bindings.item).toEqual(['ShiftLeft', 'ShiftRight']);
    s.clearBinding('pause', 0);
    expect(useSettingsStore.getState().bindings.pause).toEqual(['Escape']);
    s.setBinding('pause', 0, 'KeyP');
    target.fire('keydown', 'KeyP');
    expect(inputManager.consumePausePressed()).toBe(true);
    target.fire('keydown', 'Escape');
    expect(inputManager.consumePausePressed()).toBe(false);
  });

  it('persiste em kl3d.settings.v1, restaura padrões e tolera dados inválidos', () => {
    const s = useSettingsStore.getState();
    s.setBinding('item', 0, 'KeyE');
    s.setVolume('music', 0.25);
    s.setQuality('low');
    s.setGamepadEnabled(false);
    const stored = parseSettings(storage.getItem(SETTINGS_KEY));
    expect(stored.bindings.item).toEqual(['KeyE', 'ShiftRight']);
    expect(stored).toMatchObject({ quality: 'low', gamepadEnabled: false, volumes: { music: 0.25, sfx: 0.9, ambient: 0.6 } });

    useSettingsStore.getState().resetDefaults();
    expect(useSettingsStore.getState().bindings).toEqual(DEFAULT_BINDINGS);
    expect(useSettingsStore.getState().quality).toBe('high');
    expect(parseSettings(storage.getItem(SETTINGS_KEY)).bindings).toEqual(DEFAULT_BINDINGS);

    expect(parseSettings('{quebrado')).toMatchObject({ quality: 'high', sensitivity: 1 });
    const odd = parseSettings(JSON.stringify({ quality: 'ultra', volumes: { music: 7, sfx: 'alto' }, sensitivity: 0.1, bindings: { pause: [], drift: ['KeyX', 'KeyX', 5] } }));
    expect(odd).toMatchObject({ quality: 'high', volumes: { music: 1, sfx: 0.9, ambient: 0.6 }, sensitivity: 0.5 });
    expect(odd.bindings.pause).toEqual(['Escape']);
    expect(odd.bindings.drift).toEqual(['KeyX']);
    expect(odd.bindings.accelerate).toEqual(['KeyW', 'ArrowUp']);
  });
});

describe('gamepad', () => {
  it('gatilhos analógicos, alavanca com zona morta, botões e direcional', () => {
    const pad = makePad();
    pads = [null, pad];
    press(pad, PAD.RT, 0.6);
    pad.axes[PAD.AXIS_X] = 0.1;
    let s = step();
    expect(s.throttle).toBeCloseTo(0.6);
    expect(s.steer).toBe(0);
    pad.axes[PAD.AXIS_X] = -1;
    press(pad, PAD.X);
    press(pad, PAD.LB);
    press(pad, PAD.BACK);
    press(pad, PAD.LT, 1);
    s = step();
    expect(s).toMatchObject({ steer: -1, drift: true, item: true, reset: true, brake: 1 });
    pad.axes[PAD.AXIS_X] = 0;
    press(pad, PAD.RIGHT);
    expect(step().steer).toBe(1);
    expect(inputManager.isGamepadConnected()).toBe(true);
  });

  it('meia alavanca responde mais com sensibilidade alta', () => {
    const pad = makePad();
    pads = [pad];
    pad.axes[PAD.AXIS_X] = 0.6;
    useSettingsStore.getState().setSensitivity(0.5);
    const low = step().steer;
    useSettingsStore.getState().setSensitivity(1.5);
    const high = step().steer;
    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThan(1);
  });

  it('desligado nas configurações: é ignorado', () => {
    const pad = makePad();
    pads = [pad];
    press(pad, PAD.A);
    expect(step().throttle).toBe(1);
    useSettingsStore.getState().setGamepadEnabled(false);
    expect(step().throttle).toBe(0);
    press(pad, PAD.START);
    expect(inputManager.consumePausePressed()).toBe(false);
  });

  it('navegação de menus: borda no primeiro toque, repetição ao segurar, A confirma e B volta', () => {
    const pad = makePad();
    pads = [pad];
    inputManager.readMenuPad(); // estabelece o estado inicial com o controle conectado
    press(pad, PAD.DOWN);
    expect(inputManager.readMenuPad().down).toBe(true);
    expect(inputManager.readMenuPad().down).toBe(false);
    clock += 400;
    expect(inputManager.readMenuPad().down).toBe(true);
    press(pad, PAD.DOWN, 0);
    press(pad, PAD.A);
    const m = inputManager.readMenuPad();
    expect(m).toMatchObject({ down: false, confirm: true, back: false });
    expect(inputManager.readMenuPad().confirm).toBe(false);
    press(pad, PAD.A, 0);
    press(pad, PAD.B);
    expect(inputManager.readMenuPad().back).toBe(true);
  });
});

describe('dois jogadores (tela dividida)', () => {
  /** Lê os dois jogadores avançando o relógio (como a simulação a cada passo). */
  function both(ms = 1000 / 60) {
    clock += ms;
    const a = { ...inputManager.readPlayer(0) };
    const b = { ...inputManager.readPlayer(1) };
    return [a, b] as const;
  }

  it('teclas fixas: J1 = WASD, Q item, E drift, R recupera; J2 = setas, Enter item, Shift dir. drift, Backspace recupera', () => {
    expect(TWO_PLAYER_KEYS[0]).toEqual({ accelerate: ['KeyW'], brake: ['KeyS'], left: ['KeyA'], right: ['KeyD'], item: ['KeyQ'], drift: ['KeyE'], reset: ['KeyR'] });
    expect(TWO_PLAYER_KEYS[1]).toEqual({ accelerate: ['ArrowUp'], brake: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], item: ['Enter', 'NumpadEnter'], drift: ['ShiftRight'], reset: ['Backspace'] });
    const all = [...Object.values(TWO_PLAYER_KEYS[0]).flat(), ...Object.values(TWO_PLAYER_KEYS[1]).flat()];
    expect(new Set(all).size).toBe(all.length); // nenhuma tecla em dois lugares
    expect(all).not.toContain('Escape');
  });

  it('cada jogador lê só as próprias teclas', () => {
    inputManager.setPlayerCount(2);
    target.fire('keydown', 'KeyW');
    target.fire('keydown', 'KeyQ');
    target.fire('keydown', 'KeyE');
    let [p1, p2] = both();
    expect(p1).toMatchObject({ throttle: 1, item: true, drift: true, brake: 0 });
    expect(p2).toMatchObject({ throttle: 0, item: false, drift: false });
    target.fire('keyup', 'KeyW'); target.fire('keyup', 'KeyQ'); target.fire('keyup', 'KeyE');
    target.fire('keydown', 'ArrowUp');
    target.fire('keydown', 'Enter');
    target.fire('keydown', 'ShiftRight');
    target.fire('keydown', 'Backspace');
    [p1, p2] = both();
    expect(p1).toMatchObject({ throttle: 0, item: false, drift: false, reset: false });
    expect(p2).toMatchObject({ throttle: 1, item: true, drift: true, reset: true });
    // compatibilidade: read() é o Jogador 1
    expect(inputManager.read().throttle).toBe(0);
  });

  it('a direção de cada um é suavizada separadamente', () => {
    inputManager.setPlayerCount(2);
    target.fire('keydown', 'KeyA');
    target.fire('keydown', 'ArrowRight');
    let p1 = 0, p2 = 0;
    for (let i = 0; i < 20; i++) [{ steer: p1 }, { steer: p2 }] = both();
    expect(p1).toBe(-1);
    expect(p2).toBe(1);
  });

  it('o remapeamento de 1 jogador não vale na tela dividida (Espaço não faz drift, setas não aceleram o J1)', () => {
    inputManager.setPlayerCount(2);
    target.fire('keydown', 'Space');
    target.fire('keydown', 'ArrowUp');
    const [p1, p2] = both();
    expect(p1).toMatchObject({ drift: false, throttle: 0 });
    expect(p2.throttle).toBe(1);
  });

  it('com a corrida ativa, as teclas dos dois jogadores não chegam à página', () => {
    inputManager.setPlayerCount(2);
    inputManager.setGameplayActive(true);
    expect(target.fire('keydown', 'Enter').prevented).toBe(true);
    expect(target.fire('keydown', 'Backspace').prevented).toBe(true);
    expect(target.fire('keydown', 'KeyQ').prevented).toBe(true);
    expect(target.fire('keydown', 'KeyZ').prevented).toBe(false);
    inputManager.setPlayerCount(1);
    expect(target.fire('keydown', 'KeyQ').prevented).toBe(false);
  });

  it('gamepads: 1º → J1 e 2º → J2; com um só, ele vai para o J2', () => {
    expect(assignPads([], 1)).toEqual([null]);
    expect(assignPads([2], 1)).toEqual([2]);
    expect(assignPads([], 2)).toEqual([null, null]);
    expect(assignPads([0], 2)).toEqual([null, 0]);
    expect(assignPads([0, 3], 2)).toEqual([0, 3]);
    expect(assignPads([1, 2, 3], 2)).toEqual([1, 2]);

    inputManager.setPlayerCount(2);
    const only = makePad();
    pads = [only];
    press(only, PAD.A);
    let [p1, p2] = both();
    expect(p1.throttle).toBe(0);
    expect(p2.throttle).toBe(1);
    target.fire('keydown', 'KeyW');
    [p1] = both();
    expect(p1.throttle).toBe(1); // o J1 segue no teclado

    const second = makePad();
    pads = [only, second];
    press(second, PAD.X);
    [p1, p2] = both();
    expect(p1).toMatchObject({ throttle: 1, drift: false }); // A do 1º controle (e W)
    expect(p2).toMatchObject({ throttle: 0, drift: true });
    expect(inputManager.padAssignment()).toEqual([0, 1]);
  });

  it('Start de qualquer controle pausa (para os dois)', () => {
    inputManager.setPlayerCount(2);
    const a = makePad(), b = makePad();
    pads = [a, b];
    expect(inputManager.consumePausePressed()).toBe(false);
    press(b, PAD.START);
    expect(inputManager.consumePausePressed()).toBe(true);
    expect(inputManager.consumePausePressed()).toBe(false);
    press(b, PAD.START, 0);
    press(a, PAD.START);
    expect(inputManager.consumePausePressed()).toBe(true);
    target.fire('keydown', 'Escape');
    expect(inputManager.consumePausePressed()).toBe(true);
  });

  it('um jogador: readPlayer(0) é read() e o J2 fica parado', () => {
    target.fire('keydown', 'ArrowUp');
    clock += 16;
    expect(inputManager.readPlayer(0).throttle).toBe(1);
    expect(inputManager.readPlayer(1).throttle).toBe(0);
  });
});
