import type { CharacterId, Difficulty, GameMode, ItemId, KartId, TrackId } from '@/data/ids';

export interface RacerSetup {
  characterId: CharacterId;
  kartId: KartId;
  isPlayer: boolean;
}

/** Tudo o que a simulação precisa para montar uma corrida. `racers` está na ordem do grid. */
export interface RaceConfig {
  trackId: TrackId;
  mode: GameMode;
  difficulty: Difficulty;
  laps: number;
  racers: RacerSetup[];
  seed: number;
}

/** Comandos de um piloto em um passo de simulação. `steer`: -1 esquerda, +1 direita. */
export interface InputState {
  throttle: number;
  brake: number;
  steer: number;
  drift: boolean;
  item: boolean;
  reset: boolean;
}

export const NEUTRAL_INPUT: Readonly<InputState> = { throttle: 0, brake: 0, steer: 0, drift: false, item: false, reset: false };

export interface RacerResult {
  racerIndex: number;
  characterId: CharacterId;
  kartId: KartId;
  isPlayer: boolean;
  /** 1 a N. */
  position: number;
  /** null = não completou (classificado pelo progresso). */
  totalTimeMs: number | null;
  bestLapMs: number | null;
  lapTimesMs: number[];
  points: number;
}

export interface RaceResult {
  trackId: TrackId;
  mode: GameMode;
  difficulty: Difficulty;
  results: RacerResult[];
  playerPosition: number;
  playerTimeMs: number | null;
  playerBestLapMs: number | null;
  stats: { turbos: [number, number, number]; itemsUsed: number; hitsTaken: number; topSpeedKmh: number };
}

export type RacePhase = 'intro' | 'countdown' | 'racing' | 'finished';
export type AlertKind = 'info' | 'warn' | 'good';

export interface HudAlert { id: number; text: string; kind: AlertKind }

export interface HudMinimapDot { x: number; z: number; characterId: CharacterId; isPlayer: boolean; position: number }

/** Estado publicado pela corrida para o HUD (aprox. 15 vezes por segundo). */
export interface HudSnapshot {
  phase: RacePhase;
  /** 3, 2, 1, 0 (= "VAI!") ou -1 quando não há contagem. */
  countdown: number;
  position: number;
  totalRacers: number;
  lap: number;
  totalLaps: number;
  timeMs: number;
  lapTimeMs: number;
  bestLapMs: number | null;
  speedKmh: number;
  item: ItemId | null;
  itemRolling: boolean;
  driftLevel: 0 | 1 | 2 | 3;
  /** Progresso (0..1) até o próximo nível de drift. */
  driftCharge: number;
  /** Turbo restante normalizado (0..1). */
  boost: number;
  shield: boolean;
  wrongWay: boolean;
  alerts: HudAlert[];
  minimap: HudMinimapDot[];
}
