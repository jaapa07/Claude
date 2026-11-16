import RAPIER from '@dimforge/rapier3d-compat';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CHARACTERS } from '@/data/characters';
import type { Difficulty, GameMode, KartId, TrackId } from '@/data/ids';
import { NEUTRAL_INPUT, type InputState } from '@/game/core/types';
import { RaceSim } from '@/game/racing/raceSim';
import type { SimEvent } from '@/game/racing/events';
import { angleDiff } from '@/game/tracks/trackRuntime';
import type { TrackData } from '@/game/tracks/trackTypes';

let ready: Promise<void> | null = null;
export function initPhysics(): Promise<void> {
  ready ??= RAPIER.init();
  return ready;
}

const cache = new Map<TrackId, TrackData>();
export function loadTrack(id: TrackId): TrackData {
  let t = cache.get(id);
  if (!t) {
    t = JSON.parse(readFileSync(path.resolve(__dirname, `../../public/assets/tracks/${id}.json`), 'utf8')) as TrackData;
    cache.set(id, t);
  }
  return t;
}

/** Pista sintética: anel largo e plano, sem muros nem cenário (área livre para testar drift e itens). */
export function ringTrack(radius = 70, halfWidth = 40): TrackData {
  const n = Math.round((2 * Math.PI * radius) / 2);
  const main = { pos: [] as number[], side: [] as number[], up: [] as number[], halfWidth: [] as number[], surface: [] as number[], gap: [] as number[] };
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // sentido de percurso com o centro à esquerda
    main.pos.push(Math.cos(a) * radius, 0, -Math.sin(a) * radius);
    main.side.push(-Math.cos(a), 0, Math.sin(a));
    main.up.push(0, 1, 0);
    main.halfWidth.push(halfWidth); main.surface.push(0); main.gap.push(0);
  }
  const heading = (i: number): number => { const a = (i / n) * Math.PI * 2; return Math.atan2(-Math.sin(a), -Math.cos(a)); };
  return {
    id: 'porto-lanternas', length: n * 2, spacing: 2, count: n, main, offroad: 2, wall: new Array<number>(n).fill(0), wallHeight: 1, killY: -40,
    checkpoints: Array.from({ length: 12 }, (_, k) => Math.round((k * n) / 12)),
    grid: Array.from({ length: 8 }, (_, k) => { const i = n - 4 - k * 2; const a = (i / n) * Math.PI * 2; const r = radius + (k % 2 ? 3 : -3); return { pos: [Math.cos(a) * r, 0, -Math.sin(a) * r] as [number, number, number], heading: heading(i) }; }),
    racingLine: new Array<number>(n).fill(0), speedHint: new Array<number>(n).fill(1), shortcuts: [],
    itemRows: [{ index: 20, offsets: [-6, -3, 0, 3, 6] }], boostPads: [], ramps: [], obstacles: [], terrain: null, propColliders: [], animatedProps: [], waterY: null,
    introCamera: [], minimap: { points: [], minX: -radius, maxX: radius, minZ: -radius, maxZ: radius },
  };
}

export interface Harness {
  sim: RaceSim;
  input: InputState;
  events: SimEvent[];
  /** Avança `seconds` de simulação acumulando os eventos. */
  run: (seconds: number) => void;
  /** Passa a apresentação e a contagem regressiva. */
  start: () => void;
  /** true = a direção é corrigida a cada passo para manter o kart no centro da pista. */
  follow: boolean;
}

export interface HarnessOptions {
  track?: TrackId;
  /** Dados de pista prontos (substitui `track`). */
  data?: TrackData;
  /** Número de adversários de IA (0 = só o jogador). */
  opponents?: number;
  player?: boolean;
  kart?: KartId;
  difficulty?: Difficulty;
  mode?: GameMode;
  laps?: number;
  seed?: number;
}

export function createHarness(o: HarnessOptions = {}): Harness {
  const input: InputState = { ...NEUTRAL_INPUT };
  const withPlayer = o.player ?? true;
  const racers = [
    ...(withPlayer ? [{ characterId: CHARACTERS[0]!.id, kartId: o.kart ?? CHARACTERS[0]!.kartId, isPlayer: true }] : []),
    ...CHARACTERS.slice(withPlayer ? 1 : 0, (withPlayer ? 1 : 0) + (o.opponents ?? 0)).map((c) => ({ characterId: c.id, kartId: c.kartId, isPlayer: false })),
  ];
  const sim = new RaceSim(RAPIER, new RAPIER.World({ x: 0, y: 0, z: 0 }), o.data ?? loadTrack(o.track ?? 'porto-lanternas'), {
    trackId: o.track ?? 'porto-lanternas', mode: o.mode ?? 'quick', difficulty: o.difficulty ?? 'normal', laps: o.laps ?? 3, seed: o.seed ?? 7, racers,
  }, { playerInput: () => input });
  const events: SimEvent[] = [];
  const h: Harness = {
    sim, input, events, follow: false,
    run: (seconds: number): void => {
      const steps = Math.round(seconds * 60);
      for (let i = 0; i < steps; i++) {
        const k = sim.player;
        if (h.follow && k) {
          const p = { x: 0, y: 0, z: 0 };
          sim.track.main.point(k.mainIndex + 7, 0, p);
          input.steer = Math.max(-1, Math.min(1, -angleDiff(Math.atan2(p.x - k.x, p.z - k.z), k.heading) * 2.5));
        }
        sim.step();
        events.push(...sim.drainEvents());
      }
    },
    start: () => { sim.startCountdown(); h.run(3.05); },
  };
  return h;
}
