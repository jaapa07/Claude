import { create } from 'zustand';
import type { HudSnapshot } from './types';

export const EMPTY_HUD: HudSnapshot = {
  phase: 'intro', countdown: -1, position: 1, totalRacers: 8, lap: 1, totalLaps: 3, timeMs: 0, lapTimeMs: 0,
  bestLapMs: null, speedKmh: 0, item: null, itemRolling: false, driftLevel: 0, driftCharge: 0, boost: 0,
  shield: false, wrongWay: false, alerts: [], minimap: [],
};

interface HudStore {
  /** HUD do Jogador 1 (ou do único jogador). */
  hud: HudSnapshot;
  /** HUD do Jogador 2 na tela dividida (null com um jogador). */
  hud2: HudSnapshot | null;
  setHud: (hud: HudSnapshot, hud2?: HudSnapshot | null) => void;
  reset: () => void;
}

/** Ponte entre a simulação (escrita) e os componentes de HUD (leitura). */
export const useHudStore = create<HudStore>((set) => ({
  hud: EMPTY_HUD,
  hud2: null,
  setHud: (hud, hud2 = null) => set({ hud, hud2 }),
  reset: () => set({ hud: EMPTY_HUD, hud2: null }),
}));
