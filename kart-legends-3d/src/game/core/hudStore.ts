import { create } from 'zustand';
import type { HudSnapshot } from './types';

export const EMPTY_HUD: HudSnapshot = {
  phase: 'intro', countdown: -1, position: 1, totalRacers: 8, lap: 1, totalLaps: 3, timeMs: 0, lapTimeMs: 0,
  bestLapMs: null, speedKmh: 0, item: null, itemRolling: false, driftLevel: 0, driftCharge: 0, boost: 0,
  shield: false, wrongWay: false, alerts: [], minimap: [],
};

interface HudStore { hud: HudSnapshot; setHud: (hud: HudSnapshot) => void; reset: () => void }

/** Ponte entre a simulação (escrita) e os componentes de HUD (leitura). */
export const useHudStore = create<HudStore>((set) => ({
  hud: EMPTY_HUD,
  setHud: (hud) => set({ hud }),
  reset: () => set({ hud: EMPTY_HUD }),
}));
