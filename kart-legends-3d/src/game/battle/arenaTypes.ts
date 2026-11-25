import type { ArenaId } from '@/data/battle';
import type { AnimatedPropData, RampData, TerrainData } from '@/game/tracks/trackTypes';

export type V3 = [number, number, number];

/** Plataforma elevada (canteiro, mesa): a IA sobe por uma das entradas (pé da rampa → topo). */
export interface ArenaPlatform {
  /** Centro do topo e meias medidas (no sistema girado por `rotY`). */
  x: number; z: number; y: number;
  hx: number; hz: number;
  rotY: number;
  entries: { foot: V3; top: V3 }[];
}

/**
 * Dados de uma arena de batalha (gerados por scripts/build-arenas.ts em public/assets/arenas/<id>.json).
 * Área aberta, sem traçado: colisores por primitivas, pontos de surgimento e informação para a IA.
 */
export interface ArenaData {
  id: ArenaId;
  /** Centro e raio da área jogável (a IA evita passar do raio). */
  center: [number, number];
  radius: number;
  /** Chão (altura em cada ponto), no mesmo formato do terreno das pistas. */
  ground: TerrainData;
  /** Caixas estáticas (muros, plataformas): cx, cy, cz, meia-largura, meia-altura, meia-profundidade, rotY — 7 por caixa. */
  boxes: number[];
  /** Cilindros estáticos: x, y(base), z, raio, altura — 5 por objeto. */
  cylinders: number[];
  ramps: RampData[];
  boostPads: { pos: V3; heading: number }[];
  itemBoxes: V3[];
  /** Oito posições de largada (viradas para o centro). */
  spawns: { pos: V3; heading: number }[];
  crystalSpawns: V3[];
  crownSpawns: V3[];
  platforms: ArenaPlatform[];
  killY: number;
  animatedProps: AnimatedPropData[];
  introCamera: { pos: V3; target: V3 }[];
  /** Minimapa: contorno (x,z…) e formas (plataformas/obstáculos) para desenhar. */
  minimap: {
    minX: number; maxX: number; minZ: number; maxZ: number;
    outline: number[];
    rects: { x: number; z: number; hx: number; hz: number; rotY: number }[];
    circles: { x: number; z: number; r: number }[];
  };
}

/** Decodifica as alturas do chão (cm em Int16 base64 → metros). Funciona no navegador e no Node. */
export function decodeHeights(t: TerrainData): Float32Array {
  const bin = atob(t.heights);
  const out = new Float32Array(t.nx * t.nz);
  for (let i = 0; i < out.length; i++) {
    const v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
    out[i] = (v >= 32768 ? v - 65536 : v) / 100;
  }
  return out;
}

/** Altura do chão (bilinear) em x,z. */
export function groundHeight(t: TerrainData, h: Float32Array, x: number, z: number): number {
  const fx = Math.max(0, Math.min(t.nx - 1.001, (x - t.minX) / t.cell));
  const fz = Math.max(0, Math.min(t.nz - 1.001, (z - t.minZ) / t.cell));
  const i = Math.floor(fx), j = Math.floor(fz);
  const u = fx - i, v = fz - j;
  const a = h[j * t.nx + i]!, b = h[j * t.nx + i + 1]!, c = h[(j + 1) * t.nx + i]!, d = h[(j + 1) * t.nx + i + 1]!;
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
