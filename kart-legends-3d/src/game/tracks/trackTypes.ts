import type { TrackId } from '@/data/ids';

export const SURFACES = ['asphalt', 'dirt', 'grass', 'sand', 'ice'] as const;
export type SurfaceType = (typeof SURFACES)[number];

/** Amostras de um caminho (linha central) em arrays paralelos, uma amostra a cada `spacing` metros. */
export interface PathSamples {
  /** x,y,z por amostra. */
  pos: number[];
  /** Vetor unitário apontando para a ESQUERDA do sentido da corrida (x,y,z); inclui a inclinação lateral. */
  side: number[];
  /** Normal da superfície. */
  up: number[];
  halfWidth: number[];
  /** Índice em SURFACES. */
  surface: number[];
  /** 1 = não há pista nesta amostra (vão de salto). */
  gap: number[];
}

export interface ShortcutData {
  id: string;
  /** Índices na linha principal onde o atalho começa e termina. */
  from: number;
  to: number;
  samples: PathSamples;
  /** Comprimento do atalho em metros. */
  length: number;
  /** Atalho arriscado (estreito/fora de estrada): a IA só entra em dificuldades maiores ou com turbo. */
  risky: boolean;
}

export type ObstacleKind = 'slider' | 'pendulum' | 'roller';

export interface ObstacleData {
  id: string;
  kind: ObstacleKind;
  /** Modelo em assets/props/<model>.glb. */
  model: string;
  /** Extremos do movimento (x,y,z). */
  a: [number, number, number];
  b: [number, number, number];
  period: number;
  phase: number;
  radius: number;
  /** Índice de amostra aproximado (para a IA antecipar). */
  index: number;
}

export type PropMotion =
  | { kind: 'spin'; axis: 'x' | 'y' | 'z'; period: number }
  | { kind: 'sway'; axis: 'x' | 'z'; angle: number; period: number }
  | { kind: 'bob'; height: number; period: number };

export interface AnimatedPropData {
  /** Modelo em assets/props/<model>.glb. */
  model: string;
  pos: [number, number, number];
  rotY: number;
  scale: number;
  motion: PropMotion;
}

export interface TerrainData {
  minX: number;
  minZ: number;
  cell: number;
  /** Número de vértices em X e Z. */
  nx: number;
  nz: number;
  /** Alturas em centímetros (Int16 little-endian em base64), ordem z*nx + x. */
  heights: string;
}

export interface RampData {
  index: number;
  /** Centro da base da rampa. */
  pos: [number, number, number];
  heading: number;
  width: number;
  length: number;
  height: number;
}

export interface TrackData {
  id: TrackId;
  length: number;
  spacing: number;
  count: number;
  main: PathSamples;
  /** Superfície (índice em SURFACES) fora da faixa de rodagem. */
  offroad: number;
  /** Bit 1 = muro à esquerda, bit 2 = muro à direita. Por amostra. */
  wall: number[];
  wallHeight: number;
  killY: number;
  checkpoints: number[];
  grid: { pos: [number, number, number]; heading: number }[];
  /** Deslocamento lateral ideal (m, + = esquerda) e fator de velocidade (0..1) por amostra. */
  racingLine: number[];
  speedHint: number[];
  shortcuts: ShortcutData[];
  itemRows: { index: number; offsets: number[] }[];
  boostPads: { index: number; offset: number; pos: [number, number, number]; heading: number }[];
  ramps: RampData[];
  obstacles: ObstacleData[];
  terrain: TerrainData | null;
  /** Colisores cilíndricos de cenário: x, y(base), z, raio, altura — 5 números por objeto. */
  propColliders: number[];
  animatedProps: AnimatedPropData[];
  /** Plano de água (y) ou null. */
  waterY: number | null;
  introCamera: { pos: [number, number, number]; target: [number, number, number] }[];
  minimap: { points: number[]; minX: number; maxX: number; minZ: number; maxZ: number };
}
