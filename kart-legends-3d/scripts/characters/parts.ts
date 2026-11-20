/** Peças reutilizáveis (mãos, botas, orelhas, tufos, fitas, folhas) — todas em coordenadas locais. */
import { THREE, mix, paint, warp, type ColorLike, type V3 } from '../lib/geo';
import { darken, lighten, loft, paintUV, ramp, roundEnds, sstep, sweep, type Ring } from './shapes';

/** Espelha em X corrigindo a orientação dos triângulos. */
export function mirrorX(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) {
    const a = g.getAttribute(name) as THREE.BufferAttribute;
    const n = a.itemSize, arr = a.array as unknown as number[];
    for (let t = 0; t < a.count; t += 3) {
      for (let k = 0; k < n; k++) {
        const i1 = (t + 1) * n + k, i2 = (t + 2) * n + k;
        const tmp = arr[i1]!; arr[i1] = arr[i2]!; arr[i2] = tmp;
      }
    }
    if (name === 'position' || name === 'normal') for (let i = 0; i < a.count; i++) arr[i * n] = -arr[i * n]!;
    a.needsUpdate = true;
  }
  return g;
}

/** Une várias geometrias já pintadas em uma lista (atalho para laços). */
export type Painted = THREE.BufferGeometry;

/**
 * Punho fechado segurando o aro (mão ESQUERDA; use mirrorX para a direita).
 * Origem = centro da palma (ponto do aro), dedos para +Z, eixo do aro ≈ Y, pulso para −Z.
 */
export function fist(color: ColorLike, scale = 1, knuckle?: ColorLike): Painted[] {
  const out: Painted[] = [];
  const c0 = color, cDark = darken(color, 0.3), cHi = lighten(color, 0.12);
  const k = scale;
  const core = loft([
    { y: -0.047 * k, rx: 0.012 * k, rz: 0.014 * k, e: 2.6 },
    { y: -0.04 * k, rx: 0.031 * k, rz: 0.034 * k, e: 2.6 },
    { y: -0.015 * k, rx: 0.037 * k, rz: 0.04 * k, e: 2.8 },
    { y: 0.02 * k, rx: 0.037 * k, rz: 0.04 * k, e: 2.8 },
    { y: 0.041 * k, rx: 0.03 * k, rz: 0.033 * k, e: 2.6 },
    { y: 0.048 * k, rx: 0.012 * k, rz: 0.014 * k, e: 2.6 },
  ], 12, 7, (p) => { p.z -= 0.006 * k; });
  out.push(paint(core, (p, n) => mix(cDark, c0, 0.55 + 0.45 * n.y + (p.z > 0 ? 0.1 : 0))));
  [-0.031, -0.0105, 0.0105, 0.031].forEach((y, i) => {
    const r = (i === 3 ? 0.0115 : 0.013) * k;
    const g = sweep([
      [0.03 * k, y * k, -0.02 * k], [0.043 * k, y * k, 0.012 * k], [0.028 * k, y * k, 0.045 * k],
      [-0.008 * k, y * k, 0.049 * k], [-0.031 * k, y * k, 0.028 * k], [-0.03 * k, y * k, 0.004 * k],
    ], (t) => r * roundEnds(t, 0.15, 0.2), 6, 8, { ref: [0, 1, 0] });
    out.push(paintUV(g, (_u, v, _p, n) => mix(mix(c0, knuckle ?? cHi, sstep(0.2, 0.45, v) * (1 - sstep(0.5, 0.75, v)) * 0.7), cDark, 0.3 - 0.3 * n.y)));
  });
  const thumb = sweep([
    [-0.004 * k, -0.02 * k, -0.034 * k], [-0.034 * k, -0.006 * k, -0.02 * k], [-0.045 * k, 0.018 * k, 0.004 * k], [-0.038 * k, 0.04 * k, 0.026 * k],
  ], (t) => (0.0165 - 0.004 * t) * k * roundEnds(t, 0.2, 0.25), 6, 7, { ref: [0, 0, 1] });
  out.push(paint(thumb, (_p, n) => mix(cDark, c0, 0.6 + 0.4 * n.y)));
  return out;
}

/** Bota/tênis: calcanhar perto da origem, bico para +Z, sola para −Y. Devolve [cabedal, sola]. */
export function boot(upperCol: ColorLike, soleCol: ColorLike, toeCol?: ColorLike, scale = 1): { upper: Painted; sole: Painted } {
  const k = scale;
  const path: V3[] = [[0, 0, -0.05 * k], [0, 0, 0.015 * k], [0, -0.004 * k, 0.085 * k], [0, -0.008 * k, 0.14 * k]];
  const prof = (t: number, s: number): [number, number] => [
    ramp(t, [[0, 0.034], [0.3, 0.047], [0.7, 0.054], [1, 0.044]]) * k * s * roundEnds(t, 0.16, 0.2),
    ramp(t, [[0, 0.04], [0.3, 0.045], [0.65, 0.038], [1, 0.03]]) * k * roundEnds(t, 0.16, 0.24),
  ];
  const up = warp(sweep(path, (t) => prof(t, 1), 12, 9), (p) => { p.y = Math.max(p.y, -0.03 * k); });
  const upper = paint(up, (p, n) => {
    const base = toeCol && p.z > 0.075 * k ? toeCol : upperCol;
    return mix(darken(base, 0.3), lighten(base, 0.08), 0.5 + 0.5 * n.y);
  });
  const so = warp(sweep(path, (t) => prof(t, 1.09), 12, 7), (p) => { p.y = Math.min(-0.022 * k, Math.max(p.y, -0.043 * k)); });
  const sole = paint(so, (p) => mix(darken(soleCol, 0.35), soleCol, sstep(-0.043 * k, -0.022 * k, p.y)));
  return { upper, sole };
}

/** Orelha pontuda (raposa/felino): base na origem, ponta em +Y, frente côncava em +Z com interior claro. */
export function pointedEar(h: number, w: number, d: number, outer: ColorLike, inner: ColorLike, tip?: ColorLike, lean = 0): Painted {
  const rings: Ring[] = [
    { y: 0, rx: w * 0.46, rz: d },
    { y: h * 0.18, rx: w * 0.5, rz: d * 0.95 },
    { y: h * 0.5, rx: w * 0.36, rz: d * 0.7 },
    { y: h * 0.8, rx: w * 0.17, rz: d * 0.42 },
    { y: h * 0.95, rx: w * 0.05, rz: d * 0.2 },
    { y: h, rx: 0.002, rz: 0.002 },
  ];
  const g = loft(rings, 14, 9, (p) => {
    const t = p.y / h;
    if (p.z > 0) p.z *= 0.18 - 0.5 * (1 - Math.abs(p.x) / (w * 0.5 + 1e-6)) * (1 - t) * 0.6; // concha na frente
    p.x += lean * t * t * h;
    p.z -= 0.12 * h * t * t;
  });
  return paint(g, (p, n) => {
    const t = p.y / h;
    const half = w * 0.5 * (1 - t) * 0.72;
    const inside = n.z > 0.1 && Math.abs(p.x - lean * t * t * h) < half && t > 0.06 && t < 0.86;
    if (inside) return mix(inner, darken(inner, 0.25), sstep(0.5, 0, t) * 0.8);
    const base = tip ? mix(outer, tip, sstep(0.62, 0.82, t)) : outer;
    return mix(darken(base, 0.22), base, sstep(0, 0.4, t) * 0.6 + 0.4);
  });
}

/** Tufo pontudo (pelo/cabelo) ao longo de um caminho. */
export function tuft(pts: V3[], r: number | [number, number], c0: ColorLike, c1?: ColorLike, nu = 7, nv = 7, ref: V3 = [1, 0, 0]): Painted {
  const [ra, rb] = typeof r === 'number' ? [r, r] : r;
  const g = sweep(pts, (t) => { const k = Math.max(0.02, (1 - t) ** 0.75) * (0.55 + 0.45 * sstep(0, 0.18, t)); return [ra * k, rb * k]; }, nu, nv, { ref, capEnd: false });
  return paintUV(g, (_u, v) => mix(c0, c1 ?? lighten(c0, 0.18), v));
}

/** Fita/tira de tecido achatada ao longo de um caminho. `width(t)` em metros. */
export function ribbon(pts: V3[], width: number | ((t: number) => number), thick: number, color: (t: number, u: number) => ColorLike, o: { ref?: V3; nu?: number; nv?: number; twist?: number } = {}): Painted {
  const g = sweep(pts, (t) => [(typeof width === 'number' ? width : width(t)) * 0.5 * roundEnds(t, 0.04, 0.04), thick * 0.5], o.nu ?? 8, o.nv ?? 16, { ref: o.ref ?? [1, 0, 0], twist: o.twist });
  return paintUV(g, (u, v) => color(v, u));
}

/** Folha: lâmina fina com nervura central, base na primeira ponta do caminho. */
export function leafBlade(pts: V3[], w: number, c0: ColorLike, c1: ColorLike, ref: V3 = [1, 0, 0], nv = 5): Painted {
  const g = sweep(pts, (t) => [Math.max(0.002, w * 0.5 * Math.sin(Math.PI * t ** 0.62) ** 0.8), 0.0045 + 0.004 * (1 - t)], 6, Math.min(nv, 5), { ref });
  return paintUV(g, (u, v) => {
    const rib = Math.abs(Math.cos(Math.PI * 2 * u)) < 0.22 ? 0.25 : 0; // nervura no meio da lâmina
    return darken(mix(c0, c1, v), rib * 0.5);
  });
}

/** Cauda/tubo volumoso com cor por t. */
export function plume(pts: V3[], radius: (t: number) => number | [number, number], color: (t: number, u: number, n: THREE.Vector3) => ColorLike, nu = 14, nv = 22, ref: V3 = [1, 0, 0]): Painted {
  const g = sweep(pts, radius, nu, nv, { ref });
  return paintUV(g, (u, v, _p, n) => color(v, u, n));
}

/** Anel (toro) com eixo arbitrário. */
export function ringAround(r: number, tubeR: number, axis: V3 = [0, 1, 0], rs = 8, ts = 20, squash = 1): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(r, tubeR, rs, ts);
  if (squash !== 1) g.scale(1, squash, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...axis).normalize());
  g.applyQuaternion(q);
  return g;
}

/** Quaternion → Euler XYZ para alinhar +Y local a uma direção. */
export function aimY(dir: V3): V3 {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [e.x, e.y, e.z];
}
export function aimZ(dir: V3): V3 {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...dir).normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [e.x, e.y, e.z];
}
