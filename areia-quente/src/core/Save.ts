/** Configurações e progresso salvos no localStorage (com fallback em memória). */
export type Settings = {
  music: number; sfx: number; crowd: number;
  periodMinutes: number; difficulty: 0 | 1 | 2; quality: 0 | 1 | 2;
  keys: Record<string, string>;
};

export const DEFAULT_KEYS: Record<string, string> = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  pass: 'KeyJ', shoot: 'KeyK', lob: 'KeyL', trick: 'KeyI', sprint: 'ShiftLeft', tackle: 'Space', fire: 'KeyE', pause: 'Escape',
};

const DEF: Settings = { music: 0.7, sfx: 0.9, crowd: 0.8, periodMinutes: 3, difficulty: 1, quality: 1, keys: { ...DEFAULT_KEYS } };

function read<T>(k: string, def: T): T {
  try {
    const s = localStorage.getItem(k);
    return s ? { ...def, ...JSON.parse(s) } : structuredClone(def);
  } catch {
    return structuredClone(def);
  }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* armazenamento indisponível */ }
}

class SettingsStore {
  data: Settings = read('aq.settings', DEF);
  save() { write('aq.settings', this.data); }
}
export const settings = new SettingsStore();
settings.data.keys = { ...DEFAULT_KEYS, ...settings.data.keys };

export type CupState = {
  team: string; kit: 'home' | 'away';
  rounds: { a: string; b: string; ga?: number; gb?: number; pa?: number; pb?: number; winner?: string }[][];
  round: number; done: boolean; champion?: string;
};
export const cupStore = {
  load(): CupState | null {
    try { const s = localStorage.getItem('aq.cup'); return s ? JSON.parse(s) : null; } catch { return null; }
  },
  save(c: CupState | null) {
    try { c ? localStorage.setItem('aq.cup', JSON.stringify(c)) : localStorage.removeItem('aq.cup'); } catch { /* sem armazenamento */ }
  },
};
