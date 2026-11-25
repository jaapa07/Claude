import { beforeAll, describe, expect, it } from 'vitest';
import { ARENA_IDS, BATTLE_GAME_IDS, type ArenaId, type BattleGameId } from '@/data/battle';
import type { Difficulty } from '@/data/ids';
import type { BattleEvent } from '@/game/battle/battleSim';
import { createBattleHarness } from './battleHarness';
import { initPhysics } from './simHarness';

beforeAll(initPhysics);

interface Report { finished: boolean; matchTime: number; events: BattleEvent[]; moved: number[]; stuck: number; maxStep: number }

/** Partida inteira só com IA (8 karts), até o apito final. */
async function aiMatch(arena: ArenaId, game: BattleGameId, difficulty: Difficulty, seed = 9): Promise<Report> {
  const h = createBattleHarness({ arena, game, difficulty, seed });
  h.start();
  const s = h.sim;
  const moved = s.karts.map(() => 0);
  let steps = 0, maxStep = 0;
  while (s.phase !== 'finished' && steps < 60 * 200) {
    if (++steps % 2000 === 0) await new Promise((r) => setTimeout(r, 0));
    s.step();
    const ev = s.drainEvents();
    h.events.push(...ev);
    const respawned = new Set(ev.filter((e) => e.type === 'respawn').map((e) => (e as { kart: number }).kart));
    for (const k of s.karts) {
      if (s.battlers[k.index]!.out || respawned.has(k.index)) continue;
      const d = Math.hypot(k.x - k.px, k.z - k.pz);
      moved[k.index] += d;
      maxStep = Math.max(maxStep, d);
    }
  }
  return {
    finished: s.phase === 'finished', matchTime: s.matchTime, events: h.events, moved, maxStep,
    stuck: h.events.filter((e) => e.type === 'respawn' && e.reason === 'stuck').length,
  };
}

describe('IA de batalha: 8 robôs jogam cada minijogo até o fim em cada arena', () => {
  for (const arena of ARENA_IDS) for (const game of BATTLE_GAME_IDS) {
    it(`${arena} · ${game}`, async () => {
      const r = await aiMatch(arena, game, 'normal');
      expect(r.finished).toBe(true);
      // ninguém fica preso: no máximo uns poucos resgates pelo cão de guarda em toda a partida
      expect(r.stuck).toBeLessThanOrEqual(6);
      // todos andam de verdade (média acima de 8 m/s enquanto estão na arena)
      const avg = r.moved.reduce((a, b) => a + b, 0) / r.moved.length;
      expect(avg / r.matchTime).toBeGreaterThan(8);
      // sem teletransporte (passo físico normal)
      expect(r.maxStep).toBeLessThan(1.2);
      // jogam o jogo: usam itens e pontuam
      expect(r.events.filter((e) => e.type === 'item_use').length).toBeGreaterThan(15);
      if (game === 'estoura-balao') expect(r.events.filter((e) => e.type === 'balloon_pop').length).toBeGreaterThan(15);
      if (game === 'caca-cristais') expect(r.events.filter((e) => e.type === 'crystal_pickup').length).toBeGreaterThan(80);
      if (game === 'rei-da-coroa') expect(r.events.filter((e) => e.type === 'crown_take').length).toBeGreaterThan(4);
    });
  }

  for (const difficulty of ['easy', 'hard'] as const) {
    it(`dificuldade ${difficulty} também termina sem travar`, async () => {
      const r = await aiMatch('cratera-lunar', 'rei-da-coroa', difficulty, 3);
      expect(r.finished).toBe(true);
      expect(r.stuck).toBeLessThanOrEqual(6);
    });
  }

  it('a dificuldade muda a pilotagem: o Difícil acerta mais que o Fácil', async () => {
    const hits = async (d: Difficulty): Promise<number> => {
      let n = 0;
      for (const seed of [1, 2]) n += (await aiMatch('praca-coreto', 'estoura-balao', d, seed)).events.filter((e) => e.type === 'item_use').length;
      return n;
    };
    expect(await hits('hard')).toBeGreaterThan(await hits('easy'));
  });
});
