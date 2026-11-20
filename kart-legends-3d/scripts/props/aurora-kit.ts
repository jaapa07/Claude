/**
 * Kit de modelagem compartilhado pelas bibliotecas de cenário da Copa Aurora
 * (porto.ts, bosque.ts, vale.ts, canion.ts, corrida.ts).
 * Convenções: metros, origem no chão, frente = +Z. Todo `build` termina com `fin(m)`,
 * que gera UVs triplanares em escala de mundo para os materiais texturizados `aur_*`.
 */
import { Model, THREE, box, col, cyl, flat, ico, lathe, mix, paint, tube, warp, xf, type ColorLike, type V3, type Xf } from '../lib/geo';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Rand = () => number;
export type Geo = THREE.BufferGeometry;
export type P2 = [number, number];

export const rr = (rand: Rand, a: number, b: number): number => a + (b - a) * rand();
export const pick = <T>(rand: Rand, list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(rand() * list.length))]!;
export const TAU = Math.PI * 2;

const SHADOW = '#2c2046';
const LIGHT = '#fff3d2';
export const dark = (c: ColorLike, k = 0.25): THREE.Color => mix(c, SHADOW, k);
export const lite = (c: ColorLike, k = 0.25): THREE.Color => mix(c, LIGHT, k);

/** Varia sutilmente matiz/saturação/luminosidade de uma cor. */
export function jit(c: ColorLike, rand: Rand, h = 0.012, s = 0.05, l = 0.035): THREE.Color {
  const k = col(c).clone();
  k.offsetHSL((rand() - 0.5) * 2 * h, (rand() - 0.5) * 2 * s, (rand() - 0.5) * 2 * l);
  return k;
}

/* ---------- ruído 3D ---------- */
function h3(i: number, j: number, k: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
export function n3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const sm = (t: number): number => t * t * (3 - 2 * t);
  const fx = sm(x - xi), fy = sm(y - yi), fz = sm(z - zi);
  const l = (a: number, b: number, t: number): number => a + (b - a) * t;
  return l(
    l(l(h3(xi, yi, zi), h3(xi + 1, yi, zi), fx), l(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), fx), fy),
    l(l(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), fx), l(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), fx), fy),
    fz,
  );
}
export function fbm3(x: number, y: number, z: number, oct = 3): number {
  let s = 0, a = 0.5, n = 0;
  for (let o = 0; o < oct; o++) { s += a * n3(x, y, z); n += a; a *= 0.5; x *= 2.03; y *= 2.03; z *= 2.03; }
  return s / n;
}

/* ---------- cor ---------- */
/** Pinta com degradê vertical (sombra arroxeada embaixo, luz quente em cima) + leve realce nas faces voltadas para cima. */
export function tone(geo: Geo, c: ColorLike, amt = 0.18, top?: ColorLike): Geo {
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  const y0 = b.min.y, h = Math.max(b.max.y - b.min.y, 1e-4);
  const lo = dark(c, amt);
  const hi = top !== undefined ? col(top) : lite(c, amt * 0.55);
  return paint(geo, (p, n) => mix(lo, hi, (p.y - y0) / h).multiplyScalar(1 + n.y * 0.07));
}

/** Pinta por triângulo (cor única por face, a partir do centroide): faixas nítidas em malhas facetadas. */
export function paintTri(geo: Geo, fn: (c: THREE.Vector3) => ColorLike): Geo {
  const g = paint(geo, '#ffffff');
  const pos = g.getAttribute('position'), colr = g.getAttribute('color');
  const c = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.add(p.fromBufferAttribute(pos, i + k));
    const k2 = col(fn(c.multiplyScalar(1 / 3)));
    for (let k = 0; k < 3; k++) colr.setXYZ(i + k, k2.r, k2.g, k2.b);
  }
  return g;
}

/** Adiciona uma peça transformada e tonalizada com `tone`. */
export function put(m: Model, geo: Geo, mat: string, c: ColorLike, x?: Xf, amt?: number, top?: ColorLike): void {
  m.add(tone(x ? xf(geo, x) : geo, c, amt, top), mat);
}

/** Pinta por faixas horizontais com ruído (estratos de rocha). `bands` = cores de baixo para cima. */
export function strata(geo: Geo, bands: ColorLike[], y0: number, y1: number, seed = 0, wob = 0.6): Geo {
  const cs = bands.map((b) => col(b));
  return paint(geo, (p, n) => {
    const t = (p.y - y0) / (y1 - y0) + (n3(p.x * 0.15 + seed, p.y * 0.1, p.z * 0.15) - 0.5) * wob / bands.length;
    const f = Math.min(cs.length - 1.001, Math.max(0, t * (cs.length - 1)));
    const i = Math.floor(f);
    const k = f - i;
    const e = k < 0.35 ? 0 : k > 0.65 ? 1 : (k - 0.35) / 0.3;
    return mix(cs[i]!, cs[i + 1]!, e).multiplyScalar(0.9 + 0.1 * n.y + 0.08 * (n3(p.x * 0.6, p.y * 0.6 + seed, p.z * 0.6) - 0.5));
  });
}

/* ---------- UVs ---------- */
const TRI: Record<string, { size: number; grain?: boolean }> = {
  aur_plaster: { size: 3 },
  aur_stone: { size: 2.4 },
  aur_block: { size: 2.4 },
  aur_wood: { size: 1.6, grain: true },
  aur_bark: { size: 3.2, grain: true },
  aur_rock: { size: 6 },
  aur_foliage: { size: 4 },
  aur_sand: { size: 5 },
  aur_hay: { size: 1.4, grain: true },
  aur_cloth: { size: 0.8 },
  aur_metal: { size: 1.5 },
};

/** Finaliza o modelo: UV triplanar por triângulo (em metros) nos materiais texturizados. */
export function fin(m: Model): Model {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (const part of m.parts) {
    const cfg = TRI[part.mat];
    if (!cfg) continue;
    const g = part.geo;
    const pos = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    g.computeBoundingBox();
    const sz = g.boundingBox!.getSize(new THREE.Vector3()).toArray();
    const L = sz[0]! >= sz[1]! && sz[0]! >= sz[2]! ? 0 : sz[1]! >= sz[2]! ? 1 : 2;
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      n.copy(b).sub(a).cross(c.clone().sub(a));
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      const D = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2;
      let iu = D === 0 ? 2 : 0;
      let iv = D === 1 ? 2 : 1;
      if (cfg.grain && iv === L) { const t = iu; iu = iv; iv = t; }
      for (let k = 0; k < 3; k++) {
        const p = k === 0 ? a : k === 1 ? b : c;
        uv.setXY(i + k, p.getComponent(iu) / cfg.size, p.getComponent(iv) / cfg.size);
      }
    }
  }
  return m;
}

export function uvMul(geo: Geo, su: number, sv: number, flipV = false): Geo {
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, (flipV ? 1 - uv.getY(i) : uv.getY(i)) * sv);
  return geo;
}

/* ---------- geometria ---------- */
/** Caixa chanfrada barata (108 triângulos). */
export const cbox = (w: number, h: number, d: number, b = 0.06): Geo => box(w, h, d, b, 1);

class Quads {
  pos: number[] = [];
  uv: number[] = [];
  private a = new THREE.Vector3(); private b = new THREE.Vector3(); private n = new THREE.Vector3();
  /** Quad a,b,c,d orientado para `hint` (inverte a ordem se preciso). uvs na mesma ordem. */
  quad(p: V3[], uv: P2[], hint: V3): void {
    this.a.set(p[1]![0] - p[0]![0], p[1]![1] - p[0]![1], p[1]![2] - p[0]![2]);
    this.b.set(p[2]![0] - p[0]![0], p[2]![1] - p[0]![1], p[2]![2] - p[0]![2]);
    this.n.crossVectors(this.a, this.b);
    if (this.n.lengthSq() < 1e-12) {
      this.b.set(p[3]![0] - p[0]![0], p[3]![1] - p[0]![1], p[3]![2] - p[0]![2]);
      this.n.crossVectors(this.a, this.b);
    }
    const flip = this.n.x * hint[0] + this.n.y * hint[1] + this.n.z * hint[2] < 0;
    const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const i of order) { this.pos.push(...p[i]!); this.uv.push(...uv[i]!); }
  }
  geo(smooth = true): Geo {
    let g: Geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.uv), 2));
    if (smooth) { g = mergeVertices(g, 1e-4); g.computeVertexNormals(); g = g.toNonIndexed(); } else g.computeVertexNormals();
    return g;
  }
}

/**
 * Laje extrudada ao longo de Z a partir de um perfil no plano XY (x crescente), com espessura.
 * UV: u = z/tile, v = distância ao ponto mais alto do perfil / tile (telhas "descem" a água do telhado).
 */
export function slab(prof: P2[], thick: number, depth: number, tile = 1.6): Geo {
  const q = new Quads();
  const n = prof.length;
  const bot: P2[] = prof.map((p, i) => {
    const a = prof[Math.max(0, i - 1)]!, b = prof[Math.min(n - 1, i + 1)]!;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dy / l) * thick, p[1] - (dx / l) * thick];
  });
  const s: number[] = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1]! + Math.hypot(prof[i]![0] - prof[i - 1]![0], prof[i]![1] - prof[i - 1]![1]));
  let apex = 0;
  for (let i = 1; i < n; i++) if (prof[i]![1] > prof[apex]![1]) apex = i;
  const v = s.map((x) => Math.abs(x - s[apex]!) / tile);
  const z0 = depth / 2, z1 = -depth / 2;
  for (let i = 0; i < n - 1; i++) {
    const a = prof[i]!, b = prof[i + 1]!, c = bot[i]!, d = bot[i + 1]!;
    const nx = -(b[1] - a[1]), ny = b[0] - a[0];
    q.quad([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], [[z0 / tile, v[i]!], [z0 / tile, v[i + 1]!], [z1 / tile, v[i + 1]!], [z1 / tile, v[i]!]], [nx, ny, 0]);
    q.quad([[c[0], c[1], z0], [d[0], d[1], z0], [d[0], d[1], z1], [c[0], c[1], z1]], [[0.02, 0.02], [0.04, 0.02], [0.04, 0.04], [0.02, 0.04]], [-nx, -ny, 0]);
    q.quad([[a[0], a[1], z0], [b[0], b[1], z0], [d[0], d[1], z0], [c[0], c[1], z0]], [[0.1, 0.02], [0.2, 0.02], [0.2, 0.06], [0.1, 0.06]], [0, 0, 1]);
    q.quad([[a[0], a[1], z1], [b[0], b[1], z1], [d[0], d[1], z1], [c[0], c[1], z1]], [[0.1, 0.02], [0.2, 0.02], [0.2, 0.06], [0.1, 0.06]], [0, 0, -1]);
  }
  for (const i of [0, n - 1]) {
    const a = prof[i]!, c = bot[i]!;
    q.quad([[a[0], a[1], z0], [a[0], a[1], z1], [c[0], c[1], z1], [c[0], c[1], z0]], [[0.1, 0.02], [0.2, 0.02], [0.2, 0.06], [0.1, 0.06]], [i === 0 ? -1 : 1, -0.2, 0]);
  }
  return q.geo(true);
}

/** Perfil de telhado de duas águas com curvatura côncava (beiral que "levanta"). */
export function gableProf(hw: number, h: number, p = 1.5, n = 6): P2[] {
  const out: P2[] = [];
  for (let i = -n; i <= n; i++) {
    const t = Math.abs(i) / n;
    out.push([(i / n) * hw, h * Math.pow(1 - t, p)]);
  }
  return out;
}

/** Perfil em arco (meia-elipse) de x=-hw a +hw, base em y=0, topo em y=h. */
export function archProf(hw: number, h: number, n = 10): P2[] {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (1 - i / n);
    out.push([Math.cos(a) * hw, Math.sin(a) * h]);
  }
  return out;
}

/** Telhado cônico/"chapéu de bruxa" por revolução. `seg`=4 gera pirâmide (gire π/4). UV em telhas. */
export function coneRoof(R: number, h: number, p = 1.5, seg = 12, n = 5, tile = 1.6): Geo {
  const prof: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n; prof.push([Math.max(0.001, R * Math.pow(1 - t, p)), h * t]); }
  const g = lathe(prof, seg);
  uvMul(g, Math.max(2, Math.round((TAU * R * 0.7) / tile)), Math.hypot(R, h) / tile, true);
  return g;
}

/**
 * Superfície por anéis: `f(t, ang, j)` devolve o ponto do anel em t∈[0,1] e ângulo ang.
 * Normais suaves; tampas opcionais (leque ao centroide do anel).
 */
export function loft(n: number, k: number, f: (t: number, ang: number) => V3, capTop = true, capBottom = false, smooth = true): Geo {
  const q = new Quads();
  const ring = (i: number): V3[] => Array.from({ length: k }, (_, j) => f(i / n, (j / k) * TAU));
  let prev = ring(0);
  const first = prev;
  const ctr = (r: V3[]): V3 => [r.reduce((s, p) => s + p[0], 0) / k, r.reduce((s, p) => s + p[1], 0) / k, r.reduce((s, p) => s + p[2], 0) / k];
  for (let i = 1; i <= n; i++) {
    const cur = ring(i);
    const c0 = ctr(prev);
    for (let j = 0; j < k; j++) {
      const j2 = (j + 1) % k;
      const a = prev[j]!, b = prev[j2]!, c = cur[j2]!, d = cur[j]!;
      const mx = (a[0] + b[0]) / 2 - c0[0], my = (a[1] + b[1]) / 2 - c0[1], mz = (a[2] + b[2]) / 2 - c0[2];
      q.quad([a, b, c, d], [[j / k, (i - 1) / n], [(j + 1) / k, (i - 1) / n], [(j + 1) / k, i / n], [j / k, i / n]], [mx, my, mz]);
    }
    prev = cur;
  }
  const cap = (r: V3[], up: number): void => {
    const c = ctr(r);
    for (let j = 0; j < k; j++) q.quad([c, r[j]!, r[(j + 1) % k]!, c], [[0.5, 0.5], [0, 0], [1, 0], [0.5, 0.5]], [0, up, 0]);
  };
  if (capTop) cap(prev, 1);
  if (capBottom) cap(first, -1);
  const g = q.geo(smooth);
  return dropDegenerate(g);
}

/** Prisma em Z de um contorno XY "estrelado" em relação ao seu ponto médio inferior (empenas, frontões). Com laterais. */
export function prism(outline: P2[], depth: number): Geo {
  const q = new Quads();
  const n = outline.length;
  const cx = outline.reduce((s, o) => s + o[0], 0) / n;
  const cy = Math.min(...outline.map((o) => o[1])) + 0.001;
  const z0 = depth / 2, z1 = -depth / 2;
  for (let i = 0; i < n; i++) {
    const a = outline[i]!, b = outline[(i + 1) % n]!;
    q.quad([[cx, cy, z0], [a[0], a[1], z0], [b[0], b[1], z0], [cx, cy, z0]], [[0, 0], [0, 0], [0, 0], [0, 0]], [0, 0, 1]);
    q.quad([[cx, cy, z1], [a[0], a[1], z1], [b[0], b[1], z1], [cx, cy, z1]], [[0, 0], [0, 0], [0, 0], [0, 0]], [0, 0, -1]);
    q.quad([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], [[0, 0], [0, 0], [0, 0], [0, 0]], [(a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy - 0.5, 0]);
  }
  return dropDegenerate(q.geo(false));
}

/**
 * Parede com vão em arco (abertura |x| < hw, livre até `spring`, arco de flecha `rise` acima).
 * Devolve o anel de aduelas e o enchimento (tímpano) até `topY`, ambos com profundidade `depth` em Z.
 */
export function archWall(hw: number, spring: number, rise: number, ring: number, topY: number, depth: number, n = 12): { ring: Geo; fill: Geo } {
  const outer = archProf(hw + ring, rise + ring, n).map(([x, y]) => [x, y + spring] as P2);
  const parts: Geo[] = [];
  for (let i = 0; i < n; i++) {
    const a = outer[i]!, b = outer[i + 1]!;
    parts.push(prism([[a[0], a[1] - 0.05], [b[0], b[1] - 0.05], [b[0], topY], [a[0], topY]], depth));
  }
  return { ring: slab(outer, ring, depth + 0.3, 2.4), fill: mergeGeometries(parts, false)! };
}

function dropDegenerate(g: Geo): Geo {
  const pos = g.getAttribute('position');
  const keep: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-12) keep.push(i, i + 1, i + 2);
  }
  if (keep.length === pos.count) return g;
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(g.attributes)) {
    const src = g.getAttribute(name);
    const arr = new Float32Array(keep.length * src.itemSize);
    keep.forEach((vi, o) => { for (let e = 0; e < src.itemSize; e++) arr[o * src.itemSize + e] = src.getComponent(vi, e); });
    out.setAttribute(name, new THREE.BufferAttribute(arr, src.itemSize));
  }
  return out;
}

/** Volume orgânico (icosaedro deformado por ruído). `facet` = sombreamento lapidado. */
export function blob(r: number, detail: number, seed: number, amp = 0.22, freq = 1.3, sq: V3 = [1, 1, 1], facet = true): Geo {
  const g0 = ico(1, detail);
  g0.deleteAttribute('uv');
  const g = warp(g0, (p) => {
    const n = fbm3(p.x * freq + seed * 7.13, p.y * freq + seed * 3.7, p.z * freq - seed * 5.1);
    p.multiplyScalar(r * (1 + (n - 0.5) * 2 * amp));
    p.set(p.x * sq[0], p.y * sq[1], p.z * sq[2]);
  });
  return facet ? flat(g) : g.toNonIndexed();
}

/** Viga (caixa) entre dois pontos. */
export function beam(a: V3, b: V3, w: number, d = w, bevel = 0): Geo {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = bevel > 0 ? cbox(w, len, d, bevel) : box(w, len, d);
  const qn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), qn, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** Cilindro entre dois pontos. */
export function rod(a: V3, b: V3, r: number, seg = 6, r2 = r): Geo {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const g = cyl(r2, r, va.distanceTo(vb), seg);
  const qn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), qn, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** Pontos de uma corda/fio com barriga (parábola). */
export function sagPts(a: V3, b: V3, sag: number, n = 8): V3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t] as V3;
  });
}
export function rope(a: V3, b: V3, sag: number, r = 0.035, n = 8, radial = 4): Geo {
  return tube(sagPts(a, b, sag, n), r, n, radial);
}

/** Geometria a partir de triângulos soltos (posições e, opcionalmente, UVs). */
export function rawGeo(pos: number[], uv?: number[]): Geo {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  if (uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.computeVertexNormals();
  return g;
}

/** Vela/pano triangular com barriga (deslocada em X). */
export function triSail(a: V3, b: V3, c: V3, belly: number, n = 5): Geo {
  const pos: number[] = [];
  const pt = (i: number, j: number): V3 => {
    const u = i / n, v = j / n, w = 1 - u - v;
    const k = 27 * u * v * w * belly;
    return [a[0] * w + b[0] * u + c[0] * v + k, a[1] * w + b[1] * u + c[1] * v, a[2] * w + b[2] * u + c[2] * v];
  };
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
    pos.push(...pt(i, j), ...pt(i + 1, j), ...pt(i, j + 1));
    if (j < n - i - 1) pos.push(...pt(i + 1, j), ...pt(i + 1, j + 1), ...pt(i, j + 1));
  }
  return rawGeo(pos);
}

/** Fita ao longo de um caminho (folhas, frondes, faixas): largura w(t) na direção `side`; `fold` dobra o centro (em V). */
export function strip(pts: V3[], w: (t: number) => number, side: V3, fold = 0): Geo {
  const pos: number[] = [];
  const n = pts.length - 1;
  const P = (i: number, k: number): V3 => {
    const p = pts[i]!, ww = w(i / n) * k;
    return [p[0] + side[0] * ww, p[1] + side[1] * ww + Math.abs(k) * fold * w(i / n), p[2] + side[2] * ww];
  };
  for (let i = 0; i < n; i++) for (const [k0, k1] of [[-1, 0], [0, 1]] as const) {
    const a = P(i, k0), b = P(i, k1), c = P(i + 1, k1), d = P(i + 1, k0);
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  return dropDegenerate(rawGeo(pos));
}

/**
 * Casca de túnel/arco natural: perfil interno fixo (lista de pontos XY, da base esquerda à base direita) e
 * perfil externo por fatia z (`outer(i, zi)` para o i-ésimo ponto). Fecha frente, fundo e pés.
 */
export function shell(inner: P2[], outer: (i: number, zi: number) => P2, zs: number[], facet = true): Geo {
  const q = new Quads();
  const n = inner.length;
  const U: P2[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (let s = 0; s < zs.length - 1; s++) {
    const z0 = zs[s]!, z1 = zs[s + 1]!;
    for (let i = 0; i < n - 1; i++) {
      const a = outer(i, s), b = outer(i + 1, s), c = outer(i + 1, s + 1), d = outer(i, s + 1);
      const ia = inner[i]!, ib = inner[i + 1]!;
      const mx = (a[0] + b[0]) / 2 - (ia[0] + ib[0]) / 2, my = (a[1] + b[1]) / 2 - (ia[1] + ib[1]) / 2;
      q.quad([[a[0], a[1], z0], [b[0], b[1], z0], [c[0], c[1], z1], [d[0], d[1], z1]], U, [mx, my + 0.01, 0]);
      q.quad([[ia[0], ia[1], z0], [ib[0], ib[1], z0], [ib[0], ib[1], z1], [ia[0], ia[1], z1]], U, [-mx, -my - 0.01, 0]);
    }
  }
  for (const [s, dir] of [[0, 1], [zs.length - 1, -1]] as const) {
    const z = zs[s]!;
    const sgn = zs[0]! > zs[zs.length - 1]! ? dir : -dir;
    for (let i = 0; i < n - 1; i++) {
      const a = outer(i, s), b = outer(i + 1, s), ia = inner[i]!, ib = inner[i + 1]!;
      q.quad([[a[0], a[1], z], [b[0], b[1], z], [ib[0], ib[1], z], [ia[0], ia[1], z]], U, [0, 0, sgn]);
    }
  }
  return dropDegenerate(q.geo(!facet));
}

/** Perfil interno padrão de vão: pés verticais até `spring` e arco de flecha `rise` (n segmentos). */
export function openingProf(hw: number, spring: number, rise: number, n = 10): P2[] {
  const out: P2[] = [[-hw, -0.1], [-hw, spring * 0.5]];
  for (const [x, y] of archProf(hw, rise, n)) out.push([x, y + spring]);
  out.push([hw, spring * 0.5], [hw, -0.1]);
  return out;
}

/** Relevo em disco (dunas, montes): grade polar com altura h(x,z); borda no chão. Normais suaves. */
export function heightDisc(R: number, rings: number, k: number, h: (x: number, z: number) => number, squash: P2 = [1, 1]): Geo {
  const pos: number[] = [];
  const P = (i: number, j: number): V3 => {
    const r = (i / rings) * R, a = (j / k) * TAU;
    const x = Math.cos(a) * r * squash[0], z = Math.sin(a) * r * squash[1];
    return [x, i === rings ? -0.05 : h(x, z), z];
  };
  for (let i = 0; i < rings; i++) for (let j = 0; j < k; j++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
    pos.push(...a, ...c, ...b);
    if (i > 0) pos.push(...a, ...d, ...c);
  }
  let g: Geo = rawGeo(pos);
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

/** Plano texturizado voltado para +Z com a imagem em pé no glTF (v invertido); `mirror` espelha em X. */
export function signPlane(w: number, h: number, mirror = false): Geo {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, mirror ? 1 - uv.getX(i) : uv.getX(i), 1 - uv.getY(i));
  return g;
}

/* ---------- peças de arquitetura ---------- */
export interface WinOpts { arch?: boolean; shutters?: ColorLike; frame?: ColorLike; lit?: boolean; sill?: boolean; box?: ColorLike; bars?: [number, number]; glow?: string }

/** Janela com caixilho, vidro luminoso, travessas, peitoril, venezianas e floreira. Centro na origem, voltada para +Z. */
export function win(w: number, h: number, o: WinOpts = {}): Model {
  const m = new Model();
  const fc = o.frame ?? '#f6ead2';
  const lit = o.lit ?? true;
  const gm = lit ? (o.glow ?? 'glow_warm') : 'glossy';
  const paneTop = lit ? '#fff0b8' : '#5a7396';
  const paneLo = lit ? '#ffb45e' : '#27344f';
  const t = 0.11;
  put(m, box(w + 2 * t, h + 2 * t, 0.16), 'std', fc, { p: [0, 0, 0.02] }, 0.12);
  m.add(paint(box(w, h, 0.06), (p) => mix(paneLo, paneTop, p.y / h + 0.5)), gm, undefined, { p: [0, 0, 0.09] });
  if (o.arch) {
    const a = cyl(w / 2 + t, w / 2 + t, 0.16, 10, false);
    put(m, a, 'std', fc, { p: [0, h / 2, 0.02], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.8] }, 0.1);
    m.add(cyl(w / 2, w / 2, 0.06, 10), gm, paneTop, { p: [0, h / 2, 0.09], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.8] });
  }
  const [bx, by] = o.bars ?? [1, 1];
  for (let i = 1; i <= bx; i++) put(m, box(0.06, h + (o.arch ? w * 0.4 : 0), 0.05), 'std', fc, { p: [-w / 2 + (w * i) / (bx + 1), o.arch ? w * 0.2 : 0, 0.13] }, 0.1);
  for (let i = 1; i <= by; i++) put(m, box(w, 0.06, 0.05), 'std', fc, { p: [0, -h / 2 + (h * i) / (by + 1), 0.13] }, 0.1);
  if (o.sill ?? true) put(m, box(w + 0.42, 0.12, 0.3), 'std', lite(fc, 0.1), { p: [0, -h / 2 - t - 0.04, 0.12] }, 0.15);
  if (o.shutters !== undefined) {
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 + t + w * 0.26);
      put(m, box(w * 0.5, h + 0.1, 0.07), 'aur_wood', o.shutters, { p: [x, 0, 0.05], r: [0, sx * -0.18, 0] }, 0.2);
      for (let k = 0; k < 2; k++) put(m, box(w * 0.38, h * 0.36, 0.04), 'aur_wood', dark(o.shutters, 0.22), { p: [x, -h * 0.22 + k * h * 0.44, 0.09], r: [0, sx * -0.18, 0] }, 0.05);
    }
  }
  if (o.box !== undefined) {
    put(m, cbox(w + 0.3, 0.3, 0.36, 0.04), 'aur_wood', '#7a4a2c', { p: [0, -h / 2 - 0.32, 0.3] });
    for (let i = 0; i < 4; i++) {
      const x = -w / 2 + 0.1 + (i / 3) * (w - 0.2);
      put(m, flat(ico(0.2, 0)), 'aur_foliage', i % 2 ? '#4f9a3c' : '#3f8a44', { p: [x, -h / 2 - 0.1, 0.3], s: [1.2, 0.8, 1] });
      put(m, flat(ico(0.1, 0)), 'std', o.box, { p: [x + 0.06, -h / 2 + 0.04, 0.36] }, 0.1);
    }
  }
  return m;
}

export interface DoorOpts { color?: ColorLike; frame?: ColorLike; arch?: boolean; step?: boolean; double?: boolean }

/** Porta de madeira com moldura, almofadas, maçaneta e degrau. Base na origem (y=0), voltada para +Z. */
export function door(w: number, h: number, o: DoorOpts = {}): Model {
  const m = new Model();
  const dc = o.color ?? '#7b4a2a';
  const fc = o.frame ?? '#f6ead2';
  put(m, box(w + 0.32, h + 0.16, 0.2), 'std', fc, { p: [0, h / 2 + 0.08, 0.02] }, 0.14);
  put(m, box(w, h, 0.1), 'aur_wood', dc, { p: [0, h / 2, 0.1] }, 0.3);
  if (o.arch) {
    put(m, cyl(w / 2 + 0.16, w / 2 + 0.16, 0.2, 12), 'std', fc, { p: [0, h, 0.02], r: [Math.PI / 2, 0, 0] }, 0.1);
    put(m, cyl(w / 2, w / 2, 0.1, 12), 'aur_wood', dc, { p: [0, h, 0.1], r: [Math.PI / 2, 0, 0] }, 0.1);
  }
  const leaves = o.double ? 2 : 1;
  for (let l = 0; l < leaves; l++) {
    const lw = w / leaves;
    const cx = -w / 2 + lw * (l + 0.5);
    for (let r = 0; r < 2; r++) put(m, box(lw - 0.28, h * (r ? 0.36 : 0.3), 0.04), 'aur_wood', lite(dc, 0.18), { p: [cx, h * (r ? 0.7 : 0.26), 0.16] }, 0.2);
    if (o.double) put(m, box(0.05, h, 0.04), 'std', dark(dc, 0.5), { p: [0, h / 2, 0.155] });
    const kx = o.double ? (l ? 0.16 : -0.16) : w / 2 - 0.18;
    put(m, flat(ico(0.07, 0)), 'metal', '#e8c267', { p: [kx, h * 0.48, 0.2] });
  }
  if (o.step ?? true) put(m, cbox(w + 0.7, 0.2, 0.6, 0.04), 'aur_stone', '#b9ad9c', { p: [0, 0.06, 0.32] });
  return m;
}

/** Cores de lanterna de papel → material emissivo colorido (definidos em textures-aurora.ts). */
export const LANTERN_MATS: Record<string, string> = { '#ff7a3c': 'aur_lant_laranja', '#ffb23c': 'aur_lant_ambar', '#ff5a5a': 'aur_lant_vermelha', '#ffd34a': 'aur_lant_amarela', '#ff8fb0': 'aur_lant_rosa' };

/** Lanterna de papel luminosa: topo (ponto de suspensão) na origem; pende para −Y. */
export function paperLantern(r: number, color: ColorLike, glowMat?: string, seg = 8): Model {
  const m = new Model();
  const glow = glowMat ?? (typeof color === 'string' ? LANTERN_MATS[color] : undefined) ?? 'glow_warm';
  const h = r * 2.3;
  const prof: P2[] = [];
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI; prof.push([Math.max(0.4 * r, Math.sin(a) * r), -r * 0.3 - h / 2 - Math.cos(a) * (h / 2)]); }
  const body = lathe(prof, seg);
  m.add(paint(flat(body), (p) => mix(dark(color, 0.1), lite(color, 0.35), 1 - Math.abs((p.y + r * 0.3 + h / 2) / (h / 2)))), glow);
  put(m, cyl(r * 0.42, r * 0.42, r * 0.22, 6), 'std', '#3a2a22', { p: [0, -r * 0.2, 0] });
  put(m, cyl(r * 0.42, r * 0.42, r * 0.22, 6), 'std', '#3a2a22', { p: [0, -r * 0.3 - h, 0] });
  put(m, box(0.03, r * 0.9, 0.03), 'std', '#c8402c', { p: [0, -r * 0.4 - h - r * 0.45, 0] });
  put(m, box(0.02, r * 0.25, 0.02), 'std', '#3a2a22', { p: [0, -r * 0.05, 0] });
  return m;
}

/** Toldo listrado: borda superior na origem (parede em z=0), projeta `out` para +Z e cai `drop`. */
export function awning(w: number, out: number, drop: number, c1: ColorLike, c2: ColorLike, stripes = 6): Model {
  const m = new Model();
  const sw = w / stripes;
  const prof: P2[] = [[0, 0], [out * 0.5, -drop * 0.42], [out, -drop]];
  for (let i = 0; i < stripes; i++) {
    const c = i % 2 ? c2 : c1;
    const g = slab(prof, 0.05, sw, 1);
    g.rotateY(-Math.PI / 2);
    put(m, g, 'aur_cloth', c, { p: [-w / 2 + sw * (i + 0.5), 0, 0] }, 0.18);
    put(m, box(sw, 0.28, 0.04), 'aur_cloth', c, { p: [-w / 2 + sw * (i + 0.5), -drop - 0.12, out] }, 0.2);
  }
  return m;
}

/** Barril de madeira com aros. Base na origem. */
export function barrel(r: number, h: number, wood: ColorLike = '#9a6336', hoop: ColorLike = '#4a4a55'): Model {
  const m = new Model();
  const g = flat(lathe([[r * 0.01, 0], [r * 0.8, 0], [r * 0.95, h * 0.2], [r, h * 0.5], [r * 0.95, h * 0.8], [r * 0.8, h], [r * 0.68, h], [r * 0.66, h * 0.94], [0.01, h * 0.94]], 10));
  put(m, g, 'aur_bark', wood, undefined, 0.28);
  for (const t of [0.2, 0.8]) put(m, cyl(r * 0.965, r * 0.965, h * 0.07, 10, true), 'metal', hoop, { p: [0, h * t, 0] }, 0.1);
  return m;
}

/** Caixote de madeira com ripas e travessa diagonal. Base na origem. */
export function crate(s: number, wood: ColorLike = '#b98a52'): Model {
  const m = new Model();
  put(m, box(s * 0.92, s * 0.92, s * 0.92), 'aur_wood', dark(wood, 0.18), { p: [0, s / 2, 0] }, 0.25);
  const e = s * 0.1;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(m, box(e, s, e), 'aur_wood', wood, { p: [sx * (s - e) / 2, s / 2, sz * (s - e) / 2] }, 0.2);
  for (const sy of [0, 1]) for (const sz of [-1, 1]) put(m, box(s, e, e), 'aur_wood', wood, { p: [0, e / 2 + sy * (s - e), sz * (s - e) / 2] }, 0.1);
  for (const sy of [0, 1]) for (const sx of [-1, 1]) put(m, box(e, e, s), 'aur_wood', wood, { p: [sx * (s - e) / 2, e / 2 + sy * (s - e), 0] }, 0.1);
  for (const sz of [-1, 1]) put(m, beam([-s / 2 + e, e, sz * (s - e * 0.6) / 2], [s / 2 - e, s - e, sz * (s - e * 0.6) / 2], e * 0.9, e * 0.5), 'aur_wood', lite(wood, 0.1), undefined, 0.15);
  return m;
}

/** Tufo de folhagem lapidado com degradê (escuro embaixo, claro em cima). */
export function leafBlob(m: Model, r: number, p: V3, c: ColorLike, seed: number, detail = 1, sq: V3 = [1, 0.8, 1], top?: ColorLike, amp = 0.25): void {
  const g = blob(r, detail, seed, amp, 1.4, sq);
  g.translate(p[0], p[1], p[2]);
  m.add(tone(g, c, 0.42, top ?? lite(c, 0.38)), 'aur_foliage');
}

/** Pedra lapidada. */
export function rockGeo(r: number, seed: number, sq: V3 = [1, 0.7, 1], detail = 1, amp = 0.3): Geo {
  return blob(r, detail, seed, amp, 1.1, sq);
}

export { Model, THREE, box, col, cyl, flat, ico, lathe, mix, paint, tube, warp, xf };
export type { ColorLike, V3, Xf };
