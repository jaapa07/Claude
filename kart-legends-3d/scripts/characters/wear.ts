/** Roupas e acessórios que acompanham o tronco/cabeça: faixas, coletes, cintos, capas. */
import { THREE, mix, type ColorLike, type V3 } from '../lib/geo';
import { darken, lighten, paintUV, ringAt, ringFn, sstep, surf, type Ring, type SurfFn, type UVColorFn } from './shapes';

/** v (0..1) em que a tabela de anéis passa pela altura y (tabela com y crescente). */
export function vAtY(rings: Ring[], y: number): number {
  let a = 0, b = 1;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if (ringAt(rings, m).y < y) a = m; else b = m;
  }
  return (a + b) / 2;
}
export function ringAtY(rings: Ring[], y: number): Required<Ring> { return ringAt(rings, vAtY(rings, y)); }

/** Casca que acompanha uma tabela de anéis entre y0 e y1, afastada `grow` (número ou função de t 0..1). */
export function shellRings(rings: Ring[], y0: number, y1: number, grow: number | ((t: number) => number), n = 6): Ring[] {
  const out: Ring[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, r = ringAtY(rings, y0 + (y1 - y0) * t);
    const g = typeof grow === 'number' ? grow : grow(t);
    out.push({ y: y0 + (y1 - y0) * t, rx: r.rx + g, rz: r.rz + g, rb: r.rb + g, z: r.z, x: r.x, e: r.e });
  }
  return out;
}

/** Faixa/cinta com bordas arredondadas em volta de um loft. */
export function band(rings: Ring[], y0: number, y1: number, thick: number, nu = 28, o: { skip?: (u: number, v: number) => boolean; mod?: (p: THREE.Vector3, th: number, v: number) => void } = {}): THREE.BufferGeometry {
  const sh = shellRings(rings, y0, y1, (t) => thick * (0.15 + 0.85 * Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.5), 4);
  return surf(ringFn(sh, o.mod), nu, 5, { skip: o.skip });
}

/** Casca aberta (colete, casaco, capa): pele externa + borda grossa. `open` = meia-abertura em u na frente (0.5). */
export function shell(rings: Ring[], y0: number, y1: number, grow: number | ((t: number) => number), o: { nu?: number; nv?: number; skip?: (u: number, v: number) => boolean; mod?: (p: THREE.Vector3, th: number, v: number) => void } = {}): { geo: THREE.BufferGeometry; fn: SurfFn } {
  const fn = ringFn(shellRings(rings, y0, y1, grow, 8), o.mod);
  return { geo: surf(fn, o.nu ?? 28, o.nv ?? 10, { skip: o.skip }), fn };
}

/** Pintura de tecido com sombra vertical suave. */
export function clothPaint(base: ColorLike, y0: number, y1: number, amt = 0.25): UVColorFn {
  const lo = darken(base, amt), hi = lighten(base, amt * 0.3);
  return (_u, _v, p, n) => mix(mix(lo, base, sstep(y0, (y0 + y1) / 2, p.y)), hi, sstep((y0 + y1) / 2, y1, p.y) * (0.6 + 0.4 * n.y));
}

export const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];

/** Touca/capacete/cabelo: casca do y0 até o topo da cabeça, fechada em cima. `grow` afasta e levanta o topo. */
export function cap(rings: Ring[], y0: number, grow: number | ((t: number) => number), o: { nu?: number; nv?: number; skip?: (u: number, y: number) => boolean; mod?: (p: THREE.Vector3, th: number, v: number) => void; yTop?: number } = {}): { geo: THREE.BufferGeometry; fn: SurfFn; yOf: (v: number) => number } {
  const top = o.yTop ?? rings[rings.length - 1]!.y;
  const g = (t: number): number => (typeof grow === 'number' ? grow : grow(t));
  const sh = shellRings(rings, y0, top, g, 9).map((r, i) => ({ ...r, y: r.y + g(i / 9) * sstep(0.55, 1, i / 9) }));
  const fn = ringFn(sh, o.mod);
  const yOf = (v: number): number => y0 + (top - y0) * v;
  const skip = o.skip;
  return { geo: surf(fn, o.nu ?? 28, o.nv ?? 12, { capEnd: true, skip: skip ? (u, v) => skip(u, yOf(v)) : undefined }), fn, yOf };
}

/** Contorno (fechado) de uma abertura retangular em (u,v) de uma superfície — para aros, bordas de pelo. */
export function openingLoop(fn: SurfFn, a: number, v0: number, v1: number, n = 5, out = 0): V3[] {
  const pts: V3[] = [];
  const add = (u: number, v: number): void => {
    const p = fn(u, v).clone();
    if (out) { const c = fn(u, v).clone(); c.x = 0; c.z = 0; p.add(p.clone().sub(c).setY(0).normalize().multiplyScalar(out)); }
    pts.push([p.x, p.y, p.z]);
  };
  for (let i = 0; i < n; i++) add(0.5 - a + (2 * a * i) / n, v0);
  for (let i = 0; i < n; i++) add(0.5 + a, v0 + ((v1 - v0) * i) / n);
  for (let i = 0; i < n; i++) add(0.5 + a - (2 * a * i) / n, v1);
  for (let i = 0; i < n; i++) add(0.5 - a, v1 - ((v1 - v0) * i) / n);
  return pts;
}

/** Capa nas costas: u atravessa (−A..A em torno das costas), v desce do yTop. `zig(u)` alonga/encurta a barra. */
export function cape(rings: Ring[], o: { yTop: number; len: number; A: number; grow: (v: number) => number; zig?: (u: number) => number; nu?: number; nv?: number; back?: (v: number) => number }): THREE.BufferGeometry {
  return surf((u, v) => {
    const y = o.yTop - o.len * (1 + (o.zig ? o.zig(u) * v : 0)) * v;
    const r = ringAtY(rings, Math.max(0.02, Math.min(o.yTop, y)));
    const th = Math.PI + (u - 0.5) * 2 * o.A, g = o.grow(v);
    return new THREE.Vector3(r.x + (r.rx + g) * Math.sin(th), y, r.z + (r.rb + g) * Math.cos(th) - (o.back ? o.back(v) * Math.max(0, -Math.cos(th)) : 0));
  }, o.nu ?? 20, o.nv ?? 10, { flip: true });
}

/** Tabela de cabeça humanoide (y absoluto, base em 0.612). */
export function humanHead(sx = 1, sy = 1, e = 2.15): Ring[] {
  const Y = (y: number): number => 0.612 + (y - 0.612) * sy;
  return [
    { y: Y(0.612), rx: 0.02 * sx, rz: 0.02 * sx, z: 0.012 },
    { y: Y(0.63), rx: 0.105 * sx, rz: 0.1 * sx, z: 0.014, e },
    { y: Y(0.69), rx: 0.178 * sx, rz: 0.162 * sx, z: 0.016, e },
    { y: Y(0.77), rx: 0.212 * sx, rz: 0.19 * sx, z: 0.016, e },
    { y: Y(0.86), rx: 0.214 * sx, rz: 0.198 * sx, z: 0.012, e },
    { y: Y(0.95), rx: 0.178 * sx, rz: 0.172 * sx, z: 0.008, e },
    { y: Y(1.01), rx: 0.1 * sx, rz: 0.1 * sx, z: 0.006 },
    { y: Y(1.032), rx: 0.01, rz: 0.01, z: 0.005 },
  ];
}
