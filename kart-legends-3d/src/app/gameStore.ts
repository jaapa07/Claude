import { create } from 'zustand';
import { CHARACTERS, CHARACTER_BY_ID } from '@/data/characters';
import type { CharacterId } from '@/data/ids';
import { CUP_BY_ID, LAPS_PER_RACE, POINTS_BY_POSITION } from '@/data/tracks';
import type { RaceConfig, RaceResult, RacerSetup } from '@/game/core/types';
import { useSaveStore } from '@/game/save/saveStore';
import type { ChampionshipOutcome, UnlockNotice } from '@/game/save/saveStore';
import type { TrophyTier } from '@/data/ids';
import type { ChampionshipState, GameState, Screen, Selection, StandingEntry } from './gameTypes';

/** Voltas do Treino: na prática "sem fim" — a sessão termina pelo menu de pausa. */
export const TRAINING_LAPS = 99;

export const DEFAULT_SELECTION: Readonly<Selection> = {
  characterId: 'nilo', kartId: 'flecha', mode: 'quick', cupId: 'aurora', trackId: 'porto-lanternas', difficulty: 'normal',
};

/** O que a última corrida rendeu (mostrado em Resultados e no Pódio). */
export interface RaceRewards {
  unlocks: UnlockNotice[];
  newRecords: { raceTime: boolean; bestLap: boolean };
  /** Troféu da copa (só na última corrida do Campeonato). */
  trophy: TrophyTier | null;
  /** Posição final do jogador na copa (só na última corrida do Campeonato). */
  championshipPosition: number | null;
  /** Pontos somados por piloto nesta corrida (Campeonato). */
  pointsThisRace: Partial<Record<CharacterId, number>>;
}

/** `GameState` do contrato + extras usados só pela interface. */
export interface GameStoreState extends GameState {
  lastRewards: RaceRewards | null;
  /** `Date.now()` do início da corrida atual (para contar tempo jogado em sessões abandonadas). */
  raceStartedAt: number;
}

export function pointsForPosition(position: number): number {
  return POINTS_BY_POSITION[position - 1] ?? 0;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

/** PRNG pequeno e determinístico (mulberry32) para embaralhar o grid a partir da seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pilotos por corrida (as pistas têm oito posições de largada). */
export const RACERS_PER_RACE = 8;

/**
 * Grid da Corrida Rápida e da 1ª corrida de uma copa: sete adversários sorteados pela seed entre os outros
 * personagens (inclusive os ainda bloqueados, cada um com seu kart preferido), em ordem embaralhada, e o
 * jogador em 8º.
 */
export function buildFreshGrid(selection: Pick<Selection, 'characterId' | 'kartId'>, seed: number): RacerSetup[] {
  const rivals = CHARACTERS.filter((c) => c.id !== selection.characterId).map<RacerSetup>((c) => ({ characterId: c.id, kartId: c.kartId, isPlayer: false }));
  const rand = mulberry32(seed);
  for (let i = rivals.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rivals[i], rivals[j]] = [rivals[j], rivals[i]];
  }
  return [...rivals.slice(0, RACERS_PER_RACE - 1), { characterId: selection.characterId, kartId: selection.kartId, isPlayer: true }];
}

/**
 * Grid da 2ª à 4ª corrida da copa: classificação geral invertida (o líder larga em 8º, o último em 1º).
 * `standings` já está ordenado do líder para o último.
 */
export function buildStandingsGrid(standings: readonly StandingEntry[]): RacerSetup[] {
  return [...standings].reverse().map(({ characterId, kartId, isPlayer }) => ({ characterId, kartId, isPlayer }));
}

/** Ordena por pontos; empates são decididos pela melhor chegada na corrida mais recente. */
export function sortStandings(standings: readonly StandingEntry[], lastPositions: Partial<Record<CharacterId, number>>): StandingEntry[] {
  return standings
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) =>
      b.entry.points - a.entry.points
      || (lastPositions[a.entry.characterId] ?? 99) - (lastPositions[b.entry.characterId] ?? 99)
      || a.index - b.index)
    .map((x) => x.entry);
}

/** Garante que a seleção só aponte para conteúdo desbloqueado. */
function validSelection(sel: Selection): Selection {
  const save = useSaveStore.getState();
  const out = { ...sel };
  if (!save.isCharacterUnlocked(out.characterId)) out.characterId = DEFAULT_SELECTION.characterId;
  if (!save.isKartUnlocked(out.kartId)) out.kartId = CHARACTER_BY_ID[out.characterId].kartId;
  if (!save.isKartUnlocked(out.kartId)) out.kartId = DEFAULT_SELECTION.kartId;
  if (!save.isCupUnlocked(out.cupId)) out.cupId = DEFAULT_SELECTION.cupId;
  if (!save.isTrackUnlocked(out.trackId)) out.trackId = DEFAULT_SELECTION.trackId;
  return out;
}

export const useGameStore = create<GameStoreState>()((set, get) => ({
  screen: 'loading',
  previousScreen: 'menu',
  selection: { ...DEFAULT_SELECTION },
  race: null,
  raceNonce: 0,
  paused: false,
  lastResult: null,
  championship: null,
  lastRewards: null,
  raceStartedAt: 0,

  goTo: (screen: Screen) => {
    const current = get().screen;
    if (screen === current) return;
    // Configurações e Progressão lembram de onde foram abertas para o "Voltar".
    if (screen === 'settings' || screen === 'progress') set({ screen, previousScreen: current });
    else set({ screen });
  },

  setSelection: (patch) => set((s) => ({ selection: { ...s.selection, ...patch } })),

  startRace: () => {
    const state = get();
    const selection = validSelection(state.selection);
    const seed = randomSeed();
    let championship: ChampionshipState | null = state.championship;
    let racers: RacerSetup[];
    let trackId = selection.trackId;
    let laps = LAPS_PER_RACE;

    if (selection.mode === 'championship') {
      if (championship && !championship.finished) {
        // Copa em andamento: mesmos oito pilotos (o sorteio de adversários é feito uma vez só, ao criar a copa),
        // grid pela classificação invertida a partir da 2ª corrida.
        racers = championship.raceIndex === 0
          ? championship.standings.map(({ characterId, kartId, isPlayer }) => ({ characterId, kartId, isPlayer }))
          : buildStandingsGrid(championship.standings);
      } else {
        racers = buildFreshGrid(selection, seed);
        championship = {
          cupId: selection.cupId,
          raceIndex: 0,
          finished: false,
          standings: racers.map((r) => ({ ...r, points: 0 })),
        };
      }
      trackId = CUP_BY_ID[championship.cupId].tracks[championship.raceIndex];
    } else {
      championship = null;
      if (selection.mode === 'quick') racers = buildFreshGrid(selection, seed);
      else {
        // Contrarrelógio e Treino: só o jogador na pista.
        racers = [{ characterId: selection.characterId, kartId: selection.kartId, isPlayer: true }];
        if (selection.mode === 'training') laps = TRAINING_LAPS;
      }
    }

    const race: RaceConfig = { trackId, mode: selection.mode, difficulty: selection.difficulty, laps, racers, seed };
    set({
      selection: { ...selection, trackId },
      championship,
      race,
      raceNonce: state.raceNonce + 1,
      paused: false,
      lastResult: null,
      lastRewards: null,
      raceStartedAt: Date.now(),
      screen: 'race',
    });
  },

  restartRace: () => {
    const { race, raceNonce, screen, championship } = get();
    if (!race) return;
    // Depois de registrado o resultado, uma corrida de copa não pode ser refeita.
    if (screen !== 'race' && championship) return;
    set({
      race: { ...race, seed: randomSeed() },
      raceNonce: raceNonce + 1,
      paused: false,
      lastResult: null,
      lastRewards: null,
      raceStartedAt: Date.now(),
      screen: 'race',
    });
  },

  setPaused: (paused) => {
    const s = get();
    if (s.screen !== 'race' || !s.race) {
      if (s.paused) set({ paused: false });
      return;
    }
    if (s.paused !== paused) set({ paused });
  },

  finishRace: (result: RaceResult) => {
    const state = get();
    if (state.screen !== 'race' || !state.race) return;
    let championship = state.championship;
    let outcome: ChampionshipOutcome | undefined;
    let championshipPosition: number | null = null;
    const pointsThisRace: Partial<Record<CharacterId, number>> = {};

    if (result.mode === 'championship' && championship && !championship.finished) {
      const positions: Partial<Record<CharacterId, number>> = {};
      for (const r of result.results) {
        positions[r.characterId] = r.position;
        pointsThisRace[r.characterId] = pointsForPosition(r.position);
      }
      const standings = sortStandings(
        championship.standings.map((e) => ({ ...e, points: e.points + (pointsThisRace[e.characterId] ?? 0) })),
        positions,
      );
      const finished = championship.raceIndex >= CUP_BY_ID[championship.cupId].tracks.length - 1;
      championship = { ...championship, standings, finished };
      if (finished) {
        championshipPosition = standings.findIndex((e) => e.isPlayer) + 1;
        outcome = { cupId: championship.cupId, position: championshipPosition };
      }
    } else if (result.mode !== 'timetrial' && result.mode !== 'training') {
      for (const r of result.results) pointsThisRace[r.characterId] = pointsForPosition(r.position);
    }

    const save = useSaveStore.getState();
    const unlocks = save.applyRaceResult(result, outcome);
    const report = useSaveStore.getState().lastReport;
    // Corrida não concluída pelo jogador (ou treino): o tempo de pista ainda conta como tempo jogado.
    if (result.playerTimeMs === null) save.addPlayTime(Date.now() - state.raceStartedAt);

    set({
      championship,
      lastResult: result,
      lastRewards: {
        unlocks,
        newRecords: report ? report.newRecords : { raceTime: false, bestLap: false },
        trophy: report ? report.trophy : null,
        championshipPosition,
        pointsThisRace,
      },
      paused: false,
      screen: 'results',
    });
  },

  continueAfterResults: () => {
    const { screen, championship, lastResult } = get();
    if (screen === 'results') {
      if (championship) {
        if (championship.finished) set({ screen: 'podium' });
        else {
          set({ championship: { ...championship, raceIndex: championship.raceIndex + 1 } });
          get().startRace();
        }
      } else if (lastResult?.mode === 'quick') set({ screen: 'podium' });
      else get().quitToMenu();
    } else if (screen === 'podium') get().quitToMenu();
  },

  quitToMenu: () => {
    const s = get();
    // Sessão abandonada pelo menu de pausa (é assim que o Treino termina): registra o tempo jogado.
    if (s.screen === 'race' && s.race && s.raceStartedAt > 0) useSaveStore.getState().addPlayTime(Date.now() - s.raceStartedAt);
    set({ screen: 'menu', race: null, championship: null, paused: false, lastResult: null, lastRewards: null, raceStartedAt: 0 });
  },
}));
