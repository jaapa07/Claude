/** Terreno em grade de alturas que se molda ao traçado (planícies, encostas, cânions) e sua malha visual. */
import * as THREE from 'three';
import { fbm } from '../lib/textures';
import { col, mix } from '../lib/geo';
import type { TerrainData } from '../../src/game/tracks/trackTypes';
import type { Sampled } from './sample';
import type { TrackDef } from './types';

export interface Terrain {
  data: TerrainData;
  heights: Float32Array;
  heightAt: (x: number, z: number) => number;
  /** Distância horizontal até a borda da pista mais próxima (negativa = sobre a pista). */
  roadDistance: (x: number, z: number) => number;
}

interface Pt { x: number; y: number; z: number; hw: number; ground: boolean; flat: number }

export class RoadIndex {
  private readonly cells = new Map<string, Pt[]>();
  private readonly size = 24;
  constructor(paths: Sampled[]) {
    for (const s of paths) {
      for (let i = 0; i < s.n; i++) {
        const p = s.pos[i]!;
        const pt: Pt = { x: p.x, y: p.y, z: p.z, hw: s.halfWidth[i]!, ground: !s.bridge[i] && !s.gap[i], flat: s.flat[i]! };
        const key = `${Math.floor(p.x / this.size)},${Math.floor(p.z / this.size)}`;
        const list = this.cells.get(key);
        if (list) list.push(pt); else this.cells.set(key, [pt]);
      }
    }
  }
  near(x: number, z: number, radius: number): Pt[] {
    const out: Pt[] = [];
    const r = Math.ceil(radius / this.size);
    const cx = Math.floor(x / this.size), cz = Math.floor(z / this.size);
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const list = this.cells.get(`${cx + i},${cz + j}`);
      if (list) out.push(...list);
    }
    return out;
  }
  /** Distância até a borda de trechos que passam ABAIXO de `y` (para não fincar pilares em cima de outra pista). */
  edgeDistanceBelow(x: number, z: number, y: number, radius = 48): number {
    let best = Infinity;
    for (const p of this.near(x, z, radius)) if (p.y < y - 4) best = Math.min(best, Math.hypot(p.x - x, p.z - z) - p.hw);
    return best;
  }
  /** Distância até a borda da pista (qualquer trecho, inclusive pontes). */
  edgeDistance(x: number, z: number, radius = 96): number {
    let best = Infinity;
    for (const p of this.near(x, z, radius)) best = Math.min(best, Math.hypot(p.x - x, p.z - z) - p.hw);
    return best;
  }
}

export function buildTerrain(def: TrackDef, paths: Sampled[], index: RoadIndex, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }): Terrain | null {
  const t = def.terrain;
  if (!t) return null;
  const cell = 5;
  const margin = 150;
  const minX = Math.floor((bounds.minX - margin) / cell) * cell;
  const minZ = Math.floor((bounds.minZ - margin) / cell) * cell;
  const nx = Math.ceil((bounds.maxX + margin - minX) / cell) + 1;
  const nz = Math.ceil((bounds.maxZ + margin - minZ) / cell) + 1;
  const heights = new Float32Array(nx * nz);
  const reach = Math.max(t.flat, 80) + t.rise + 40;
  const seed = def.seed;
  const far = (x: number, z: number, d: number): number => {
    const n1 = fbm(x / t.scale + 100, z / t.scale + 100, 64, 4, seed) - 0.5;
    let h = t.base + n1 * 2 * t.amp;
    if (t.island) {
      const wob = (fbm(x / 90 + 7, z / 90 + 7, 64, 3, seed + 5) - 0.5) * 60;
      const k = Math.min(1, Math.max(0, (Math.hypot(x - t.island.x, z - t.island.z) + wob - t.island.r) / 28));
      h += (t.island.sea - h) * k * k * (3 - 2 * k);
    }
    for (const river of t.rivers ?? []) {
      let rd = Infinity;
      for (let q = 0; q + 1 < river.pts.length; q++) {
        const [ax, az] = river.pts[q]!, [bx, bz] = river.pts[q + 1]!;
        const tt = Math.min(1, Math.max(0, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
        rd = Math.min(rd, Math.hypot(x - ax - (bx - ax) * tt, z - az - (bz - az) * tt));
      }
      const k = Math.min(1, Math.max(0, 1 - (rd - river.width / 2) / (river.width * 0.6)));
      h -= river.depth * k * k * (3 - 2 * k);
    }
    if (t.far && d > t.far.from) {
      const k = Math.min(1, (d - t.far.from) / 90);
      const ridge = 1 - Math.abs(fbm(x / 160 + 50, z / 160 + 50, 64, 4, seed + 9) * 2 - 1);
      h += k * k * t.far.height * (0.35 + 0.65 * ridge);
    }
    return h;
  };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = minX + i * cell, z = minZ + j * cell;
    let dmin = Infinity, wsum = 0, ysum = 0, flat = t.flat;
    for (const p of index.near(x, z, reach)) {
      if (!p.ground) continue;
      const d = Math.max(0, Math.hypot(p.x - x, p.z - z) - p.hw);
      if (d < dmin) { dmin = d; flat = Number.isNaN(p.flat) ? t.flat : p.flat; }
      const w = 1 / (d * d * d * d + 0.5);
      wsum += w; ysum += w * p.y;
    }
    const f = far(x, z, dmin === Infinity ? 999 : dmin);
    if (dmin === Infinity) { heights[j * nx + i] = f; continue; }
    const roadY = ysum / wsum - 0.14;
    const k = Math.min(1, Math.max(0, (dmin - flat) / t.rise));
    const s = k * k * (3 - 2 * k);
    heights[j * nx + i] = roadY + (f - roadY) * s;
  }
  // garante que nenhuma célula fique acima de uma pista apoiada no chão logo ao lado
  const heightAt = (x: number, z: number): number => {
    const fx = Math.min(nx - 1.001, Math.max(0, (x - minX) / cell));
    const fz = Math.min(nz - 1.001, Math.max(0, (z - minZ) / cell));
    const i = Math.floor(fx), j = Math.floor(fz);
    const a = fx - i, b = fz - j;
    const h = (ii: number, jj: number): number => heights[jj * nx + ii]!;
    // mesma triangulação da malha (diagonal i,j → i+1,j+1)
    return a > b
      ? h(i, j) + (h(i + 1, j) - h(i, j)) * a + (h(i + 1, j + 1) - h(i + 1, j)) * b
      : h(i, j) + (h(i + 1, j + 1) - h(i, j + 1)) * a + (h(i, j + 1) - h(i, j)) * b;
  };
  const i16 = new Int16Array(nx * nz);
  for (let k = 0; k < i16.length; k++) {
    i16[k] = Math.max(-32767, Math.min(32767, Math.round(heights[k]! * 100)));
    heights[k] = i16[k]! / 100;
  }
  void paths;
  return {
    data: { minX, minZ, cell, nx, nz, heights: Buffer.from(i16.buffer).toString('base64') },
    heights,
    heightAt,
    roadDistance: (x, z) => index.edgeDistance(x, z),
  };
}

/** Malha visual do terreno, em ladrilhos (para frustum culling), com cor de vértice por altura e inclinação. */
export function terrainTiles(def: TrackDef, terrain: Terrain, tile = 24): THREE.BufferGeometry[] {
  const t = def.terrain!;
  const { nx, nz, cell, minX, minZ } = terrain.data;
  const h = (i: number, j: number): number => terrain.heights[Math.min(nz - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))]!;
  const [low, mid, high, cliff] = t.colors.map((c) => col(c)) as [THREE.Color, THREE.Color, THREE.Color, THREE.Color];
  let hmin = Infinity, hmax = -Infinity;
  for (const v of terrain.heights) { hmin = Math.min(hmin, v); hmax = Math.max(hmax, v); }
  const out: THREE.BufferGeometry[] = [];
  for (let tj = 0; tj < nz - 1; tj += tile) for (let ti = 0; ti < nx - 1; ti += tile) {
    const w = Math.min(tile, nx - 1 - ti), d = Math.min(tile, nz - 1 - tj);
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], color: number[] = [], idx: number[] = [];
    for (let j = 0; j <= d; j++) for (let i = 0; i <= w; i++) {
      const gi = ti + i, gj = tj + j;
      const x = minX + gi * cell, z = minZ + gj * cell, y = h(gi, gj);
      const nxv = h(gi - 1, gj) - h(gi + 1, gj), nzv = h(gi, gj - 1) - h(gi, gj + 1);
      const n = new THREE.Vector3(nxv, 2 * cell, nzv).normalize();
      pos.push(x, y, z); nor.push(n.x, n.y, n.z); uv.push(x / 12, z / 12);
      const slope = 1 - n.y;
      const hh = (y - hmin) / (hmax - hmin || 1);
      const noise = fbm(x / 40, z / 40, 64, 3, def.seed + 3);
      let c = hh < 0.45 ? mix(low, mid, hh / 0.45) : mix(mid, high, (hh - 0.45) / 0.55);
      c = mix(c, cliff, Math.min(1, Math.max(0, (slope - 0.08) * 5)));
      c = c.clone().multiplyScalar(0.86 + noise * 0.28);
      color.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
      const a = j * (w + 1) + i, b = a + 1, c2 = a + w + 1, e = c2 + 1;
      idx.push(a, c2, e, a, e, b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
    g.setIndex(idx);
    out.push(g);
  }
  return out;
}
