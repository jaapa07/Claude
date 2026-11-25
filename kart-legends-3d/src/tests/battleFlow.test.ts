import { beforeEach, describe, expect, it } from 'vitest';
import { RACERS_PER_RACE } from '@/data/tracks';
import { installMemoryStorage } from '@/game/save/testUtils';
import type { BattleResult } from '@/game/battle/battleSim';

const storage = installMemoryStorage();
const { useSaveStore, SAVE_KEY, parseSave } = await import('@/game/save/saveStore');
const { useGameStore, DEFAULT_SELECTION } = await import('@/app/gameStore');
const { coinsForBattle } = await import('@/data/shop');

function result(position: number): BattleResult {
  const standings = Array.from({ length: 8 }, (_, i) => ({
    racerIndex: i, characterId: (['nilo', 'boro', 'lumi', 'kora', 'tiko', 'mavi', 'runi', 'zera'] as const)[i]!, kartId: 'flecha' as const,
    isPlayer: i === position - 1, position: i + 1, score: 8 - i, eliminated: false, hitsLanded: 1, hitsTaken: 1,
  }));
  return { game: 'caca-cristais', arenaId: 'praca-coreto', difficulty: 'normal', standings, playerPosition: position, durationMs: 150000, stats: { itemsUsed: 4, hitsLanded: 3, hitsTaken: 2, turbos: [1, 2, 0] } };
}

beforeEach(() => {
  storage.clear();
  useSaveStore.getState().reload();
  useGameStore.setState({ screen: 'menu', selection: { ...DEFAULT_SELECTION }, race: null, battle: null, lastBattle: null, raceNonce: 0 });
});

describe('Batalha: fluxo, recompensas e save', () => {
  it('Batalha monta 8 pilotos (jogador incluso) sem RaceConfig', () => {
    useGameStore.getState().setSelection({ mode: 'battle', battleGame: 'rei-da-coroa', arenaId: 'cratera-lunar', difficulty: 'hard' });
    useGameStore.getState().startRace();
    const g = useGameStore.getState();
    expect(g.screen).toBe('race');
    expect(g.race).toBeNull();
    expect(g.battle?.racers.length).toBe(RACERS_PER_RACE);
    expect(g.battle?.racers.filter((r) => r.isPlayer).length).toBe(1);
    expect(g.battle).toMatchObject({ game: 'rei-da-coroa', arenaId: 'cratera-lunar', difficulty: 'hard' });
  });

  it('o resultado paga moedas, conta partidas/vitórias e persiste; sair limpa a batalha', () => {
    useGameStore.getState().setSelection({ mode: 'battle' });
    useGameStore.getState().startRace();
    const coins0 = useSaveStore.getState().coins;
    useGameStore.getState().finishBattle(result(1));
    const g = useGameStore.getState();
    expect(g.screen).toBe('results');
    expect(g.lastRewards?.coins).toBe(coinsForBattle({ difficulty: 'normal', position: 1, racers: 8 }));
    const s = useSaveStore.getState();
    expect(s.coins).toBe(coins0 + g.lastRewards!.coins);
    expect(s.stats.battles).toBe(1);
    expect(s.stats.battleWins).toBe(1);
    expect(s.stats.races).toBe(0);
    expect(s.stats.itemsUsed).toBe(4);
    const stored = JSON.parse(storage.getItem(SAVE_KEY) ?? 'null') as { stats: { battles: number } };
    expect(stored.stats.battles).toBe(1);
    useGameStore.getState().quitToMenu();
    expect(useGameStore.getState().battle).toBeNull();
    expect(useGameStore.getState().lastBattle).toBeNull();
  });

  it('saves antigos (sem campos de batalha) continuam válidos', () => {
    const { data, status } = parseSave(JSON.stringify({ version: 2, coins: 50, stats: { races: 3 } }));
    expect(status).toBe('loaded');
    expect(data.stats.battles).toBe(0);
    expect(data.stats.battleWins).toBe(0);
    expect(data.stats.races).toBe(3);
  });
});
