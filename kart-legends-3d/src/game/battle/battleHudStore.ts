import { create } from 'zustand';
import type { ArenaData } from './arenaTypes';
import type { BattleHudSnapshot } from './battleSim';

interface BattleHudStore {
  hud: BattleHudSnapshot | null;
  /** Arena atual (para o minimapa), definida quando a cena monta. */
  arena: ArenaData | null;
  /** Pedido da interface para adiantar a partida depois de eliminado. */
  fast: boolean;
  setHud: (hud: BattleHudSnapshot) => void;
  setArena: (arena: ArenaData | null) => void;
  setFast: (fast: boolean) => void;
  reset: () => void;
}

/** Ponte entre a simulação da batalha (escrita) e o HUD da batalha (leitura). */
export const useBattleHudStore = create<BattleHudStore>((set) => ({
  hud: null,
  arena: null,
  fast: false,
  setHud: (hud) => set({ hud }),
  setArena: (arena) => set({ arena }),
  setFast: (fast) => set({ fast }),
  reset: () => set({ hud: null, arena: null, fast: false }),
}));
