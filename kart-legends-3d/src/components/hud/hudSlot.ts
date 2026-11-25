import { createContext, useContext } from 'react';
import { useBattleHudStore } from '@/game/battle/battleHudStore';
import type { BattleHudSnapshot } from '@/game/battle/battleSim';
import { useHudStore } from '@/game/core/hudStore';
import type { HudSnapshot } from '@/game/core/types';

/** De qual jogador é o HUD que está sendo desenhado (0 = Jogador 1 / único, 1 = Jogador 2 na tela dividida). */
export const HudSlotContext = createContext(0);

export function useHudSlot(): number {
  return useContext(HudSlotContext);
}

/** Lê um campo do HUD de corrida do jogador deste contexto. */
export function useHud<T>(select: (h: HudSnapshot) => T): T {
  const slot = useContext(HudSlotContext);
  return useHudStore((s) => select(slot === 1 && s.hud2 ? s.hud2 : s.hud));
}

/** HUD de batalha do jogador deste contexto (null antes da primeira publicação). */
export function useBattleHud(): BattleHudSnapshot | null {
  const slot = useContext(HudSlotContext);
  return useBattleHudStore((s) => (slot === 1 ? s.hud2 ?? s.hud : s.hud));
}

/** Rótulo curto de um jogador humano na tela dividida. */
export const slotTag = (slot: number | undefined): string => `J${(slot ?? 0) + 1}`;
