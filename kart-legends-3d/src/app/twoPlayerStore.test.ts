import { beforeEach, describe, expect, it } from 'vitest';
import { CUP_BY_ID, POINTS_BY_POSITION } from '@/data/tracks';
import type { BattleResult } from '@/game/battle/battleSim';
import type { RaceConfig, RaceResult, RacerResult } from '@/game/core/types';
import { installMemoryStorage } from '@/game/save/testUtils';
import { flowSteps, humanCount, nextScreen, prevScreen } from './flow';

const storage = installMemoryStorage();
const { useSaveStore } = await import('@/game/save/saveStore');
const { coinsForBattle, coinsForRace } = await import('@/data/shop');
const { DEFAULT_SELECTION, RACERS_PER_RACE, buildFreshGrid, buildStandingsGrid, capRacers, useGameStore } = await import('./gameStore');

const game = () => useGameStore.getState();
function currentRace(): RaceConfig {
  const r = game().race;
  if (!r) throw new Error('sem corrida ativa');
  return r;
}

/** Resultado com os dois jogadores nas colocações pedidas (os outros pela ordem do grid). */
function result2p(race: RaceConfig, p1: number, p2: number): RaceResult {
  const humans = race.racers.map((r, i) => ({ r, i })).filter((x) => x.r.isPlayer);
  const h1 = humans.find((x) => x.r.slot === 0)!, h2 = humans.find((x) => x.r.slot === 1)!;
  const others = race.racers.map((_, i) => i).filter((i) => i !== h1.i && i !== h2.i);
  const order: number[] = [];
  for (let pos = 1; pos <= race.racers.length; pos++) order.push(pos === p1 ? h1.i : pos === p2 ? h2.i : others.shift()!);
  const results: RacerResult[] = order.map((racerIndex, i) => {
    const r = race.racers[racerIndex]!;
    return {
      racerIndex, characterId: r.characterId, kartId: r.kartId, isPlayer: r.isPlayer, ...(r.isPlayer ? { slot: r.slot } : {}), position: i + 1,
      totalTimeMs: 90000 + i * 1000, bestLapMs: 29000 + i * 100, lapTimesMs: [30000, 29000 + i * 100, 31000], points: POINTS_BY_POSITION[i] ?? 0,
    };
  });
  const out = (slot: number, pos: number) => ({
    slot, racerIndex: slot === 0 ? h1.i : h2.i, characterId: (slot === 0 ? h1 : h2).r.characterId, position: pos,
    timeMs: 90000 + (pos - 1) * 1000, bestLapMs: 29000 + (pos - 1) * 100,
    stats: { turbos: [1, 1, 0] as [number, number, number], itemsUsed: 2, hitsTaken: 0, topSpeedKmh: 90 },
  });
  const o1 = out(0, p1);
  return {
    trackId: race.trackId, mode: race.mode, difficulty: race.difficulty, results,
    playerPosition: p1, playerTimeMs: o1.timeMs, playerBestLapMs: o1.bestLapMs, stats: o1.stats,
    players: [o1, out(1, p2)],
  };
}

beforeEach(() => {
  storage.clear();
  useSaveStore.getState().reload();
  game().quitToMenu();
  useGameStore.setState({ selection: { ...DEFAULT_SELECTION }, previousScreen: 'menu', raceNonce: 0 });
});

describe('fluxo com dois jogadores', () => {
  it('escolha de jogadores e a vez do Jogador 2 entram no fluxo só nos modos que aceitam', () => {
    expect(flowSteps('quick', { choosePlayers: true, players: 2 })).toEqual(['menu', 'players', 'mode', 'track', 'difficulty', 'character', 'kart', 'character2', 'kart2']);
    expect(flowSteps('battle', { choosePlayers: true, players: 2 })).toEqual(['menu', 'players', 'mode', 'battleGame', 'arena', 'difficulty', 'character', 'kart', 'character2', 'kart2']);
    expect(flowSteps('timetrial', { choosePlayers: true, players: 2 })).toEqual(['menu', 'players', 'mode', 'track', 'character', 'kart']);
    expect(flowSteps('training', { players: 2 })).toEqual(['menu', 'mode', 'track', 'character', 'kart']);
    expect(nextScreen('kart', 'championship', { players: 2 })).toBe('character2');
    expect(nextScreen('kart2', 'championship', { players: 2 })).toBeNull();
    expect(prevScreen('mode', 'quick', { choosePlayers: true })).toBe('players');
    expect(prevScreen('character2', 'quick', { players: 2 })).toBe('kart');
    expect(humanCount({ players: 2, mode: 'battle' })).toBe(2);
    expect(humanCount({ players: 2, mode: 'timetrial' })).toBe(1);
  });
});

describe('grid com dois jogadores', () => {
  it('seis adversários e os dois jogadores no fim (J1 em 7º, J2 em 8º), sem repetir piloto', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const grid = buildFreshGrid({ characterId: 'nilo', kartId: 'flecha' }, seed, { characterId: 'lumi', kartId: 'cometa' });
      expect(grid).toHaveLength(RACERS_PER_RACE);
      expect(grid[6]).toEqual({ characterId: 'nilo', kartId: 'flecha', isPlayer: true, slot: 0 });
      expect(grid[7]).toEqual({ characterId: 'lumi', kartId: 'cometa', isPlayer: true, slot: 1 });
      expect(grid.slice(0, 6).every((r) => !r.isPlayer)).toBe(true);
      expect(new Set(grid.map((r) => r.characterId)).size).toBe(RACERS_PER_RACE);
    }
  });

  it('a trava de 8 pilotos mantém os dois humanos', () => {
    const many = [
      ...Array.from({ length: 10 }, (_, i) => ({ characterId: (['boro', 'kora', 'tiko', 'mavi', 'runi', 'zera', 'capi', 'tuca', 'yuki', 'ren'] as const)[i]!, kartId: 'flecha' as const, isPlayer: false })),
      { characterId: 'nilo' as const, kartId: 'flecha' as const, isPlayer: true, slot: 0 },
      { characterId: 'lumi' as const, kartId: 'flecha' as const, isPlayer: true, slot: 1 },
    ];
    const capped = capRacers(many);
    expect(capped).toHaveLength(RACERS_PER_RACE);
    expect(capped.filter((r) => r.isPlayer).map((r) => r.slot)).toEqual([0, 1]);
  });

  it('a classificação invertida da copa preserva as vagas', () => {
    const grid = buildStandingsGrid([
      { characterId: 'nilo', kartId: 'flecha', isPlayer: true, slot: 0, points: 30 },
      { characterId: 'boro', kartId: 'engrenagem', isPlayer: false, points: 20 },
      { characterId: 'lumi', kartId: 'cometa', isPlayer: true, slot: 1, points: 10 },
    ]);
    expect(grid).toEqual([
      { characterId: 'lumi', kartId: 'cometa', isPlayer: true, slot: 1 },
      { characterId: 'boro', kartId: 'engrenagem', isPlayer: false },
      { characterId: 'nilo', kartId: 'flecha', isPlayer: true, slot: 0 },
    ]);
  });
});

describe('Corrida Rápida com dois jogadores', () => {
  it('monta 2 humanos + 6 IA, paga as duas colocações na mesma carteira e conta a corrida uma vez', () => {
    game().setSelection({ mode: 'quick', players: 2, characterId: 'kora', kartId: 'broto', p2CharacterId: 'lumi', p2KartId: 'cometa', difficulty: 'normal' });
    game().startRace();
    const race = currentRace();
    expect(race.racers).toHaveLength(8);
    expect(race.racers.filter((r) => r.isPlayer).map((r) => [r.characterId, r.slot])).toEqual([['kora', 0], ['lumi', 1]]);
    const coins0 = useSaveStore.getState().coins;
    game().finishRace(result2p(race, 2, 5));
    const rewards = game().lastRewards!;
    const c1 = coinsForRace({ mode: 'quick', difficulty: 'normal', position: 2, finished: true, trophy: null, timeTrialRecord: false });
    const c2 = coinsForRace({ mode: 'quick', difficulty: 'normal', position: 5, finished: true, trophy: null, timeTrialRecord: false });
    expect(rewards.coinsBySlot).toEqual([c1, c2]);
    expect(rewards.coins).toBe(c1 + c2);
    const save = useSaveStore.getState();
    expect(save.coins).toBe(coins0 + c1 + c2);
    expect(save.stats.races).toBe(1);
    expect(save.stats.wins).toBe(0);
    expect(save.stats.podiums).toBe(1);
    expect(save.stats.itemsUsed).toBe(4); // somados
    expect(save.records[race.trackId].bestRaceMs).toBe(91000); // melhor tempo dos dois
    expect(rewards.pointsThisRace.kora).toBe(POINTS_BY_POSITION[1]);
    expect(rewards.pointsThisRace.lumi).toBe(POINTS_BY_POSITION[4]);
  });

  it('o Jogador 2 não pode usar o mesmo piloto do Jogador 1 nem um piloto bloqueado', () => {
    game().setSelection({ mode: 'quick', players: 2, characterId: 'nilo', p2CharacterId: 'nilo' });
    game().startRace();
    const humans = currentRace().racers.filter((r) => r.isPlayer);
    expect(humans).toHaveLength(2);
    expect(humans[0]!.characterId).toBe('nilo');
    expect(humans[1]!.characterId).not.toBe('nilo');
    game().quitToMenu();
    game().setSelection({ mode: 'quick', players: 2, characterId: 'nilo', p2CharacterId: 'zera' });
    game().startRace();
    expect(useSaveStore.getState().isCharacterUnlocked(currentRace().racers.find((r) => r.slot === 1)!.characterId)).toBe(true);
  });

  it('Contrarrelógio e Treino ignoram o segundo jogador', () => {
    game().setSelection({ mode: 'timetrial', players: 2 });
    game().startRace();
    expect(currentRace().racers).toHaveLength(1);
    game().quitToMenu();
    game().setSelection({ mode: 'training', players: 2 });
    game().startRace();
    expect(currentRace().racers.filter((r) => r.isPlayer)).toHaveLength(1);
  });
});

describe('Campeonato com dois jogadores', () => {
  it('a classificação acompanha os dois e o troféu vale pela melhor colocação', () => {
    game().setSelection({ mode: 'championship', players: 2, cupId: 'aurora', characterId: 'nilo', p2CharacterId: 'boro', p2KartId: 'engrenagem', difficulty: 'easy' });
    game().startRace();
    const cup = CUP_BY_ID.aurora;
    const placings: [number, number][] = [[3, 1], [2, 1], [4, 1], [1, 2]];
    for (let i = 0; i < cup.tracks.length; i++) {
      const race = currentRace();
      expect(race.racers.filter((r) => r.isPlayer).map((r) => r.slot).sort()).toEqual([0, 1]);
      expect(race.trackId).toBe(cup.tracks[i]);
      game().finishRace(result2p(race, ...placings[i]!));
      const st = game().championship!.standings;
      expect(st.filter((e) => e.isPlayer).map((e) => e.slot).sort()).toEqual([0, 1]);
      if (i < cup.tracks.length - 1) game().continueAfterResults();
    }
    const ch = game().championship!;
    expect(ch.finished).toBe(true);
    // Jogador 2 venceu três corridas: lidera a copa
    expect(ch.standings[0]).toMatchObject({ characterId: 'boro', slot: 1 });
    expect(ch.standings[1]).toMatchObject({ characterId: 'nilo', slot: 0 });
    expect(game().lastRewards!.championshipPosition).toBe(1);
    expect(game().lastRewards!.trophy).toBe('gold');
    expect(useSaveStore.getState().trophies.aurora).toBe('gold');
    expect(useSaveStore.getState().stats.races).toBe(4);
    expect(useSaveStore.getState().stats.championships).toBe(1);
  });
});

describe('Batalha com dois jogadores', () => {
  it('monta os dois humanos e paga as duas colocações', () => {
    game().setSelection({ mode: 'battle', players: 2, characterId: 'nilo', p2CharacterId: 'lumi', p2KartId: 'cometa', difficulty: 'normal' });
    game().startRace();
    const b = game().battle!;
    expect(b.racers).toHaveLength(8);
    expect(b.racers.filter((r) => r.isPlayer).map((r) => r.slot)).toEqual([0, 1]);
    const standings = b.racers.map((r, i) => ({
      racerIndex: i, characterId: r.characterId, kartId: r.kartId, isPlayer: r.isPlayer, ...(r.isPlayer ? { slot: r.slot } : {}),
      position: i + 1, score: 8 - i, eliminated: false, hitsLanded: 1, hitsTaken: 1,
    }));
    const stats = { itemsUsed: 2, hitsLanded: 1, hitsTaken: 1, turbos: [0, 1, 0] as [number, number, number] };
    const result: BattleResult = {
      game: 'estoura-balao', arenaId: 'praca-coreto', difficulty: 'normal', standings, playerPosition: 7, durationMs: 120000, stats,
      players: [{ slot: 0, racerIndex: 6, characterId: 'nilo', position: 7, stats }, { slot: 1, racerIndex: 7, characterId: 'lumi', position: 8, stats }],
    };
    const coins0 = useSaveStore.getState().coins;
    game().finishBattle(result);
    const expected = [7, 8].map((position) => coinsForBattle({ difficulty: 'normal', position, racers: 8 }));
    expect(game().lastRewards!.coinsBySlot).toEqual(expected);
    expect(useSaveStore.getState().coins).toBe(coins0 + expected[0]! + expected[1]!);
    expect(useSaveStore.getState().stats.battles).toBe(1);
    expect(useSaveStore.getState().stats.itemsUsed).toBe(4);
  });
});
