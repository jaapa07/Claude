import { beforeEach, describe, expect, it } from 'vitest';
import type { RaceConfig } from '@/game/core/types';
import { TRACK_IDS } from '@/data/ids';
import { installMemoryStorage, makeResult } from './testUtils';

const storage = installMemoryStorage();
const { SAVE_CORRUPT_KEY, SAVE_KEY, SAVE_VERSION, computeUnlocks, createDefaultSave, parseSave, trophyForPosition, useSaveStore } = await import('./saveStore');

function race(partial: Partial<RaceConfig> = {}): RaceConfig {
  return {
    trackId: 'porto-lanternas', mode: 'quick', difficulty: 'normal', laps: 3, seed: 1,
    racers: [
      { characterId: 'boro', kartId: 'engrenagem', isPlayer: false },
      { characterId: 'lumi', kartId: 'cometa', isPlayer: false },
      { characterId: 'kora', kartId: 'broto', isPlayer: false },
      { characterId: 'nilo', kartId: 'flecha', isPlayer: true },
    ],
    ...partial,
  };
}
const solo = (partial: Partial<RaceConfig>): RaceConfig => race({ racers: [{ characterId: 'nilo', kartId: 'flecha', isPlayer: true }], ...partial });

beforeEach(() => {
  storage.clear();
  useSaveStore.getState().reload();
});

describe('save: estado inicial', () => {
  it('começa com os quatro pilotos, quatro karts e a Copa Aurora liberados', () => {
    const s = useSaveStore.getState();
    expect(s.loadStatus).toBe('fresh');
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.unlocked.characters).toEqual(['nilo', 'boro', 'lumi', 'kora']);
    expect(s.unlocked.karts).toEqual(['flecha', 'engrenagem', 'cometa', 'broto']);
    expect(s.unlocked.cups).toEqual(['aurora']);
    expect(s.isTrackUnlocked('canion-solar')).toBe(true);
    expect(s.isTrackUnlocked('cidade-neon')).toBe(false);
    expect(s.isCharacterUnlocked('zera')).toBe(false);
    expect(Object.keys(s.records)).toEqual([...TRACK_IDS]);
  });
});

describe('save: persistência', () => {
  it('grava no localStorage com versão e recarrega os mesmos dados', () => {
    useSaveStore.getState().applyRaceResult(makeResult(race(), { playerPosition: 2, playerTimeMs: 95000, playerBestLapMs: 30000 }));
    const stored = JSON.parse(storage.getItem(SAVE_KEY) ?? 'null') as { version: number; stats: { races: number } };
    expect(stored.version).toBe(SAVE_VERSION);
    expect(stored.stats.races).toBe(1);

    // Simula fechar e abrir o navegador: o store relê o que está no armazenamento.
    useSaveStore.setState(createDefaultSave());
    expect(useSaveStore.getState().stats.races).toBe(0);
    useSaveStore.getState().reload();
    const s = useSaveStore.getState();
    expect(s.loadStatus).toBe('loaded');
    expect(s.stats.races).toBe(1);
    expect(s.stats.podiums).toBe(1);
    expect(s.records['porto-lanternas'].bestRaceMs).toBe(95000);
    expect(s.records['porto-lanternas'].bestLapMs).toBe(30000);
  });

  it('resetProgress volta ao estado inicial e persiste', () => {
    const s = useSaveStore.getState();
    for (let i = 0; i < 3; i++) s.applyRaceResult(makeResult(race(), { playerPosition: 1 }));
    expect(useSaveStore.getState().unlocked.characters).toContain('tiko');
    useSaveStore.getState().resetProgress();
    useSaveStore.getState().reload();
    expect(useSaveStore.getState().unlocked.characters).not.toContain('tiko');
    expect(useSaveStore.getState().stats.races).toBe(0);
  });
});

describe('save: dados ausentes, corrompidos e versões', () => {
  it('JSON inválido: recomeça do zero, guarda cópia e avisa', () => {
    storage.setItem(SAVE_KEY, '{"version":1,"stats":{"races":');
    useSaveStore.getState().reload();
    const s = useSaveStore.getState();
    expect(s.loadStatus).toBe('recovered');
    expect(s.stats.races).toBe(0);
    expect(storage.getItem(SAVE_CORRUPT_KEY)).toBe('{"version":1,"stats":{"races":');
    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? '{}')).toMatchObject({ version: SAVE_VERSION });
  });

  it('valor que não é objeto também é tratado como corrompido', () => {
    expect(parseSave('42').status).toBe('recovered');
    expect(parseSave('null').status).toBe('recovered');
    expect(parseSave('[1,2]').status).toBe('recovered');
  });

  it('campos inválidos são saneados sem perder os válidos', () => {
    const { data, status } = parseSave(JSON.stringify({
      version: SAVE_VERSION,
      stats: { races: 7, wins: -3, podiums: 'muitos', turbos: [1, 'x', 30], playTimeMs: Infinity },
      trophies: { aurora: 'platina', eclipse: 'silver' },
      records: { 'porto-lanternas': { bestRaceMs: 88000, bestLapMs: -5 }, 'pista-fantasma': { bestRaceMs: 1 } },
      unlocked: { characters: ['zera', 'hacker'], karts: 'todos' },
    }));
    expect(status).toBe('loaded');
    expect(data.stats).toMatchObject({ races: 7, wins: 0, podiums: 0, turbos: [1, 0, 30], playTimeMs: 0 });
    expect(data.trophies).toEqual({ aurora: null, eclipse: 'silver' });
    expect(data.records['porto-lanternas']).toEqual({ bestRaceMs: 88000, bestLapMs: null, timeTrialMs: null, timeTrialLapMs: null });
    expect(Object.keys(data.records)).toHaveLength(8);
    // 'zera' estava salvo (mantém); 'tiko' sai da regra de 3 corridas; 'duna' dos 25 turbos nível 3.
    expect(data.unlocked.characters).toEqual(['nilo', 'boro', 'lumi', 'kora', 'tiko', 'zera']);
    expect(data.unlocked.karts).toContain('duna');
  });

  it('migra save sem versão (formato de pré-lançamento com bestTimes)', () => {
    const { data, status } = parseSave(JSON.stringify({ stats: { races: 4, wins: 1 }, bestTimes: { 'vale-moinhos': 101000 } }));
    expect(status).toBe('migrated');
    expect(data.version).toBe(SAVE_VERSION);
    expect(data.records['vale-moinhos'].bestRaceMs).toBe(101000);
    expect(data.stats.races).toBe(4);
    expect(data.unlocked.karts).toContain('faisca');
  });

  it('save de versão futura é lido no que for compreensível e regravado na versão atual', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 99, stats: { races: 2 }, novidade: true }));
    useSaveStore.getState().reload();
    expect(useSaveStore.getState().loadStatus).toBe('migrated');
    expect(useSaveStore.getState().stats.races).toBe(2);
    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? '{}')).toMatchObject({ version: SAVE_VERSION });
  });
});

describe('save: desbloqueios pelas regras dos dados', () => {
  it('Tiko abre com 3 corridas e Faísca Turbo com 1 vitória', () => {
    const s = useSaveStore.getState();
    expect(s.applyRaceResult(makeResult(race(), { playerPosition: 4 }))).toEqual([]);
    expect(s.applyRaceResult(makeResult(race(), { playerPosition: 1 }))).toEqual([{ kind: 'kart', id: 'faisca', name: 'Faísca Turbo' }]);
    expect(s.applyRaceResult(makeResult(race(), { playerPosition: 3 }))).toEqual([{ kind: 'character', id: 'tiko', name: 'Tiko' }]);
    expect(s.applyRaceResult(makeResult(race(), { playerPosition: 1 }))).toEqual([]);
    const st = useSaveStore.getState().stats;
    expect(st).toMatchObject({ races: 4, wins: 2, podiums: 3 });
  });

  it('troféus: bronze na Aurora abre Mavi e a Copa Eclipse; ouro abre Runi; o melhor troféu é mantido', () => {
    const s = useSaveStore.getState();
    const last = makeResult(race({ mode: 'championship', trackId: 'canion-solar' }), { playerPosition: 3 });
    const unlocks = s.applyRaceResult(last, { cupId: 'aurora', position: 3 });
    expect(unlocks.map((u) => u.id)).toEqual(expect.arrayContaining(['mavi', 'eclipse']));
    expect(unlocks.map((u) => u.id)).not.toContain('runi');
    expect(useSaveStore.getState().trophies.aurora).toBe('bronze');
    expect(useSaveStore.getState().lastReport?.trophy).toBe('bronze');
    expect(useSaveStore.getState().isTrackUnlocked('cidade-neon')).toBe(true);

    expect(s.applyRaceResult(last, { cupId: 'aurora', position: 1 }).map((u) => u.id)).toContain('runi');
    expect(useSaveStore.getState().trophies.aurora).toBe('gold');
    s.applyRaceResult(last, { cupId: 'aurora', position: 5 });
    expect(useSaveStore.getState().trophies.aurora).toBe('gold');
    expect(useSaveStore.getState().lastReport?.trophy).toBeNull();

    const eclipse = s.applyRaceResult(makeResult(race({ mode: 'championship', trackId: 'fortaleza-tempestade' })), { cupId: 'eclipse', position: 2 });
    expect(eclipse.map((u) => u.id)).toEqual(expect.arrayContaining(['zera', 'geada']));
    expect(useSaveStore.getState().stats.championships).toBe(4);
  });

  it('Capi sai com 3 vitórias e Tuca com 40 miniturbos de nível 3', () => {
    const d = createDefaultSave();
    expect(d.unlocked.characters).not.toContain('capi');
    expect(d.unlocked.characters).not.toContain('tuca');
    d.stats.wins = 2;
    expect(computeUnlocks(d).characters).not.toContain('capi');
    d.stats.wins = 3;
    expect(computeUnlocks(d).characters).toContain('capi');
    d.stats.turbos = [0, 0, 39];
    expect(computeUnlocks(d).characters).not.toContain('tuca');
    d.stats.turbos = [0, 0, 40];
    expect(computeUnlocks(d).characters).toContain('tuca');
  });

  it('trophyForPosition: ouro, prata, bronze e nada', () => {
    expect([1, 2, 3, 4, 8].map(trophyForPosition)).toEqual(['gold', 'silver', 'bronze', null, null]);
  });

  it('Maré Alta abre com tempos de contrarrelógio em 4 pistas diferentes', () => {
    const s = useSaveStore.getState();
    const tracks = ['porto-lanternas', 'bosque-cristal', 'vale-moinhos', 'canion-solar'] as const;
    // Repetir a mesma pista não conta duas vezes.
    s.applyRaceResult(makeResult(solo({ mode: 'timetrial', trackId: tracks[0] })));
    s.applyRaceResult(makeResult(solo({ mode: 'timetrial', trackId: tracks[0] })));
    s.applyRaceResult(makeResult(solo({ mode: 'timetrial', trackId: tracks[1] })));
    // Tentativa não concluída não registra tempo.
    s.applyRaceResult(makeResult(solo({ mode: 'timetrial', trackId: tracks[2] }), { playerTimeMs: null }));
    expect(useSaveStore.getState().unlocked.karts).not.toContain('mare');
    s.applyRaceResult(makeResult(solo({ mode: 'timetrial', trackId: tracks[2] })));
    const unlocks = s.applyRaceResult(makeResult(solo({ mode: 'timetrial', trackId: tracks[3] })));
    expect(unlocks).toEqual([{ kind: 'kart', id: 'mare', name: 'Maré Alta' }]);
    const st = useSaveStore.getState().stats;
    expect(st.timeTrials).toBe(5);
    expect(st.races).toBe(0);
  });

  it('Rastro de Duna abre com 25 miniturbos de nível 3 (o treino também conta)', () => {
    const s = useSaveStore.getState();
    s.applyRaceResult(makeResult(solo({ mode: 'training', laps: 99 }), { turbos: [5, 5, 24], playerTimeMs: null }));
    expect(useSaveStore.getState().unlocked.karts).not.toContain('duna');
    const unlocks = s.applyRaceResult(makeResult(solo({ mode: 'training', laps: 99 }), { turbos: [0, 0, 1], playerTimeMs: null }));
    expect(unlocks.map((u) => u.id)).toEqual(['duna']);
    const st = useSaveStore.getState();
    expect(st.stats.turbos).toEqual([5, 5, 25]);
    expect(st.stats.races).toBe(0);
    expect(st.records['porto-lanternas'].bestRaceMs).toBeNull();
  });
});

describe('save: melhores tempos', () => {
  it('só melhora; corrida e contrarrelógio são registros separados', () => {
    const s = useSaveStore.getState();
    s.applyRaceResult(makeResult(race(), { playerTimeMs: 100000, playerBestLapMs: 32000 }));
    expect(useSaveStore.getState().lastReport?.newRecords).toEqual({ raceTime: true, bestLap: true });

    s.applyRaceResult(makeResult(race(), { playerTimeMs: 104000, playerBestLapMs: 31000 }));
    expect(useSaveStore.getState().lastReport?.newRecords).toEqual({ raceTime: false, bestLap: true });

    s.applyRaceResult(makeResult(solo({ mode: 'timetrial' }), { playerTimeMs: 90000, playerBestLapMs: 29000 }));
    expect(useSaveStore.getState().lastReport?.newRecords).toEqual({ raceTime: true, bestLap: true });

    // Corrida não concluída: não mexe no tempo total.
    s.applyRaceResult(makeResult(race(), { playerPosition: 4, playerTimeMs: null, playerBestLapMs: 33000 }));
    expect(useSaveStore.getState().lastReport?.newRecords).toEqual({ raceTime: false, bestLap: false });

    expect(useSaveStore.getState().records['porto-lanternas']).toEqual({ bestRaceMs: 100000, bestLapMs: 31000, timeTrialMs: 90000, timeTrialLapMs: 29000 });
  });

  it('acumula itens, turbos e tempo jogado', () => {
    const s = useSaveStore.getState();
    s.applyRaceResult(makeResult(race(), { playerTimeMs: 60000, turbos: [3, 2, 1], itemsUsed: 4 }));
    s.applyRaceResult(makeResult(race(), { playerTimeMs: 61000, turbos: [1, 1, 1], itemsUsed: 2 }));
    s.addPlayTime(9000);
    expect(useSaveStore.getState().stats).toMatchObject({ turbos: [4, 3, 2], itemsUsed: 6, playTimeMs: 130000 });
  });
});
