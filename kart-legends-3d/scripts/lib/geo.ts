/**
 * Ferramentas de modelagem usadas pelos scripts de autoria de assets.
 * Toda geometria sai com position, normal, uv e color (cor de vértice linear), sem índice,
 * para poder ser unida por material antes da exportação para GLB.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export { THREE };
export type V3 = [number, number, number];
export type ColorLike = string | number | THREE.Color;
export type ColorFn = (p: THREE.Vector3, n: THREE.Vector3) => ColorLike;

export function col(c: ColorLike): THREE.Color {
  return c instanceof THREE.Color ? c : new THREE.Color(c as THREE.ColorRepresentation);
}
export function mix(a: ColorLike, b: ColorLike, t: number): THREE.Color {
  return col(a).clone().lerp(col(b), Math.min(1, Math.max(0, t)));
}

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Xf { p?: V3; r?: V3; s?: V3 | number }

export function matrixOf(x: Xf = {}): THREE.Matrix4 {
  const s = typeof x.s === 'number' ? new THREE.Vector3(x.s, x.s, x.s) : new THREE.Vector3(...(x.s ?? [1, 1, 1]));
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(x.r ?? [0, 0, 0]), 'XYZ'));
  return new THREE.Matrix4().compose(new THREE.Vector3(...(x.p ?? [0, 0, 0])), q, s);
}

/** Normaliza: sem índice, com uv e normal. */
export function norm(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) {
    const n = g.getAttribute('position').count;
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  for (const name of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv', 'color', 'skinIndex', 'skinWeight'].includes(name)) g.deleteAttribute(name);
  }
  g = g.clone();
  g.morphAttributes = {};
  return g;
}

/** Pinta a geometria com uma cor única ou com uma função (posição, normal) → cor. */
export function paint(geo: THREE.BufferGeometry, c: ColorLike | ColorFn): THREE.BufferGeometry {
  const g = norm(geo);
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const arr = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const fixed = typeof c === 'function' ? null : col(c);
  for (let i = 0; i < pos.count; i++) {
    let cc = fixed;
    if (!cc) {
      p.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(nor, i);
      cc = col((c as ColorFn)(p, n));
    }
    arr[i * 3] = cc.r; arr[i * 3 + 1] = cc.g; arr[i * 3 + 2] = cc.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Degradê vertical entre duas cores (útil para sombreado "pintado à mão"). */
export function gradY(a: ColorLike, b: ColorLike, y0: number, y1: number): ColorFn {
  return (p) => mix(a, b, (p.y - y0) / (y1 - y0 || 1));
}

export function xf(geo: THREE.BufferGeometry, x: Xf): THREE.BufferGeometry {
  const g = geo.clone();
  g.applyMatrix4(matrixOf(x));
  return g;
}

/** Sombreamento facetado (estilo low-poly lapidado). */
export function flat(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.computeVertexNormals();
  return g;
}

/** Deforma os vértices com uma função (use antes de `paint`). Recalcula normais. */
export function warp(geo: THREE.BufferGeometry, fn: (p: THREE.Vector3) => void, smooth = true): THREE.BufferGeometry {
  let g = geo.clone();
  const pos = g.getAttribute('position');
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    fn(p);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  if (smooth && !g.index) g = mergeVertices(g);
  g.computeVertexNormals();
  return g;
}

/* ---------- primitivas ---------- */
export const box = (w: number, h: number, d: number, bevel = 0, seg = 3): THREE.BufferGeometry =>
  bevel > 0 ? new RoundedBoxGeometry(w, h, d, seg, Math.min(bevel, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
export const sphere = (r: number, ws = 20, hs = 14): THREE.BufferGeometry => new THREE.SphereGeometry(r, ws, hs);
export const cyl = (rTop: number, rBottom: number, h: number, seg = 20, open = false): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open);
export const cone = (r: number, h: number, seg = 16): THREE.BufferGeometry => new THREE.ConeGeometry(r, h, seg);
export const capsule = (r: number, len: number, seg = 14): THREE.BufferGeometry => new THREE.CapsuleGeometry(r, len, 6, seg);
export const torus = (r: number, tube: number, rs = 10, ts = 28, arc = Math.PI * 2): THREE.BufferGeometry =>
  new THREE.TorusGeometry(r, tube, rs, ts, arc);
export const ico = (r: number, detail = 1): THREE.BufferGeometry => new THREE.IcosahedronGeometry(r, detail);
export const plane = (w: number, h: number, ws = 1, hs = 1): THREE.BufferGeometry => new THREE.PlaneGeometry(w, h, ws, hs);

/** Sólido de revolução a partir de um perfil [raio, altura][]. */
export function lathe(profile: [number, number][], seg = 24): THREE.BufferGeometry {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

/** Tubo ao longo de pontos (Catmull-Rom). `radius` pode variar ao longo de t (0..1). */
export function tube(points: V3[], radius: number | ((t: number) => number), tubular = 24, radial = 10, closed = false): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
  const g = new THREE.TubeGeometry(curve, tubular, typeof radius === 'number' ? radius : 1, radial, closed);
  if (typeof radius === 'function') {
    const pos = g.getAttribute('position');
    const p = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let i = 0; i <= tubular; i++) {
      const t = i / tubular;
      curve.getPointAt(Math.min(1, t), c);
      const r = radius(t);
      for (let j = 0; j <= radial; j++) {
        const k = i * (radial + 1) + j;
        p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
        pos.setXYZ(k, p.x, p.y, p.z);
      }
    }
    g.computeVertexNormals();
  }
  return g;
}

/** Extrusão de um contorno 2D (plano XY, profundidade em Z, centrada). */
export function extrude(outline: [number, number][], depth: number, bevel = 0, holes: [number, number][][] = []): THREE.BufferGeometry {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Contorno suave (Catmull-Rom fechado) para usar em `extrude`. */
export function smoothOutline(pts: [number, number][], samples = 48): [number, number][] {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'catmullrom', 0.5);
  return curve.getPoints(samples).slice(0, -1).map((p) => [p.x, p.y]);
}

/* ---------- modelo = lista de peças por material ---------- */
export interface Part { geo: THREE.BufferGeometry; mat: string }

export class Model {
  parts: Part[] = [];

  /** Adiciona uma peça. `color` omitido = a geometria já foi pintada com `paint`. */
  add(geo: THREE.BufferGeometry, mat = 'std', color?: ColorLike | ColorFn, x?: Xf): this {
    let g = color !== undefined || !geo.getAttribute('color') ? paint(geo, color ?? '#ffffff') : norm(geo);
    if (x) g = xf(g, x);
    this.parts.push({ geo: g, mat });
    return this;
  }

  /** Incorpora outro modelo com uma transformação. */
  addModel(other: Model, x: Xf | THREE.Matrix4 = {}): this {
    const m = x instanceof THREE.Matrix4 ? x : matrixOf(x);
    for (const part of other.parts) {
      const g = part.geo.clone();
      g.applyMatrix4(m);
      this.parts.push({ geo: g, mat: part.mat });
    }
    return this;
  }

  transform(x: Xf | THREE.Matrix4): this {
    const m = x instanceof THREE.Matrix4 ? x : matrixOf(x);
    for (const part of this.parts) part.geo.applyMatrix4(m);
    return this;
  }

  clone(): Model {
    const m = new Model();
    m.parts = this.parts.map((p) => ({ geo: p.geo.clone(), mat: p.mat }));
    return m;
  }

  bounds(): THREE.Box3 {
    const b = new THREE.Box3();
    for (const part of this.parts) {
      part.geo.computeBoundingBox();
      b.union(part.geo.boundingBox!);
    }
    return b;
  }

  triangleCount(): number {
    return this.parts.reduce((n, p) => n + p.geo.getAttribute('position').count / 3, 0);
  }

  /** Une as peças por material e reindexa (solda vértices idênticos). */
  merged(weld = true): Map<string, THREE.BufferGeometry> {
    const byMat = new Map<string, THREE.BufferGeometry[]>();
    for (const part of this.parts) {
      const list = byMat.get(part.mat) ?? [];
      list.push(part.geo);
      byMat.set(part.mat, list);
    }
    const out = new Map<string, THREE.BufferGeometry>();
    for (const [mat, list] of byMat) {
      const hasSkin = list.some((g) => g.getAttribute('skinIndex'));
      for (const g of list) {
        if (hasSkin && !g.getAttribute('skinIndex')) throw new Error(`Peça sem skin em modelo com skin (material ${mat})`);
      }
      const merged = mergeGeometries(list, false);
      if (!merged) throw new Error(`Falha ao unir geometrias do material ${mat}`);
      out.set(mat, weld ? mergeVertices(merged, 1e-4) : merged);
    }
    return out;
  }
}

/** Atribui todos os vértices a um osso (skin rígida). */
export function bindTo(geo: THREE.BufferGeometry, bone: number): THREE.BufferGeometry {
  const n = geo.getAttribute('position').count;
  const idx = new Uint16Array(n * 4);
  const w = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { idx[i * 4] = bone; w[i * 4] = 1; }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4));
  return geo;
}

/** Skin suave: `fn` devolve até 4 pares [osso, peso] por vértice (pesos são normalizados). */
export function bindWith(geo: THREE.BufferGeometry, fn: (p: THREE.Vector3) => [number, number][]): THREE.BufferGeometry {
  const pos = geo.getAttribute('position');
  const idx = new Uint16Array(pos.count * 4);
  const w = new Float32Array(pos.count * 4);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const pairs = fn(p).filter(([, ww]) => ww > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = pairs.reduce((s, [, ww]) => s + ww, 0) || 1;
    pairs.forEach(([b, ww], k) => { idx[i * 4 + k] = b; w[i * 4 + k] = ww / sum; });
  }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4));
  return geo;
}
