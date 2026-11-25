import type { CharacterId, Difficulty, GameMode, ItemId, KartId, TrackId } from '@/data/ids';

export interface RacerSetup {
  characterId: CharacterId;
  kartId: KartId;
  isPlayer: boolean;
  /** Jogador humano: 0 = Jogador 1, 1 = Jogador 2 (tela dividida). Sem valor = 0. */
  slot?: number;
}

/** Até dois jogadores humanos na mesma tela (tela dividida). */
export const MAX_PLAYERS = 2;

/** Vagas dos humanos na ordem do grid (sem `slot` explícito, o primeiro humano é o Jogador 1). */
export function playerSlotOf(r: Pick<RacerSetup, 'isPlayer' | 'slot'>): number {
  return r.isPlayer ? (r.slot ?? 0) : -1;
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
  /** Vaga do jogador humano (0/1); ausente ou -1 = IA. */
  slot?: number;
  /** 1 a N. */
  position: number;
  /** Tempo final; quem não cruzou a chegada recebe uma estimativa pelo ritmo (`estimated`). null = sem ritmo medido. */
  totalTimeMs: number | null;
  /** O tempo é estimado (não cruzou a chegada antes dos resultados). */
  estimated?: boolean;
  bestLapMs: number | null;
  lapTimesMs: number[];
  points: number;
}

/** Resultado de um jogador humano (um por jogador; dois na tela dividida). */
export interface PlayerRaceOutcome {
  slot: number;
  racerIndex: number;
  characterId: CharacterId;
  position: number;
  /** null = não cruzou a chegada (tempo estimado não vale recorde). */
  timeMs: number | null;
  bestLapMs: number | null;
  stats: { turbos: [number, number, number]; itemsUsed: number; hitsTaken: number; topSpeedKmh: number };
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
  /**
   * Um item por jogador humano, na ordem das vagas. `playerPosition`/`playerTimeMs`/`stats` acima são sempre os do
   * Jogador 1 (compatibilidade); com dois jogadores as recompensas usam esta lista.
   */
  players?: PlayerRaceOutcome[];
}

export type RacePhase = 'intro' | 'countdown' | 'racing' | 'finished';
export type AlertKind = 'info' | 'warn' | 'good';

export interface HudAlert { id: number; text: string; kind: AlertKind }

export interface HudMinimapDot {
  x: number; z: number; characterId: CharacterId; isPlayer: boolean; position: number;
  /** O kart de quem lê este HUD (na tela dividida, cada metade destaca o seu). */
  me?: boolean;
}

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
  /** Este jogador já cruzou a chegada (na tela dividida o outro pode ainda estar correndo). */
  finished?: boolean;
  /** Vaga do jogador deste HUD (0/1). */
  slot?: number;
  alerts: HudAlert[];
  minimap: HudMinimapDot[];
}
