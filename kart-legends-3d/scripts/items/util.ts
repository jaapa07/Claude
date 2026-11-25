/** Utilitários dos itens: materiais/texturas (`item_`), animação por quadros-chave e exportação. */
import path from 'node:path';
import type { Node } from '@gltf-transform/core';
import { GlbBuilder, type Channel, type Quat } from '../lib/glb';
import { defineMaterial } from '../lib/materials';
import { ASSETS_DIR, makeTexture, svgTexture } from '../lib/textures';
import { THREE, type Model, type V3 } from '../lib/geo';
import { textPaths } from '../karts/glyphs';

export interface ItemEntry { id: string; file: string; bytes: number; triangles: number; clips: { name: string; duration: number }[]; size: V3; note: string }

export class ItemBuilder {
  readonly g = new GlbBuilder();
  readonly root: Node;
  private tris = 0;
  private readonly box = new THREE.Box3();
  private readonly clips: { name: string; duration: number }[] = [];
  private channels: Channel[] = [];
  private n = 0;

  constructor(readonly id: string) { this.root = this.g.node('root'); }

  /** Nó (animável) com uma malha num filho, para a quantização não mexer na transformação do nó. */
  part(name: string, model: Model, opts: { t?: V3; r?: Quat; s?: V3; parent?: Node } = {}): Node {
    const node = this.g.node(name, { t: opts.t, r: opts.r, s: opts.s, parent: opts.parent ?? this.root });
    this.g.node(`${name}_mesh`, { parent: node, mesh: this.g.mesh(`${name}_${this.n++}`, model) });
    this.tris += model.triangleCount();
    const b = model.bounds().clone();
    b.applyMatrix4(new THREE.Matrix4().fromArray(node.getWorldMatrix()));
    this.box.union(b);
    return node;
  }
  group(name: string, opts: { t?: V3; r?: Quat; parent?: Node } = {}): Node {
    return this.g.node(name, { t: opts.t, r: opts.r, parent: opts.parent ?? this.root });
  }
  add(...ch: Channel[]): void { this.channels.push(...ch); }
  clip(name: string, duration: number): void {
    this.g.animation(name, this.channels);
    this.clips.push({ name, duration });
    this.channels = [];
  }
  async save(note: string): Promise<ItemEntry> {
    const file = `items/${this.id}.glb`;
    const bytes = await this.g.save(path.join(ASSETS_DIR, file));
    const s = this.box.getSize(new THREE.Vector3());
    const r = (x: number): number => Math.round(x * 100) / 100;
    return { id: this.id, file, bytes, triangles: Math.round(this.tris), clips: this.clips, size: [r(s.x), r(s.y), r(s.z)], note };
  }
}

export function quat(axis: V3, ang: number): Quat {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis).normalize(), ang);
  return [q.x, q.y, q.z, q.w];
}
export function qmul(a: Quat, b: Quat): Quat {
  const q = new THREE.Quaternion(...a).multiply(new THREE.Quaternion(...b));
  return [q.x, q.y, q.z, q.w];
}
/** Giro contínuo em torno de `axis` (eixo local), `turns` voltas em `dur` s; `base` = orientação fixa aplicada antes. */
export function spin(node: Node, axis: V3, dur: number, turns = 1, base: Quat = [0, 0, 0, 1], phase = 0): Channel {
  const steps = Math.abs(turns) * 8;
  const times: number[] = [], values: number[] = [];
  for (let i = 0; i <= steps; i++) {
    times.push((i / steps) * dur);
    values.push(...qmul(base, quat(axis, phase + (i / steps) * turns * Math.PI * 2)));
  }
  return { node, path: 'rotation', times, values };
}
/** Canal amostrado: `fn(fase 0..1)` devolve o vetor (translação/escala) ou quaternion. */
export function sampled(node: Node, p: Channel['path'], dur: number, fn: (ph: number) => number[], steps = 16): Channel {
  const times: number[] = [], values: number[] = [];
  for (let i = 0; i <= steps; i++) { times.push((i / steps) * dur); values.push(...fn(i / steps)); }
  return { node, path: p, times, values };
}
export const wave = (ph: number, k = 1, off = 0): number => Math.sin((ph * k + off) * Math.PI * 2);

/** Plano texturizado olhando para +Z, com V invertido (convenção glTF) e repetição em U/V. */
export function texPlane(w: number, h: number, uRep = 1, vRep = 1): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uRep, (1 - uv.getY(i)) * vRep);
  return g;
}

export async function registerItemMaterials(): Promise<void> {
  defineMaterial('kart_metal', { roughness: 0.42, metalness: 0.55 });
  defineMaterial('item_crystal', { roughness: 0.08, alpha: 0.55, doubleSided: true, emissive: [0.1, 0.42, 0.7], emissiveStrength: 1.3 });
  defineMaterial('item_glow_orange', { roughness: 0.6, emissive: [1, 0.42, 0.06], emissiveStrength: 1.1 });
  defineMaterial('item_glow_yellow', { roughness: 0.6, emissive: [1, 0.74, 0.16], emissiveStrength: 1.0 });
  defineMaterial('item_glow_red', { roughness: 0.6, emissive: [1, 0.16, 0.08], emissiveStrength: 1.1 });
  defineMaterial('item_crystal_blue', { roughness: 0.1, alpha: 0.86, doubleSided: true, emissive: [0.1, 0.25, 0.9], emissiveStrength: 1.1 });
  defineMaterial('item_wind', { roughness: 0.5, alpha: 0.62, doubleSided: true, emissive: [0.45, 0.95, 0.72], emissiveStrength: 1.3 });
  defineMaterial('item_mist_a', { roughness: 1, alpha: 0.6, emissive: [0.5, 0.12, 1], emissiveStrength: 1.0 });
  defineMaterial('item_mist_b', { roughness: 1, alpha: 0.56, emissive: [0.05, 0.6, 1], emissiveStrength: 1.0 });
  defineMaterial('item_mist_c', { roughness: 1, alpha: 0.56, emissive: [1, 0.15, 0.55], emissiveStrength: 1.0 });
  defineMaterial('item_wing', { roughness: 0.7, doubleSided: true, emissive: [0.75, 0.82, 1], emissiveStrength: 0.7 });
  defineMaterial('item_bolt', { roughness: 0.6, emissive: [0.85, 1, 0.25], emissiveStrength: 1.8 });
  defineMaterial('item_comet', { roughness: 0.4, alpha: 0.16, doubleSided: true, emissive: [1, 0.35, 0.62], emissiveStrength: 1.4 });
  defineMaterial('item_comet_tail', { roughness: 0.6, alpha: 0.24, doubleSided: true, emissive: [1, 0.5, 0.35], emissiveStrength: 1.5 });
  defineMaterial('item_gold', { roughness: 0.3, metalness: 0.65, emissive: [0.32, 0.22, 0.04], emissiveStrength: 1 });
  defineMaterial('item_silver', { roughness: 0.3, metalness: 0.65, emissive: [0.2, 0.22, 0.26], emissiveStrength: 1 });
  defineMaterial('item_bronze', { roughness: 0.36, metalness: 0.6, emissive: [0.26, 0.13, 0.05], emissiveStrength: 1 });
  // colmeia do escudo: linhas opacas, células quase transparentes
  await makeTexture('item_hex', 128, (u, v) => {
    // células de Voronoi sobre uma rede triangular 4 × 4 (ladrilhável) = colmeia
    const x = u * 4, y = v * 4;
    let best = 9, second = 9;
    for (let j = -1; j <= 5; j++) for (let i = -1; i <= 5; i++) {
      const d = Math.hypot(x - (i + (j % 2 ? 0.5 : 0)), (y - j) * 0.866);
      if (d < best) { second = best; best = d; } else if (d < second) second = d;
    }
    const edge = second - best;
    const line = edge < 0.07 ? 1 : edge < 0.12 ? 0.5 : 0;
    return [0.75 + 0.25 * line, 0.95, 1, 0.16 + 0.74 * line];
  });
  defineMaterial('item_bubble', { roughness: 0.2, alpha: 0.98, doubleSided: true, map: 'item_hex', emissive: [0.18, 0.6, 0.7], emissiveStrength: 1.2, color: [0.55, 0.92, 1] });
  await makeTexture('item_hazard', 64, (u, v) => (((u + v) * 4) % 1 < 0.5 ? [1, 0.8, 0.12, 1] : [0.12, 0.12, 0.14, 1]));
  defineMaterial('item_hazard', { roughness: 0.6, map: 'item_hazard', noVertexColor: true });
  await makeTexture('item_checker', 64, (u, v) => ((Math.floor(u * 4) + Math.floor(v * 4)) % 2 ? [0.97, 0.97, 0.95, 1] : [0.09, 0.09, 0.11, 1]));
  defineMaterial('item_checker', { roughness: 0.7, map: 'item_checker', noVertexColor: true, doubleSided: true });
  await makeTexture('item_planks', 128, (u, v) => {
    const plank = Math.floor(u * 8), f = (u * 8) % 1;
    const gap = f < 0.04 || f > 0.96 ? 0.55 : 1;
    const k = (0.82 + 0.12 * Math.sin((v * 5 + plank * 1.7) * 6.283) * 0.5 + 0.08 * ((plank * 37) % 5) / 5) * gap;
    return [k, k * 0.97, k * 0.92, 1];
  });
  defineMaterial('item_planks', { roughness: 0.8, map: 'item_planks' });
  // letreiro KART LEGENDS (glifos próprios)
  const t = textPaths('KART LEGENDS', 0, 0, 5, '');
  const x0 = (800 - t.width) / 2;
  const mk = (attrs: string): string => textPaths('KART LEGENDS', x0, 10, 5, attrs).svg;
  const sign = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="100" viewBox="0 0 800 100">
    <rect width="800" height="100" fill="#1d2a4d"/>
    <rect x="6" y="6" width="788" height="88" rx="10" fill="none" stroke="#ffd23f" stroke-width="5"/>
    ${mk('fill="none" stroke="#0c1226" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"')}
    ${mk('fill="none" stroke="#ffd23f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"')}
    ${mk('fill="none" stroke="#fff8dc" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"')}
  </svg>`;
  await svgTexture('item_sign', sign, 512, 90);
  defineMaterial('item_sign', { roughness: 0.6, map: 'item_sign', noVertexColor: true });
  for (const [n, bg, fg] of [[1, '#f2c230', '#5a3d00'], [2, '#cfd6e0', '#2f3a4a'], [3, '#cf8a4a', '#4a2408']] as [number, string, string][]) {
    const d = textPaths(String(n), 37, 20, 5.4, `fill="none" stroke="${fg}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"`).svg;
    await svgTexture(`item_rank${n}`, `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="${bg}"/><circle cx="64" cy="64" r="56" fill="none" stroke="${fg}" stroke-width="4" opacity="0.5"/>${d}</svg>`, 128, 88);
    defineMaterial(`item_rank${n}`, { roughness: 0.5, map: `item_rank${n}`, noVertexColor: true });
  }
}
