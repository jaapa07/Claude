// Persistent save (progress, options, records) in localStorage, tolerant to private mode.
interface SaveData {
  version: 1;
  unlocked: string[];
  arcadeWins: number;
  lastMenu: number;
  records: { trainingBest: number };
  exhibition: { venue: string; games: number; sets: number; difficulty: string; twoPlayers: boolean; p1?: string; p2?: string };
  options: { volume: { music: number; sfx: number; voice: number; crowd: number }; quality: 'low' | 'medium' | 'high'; hudScale: number; shake: boolean; touch: 'auto' | 'on' | 'off' };
}

const KEY = 'gsa_save_v1';
const defaults = (): SaveData => ({
  version: 1,
  unlocked: [],
  arcadeWins: 0,
  lastMenu: 0,
  records: { trainingBest: 0 },
  exhibition: { venue: 'harbor', games: 2, sets: 1, difficulty: 'normal', twoPlayers: false },
  options: { volume: { music: 0.5, sfx: 0.9, voice: 1, crowd: 0.7 }, quality: 'high', hudScale: 1, shake: true, touch: 'auto' },
});

class SaveStore {
  data: SaveData = defaults();
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const base = defaults();
        this.data = { ...base, ...d, options: { ...base.options, ...d.options, volume: { ...base.options.volume, ...d.options?.volume } }, exhibition: { ...base.exhibition, ...d.exhibition }, records: { ...base.records, ...d.records } };
      }
    } catch { /* private mode */ }
  }
  flush() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }
}

export const Save = new SaveStore();
