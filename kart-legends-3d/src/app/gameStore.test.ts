import { beforeEach, describe, expect, it } from 'vitest';
import { CHARACTER_BY_ID } from '@/data/characters';
import { CHARACTER_IDS } from '@/data/ids';
import { CUP_BY_ID } from '@/data/tracks';
import type { RaceConfig } from '@/game/core/types';
import { installMemoryStorage, makeResult } from '@/game/save/testUtils';
import { flowSteps, nextScreen, prevScreen } from './flow';

const storage = installMemoryStorage();
const { useSaveStore } = await import('@/game/save/saveStore');
const { DEFAULT_SELECTION, RACERS_PER_RACE, TRAINING_LAPS, buildFreshGrid, sortStandings, useGameStore } = await import('./gameStore');

const game = () => useGameStore.getState();
function currentRace(): RaceConfig {
  const r = game().race;
  if (!r) throw new Error('sem corrida ativa');
  return r;
}

beforeEach(() => {
  storage.clear();
  useSaveStore.getState().reload();
  game().quitToMenu();
  useGameStore.setState({ selection: { ...DEFAULT_SELECTION }, previousScreen: 'menu', raceNonce: 0 });
});

describe('fluxo de telas', () => {
  it('a dificuldade só aparece quando há adversários', () => {
    expect(flowSteps('quick')).toEqual(['menu', 'mode', 'track', 'difficulty', 'character', 'kart']);
    expect(flowSteps('championship')).toEqual(['menu', 'mode', 'cup', 'difficulty', 'character', 'kart']);
    expect(flowSteps('timetrial')).toEqual(['menu', 'mode', 'track', 'character', 'kart']);
    expect(flowSteps('training')).toEqual(['menu', 'mode', 'track', 'character', 'kart']);
    expect(nextScreen('kart', 'quick')).toBeNull();
    expect(prevScreen('character', 'timetrial')).toBe('track');
    expect(prevScreen('character', 'championship')).toBe('difficulty');
    expect(prevScreen('mode', 'quick')).toBe('menu');
  });

  it('Configurações e Progressão lembram a tela de origem', () => {
    game().goTo('menu');
    game().goTo('settings');
    expect(game().previousScreen).toBe('menu');
    game().goTo(game().previousScreen);
    game().goTo('mode');
    expect(game().previousScreen).toBe('menu');
    game().goTo('progress');
    expect(game().previousScreen).toBe('mode');
  });
});

describe('corrida rápida', () => {
  it('fluxo completo: grid de 8 com o jogador em 8º, pausa, resultado, pódio e menu', () => {
    game().setSelection({ mode: 'quick', trackId: 'vale-moinhos', characterId: 'kora', kartId: 'cometa', difficulty: 'hard' });
    game().startRace();
    expect(game().screen).toBe('race');
    const race = currentRace();
    expect(race).toMatchObject({ trackId: 'vale-moinhos', mode: 'quick', difficulty: 'hard', laps: 3 });
    expect(Number.isInteger(race.seed)).toBe(true);
    expect(race.racers).toHaveLength(8);
    expect(race.racers[7]).toEqual({ characterId: 'kora', kartId: 'cometa', isPlayer: true });
    expect(race.racers.filter((r) => r.isPlayer)).toHaveLength(1);
    // Oito pilotos distintos, todos personagens válidos (sete adversários sorteados entre os outros).
    expect(new Set(race.racers.map((r) => r.characterId)).size).toBe(8);
    for (const r of race.racers) expect(CHARACTER_IDS).toContain(r.characterId);
    // Adversários (inclusive personagens ainda bloqueados) usam o kart preferido.
    for (const r of race.racers.slice(0, 7)) expect(r.kartId).toBe(CHARACTER_BY_ID[r.characterId].kartId);
    expect(game().raceNonce).toBe(1);

    game().setPaused(true);
    expect(game().paused).toBe(true);
    game().setPaused(false);
    game().restartRace();
    expect(game().raceNonce).toBe(2);
    expect(game().paused).toBe(false);
    expect(currentRace().racers).toEqual(race.racers);

    game().finishRace(makeResult(currentRace(), { playerPosition: 1 }));
    expect(game().screen).toBe('results');
    expect(game().lastResult?.playerPosition).toBe(1);
    expect(game().championship).toBeNull();
    expect(game().lastRewards?.newRecords).toEqual({ raceTime: true, bestLap: true });
    expect(game().lastRewards?.unlocks.map((u) => u.id)).toEqual(['faisca']);
    expect(game().lastRewards?.pointsThisRace.kora).toBe(15);
    expect(useSaveStore.getState().stats).toMatchObject({ races: 1, wins: 1 });

    game().continueAfterResults();
    expect(game().screen).toBe('podium');
    game().continueAfterResults();
    expect(game().screen).toBe('menu');
    expect(game().race).toBeNull();
    expect(game().lastResult).toBeNull();
  });

  it('finishRace fora de uma corrida é ignorado; pausa só existe na corrida', () => {
    game().setSelection({ mode: 'quick' });
    game().startRace();
    const result = makeResult(currentRace());
    game().finishRace(result);
    game().finishRace(result);
    expect(useSaveStore.getState().stats.races).toBe(1);
    game().setPaused(true);
    expect(game().paused).toBe(false);
  });

  it('"Correr de novo" a partir dos resultados reinicia a mesma corrida', () => {
    game().startRace();
    game().finishRace(makeResult(currentRace(), { playerPosition: 5 }));
    game().restartRace();
    expect(game().screen).toBe('race');
    expect(game().lastResult).toBeNull();
    expect(game().raceNonce).toBe(2);
  });

  it('seleção bloqueada volta ao padrão antes de largar', () => {
    game().setSelection({ mode: 'quick', characterId: 'zera', kartId: 'geada', trackId: 'cidade-neon' });
    game().startRace();
    const player = currentRace().racers.find((r) => r.isPlayer);
    expect(player).toMatchObject({ characterId: 'nilo', kartId: 'flecha' });
    expect(currentRace().trackId).toBe('porto-lanternas');
  });

  it('grid embaralhado é determinístico pela seed', () => {
    const sel = { characterId: 'nilo', kartId: 'flecha' } as const;
    expect(buildFreshGrid(sel, 1234)).toEqual(buildFreshGrid(sel, 1234));
    const orders = new Set([1, 2, 3, 4, 5, 6].map((seed) => buildFreshGrid(sel, seed).map((r) => r.characterId).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('com mais personagens que vagas, sorteia sete adversários e todos aparecem em alguma seed', () => {
    const sel = { characterId: 'nilo', kartId: 'flecha' } as const;
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const grid = buildFreshGrid(sel, seed);
      expect(grid).toHaveLength(RACERS_PER_RACE);
      expect(grid[RACERS_PER_RACE - 1]).toEqual({ characterId: 'nilo', kartId: 'flecha', isPlayer: true });
      expect(new Set(grid.map((r) => r.characterId)).size).toBe(RACERS_PER_RACE);
      for (const r of grid) seen.add(r.characterId);
    }
    expect(seen).toEqual(new Set(CHARACTER_IDS));
  });
});

describe('campeonato', () => {
  it('quatro corridas com os mesmos pilotos, pontos acumulados, grid invertido e troféu de ouro', () => {
    game().setSelection({ mode: 'championship', cupId: 'aurora', characterId: 'nilo', kartId: 'flecha' });
    game().startRace();
    const tracks = CUP_BY_ID.aurora.tracks;
    const roster = new Set(currentRace().racers.map((r) => `${r.characterId}/${r.kartId}`));
    expect(game().championship).toMatchObject({ cupId: 'aurora', raceIndex: 0, finished: false });
    expect(currentRace().racers[7].isPlayer).toBe(true);

    const playerFinishes = [1, 2, 1, 3];
    let expectedPoints = 0;
    for (let i = 0; i < 4; i++) {
      expect(game().screen).toBe('race');
      expect(currentRace().trackId).toBe(tracks[i]);
      expect(currentRace().mode).toBe('championship');
      expect(new Set(currentRace().racers.map((r) => `${r.characterId}/${r.kartId}`))).toEqual(roster);
      if (i > 0) {
        // Líder do campeonato (o jogador, aqui) larga em último.
        expect(currentRace().racers[7].isPlayer).toBe(true);
      }
      game().finishRace(makeResult(currentRace(), { playerPosition: playerFinishes[i] }));
      expectedPoints += [15, 12, 10][playerFinishes[i] - 1];
      const champ = game().championship;
      expect(game().screen).toBe('results');
      expect(champ?.raceIndex).toBe(i);
      expect(champ?.standings).toHaveLength(8);
      expect(champ?.standings.find((e) => e.isPlayer)?.points).toBe(expectedPoints);
      // Total distribuído por corrida: 15+12+10+8+6+4+2+1 = 58.
      expect(champ?.standings.reduce((sum, e) => sum + e.points, 0)).toBe(58 * (i + 1));
      const pts = champ?.standings.map((e) => e.points) ?? [];
      expect([...pts].sort((a, b) => b - a)).toEqual(pts);
      expect(champ?.finished).toBe(i === 3);
      if (i < 3) {
        expect(game().lastRewards?.trophy).toBeNull();
        game().continueAfterResults();
      }
    }

    expect(expectedPoints).toBe(52);
    expect(game().lastRewards).toMatchObject({ trophy: 'gold', championshipPosition: 1 });
    const save = useSaveStore.getState();
    expect(save.trophies.aurora).toBe('gold');
    expect(save.stats).toMatchObject({ races: 4, wins: 2, podiums: 4, championships: 1 });
    expect(save.unlocked.cups).toContain('eclipse');
    expect(save.unlocked.characters).toEqual(expect.arrayContaining(['tiko', 'mavi', 'runi']));
    // Uma corrida de copa já registrada não pode ser refeita.
    game().restartRace();
    expect(game().screen).toBe('results');

    game().continueAfterResults();
    expect(game().screen).toBe('podium');
    expect(game().championship?.finished).toBe(true);
    game().continueAfterResults();
    expect(game().screen).toBe('menu');
    expect(game().championship).toBeNull();
  });

  it('jogador sempre em último: sem troféu, e larga na frente pela classificação invertida', () => {
    game().setSelection({ mode: 'championship', cupId: 'aurora' });
    game().startRace();
    for (let i = 0; i < 4; i++) {
      if (i > 0) expect(currentRace().racers[0].isPlayer).toBe(true);
      game().finishRace(makeResult(currentRace(), { playerPosition: 8 }));
      if (i < 3) game().continueAfterResults();
    }
    expect(game().lastRewards).toMatchObject({ trophy: null, championshipPosition: 8 });
    expect(useSaveStore.getState().trophies.aurora).toBeNull();
    expect(useSaveStore.getState().unlocked.cups).toEqual(['aurora']);
  });

  it('sair pelo menu de pausa abandona a copa; a próxima começa do zero', () => {
    game().setSelection({ mode: 'championship', cupId: 'aurora' });
    game().startRace();
    game().finishRace(makeResult(currentRace(), { playerPosition: 1 }));
    game().continueAfterResults();
    expect(game().championship?.raceIndex).toBe(1);
    game().quitToMenu();
    expect(game().championship).toBeNull();
    game().startRace();
    expect(game().championship).toMatchObject({ raceIndex: 0 });
    expect(game().championship?.standings.every((e) => e.points === 0)).toBe(true);
    expect(currentRace().trackId).toBe('porto-lanternas');
  });

  it('empate em pontos é decidido pela chegada mais recente', () => {
    const base = { kartId: 'flecha', isPlayer: false } as const;
    const sorted = sortStandings(
      [{ ...base, characterId: 'nilo', points: 20 }, { ...base, characterId: 'boro', points: 27 }, { ...base, characterId: 'lumi', points: 20 }],
      { nilo: 5, lumi: 2, boro: 1 },
    );
    expect(sorted.map((e) => e.characterId)).toEqual(['boro', 'lumi', 'nilo']);
  });
});

describe('contrarrelógio e treino', () => {
  it('contrarrelógio: só o jogador, 3 voltas, registra o tempo e volta ao menu sem pódio', () => {
    game().setSelection({ mode: 'timetrial', trackId: 'bosque-cristal', characterId: 'lumi', kartId: 'cometa' });
    game().startRace();
    expect(currentRace()).toMatchObject({ mode: 'timetrial', laps: 3, trackId: 'bosque-cristal' });
    expect(currentRace().racers).toEqual([{ characterId: 'lumi', kartId: 'cometa', isPlayer: true }]);
    game().finishRace(makeResult(currentRace(), { playerTimeMs: 87654, playerBestLapMs: 28111 }));
    expect(game().screen).toBe('results');
    expect(game().lastRewards?.newRecords.raceTime).toBe(true);
    expect(game().lastRewards?.pointsThisRace).toEqual({});
    const save = useSaveStore.getState();
    expect(save.records['bosque-cristal']).toMatchObject({ timeTrialMs: 87654, timeTrialLapMs: 28111, bestRaceMs: null });
    expect(save.stats).toMatchObject({ races: 0, timeTrials: 1 });
    game().continueAfterResults();
    expect(game().screen).toBe('menu');
  });

  it('treino: só o jogador, 99 voltas, termina pelo menu de pausa e conta tempo jogado', () => {
    game().setSelection({ mode: 'training', trackId: 'canion-solar' });
    game().startRace();
    expect(currentRace()).toMatchObject({ mode: 'training', laps: TRAINING_LAPS, trackId: 'canion-solar' });
    expect(TRAINING_LAPS).toBe(99);
    expect(currentRace().racers).toHaveLength(1);
    useGameStore.setState({ raceStartedAt: Date.now() - 65000 });
    game().setPaused(true);
    game().quitToMenu();
    expect(game().screen).toBe('menu');
    expect(game().race).toBeNull();
    expect(game().paused).toBe(false);
    const stats = useSaveStore.getState().stats;
    expect(stats.races).toBe(0);
    expect(stats.playTimeMs).toBeGreaterThanOrEqual(65000);
  });
});
