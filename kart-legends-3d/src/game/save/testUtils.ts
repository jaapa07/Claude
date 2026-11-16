import type { RaceConfig, RaceResult, RacerResult } from '@/game/core/types';
import { POINTS_BY_POSITION } from '@/data/tracks';

/** localStorage em memória para testes em ambiente Node. */
export class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

export function installMemoryStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  return storage;
}

export interface FakeResultOptions {
  /** Posição de chegada do jogador (1..N). Os demais mantêm a ordem do grid. */
  playerPosition?: number;
  playerTimeMs?: number | null;
  playerBestLapMs?: number | null;
  turbos?: [number, number, number];
  itemsUsed?: number;
}

/** Monta um RaceResult coerente a partir de um RaceConfig (o que a simulação entregaria). */
export function makeResult(race: RaceConfig, opts: FakeResultOptions = {}): RaceResult {
  const n = race.racers.length;
  const playerIndex = race.racers.findIndex((r) => r.isPlayer);
  const playerPosition = Math.min(n, Math.max(1, opts.playerPosition ?? 1));
  const order = race.racers.map((_, i) => i).filter((i) => i !== playerIndex);
  order.splice(playerPosition - 1, 0, playerIndex);
  const playerTimeMs = opts.playerTimeMs === undefined ? 90000 + playerPosition * 1000 : opts.playerTimeMs;
  const playerBestLapMs = opts.playerBestLapMs === undefined ? 29000 : opts.playerBestLapMs;
  const results: RacerResult[] = order.map((racerIndex, i) => {
    const r = race.racers[racerIndex];
    const total = r.isPlayer ? playerTimeMs : 90000 + (i + 1) * 1000;
    const best = r.isPlayer ? playerBestLapMs : 29500 + i * 100;
    return {
      racerIndex, characterId: r.characterId, kartId: r.kartId, isPlayer: r.isPlayer, position: i + 1,
      totalTimeMs: total, bestLapMs: best, lapTimesMs: best === null ? [] : [best + 500, best, best + 900],
      points: POINTS_BY_POSITION[i] ?? 0,
    };
  });
  return {
    trackId: race.trackId, mode: race.mode, difficulty: race.difficulty, results,
    playerPosition, playerTimeMs, playerBestLapMs,
    stats: { turbos: opts.turbos ?? [2, 1, 0], itemsUsed: opts.itemsUsed ?? 1, hitsTaken: 0, topSpeedKmh: 96 },
  };
}
