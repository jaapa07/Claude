/**
 * Superfícies paramétricas para modelagem de personagens: lofts por anéis, varreduras (sweeps) com
 * seção elíptica, remendos (patches) e utilitários de pintura por vértice.
 * Tudo sai sem índice, com position/normal/uv, compatível com `Model.add` de scripts/lib/geo.ts.
 */
import { THREE, col, mix, type ColorLike, type V3 } from '../lib/geo';

export type SurfFn = (u: number, v: number) => THREE.Vector3;

export interface SurfOpts {
  /** Intervalo paramétrico (padrão 0..1). */
  u0?: number; u1?: number; v0?: number; v1?: number;
  capStart?: boolean; capEnd?: boolean;
  /** Recebe o centro (u,v) de cada célula; `true` = não gera a célula. */
  skip?: (u: number, v: number) => boolean;
  flip?: boolean;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3();

/** Normal analítica (diferenças finitas) de uma superfície paramétrica. */
export function surfNormal(fn: SurfFn, u: number, v: number, flip = false): THREE.Vector3 {
  const e = 1e-3;
  const vv = Math.min(1 - e, Math.max(e, v));
  const du = _a.copy(fn(u + e, vv)).sub(fn(u - e, vv));
  const dv = _b.copy(fn(u, vv + e)).sub(fn(u, vv - e));
  const n = new THREE.Vector3().crossVectors(du, dv);
  if (n.lengthSq() < 1e-16) {
    // polo: usa a direção do eixo
    n.copy(dv).multiplyScalar(v < 0.5 ? -1 : 1);
    if (n.lengthSq() < 1e-16) n.set(0, 1, 0);
    return n.normalize();
  }
  n.normalize();
  return flip ? n.negate() : n;
}

/** Tessela uma superfície paramétrica em uma grade nu×nv. */
export function surf(fn: SurfFn, nu: number, nv: number, o: SurfOpts = {}): THREE.BufferGeometry {
  const u0 = o.u0 ?? 0, u1 = o.u1 ?? 1, v0 = o.v0 ?? 0, v1 = o.v1 ?? 1;
  const P: THREE.Vector3[][] = [], N: THREE.Vector3[][] = [];
  for (let j = 0; j <= nv; j++) {
    const v = v0 + ((v1 - v0) * j) / nv;
    const rowP: THREE.Vector3[] = [], rowN: THREE.Vector3[] = [];
    for (let i = 0; i <= nu; i++) {
      const u = u0 + ((u1 - u0) * i) / nu;
      rowP.push(fn(u, v).clone());
      rowN.push(surfNormal(fn, u, v, o.flip));
    }
    P.push(rowP); N.push(rowN);
  }
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const put = (i: number, j: number): void => {
    const p = P[j]![i]!, n = N[j]![i]!;
    pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z);
    uv.push(u0 + ((u1 - u0) * i) / nu, v0 + ((v1 - v0) * j) / nv);
  };
  const tri = (a: [number, number], b: [number, number], c: [number, number]): void => {
    const pa = P[a[1]]![a[0]]!, pb = P[b[1]]![b[0]]!, pc = P[c[1]]![c[0]]!;
    if (pa.distanceToSquared(pb) < 1e-14 || pb.distanceToSquared(pc) < 1e-14 || pa.distanceToSquared(pc) < 1e-14) return;
    if (o.flip) { put(...a); put(...c); put(...b); } else { put(...a); put(...b); put(...c); }
  };
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    if (o.skip) {
      const uc = u0 + ((u1 - u0) * (i + 0.5)) / nu, vc = v0 + ((v1 - v0) * (j + 0.5)) / nv;
      if (o.skip(uc, vc)) continue;
    }
    tri([i, j], [i + 1, j], [i + 1, j + 1]);
    tri([i, j], [i + 1, j + 1], [i, j + 1]);
  }
  const cap = (j: number, end: boolean): void => {
    const c = new THREE.Vector3();
    for (let i = 0; i < nu; i++) c.add(P[j]![i]!);
    c.multiplyScalar(1 / nu);
    const j2 = end ? j - 1 : j + 1;
    const c2 = new THREE.Vector3();
    for (let i = 0; i < nu; i++) c2.add(P[j2]![i]!);
    c2.multiplyScalar(1 / nu);
    const n = c.clone().sub(c2).normalize();
    for (let i = 0; i < nu; i++) {
      const a = P[j]![i]!, b = P[j]![i + 1]!;
      const order = end !== !!o.flip ? [c, a, b] : [c, b, a];
      for (const p of order) { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uv.push(0.5, end ? 1 : 0); }
    }
  };
  if (o.capStart) cap(0, false);
  if (o.capEnd) cap(nv, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/* ---------- loft por anéis horizontais ---------- */
export interface Ring {
  y: number; rx: number; rz: number;
  /** Deslocamento do centro. */
  z?: number; x?: number;
  /** Expoente de superelipse (2 = elipse, >2 = mais quadrado). */
  e?: number;
  /** Raio da metade de trás (−Z), se diferente de rz. */
  rb?: number;
}

function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Interpola a tabela de anéis (Catmull-Rom) em v ∈ [0,1]. */
export function ringAt(rings: Ring[], v: number): Required<Ring> {
  const n = rings.length - 1;
  const f = Math.min(n, Math.max(0, v * n));
  const i = Math.min(n - 1, Math.floor(f)), t = f - i;
  const g = (k: number): Ring => rings[Math.min(n, Math.max(0, k))]!;
  const q = (sel: (r: Ring) => number): number => cr(sel(g(i - 1)), sel(g(i)), sel(g(i + 1)), sel(g(i + 2)), t);
  return {
    y: q((r) => r.y), rx: Math.max(0, q((r) => r.rx)), rz: Math.max(0, q((r) => r.rz)),
    z: q((r) => r.z ?? 0), x: q((r) => r.x ?? 0), e: q((r) => r.e ?? 2), rb: Math.max(0, q((r) => r.rb ?? r.rz)),
  };
}

/**
 * Loft vertical. u=0 fica ATRÁS (−Z), u=0.25 à direita do personagem (−X), u=0.5 na FRENTE (+Z), u=0.75 à esquerda (+X).
 * `mod` deforma cada ponto (focinhos, bochechas...). Os anéis devem ter y crescente.
 */
export function ringFn(rings: Ring[], mod?: (p: THREE.Vector3, th: number, v: number) => void): SurfFn {
  const out = new THREE.Vector3();
  return (u, v) => {
    const r = ringAt(rings, v);
    const th = Math.PI * 2 * u + Math.PI;
    const s = Math.sin(th), c = Math.cos(th);
    const k = 2 / r.e;
    out.set(r.x + r.rx * Math.sign(s) * Math.abs(s) ** k, r.y, r.z + (c >= 0 ? r.rz : r.rb) * Math.sign(c) * Math.abs(c) ** k);
    if (mod) mod(out, th, v);
    return out;
  };
}

export function loft(rings: Ring[], nu = 24, nv = 16, mod?: (p: THREE.Vector3, th: number, v: number) => void, o: SurfOpts = {}): THREE.BufferGeometry {
  return surf(ringFn(rings, mod), nu, nv, { capStart: true, capEnd: true, ...o });
}

/* ---------- varredura ao longo de um caminho ---------- */
export interface SweepOpts { ref?: V3; closed?: boolean; twist?: number; tension?: number }

/**
 * Tubo com seção elíptica ao longo de pontos. `radius(t)` devolve r ou [raio em N, raio em B];
 * N = `ref` projetado no plano normal ao caminho (padrão X), B = T × N.
 */
export function sweepFn(pts: V3[], radius: number | ((t: number) => number | [number, number]), o: SweepOpts = {}): SurfFn {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), !!o.closed, 'catmullrom', o.tension ?? 0.5);
  const ref = new THREE.Vector3(...(o.ref ?? [1, 0, 0])).normalize();
  const out = new THREE.Vector3(), T = new THREE.Vector3(), Nv = new THREE.Vector3(), B = new THREE.Vector3(), c = new THREE.Vector3();
  return (u, v) => {
    const t = Math.min(1, Math.max(0, v));
    curve.getPoint(t, c);
    curve.getTangent(Math.min(0.9999, Math.max(0.0001, t)), T);
    Nv.copy(ref).addScaledVector(T, -T.dot(ref));
    if (Nv.lengthSq() < 1e-8) Nv.set(0, 0, 1).addScaledVector(T, -T.z);
    Nv.normalize();
    B.crossVectors(T, Nv);
    const rr = typeof radius === 'number' ? radius : radius(t);
    const [ra, rb] = typeof rr === 'number' ? [rr, rr] : rr;
    const th = Math.PI * 2 * u + (o.twist ?? 0) * t;
    return out.copy(c).addScaledVector(Nv, Math.cos(th) * ra).addScaledVector(B, Math.sin(th) * rb);
  };
}

export function sweep(pts: V3[], radius: number | ((t: number) => number | [number, number]), nu = 10, nv = 16, o: SweepOpts & SurfOpts = {}): THREE.BufferGeometry {
  return surf(sweepFn(pts, radius, o), nu, nv, { capStart: true, capEnd: true, ...o });
}

/** Perfil de raio arredondado nas pontas: sobe de 0 em t=0, vale 1 no meio e fecha em t=1. */
export function roundEnds(t: number, a = 0.12, b = 0.12): number {
  let k = 1;
  if (a > 0 && t < a) k *= Math.sqrt(Math.max(0, 1 - (1 - t / a) ** 2));
  if (b > 0 && t > 1 - b) k *= Math.sqrt(Math.max(0, 1 - (1 - (1 - t) / b) ** 2));
  return k;
}

/** Interpolação linear por partes: pares [t, valor]. */
export function ramp(t: number, stops: [number, number][]): number {
  if (t <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [t1, v1] = stops[i]!;
    if (t <= t1) {
      const [t0, v0] = stops[i - 1]!;
      const k = (t - t0) / (t1 - t0 || 1);
      return v0 + (v1 - v0) * (k * k * (3 - 2 * k));
    }
  }
  return stops[stops.length - 1]![1];
}

export const sstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1)));
  return t * t * (3 - 2 * t);
};

/* ---------- pintura ---------- */
export type UVColorFn = (u: number, v: number, p: THREE.Vector3, n: THREE.Vector3) => ColorLike;

/** Pinta usando também as coordenadas paramétricas (u,v) gravadas por `surf`. */
export function paintUV(geo: THREE.BufferGeometry, fn: UVColorFn): THREE.BufferGeometry {
  const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal'), uv = geo.getAttribute('uv');
  const arr = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
    const c = col(fn(uv.getX(i), uv.getY(i), p, n));
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

export const darken = (c: ColorLike, k: number): THREE.Color => mix(c, '#0a0612', k);
export const lighten = (c: ColorLike, k: number): THREE.Color => mix(c, '#ffffff', k);

/** Sombreado "pintado à mão": escurece embaixo/atrás e clareia no topo. */
export function shaded(base: ColorLike, y0: number, y1: number, amt = 0.28): (p: THREE.Vector3, n: THREE.Vector3) => THREE.Color {
  const lo = darken(base, amt), hi = lighten(base, amt * 0.35);
  return (p, n) => {
    const t = sstep(y0, y1, p.y) * 0.75 + (n.y * 0.5 + 0.5) * 0.25;
    return t < 0.6 ? mix(lo, base, t / 0.6) : mix(base, hi, (t - 0.6) / 0.4);
  };
}

/* ---------- formas 2D ---------- */
export function starOutline(r1: number, r2: number, n = 5): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2, r = i % 2 === 0 ? r1 : r2;
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

export function gearOutline(r: number, teeth: number, depth: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2, st = (Math.PI * 2) / teeth;
    for (const [f, rr] of [[0.0, r - depth], [0.18, r], [0.5, r], [0.68, r - depth]] as [number, number][]) {
      out.push([Math.cos(a0 + f * st) * rr, Math.sin(a0 + f * st) * rr]);
    }
  }
  return out;
}

export function circleOutline(r: number, n = 16): [number, number][] {
  return Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r] as [number, number]);
}

/** Escala uma tabela de anéis: alturas a partir de y0 (sy) e raios/deslocamentos (sx). */
export function scaleRings(rings: Ring[], y0: number, sy: number, sx: number): Ring[] {
  return rings.map((r) => ({ ...r, y: y0 + (r.y - y0) * sy, rx: r.rx * sx, rz: r.rz * sx, rb: r.rb !== undefined ? r.rb * sx : undefined, z: (r.z ?? 0) * sx }));
}
