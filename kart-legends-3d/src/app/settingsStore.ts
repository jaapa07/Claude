import { create } from 'zustand';
import { readKey, writeKey } from '@/game/save/storage';

export const SETTINGS_KEY = 'kl3d.settings.v1';

export const ACTION_IDS = ['accelerate', 'brake', 'left', 'right', 'drift', 'item', 'pause', 'reset'] as const;
export type ActionId = (typeof ACTION_IDS)[number];
export type Quality = 'low' | 'medium' | 'high';
export interface Volumes { music: number; sfx: number; ambient: number }
export type Bindings = Record<ActionId, string[]>;

export const ACTION_LABELS: Record<ActionId, string> = {
  accelerate: 'Acelerar', brake: 'Frear / ré', left: 'Virar à esquerda', right: 'Virar à direita',
  drift: 'Drift', item: 'Usar item', pause: 'Pausar', reset: 'Recuperar veículo',
};

/** Cada ação aceita até duas teclas (KeyboardEvent.code). */
export const BINDING_SLOTS = 2;
export const SENSITIVITY_MIN = 0.5;
export const SENSITIVITY_MAX = 1.5;

export const DEFAULT_BINDINGS: Readonly<Bindings> = {
  accelerate: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  drift: ['Space'], item: ['ShiftLeft', 'ShiftRight'], pause: ['Escape'], reset: ['KeyR'],
};

export interface SettingsData {
  quality: Quality;
  volumes: Volumes;
  /** Sensibilidade da direção: 0.5 (suave) a 1.5 (rápida). */
  sensitivity: number;
  bindings: Bindings;
  gamepadEnabled: boolean;
  /** Controles de toque: o kart acelera sozinho (desligado = botão Acelerar). */
  autoAccelerate: boolean;
}

export interface SettingsState extends SettingsData {
  setQuality: (quality: Quality) => void;
  setVolume: (channel: keyof Volumes, value: number) => void;
  setSensitivity: (value: number) => void;
  setGamepadEnabled: (enabled: boolean) => void;
  setAutoAccelerate: (enabled: boolean) => void;
  /**
   * Define a tecla do `slot` (0 ou 1) da ação. A mesma tecla nunca fica em duas ações:
   * ela é removida de onde estava antes.
   */
  setBinding: (action: ActionId, slot: number, code: string) => void;
  clearBinding: (action: ActionId, slot: number) => void;
  resetBindings: () => void;
  /** Restaura todas as configurações de fábrica. */
  resetDefaults: () => void;
  reload: () => void;
}

function cloneBindings(b: Readonly<Bindings>): Bindings {
  return Object.fromEntries(ACTION_IDS.map((a) => [a, [...b[a]]])) as Bindings;
}

/** Celular/tablet: tela de toque sem mouse. */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches;
}

export function createDefaultSettings(): SettingsData {
  return {
    // No celular a qualidade padrão é baixa (GPU e bateria).
    quality: isTouchDevice() ? 'low' : 'high',
    volumes: { music: 0.7, sfx: 0.9, ambient: 0.6 },
    sensitivity: 1,
    bindings: cloneBindings(DEFAULT_BINDINGS),
    gamepadEnabled: true,
    autoAccelerate: true,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : fallback;
}

/** Lê configurações salvas tolerando campos ausentes ou inválidos. */
export function parseSettings(text: string | null): SettingsData {
  const d = createDefaultSettings();
  if (text === null) return d;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return d;
  }
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  if (r.quality === 'low' || r.quality === 'medium' || r.quality === 'high') d.quality = r.quality;
  if (typeof r.volumes === 'object' && r.volumes !== null) {
    const v = r.volumes as Record<string, unknown>;
    d.volumes = { music: num(v.music, d.volumes.music, 0, 1), sfx: num(v.sfx, d.volumes.sfx, 0, 1), ambient: num(v.ambient, d.volumes.ambient, 0, 1) };
  }
  d.sensitivity = num(r.sensitivity, 1, SENSITIVITY_MIN, SENSITIVITY_MAX);
  if (typeof r.gamepadEnabled === 'boolean') d.gamepadEnabled = r.gamepadEnabled;
  if (typeof r.autoAccelerate === 'boolean') d.autoAccelerate = r.autoAccelerate;
  if (typeof r.bindings === 'object' && r.bindings !== null) {
    const b = r.bindings as Record<string, unknown>;
    const used = new Set<string>();
    for (const a of ACTION_IDS) {
      const list = b[a];
      if (!Array.isArray(list)) continue;
      const codes: string[] = [];
      for (const c of list) {
        if (typeof c === 'string' && c.length > 0 && c.length < 40 && !used.has(c) && codes.length < BINDING_SLOTS) {
          codes.push(c);
          used.add(c);
        }
      }
      d.bindings[a] = codes;
    }
    // Pausar nunca pode ficar sem tecla (o jogador ficaria preso na corrida).
    if (d.bindings.pause.length === 0) d.bindings.pause = ['Escape'];
  }
  return d;
}

function persist(s: SettingsData): void {
  const { quality, volumes, sensitivity, bindings, gamepadEnabled, autoAccelerate } = s;
  writeKey(SETTINGS_KEY, JSON.stringify({ quality, volumes, sensitivity, bindings, gamepadEnabled, autoAccelerate }));
}

export const useSettingsStore = create<SettingsState>()((set, get) => {
  const update = (patch: Partial<SettingsData>): void => {
    set(patch);
    persist(get());
  };
  return {
    ...parseSettings(readKey(SETTINGS_KEY)),
    setQuality: (quality) => update({ quality }),
    setVolume: (channel, value) => update({ volumes: { ...get().volumes, [channel]: clamp(value, 0, 1) } }),
    setSensitivity: (value) => update({ sensitivity: clamp(value, SENSITIVITY_MIN, SENSITIVITY_MAX) }),
    setGamepadEnabled: (gamepadEnabled) => update({ gamepadEnabled }),
    setAutoAccelerate: (autoAccelerate) => update({ autoAccelerate }),
    setBinding: (action, slot, code) => {
      if (!code || slot < 0 || slot >= BINDING_SLOTS) return;
      const bindings = cloneBindings(get().bindings);
      // A única tecla de pausa não pode ser roubada por outra ação.
      if (action !== 'pause' && bindings.pause.length === 1 && bindings.pause[0] === code) return;
      for (const a of ACTION_IDS) if (a !== action) bindings[a] = bindings[a].filter((c) => c !== code);
      const own = bindings[action].indexOf(code);
      if (own >= 0 && own !== slot) bindings[action].splice(own, 1);
      const list = bindings[action];
      if (slot < list.length) list[slot] = code;
      else list.push(code);
      update({ bindings });
    },
    clearBinding: (action, slot) => {
      const bindings = cloneBindings(get().bindings);
      if (action === 'pause' && bindings.pause.length <= 1) return;
      bindings[action].splice(slot, 1);
      update({ bindings });
    },
    resetBindings: () => update({ bindings: cloneBindings(DEFAULT_BINDINGS) }),
    resetDefaults: () => update(createDefaultSettings()),
    reload: () => set(parseSettings(readKey(SETTINGS_KEY))),
  };
});
