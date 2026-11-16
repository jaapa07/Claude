import { KART_BY_ID, type KartStats } from '@/data/karts';
import type { KartId } from '@/data/ids';
import { SURFACES, type SurfaceType } from '@/game/tracks/trackTypes';

/** Parâmetros físicos derivados dos atributos (1..5) de um kart. */
export interface KartTuning {
  topSpeed: number;
  accel: number;
  brake: number;
  turnRate: number;
  grip: number;
  mass: number;
  /** Multiplicador do acúmulo de carga de drift. */
  driftCharge: number;
  /** Multiplicador da duração do miniturbo. */
  driftBoost: number;
  /** Reduz o tempo de giro/atordoamento e acelera a retomada. */
  recovery: number;
  /** 0..1: quanto o kart ignora as penalidades fora de estrada. */
  offroad: number;
}

const lerp = (a: number, b: number, stat: number): number => a + (b - a) * ((stat - 1) / 4);

export function tuningFromStats(s: KartStats): KartTuning {
  return {
    topSpeed: lerp(26.2, 29.4, s.topSpeed),
    accel: lerp(13.5, 21, s.acceleration),
    brake: lerp(24, 38, s.braking),
    turnRate: lerp(1.75, 2.35, s.handling),
    grip: lerp(0.8, 1.25, s.grip),
    mass: lerp(0.75, 1.5, s.mass),
    driftCharge: lerp(0.84, 1.2, s.driftEfficiency),
    driftBoost: lerp(0.9, 1.15, s.driftEfficiency),
    recovery: lerp(0.85, 1.3, s.recovery),
    offroad: lerp(0, 0.4, s.grip),
  };
}

export const tuningFor = (id: KartId): KartTuning => tuningFromStats(KART_BY_ID[id].stats);

export interface SurfaceParams { speed: number; accel: number; grip: number; drag: number }

/** Comportamento por superfície (asfalto, terra, grama, areia, gelo). */
export const SURFACE_PARAMS: Record<SurfaceType, SurfaceParams> = {
  asphalt: { speed: 1, accel: 1, grip: 10.5, drag: 1 },
  dirt: { speed: 0.93, accel: 0.9, grip: 7, drag: 1.2 },
  grass: { speed: 0.6, accel: 0.7, grip: 6.5, drag: 2.4 },
  sand: { speed: 0.5, accel: 0.55, grip: 5.5, drag: 3.2 },
  ice: { speed: 1, accel: 0.5, grip: 1.5, drag: 0.35 },
};

export const surfaceByIndex = (i: number): SurfaceParams => SURFACE_PARAMS[SURFACES[i] ?? 'asphalt'];

export const PHYS = {
  /** Passo fixo da simulação. */
  dt: 1 / 60,
  gravity: 28,
  ballRadius: 0.8,
  /** Altura do centro do kart sobre o chão em repouso. */
  rideHeight: 0.95,
  boostSpeed: 1.3,
  boostAccel: 34,
  reverseSpeed: 9,
  /** Limiares de carga para os níveis 1, 2 e 3 de drift. */
  driftLevels: [0.9, 1.9, 3.0] as const,
  /** Duração do miniturbo por nível. */
  driftBoostTime: [0.7, 1.35, 2.3] as const,
  spinTime: 1.15,
  invulnTime: 1.6,
  jumpSpeed: 11.5,
} as const;
