import RAPIER from '@dimforge/rapier3d-compat';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ArenaId, BattleGameId } from '@/data/battle';
import { CHARACTERS } from '@/data/characters';
import type { Difficulty } from '@/data/ids';
import type { ArenaData } from '@/game/battle/arenaTypes';
import { BattleSim, type BattleEvent } from '@/game/battle/battleSim';
import { NEUTRAL_INPUT, type InputState } from '@/game/core/types';

const cache = new Map<ArenaId, ArenaData>();
export function loadArena(id: ArenaId): ArenaData {
  let a = cache.get(id);
  if (!a) {
    a = JSON.parse(readFileSync(path.resolve(__dirname, `../../public/assets/arenas/${id}.json`), 'utf8')) as ArenaData;
    cache.set(id, a);
  }
  return a;
}

export interface BattleHarness {
  sim: BattleSim;
  /** Comandos do Jogador 1 (= inputs[0]). */
  input: InputState;
  inputs: InputState[];
  events: BattleEvent[];
  run: (seconds: number) => void;
  /** Passa a apresentação e a contagem. */
  start: () => void;
}

export interface BattleHarnessOptions {
  arena?: ArenaId;
  game?: BattleGameId;
  difficulty?: Difficulty;
  /** Número total de participantes (jogador incluso, se houver). */
  count?: number;
  player?: boolean;
  /** Jogadores humanos (com `player`): 2 = os dois primeiros participantes. */
  humans?: number;
  seed?: number;
}

export function createBattleHarness(o: BattleHarnessOptions = {}): BattleHarness {
  const withPlayer = o.player ?? false;
  const humans = withPlayer ? Math.max(1, o.humans ?? 1) : 0;
  const inputs: InputState[] = Array.from({ length: Math.max(1, humans) }, () => ({ ...NEUTRAL_INPUT }));
  const input = inputs[0]!;
  const count = o.count ?? 8;
  const racers = CHARACTERS.slice(0, count).map((c, i) => ({ characterId: c.id, kartId: c.kartId, isPlayer: i < humans, ...(i < humans ? { slot: i } : {}) }));
  const sim = new BattleSim(RAPIER, new RAPIER.World({ x: 0, y: 0, z: 0 }), loadArena(o.arena ?? 'praca-coreto'), {
    arenaId: o.arena ?? 'praca-coreto', game: o.game ?? 'estoura-balao', difficulty: o.difficulty ?? 'normal', racers, seed: o.seed ?? 5,
  }, { playerInput: (slot) => inputs[slot] ?? input });
  const events: BattleEvent[] = [];
  const h: BattleHarness = {
    sim, input, inputs, events,
    run: (seconds: number): void => {
      const steps = Math.round(seconds * 60);
      for (let i = 0; i < steps; i++) { sim.step(); events.push(...sim.drainEvents()); }
    },
    start: () => { sim.startCountdown(); h.run(3.05); },
  };
  return h;
}
