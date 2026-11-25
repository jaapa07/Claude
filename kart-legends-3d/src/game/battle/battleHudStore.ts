import { create } from 'zustand';
import type { ArenaData } from './arenaTypes';
import type { BattleHudSnapshot } from './battleSim';

interface BattleHudStore {
  hud: BattleHudSnapshot | null;
  /** HUD do Jogador 2 na tela dividida. */
  hud2: BattleHudSnapshot | null;
  /** Arena atual (para o minimapa), definida quando a cena monta. */
  arena: ArenaData | null;
  /** Pedido da interface para adiantar a partida depois de eliminado. */
  fast: boolean;
  setHud: (hud: BattleHudSnapshot, hud2?: BattleHudSnapshot | null) => void;
  setArena: (arena: ArenaData | null) => void;
  setFast: (fast: boolean) => void;
  reset: () => void;
}

/** Ponte entre a simulação da batalha (escrita) e o HUD da batalha (leitura). */
export const useBattleHudStore = create<BattleHudStore>((set) => ({
  hud: null,
  hud2: null,
  arena: null,
  fast: false,
  setHud: (hud, hud2 = null) => set({ hud, hud2 }),
  setArena: (arena) => set({ arena }),
  setFast: (fast) => set({ fast }),
  reset: () => set({ hud: null, hud2: null, arena: null, fast: false }),
}));
