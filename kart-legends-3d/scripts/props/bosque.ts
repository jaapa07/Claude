/** BOSQUE DE CRISTAL — floresta fantástica. Objetos de cenário originais. */
import { torus } from '../lib/geo';
import {
  Model, TAU, blob, box, cbox, cyl, dark, fbm3, fin, flat, ico, jit, lathe, leafBlob, lite, loft, mix, n3, openingProf, paint, pick, put, rawGeo, rockGeo, rod,
  rope, rr, shell, strata, strip, tone, tube, xf, type P2, type Rand, type V3,
} from './aurora-kit';
import type { PropLibrary } from './types';

const BARK = ['#6d4a3c', '#5c4544', '#74523a'];
const CANOPY: [string, string][] = [['#0f7a5e', '#5fe07a'], ['#0d7f86', '#4fe6b4'], ['#1f7a3e', '#a8e83c'], ['#1c5f96', '#58d8d0'], ['#5a3f9a', '#e07ad8']];
const GLOWS = ['glow_cyan', 'glow_violet', 'glow_magenta'] as const;
const GLOW_COL: Record<string, string> = { glow_cyan: '#9af4ff', glow_violet: '#c9b0ff', glow_magenta: '#ff9ad8', glow_green: '#b0ffb8', glow_warm: '#ffd890' };
const MOSS = '#4a8a2e';
const SOFT: Record<string, string> = { glow_cyan: 'aur_suave_ciano', glow_violet: 'aur_suave_violeta', glow_magenta: 'aur_suave_magenta', glow_green: 'aur_suave_verde' };
const HUE: Record<string, [string, string]> = { glow_cyan: ['#0f6fa8', '#7fe8ff'], glow_violet: ['#4a2f9a', '#b89cff'], glow_magenta: ['#9a1f6e', '#ff8ad0'], glow_green: ['#1a7a3a', '#9aff9a'] };

/** Cogumelo-prateleira luminoso encostado num tronco (centro no ponto de contato, cresce para +X local). */
function shelfMushroom(m: Model, p: V3, ang: number, r: number, glow: string): void {
  const cap = flat(lathe([[0.01, -0.02], [r * 0.95, 0.0], [r, 0.09], [r * 0.6, 0.24], [0.01, 0.3]], 8));
  const g = xf(cap, { p: [r * 0.45, 0, 0], s: [1, 1, 0.85] });
  const x = { p, r: [0, -ang, 0] as V3 };
  m.add(paint(xf(g, x), (q) => mix(HUE[glow]![0], HUE[glow]![1], Math.min(1, Math.max(0, (q.y - p[1]) / 0.3)))), SOFT[glow]!);
  m.add(flat(ico(r * 0.16, 0)), glow, '#ffffff', { p: [p[0] + Math.cos(ang) * r * 0.5, p[1] + 0.27, p[2] + Math.sin(ang) * r * 0.5], s: [1, 0.5, 1] });
  put(m, xf(cyl(r * 0.8, r * 0.3, 0.16, 8), { p: [r * 0.4, -0.09, 0], s: [1, 1, 0.85] }), 'std', '#e9dcc4', x, 0.3);
}

function arvoreGigante(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 28, 36);
  const tH = H * rr(rand, 0.58, 0.64);
  const lx = rr(rand, -1.6, 1.6), lz = rr(rand, -1.6, 1.6);
  const tw = rr(rand, 1.6, 3.2) * (rand() < 0.5 ? -1 : 1), ph = rand() * TAU;
  const lobes = 5 + Math.floor(rand() * 2);
  const bark = jit(pick(rand, BARK), rand);
  const [c0, c1] = pick(rand, CANOPY);
  const glow = pick(rand, GLOWS);
  const axis = (t: number): V3 => [lx * Math.sin(t * Math.PI * 1.1) + lz * 0.4 * t * t, -0.25 + t * (tH + 0.25), lz * Math.sin(t * Math.PI * 0.8) - lx * 0.4 * t * t];
  const rad = (t: number): number => 1.25 + 0.75 * Math.pow(1 - t, 2) + 1.3 * Math.exp(-t * 11);
  const rAt = (t: number, a: number): number => {
    const ridge = Math.sin(lobes * a + tw * t * 3 + ph);
    return rad(t) * (1 + 0.21 * ridge * (1 - 0.4 * t)) + 0.9 * Math.exp(-t * 14) * Math.pow(Math.max(0, ridge), 2);
  };
  const trunk = loft(15, 14, (t, a) => {
    const c = axis(t), r = rAt(t, a);
    return [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r];
  }, true);
  m.add(paint(trunk, (p, n) => {
    const t = p.y / tH;
    const base = mix(mix(dark(bark, 0.45), MOSS, Math.max(0, 0.55 - t * 6) * (0.5 + n3(p.x, p.y, p.z))), lite(bark, 0.25), Math.min(1, t * 1.2));
    return base.multiplyScalar(0.85 + 0.3 * fbm3(p.x * 0.5, p.y * 0.15, p.z * 0.5) + n.y * 0.1);
  }), 'aur_bark');

  // raízes aparentes nas cristas da base
  for (let k = 0; k < lobes; k++) {
    const a = (Math.PI / 2 - ph + TAU * k) / lobes + rr(rand, -0.08, 0.08);
    const L = rr(rand, 5.5, 8), bend = rr(rand, -0.5, 0.5);
    const d = (r: number, y: number, da: number): V3 => [Math.cos(a + da) * r, y, Math.sin(a + da) * r];
    const g = tube([d(2.3, 2.2, 0), d(3.6, 1.0, bend * 0.2), d(L * 0.75, 0.45, bend * 0.5), d(L, -0.1, bend)], (t) => 0.85 - 0.68 * t, 7, 6);
    put(m, g, 'aur_bark', mix(bark, MOSS, 0.12), undefined, 0.4, lite(bark, 0.15));
    if (k % 2 === 0) leafBlob(m, rr(rand, 0.7, 1.1), d(L * 0.55, 0.75, bend * 0.4), MOSS, rand() * 9, 0, [1.3, 0.4, 1.3]);
  }

  // galhos mestres com volumes de copa
  const nB = 5;
  const a0 = rand() * TAU;
  for (let k = 0; k < nB; k++) {
    const t = 0.62 + (k / nB) * 0.3;
    const a = a0 + (k / nB) * TAU * 1.0 + rr(rand, -0.3, 0.3);
    const c = axis(t);
    const out = rr(rand, 5.2, 7.6), up = rr(rand, 3.5, 6.5);
    const tip: V3 = [c[0] + Math.cos(a) * out, c[1] + up, c[2] + Math.sin(a) * out];
    const g = tube([c, [c[0] + Math.cos(a) * out * 0.35, c[1] + up * 0.15, c[2] + Math.sin(a) * out * 0.35], [c[0] + Math.cos(a + 0.2) * out * 0.75, c[1] + up * 0.6, c[2] + Math.sin(a + 0.2) * out * 0.75], tip], (u) => 1.15 - 0.75 * u, 6, 6);
    put(m, g, 'aur_bark', bark, undefined, 0.3);
    const r = rr(rand, 4.4, 5.6);
    leafBlob(m, r, [tip[0], tip[1] + r * 0.35, tip[2]], mix(c0, c1, 0.1 + 0.15 * (k / nB)), rand() * 20, 2, [1.15, 0.66, 1.15], mix(c0, c1, 0.8));
    for (let j = 0; j < 2; j++) {
      const sa = a + (j ? 1 : -1) * rr(rand, 0.7, 1.1), sr = r * rr(rand, 0.5, 0.65);
      leafBlob(m, sr, [tip[0] + Math.cos(sa) * r * 0.85, tip[1] + r * 0.2 + rr(rand, -1.4, 1.2), tip[2] + Math.sin(sa) * r * 0.85], mix(c0, c1, 0.2), rand() * 20, 1, [1.1, 0.7, 1.1], mix(c0, c1, 0.9));
    }
    // cipó com bulbo luminoso
    const vx = tip[0] + rr(rand, -2, 2), vz = tip[2] + rr(rand, -2, 2), vl = rr(rand, 3, 7), vy = tip[1] - r * 0.1;
    put(m, rod([vx, vy, vz], [vx + 0.2, vy - vl, vz], 0.05, 4), 'aur_foliage', dark(c0, 0.3));
    m.add(flat(ico(0.24, 0)), glow, GLOW_COL[glow], { p: [vx + 0.2, vy - vl - 0.2, vz], s: [1, 1.4, 1] });
  }
  const top = axis(1);
  const crown: [number, number, number, number][] = [[0, 0.56, 0, 7.4], [4.4, 0.2, 3.4, 5.6], [-4.8, 0.26, 2.0, 5.4], [0.8, 0.22, -5.2, 5.8]];
  for (const [ox, f, oz, r0] of crown) {
    const r = r0 * rr(rand, 0.92, 1.08) * (H / 32);
    const cy = Math.min(H - r * 0.74, top[1] + (H - top[1]) * f + r * 0.2);
    leafBlob(m, r, [top[0] + ox, cy, top[2] + oz], mix(c0, c1, 0.25 + f * 0.5), rand() * 30, 2, [1.1, 0.7, 1.1], lite(c1, f * 0.3));
  }
  // cogumelos-prateleira luminosos subindo em espiral
  const nM = 5 + Math.floor(rand() * 3);
  const ma = rand() * TAU;
  for (let i = 0; i < nM; i++) {
    const y = 2.4 + i * rr(rand, 1.2, 1.9);
    const t = (y + 0.25) / (tH + 0.25);
    const a = ma + i * 0.75 * Math.sign(tw);
    const c = axis(t);
    const r = rAt(t, a) * 0.93;
    shelfMushroom(m, [c[0] + Math.cos(a) * r, y, c[2] + Math.sin(a) * r], a, rr(rand, 0.9, 1.6), glow);
  }
  return fin(m);
}


function arvoreBosque(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 10, 14);
  const bark = jit(pick(rand, BARK), rand);
  const [c0, c1] = pick(rand, CANOPY);
  const glow = pick(rand, GLOWS);
  const lx = rr(rand, -1.4, 1.4), lz = rr(rand, -1.4, 1.4), tH = H * 0.62;
  const ax = (t: number): V3 => [lx * Math.sin(t * Math.PI) + lz * 0.5 * t * t, -0.1 + t * (tH + 0.1), lz * Math.sin(t * Math.PI * 0.8) - lx * 0.5 * t * t];
  put(m, tube([ax(0), ax(0.2), ax(0.45), ax(0.7), ax(1)], (t) => 0.62 - 0.36 * t + 0.35 * Math.exp(-t * 9), 8, 7), 'aur_bark', bark, undefined, 0.4, lite(bark, 0.25));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + rand(), L = rr(rand, 1.4, 2.2);
    put(m, tube([[Math.cos(a) * 0.4, 0.75, Math.sin(a) * 0.4], [Math.cos(a) * L * 0.6, 0.3, Math.sin(a) * L * 0.6], [Math.cos(a + 0.3) * L, 0.0, Math.sin(a + 0.3) * L]], (t) => 0.3 - 0.2 * t, 4, 5), 'aur_bark', mix(bark, MOSS, 0.15), undefined, 0.35);
  }
  const top = ax(1);
  const a0 = rand() * TAU;
  for (let k = 0; k < 3; k++) {
    const a = a0 + (k / 3) * TAU, c = ax(0.6 + k * 0.12), out = rr(rand, 2.2, 3.2), up = rr(rand, 1.4, 2.4);
    const tip: V3 = [c[0] + Math.cos(a) * out, c[1] + up, c[2] + Math.sin(a) * out];
    put(m, tube([c, [c[0] + Math.cos(a) * out * 0.5, c[1] + up * 0.3, c[2] + Math.sin(a) * out * 0.5], tip], (t) => 0.3 - 0.16 * t, 4, 5), 'aur_bark', bark, undefined, 0.3);
    const r = rr(rand, 1.9, 2.5);
    leafBlob(m, r, [tip[0], tip[1] + r * 0.3, tip[2]], mix(c0, c1, 0.15), rand() * 30, 1, [1.15, 0.72, 1.15], mix(c0, c1, 0.85));
    const fx = tip[0] + rr(rand, -1, 1), fz = tip[2] + rr(rand, -1, 1), fl = rr(rand, 0.9, 1.8);
    put(m, rod([fx, tip[1], fz], [fx, tip[1] - fl, fz], 0.03, 3), 'aur_foliage', dark(c0, 0.3));
    m.add(flat(ico(0.16, 0)), glow, GLOW_COL[glow], { p: [fx, tip[1] - fl - 0.14, fz], s: [1, 1.3, 1] });
  }
  const r = (H - top[1]) * 0.78;
  leafBlob(m, r, [top[0], H - r * 0.7, top[2]], mix(c0, c1, 0.35), rand() * 30, 2, [1.15, 0.7, 1.15], lite(c1, 0.15));
  leafBlob(m, r * 0.62, [top[0] + r * 0.75, H - r * 1.25, top[2] + r * 0.3], mix(c0, c1, 0.2), rand() * 30, 1, [1.1, 0.75, 1.1], c1);
  return fin(m);
}

const CRYSTAL_HUE: Record<string, [string, string]> = { glow_cyan: ['#0b4f96', '#5fd8ff'], glow_violet: ['#3a1f8a', '#a888ff'], glow_magenta: ['#8a1260', '#ff78c8'] };

/** Prisma de cristal lapidado: corpo translúcido colorido + ponta luminosa. Base na origem, aponta para +Y. */
function prisma(m: Model, h: number, r: number, glow: string, x: { p: V3; r: V3 }, seed: number): void {
  const [deep, pale] = CRYSTAL_HUE[glow]!;
  const sides = 5 + (Math.floor(seed * 3) % 2);
  const cut = h * 0.72;
  const body = flat(lathe([[r * 0.72, -0.3], [r, cut * 0.55], [r * 0.94, cut]], sides));
  const ground = (g: ReturnType<typeof xf>): ReturnType<typeof xf> => {
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) if (x.p[1] < 0.5 && pos.getY(i) < -0.2) pos.setY(i, -0.2);
    return g;
  };
  m.add(paint(ground(xf(body, x)), (p, n) => mix(deep, pale, Math.min(1, Math.max(0, (p.y - x.p[1]) / h)) * 0.75 + 0.2 * Math.abs(n.x)).multiplyScalar(0.75 + 0.35 * Math.abs(n.z))), 'aur_cristal');
  const tip = flat(lathe([[r * 0.94, cut], [r * 0.5, h * 0.9], [0.01, h]], sides));
  m.add(xf(tip, x), glow, mix(pale, '#ffffff', 0.5));
}

function cristais(rand: Rand, n: number, hMin: number, hMax: number, spread: number, rocks: boolean): Model {
  const m = new Model();
  const glow = pick(rand, GLOWS);
  const glow2 = rand() < 0.35 ? pick(rand, GLOWS) : glow;
  const a0 = rand() * TAU;
  for (let i = 0; i < n; i++) {
    const main = i === 0;
    const h = main ? hMax * rr(rand, 0.9, 1) : rr(rand, hMin, hMax * 0.8);
    const a = a0 + (i / (n - 1 || 1)) * TAU + rr(rand, -0.3, 0.3);
    const d = main ? 0 : spread * rr(rand, 0.55, 1);
    const tilt = main ? rr(rand, -0.08, 0.08) : rr(rand, 0.25, 0.6);
    prisma(m, h, h * rr(rand, 0.11, 0.15) + 0.08, i % 3 === 2 ? glow2 : glow, { p: [Math.cos(a) * d, 0, Math.sin(a) * d], r: [Math.sin(a) * tilt, rand() * 3, -Math.cos(a) * tilt] }, rand());
  }
  if (rocks) {
    for (let i = 0; i < 5; i++) {
      const a = a0 + i * 1.3 + 0.6, d = spread * rr(rand, 0.9, 1.3);
      put(m, rockGeo(rr(rand, 0.5, 0.9), rand() * 20, [1.2, 0.55, 1], 1, 0.2), 'aur_rock', jit('#5a5878', rand), { p: [Math.cos(a) * d, 0.3, Math.sin(a) * d] }, 0.35, '#8a86b0');
    }
  } else {
    for (let i = 0; i < 3; i++) put(m, rockGeo(rr(rand, 0.2, 0.32), rand() * 20, [1.2, 0.7, 1], 0, 0.2), 'aur_rock', '#5a5878', { p: [Math.cos(a0 + i * 2.1 + 1) * spread * 1.3, 0.1, Math.sin(a0 + i * 2.1 + 1) * spread * 1.3] }, 0.3, '#8a86b0');
  }
  return fin(m);
}

function cogumelo(m: Model, rand: Rand, p: V3, h: number, glow: string): void {
  const lean = rr(rand, -0.3, 0.3), a = rand() * TAU;
  const tx = Math.cos(a) * lean * h, tz = Math.sin(a) * lean * h;
  put(m, tube([[p[0], p[1] - 0.1, p[2]], [p[0] + tx * 0.2, p[1] + h * 0.5, p[2] + tz * 0.2], [p[0] + tx, p[1] + h, p[2] + tz]], (t) => h * (0.11 - 0.045 * t) + 0.03, 5, 6), 'std', '#efe6d2', undefined, 0.3);
  const r = h * rr(rand, 0.38, 0.5) + 0.1;
  const cap = flat(lathe([[r * 0.98, 0], [r, r * 0.12], [r * 0.78, r * 0.42], [r * 0.4, r * 0.62], [0.01, r * 0.68]], 9));
  const [deep, pale] = HUE[glow]!;
  const cx: V3 = [p[0] + tx, p[1] + h - r * 0.08, p[2] + tz];
  m.add(paint(cap, (q) => mix(deep, pale, q.y / (r * 0.68))), SOFT[glow]!, undefined, { p: cx, r: [Math.sin(a) * lean, 0, -Math.cos(a) * lean] });
  put(m, flat(lathe([[0.02, -r * 0.14], [r * 0.5, -r * 0.1], [r * 0.97, 0]], 9)), 'std', '#f6ead2', { p: cx, r: [Math.sin(a) * lean, 0, -Math.cos(a) * lean] }, 0.3);
  for (let i = 0; i < 4; i++) {
    const sa = (i / 4) * TAU + a, sr = r * 0.6;
    m.add(flat(ico(r * 0.12, 0)), glow, '#ffffff', { p: [cx[0] + Math.cos(sa) * sr, cx[1] + r * 0.4, cx[2] + Math.sin(sa) * sr], s: [1, 0.5, 1] });
  }
}

function cogumeloLuminoso(rand: Rand): Model {
  const m = new Model();
  const glow = pick(rand, [...GLOWS, 'glow_green'] as const);
  const a = rand() * TAU;
  cogumelo(m, rand, [0, 0, 0], rr(rand, 1.5, 2.3), glow);
  cogumelo(m, rand, [Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8], rr(rand, 0.8, 1.2), glow);
  cogumelo(m, rand, [Math.cos(a + 2.4) * 0.7, 0, Math.sin(a + 2.4) * 0.7], rr(rand, 0.45, 0.75), glow);
  for (let i = 0; i < 4; i++) leafBlob(m, rr(rand, 0.2, 0.32), [Math.cos(a + i * 1.6 + 1) * 0.9, 0.08, Math.sin(a + i * 1.6 + 1) * 0.9], MOSS, rand() * 9, 0, [1.4, 0.5, 1.4]);
  return fin(m);
}

function cachoeira(rand: Rand): Model {
  const m = new Model();
  const W = rr(rand, 13.5, 14.5), Hh = rr(rand, 15.5, 16.5), D = 6.5;
  const seed = rand() * 50;
  const rockC = ['#4a4770', '#63608e', '#7d79a8', '#666e9c', '#8a8ab8', '#a4a0cc'];
  // paredão: anéis horizontais em "retângulo arredondado" com ruído e um nicho no centro da frente
  const g = loft(11, 22, (t, a) => {
    const y = -0.15 + t * (Hh + 0.15);
    const c = Math.cos(a), s2 = Math.sin(a);
    const sup = (v: number): number => Math.sign(v) * Math.pow(Math.abs(v), 0.55);
    const taper = 1 - 0.22 * t * t + 0.1 * Math.sin(t * 9 + seed);
    let x = sup(c) * (W / 2) * taper, z = sup(s2) * (D / 2) * (1 - 0.3 * t) - 1.2;
    const nz = fbm3(x * 0.22 + seed, y * 0.25, z * 0.3);
    x += (nz - 0.5) * 2.2; z += (fbm3(x * 0.2, y * 0.3 + seed, z * 0.2) - 0.5) * 2.0;
    if (s2 > 0) z -= 1.3 * Math.exp(-(x * x) / 5) * (0.5 + 0.5 * t);
    return [x, y, z];
  }, true, false, false);
  m.add(strata(g, rockC, 0, Hh, seed, 1.2), 'aur_rock');
  // topo com musgo e tufos
  for (let i = 0; i < 6; i++) {
    const x = (i / 5 - 0.5) * W * 0.72, skip = Math.abs(x) < 1.6;
    if (!skip) leafBlob(m, rr(rand, 1.3, 2.0), [x, Hh + 0.1, rr(rand, -2.2, -0.6)], pick(rand, ['#2f8a5a', '#3f9a4a', '#1f7a6a']), rand() * 20, 1, [1.3, 0.5, 1.2]);
  }
  // patamares de rocha por onde a água escorre
  const lip = 1.25, wW = rr(rand, 2.6, 3.2);
  put(m, rockGeo(2.4, seed, [1.2, 0.4, 0.8], 1, 0.2), 'aur_rock', '#6d6a92', { p: [0, Hh - 0.5, lip - 1.9] }, 0.3);
  const midY = Hh * rr(rand, 0.36, 0.44);
  put(m, rockGeo(2.6, seed + 3, [1.25, 0.45, 0.9], 1, 0.22), 'aur_rock', '#56557a', { p: [0, midY - 0.7, 1.5] }, 0.3, '#8f8cb4');
  // lâmina de água: duas quedas; UV v corre ao longo da queda
  const sheet = (path: [number, number, number][], w0: number, w1: number): void => {
    const pos: number[] = [], uv: number[] = [];
    const cols = 3;
    let len = 0;
    const acc = path.map((p, i) => { if (i > 0) len += Math.hypot(p[1] - path[i - 1]![1], p[2] - path[i - 1]![2]); return len; });
    for (let i = 0; i < path.length - 1; i++) for (let k = 0; k < cols; k++) {
      const P = (ii: number, kk: number): V3 => {
        const t = acc[ii]! / len, w = w0 + (w1 - w0) * t, u = kk / cols - 0.5;
        return [u * w + path[ii]![0], path[ii]![1], path[ii]![2] + (0.25 - u * u) * 0.5];
      };
      const a = P(i, k), b = P(i, k + 1), c = P(i + 1, k + 1), d = P(i + 1, k);
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      const v0 = acc[i]! / 4, v1 = acc[i + 1]! / 4, u0 = k / cols, u1 = (k + 1) / cols;
      uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
    }
    const geo = rawGeo(pos, uv);
    m.add(paint(geo, (p) => mix('#bfeaff', '#ffffff', 0.5 + 0.5 * Math.sin(p.x * 5 + p.y * 0.7))), 'water_fall');
  };
  sheet([[0, Hh - 0.05, lip - 3.4], [0, Hh - 0.08, lip - 1.0], [0, Hh - 0.5, lip - 0.2], [0, Hh - 2.5, lip + 0.25], [0, (Hh + midY) / 2, lip + 0.5], [0, midY + 0.2, lip + 0.75]], wW * 0.8, wW);
  sheet([[0, midY - 0.2, 2.6], [0, midY - 0.9, 3.25], [0, midY * 0.5, 3.6], [0, 0.15, 3.85]], wW * 1.05, wW * 1.35);
  // poça com espuma e pedras
  const pool = flat(lathe([[0.01, 0.1], [4.6, 0.1], [5.2, 0.0]], 14));
  m.add(paint(xf(pool, { p: [0, 0, 4.6], s: [1.15, 1, 0.8] }), (p) => mix('#7fe0f0', '#2f8fc0', Math.min(1, Math.hypot(p.x, p.z - 4.6) / 5))), 'aur_water');
  for (let i = 0; i < 9; i++) {
    const fx = (i / 8 - 0.5) * wW * 1.7, fr = rr(rand, 0.35, 0.7);
    put(m, blob(fr, 0, rand() * 30, 0.2, 1.4, [1.3, 0.55, 1.1]), 'glow_white', '#ffffff', { p: [fx, 0.25, 3.9 + rr(rand, -0.2, 0.9)] }, 0.05);
  }
  for (let i = 0; i < 5; i++) put(m, blob(rr(rand, 0.3, 0.55), 0, rand() * 30, 0.2, 1.4, [1.3, 0.5, 1.1]), 'glow_white', '#ffffff', { p: [rr(rand, -1.6, 1.6), midY - 0.25, 2.5 + rr(rand, -0.2, 0.4)] }, 0.05);
  for (let i = 0; i < 8; i++) {
    const a = -0.5 + (i / 7) * (Math.PI + 1.0), r = rr(rand, 0.7, 1.3);
    put(m, rockGeo(r, rand() * 30, [1.1, 0.7, 1], 1, 0.25), 'aur_rock', jit('#56557a', rand), { p: [Math.cos(a) * 5.9, r * 0.45, 4.6 + Math.sin(a) * 4.2] }, 0.35, '#8f8cb4');
  }
  // cristais nas laterais
  const glow = pick(rand, GLOWS);
  for (const sx of [-1, 1]) {
    prisma(m, rr(rand, 2.2, 3.4), 0.42, glow, { p: [sx * (W * 0.36), 0, 3.4], r: [0.2, rand(), -sx * 0.25] }, rand());
    prisma(m, rr(rand, 1.2, 1.8), 0.3, glow, { p: [sx * (W * 0.36 + 0.9), 0, 3.9], r: [0.4, rand(), -sx * 0.5] }, rand());
    prisma(m, rr(rand, 1.4, 2.2), 0.3, glow, { p: [sx * W * 0.3, Hh * rr(rand, 0.5, 0.7), 1.0], r: [1.0, rand(), -sx * 0.5] }, rand());
  }
  return fin(m);
}

function fireflyLantern(m: Model, p: V3, glow: string): void {
  put(m, cyl(0.13, 0.13, 0.07, 6), 'aur_wood', '#5a3f2c', { p: [p[0], p[1] - 0.04, p[2]] });
  m.add(paint(flat(lathe([[0.1, -0.5], [0.2, -0.42], [0.21, -0.2], [0.12, -0.08]], 7)), (q) => mix('#d8ffb0', '#ffffff', (q.y + 0.5) * 2)), 'glass', undefined, { p });
  for (let i = 0; i < 4; i++) m.add(flat(ico(0.045, 0)), glow, '#f4ffc0', { p: [p[0] + Math.cos(i * 1.9) * 0.08, p[1] - 0.16 - i * 0.07, p[2] + Math.sin(i * 1.9) * 0.08] });
  m.add(flat(ico(0.1, 0)), glow, '#f4ffc0', { p: [p[0], p[1] - 0.3, p[2]] });
  put(m, cyl(0.11, 0.11, 0.04, 6), 'aur_wood', '#5a3f2c', { p: [p[0], p[1] - 0.52, p[2]] });
}

function corrimaoMadeira(rand: Rand): Model {
  const m = new Model();
  const wood = jit(pick(rand, ['#7a5236', '#6a4a3a', '#8a6240']), rand);
  const xs = [-2.85, 0, 2.85];
  const tall = rand() < 0.5 ? 0 : 2;
  xs.forEach((x, i) => {
    const h = i === tall ? rr(rand, 2.7, 3.0) : rr(rand, 1.25, 1.4);
    put(m, flat(cyl(0.13, 0.17, h + 0.1, 6)), 'aur_bark', wood, { p: [x, h / 2 - 0.05, 0], r: [0, rand(), rr(rand, -0.03, 0.03)] }, 0.35, lite(wood, 0.25));
    put(m, flat(lathe([[0.16, 0], [0.2, 0.1], [0.01, 0.3]], 6)), 'aur_bark', lite(wood, 0.15), { p: [x, h, 0] });
    for (const y of [0.62, 1.12]) put(m, xf(torus(0.17, 0.035, 4, 7), { r: [Math.PI / 2, 0, 0], p: [x, y, 0] }), 'aur_hay', '#d9c08a');
    if (i === tall) {
      const sz = rand() < 0.5 ? -1 : 1;
      put(m, tube([[x, h - 0.5, 0], [x, h - 0.05, sz * 0.25], [x, h - 0.1, sz * 0.6], [x, h - 0.3, sz * 0.72]], 0.04, 6, 4), 'aur_bark', wood);
      fireflyLantern(m, [x, h - 0.32, sz * 0.72], 'glow_green');
    }
  });
  for (let i = 0; i < 2; i++) {
    for (const y of [1.12, 0.62]) put(m, rope([xs[i]!, y, 0], [xs[i + 1]!, y, 0], y > 1 ? 0.16 : 0.1, 0.04, 6, 4), 'aur_hay', '#d9c08a', undefined, 0.2);
    for (let k = 1; k < 5; k++) {
      const x = xs[i]! + (k / 5) * 2.85, s = 4 * (k / 5) * (1 - k / 5);
      put(m, rod([x, 1.12 - 0.16 * s, 0], [x, 0.62 - 0.1 * s, 0], 0.02, 3), 'aur_hay', '#c9ae78');
    }
    put(m, box(2.7, 0.14, 0.06), 'aur_wood', dark(wood, 0.1), { p: [(xs[i]! + xs[i + 1]!) / 2, 0.2, 0], r: [0, 0, rr(rand, -0.02, 0.02)] });
  }
  leafBlob(m, 0.3, [xs[1]! + 0.2, 0.1, 0.1], MOSS, rand() * 9, 0, [1.4, 0.5, 1.2]);
  return fin(m);
}

function arcoCaverna(rand: Rand, span = 20): Model {
  const m = new Model();
  const hw = span / 2, depth = 10, spring = 6.3, rise = rr(rand, 2.4, 3.2);
  const seed = rand() * 40;
  const inner = openingProf(hw, spring, rise, 10);
  const zs = [depth / 2, depth / 4, 0, -depth / 4, -depth / 2];
  const cy = 3;
  const outer = (i: number, zi: number): P2 => {
    const p = inner[i]!;
    const z = zs[zi]!;
    const edge = zi === 0 || zi === zs.length - 1 ? 0.7 : 1;
    const T = (3.2 + 3.6 * fbm3(p[0] * 0.12 + seed, p[1] * 0.16, z * 0.2 + seed)) * edge;
    if (i === 0 || i === inner.length - 1) {
      const q = inner[i === 0 ? 1 : i - 1]!;
      return [p[0] + Math.sign(p[0]) * (3.2 + 3.6 * fbm3(q[0] * 0.12 + seed, q[1] * 0.16, z * 0.2 + seed)) * edge * 1.1, -0.1];
    }
    const dx = p[0], dy = (p[1] - cy) * 1.4;
    const l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / l) * T, Math.max(0.6, p[1] + (dy / l) * T + (p[1] > spring ? 0.8 : 0))];
  };
  const g = shell(inner, outer, zs);
  const top = spring + rise + 6;
  m.add(strata(g, ['#4a4770', '#63608e', '#7d79a8', '#666e9c', '#8a8ab8', '#a4a0cc'], 0, top, seed, 1.4), 'aur_rock');
  const glow = pick(rand, GLOWS), glow2 = pick(rand, GLOWS);
  for (const sz of [-1, 1]) {
    // estalactites acima do vão (pontas ≥ 6,9 m)
    for (let i = 0; i < 5; i++) {
      const x = (i / 4 - 0.5) * hw * 1.1, yTop = spring + rise * Math.sqrt(Math.max(0, 1 - (x / hw) ** 2)) + 0.3;
      const len = Math.min(yTop - 6.9, rr(rand, 0.9, 1.7));
      put(m, flat(lathe([[0.01, -len], [0.28, 0], [0.3, 0.4]], 5)), 'aur_rock', '#66648c', { p: [x, yTop, sz * (depth / 2 - rr(rand, 0.4, 1.6))] }, 0.3);
    }
    // cristais nos pés e na coroa
    for (const sx of [-1, 1]) {
      const bx = sx * (hw + rr(rand, 3.4, 4.2));
      prisma(m, rr(rand, 3.0, 4.4), 0.55, glow, { p: [bx, 0, sz * (depth / 2 + 0.6)], r: [sz * 0.25, rand(), -sx * 0.2] }, rand());
      prisma(m, rr(rand, 1.6, 2.4), 0.36, glow2, { p: [bx + sx * 1.1, 0, sz * (depth / 2 + 0.9)], r: [sz * 0.45, rand(), -sx * 0.45] }, rand());
      prisma(m, rr(rand, 1.8, 2.8), 0.4, glow, { p: [sx * hw * rr(rand, 0.7, 1.0), spring + rise + rr(rand, 1.0, 2.2), sz * (depth / 2 - 0.9)], r: [sz * 1.0, rand(), -sx * 0.5] }, rand());
      cogumelo(m, rand, [bx - sx * 1.6, 0, sz * (depth / 2 + 1.1)], rr(rand, 0.7, 1.2), 'glow_green');
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = (i / 5 - 0.5) * span * 1.05;
    leafBlob(m, rr(rand, 2.2, 3.4), [x, spring + rise + rr(rand, 2.4, 3.6) - Math.abs(x) * 0.14, rr(rand, -2.5, 2.5)], pick(rand, ['#2f8a5a', '#1f7a6a', '#3f9a4a']), rand() * 30, 1, [1.4, 0.45, 1.3]);
  }
  return fin(m);
}

const PLANT_PIVOT: V3 = [0, 0.55, 0];
function plantaBase(rand: Rand): Model {
  const m = new Model();
  const c = jit(pick(rand, ['#0f7a4e', '#1a6f3c', '#0b7a70']), rand);
  put(m, flat(lathe([[0.01, -0.05], [0.42, 0], [0.55, 0.3], [0.38, 0.62], [0.2, 0.6]], 8)), 'std', jit('#7a4f9a', rand), undefined, 0.35, '#c08ae0');
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand() * 0.3, L = rr(rand, 1.2, 1.7);
    const pts: V3[] = [0, 0.3, 0.6, 0.85, 1].map((t) => [Math.cos(a) * (0.3 + t * L), 0.3 + Math.sin(t * Math.PI * 0.85) * 0.75 - t * 0.2, Math.sin(a) * (0.3 + t * L)] as V3);
    m.add(tone(strip(pts, (t) => 0.34 * Math.sin(Math.PI * (0.12 + 0.88 * t)) + 0.02, [-Math.sin(a), 0, Math.cos(a)], 0.35), c, 0.35, lite(c, 0.12)), 'leaf');
  }
  return fin(m);
}
function plantaTopo(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 3.4, 4.2);
  const glow = pick(rand, GLOWS);
  const [deep, pale] = HUE[glow]!;
  const c = jit('#168a50', rand);
  const bend = rr(rand, 0.35, 0.6);
  const ax = (t: number): V3 => [Math.sin(t * 2.2) * bend, t * H, Math.sin(t * 3.1 + 1) * bend * 0.4];
  put(m, tube([ax(0), ax(0.25), ax(0.5), ax(0.75), ax(1)], (t) => 0.13 - 0.07 * t, 8, 6), 'std', c, undefined, 0.3, lite(c, 0.3));
  for (let i = 0; i < 3; i++) {
    const t = 0.3 + i * 0.2, p = ax(t), a = i * 2.1;
    for (const s of [0, Math.PI]) {
      const pts: V3[] = [0, 0.35, 0.7, 1].map((u) => [p[0] + Math.cos(a + s) * u * 0.95, p[1] + Math.sin(u * 2.4) * 0.38, p[2] + Math.sin(a + s) * u * 0.95] as V3);
      m.add(tone(strip(pts, (u) => 0.22 * Math.sin(Math.PI * (0.1 + 0.9 * u)) + 0.02, [-Math.sin(a + s), 0, Math.cos(a + s)], 0.3), c, 0.3, lite(c, 0.12)), 'leaf');
    }
  }
  // flor-sino luminosa com pétalas e estames
  const top = ax(1);
  const bell = flat(lathe([[0.05, 0.1], [0.34, -0.05], [0.5, -0.5], [0.62, -0.75]], 8));
  m.add(paint(bell, (q) => mix(pale, deep, Math.min(1, -q.y / 0.75) * 0.7)), SOFT[glow]!, undefined, { p: top, r: [0.5, 0, 0.3] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const pts: V3[] = [0, 0.5, 1].map((u) => [top[0] + Math.cos(a) * (0.2 + u * 0.75), top[1] + 0.12 + Math.sin(u * 2.6) * 0.35, top[2] + Math.sin(a) * (0.2 + u * 0.75)] as V3);
    m.add(tone(strip(pts, (u) => 0.2 * Math.sin(Math.PI * (0.15 + 0.85 * u)) + 0.01, [-Math.sin(a), 0, Math.cos(a)], 0.3), deep, 0.2, pale), 'leaf');
  }
  m.add(flat(ico(0.16, 0)), glow, '#ffffff', { p: [top[0] - 0.25, top[1] - 0.85, top[2] + 0.4] });
  return fin(m);
}

function samambaia(rand: Rand): Model {
  const m = new Model();
  const c = jit(pick(rand, ['#1a8a44', '#0f7a56', '#2f9a2c', '#0f7a76']), rand);
  const n = 9 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rr(rand, -0.2, 0.2), L = rr(rand, 1.1, 1.7) * (i % 2 ? 0.7 : 1), up = rr(rand, 0.6, 1.0) * (i % 2 ? 1.35 : 1);
    const segs = 10;
    const pts: V3[] = Array.from({ length: segs + 1 }, (_, k) => { const t = k / segs; return [Math.cos(a) * (0.08 + t * L), 0.05 + Math.sin(t * Math.PI * 0.8) * up, Math.sin(a) * (0.08 + t * L)] as V3; });
    const g = strip(pts, (t) => (0.3 * Math.sin(Math.PI * (0.1 + 0.88 * t)) + 0.02) * (Math.round(t * segs) % 2 ? 1 : 0.55), [-Math.sin(a), 0, Math.cos(a)], 0.3);
    m.add(tone(g, c, 0.4, lite(c, 0.15)), 'leaf');
  }
  put(m, flat(ico(0.16, 0)), 'aur_bark', '#5a4030', { p: [0, 0.06, 0], s: [1.2, 0.8, 1.2] });
  if (rand() < 0.6) m.add(flat(ico(0.08, 0)), 'glow_green', '#d8ffb0', { p: [0.1, 0.5, 0.05] });
  return fin(m);
}

function troncoCaido(rand: Rand): Model {
  const m = new Model();
  const L = rr(rand, 5, 7), r = rr(rand, 0.62, 0.82);
  const bark = jit(pick(rand, BARK), rand);
  const g = loft(7, 10, (t, a) => {
    const rad = r * (1 - 0.18 * t) * (1 + 0.1 * Math.sin(a * 4 + t * 5));
    return [-L / 2 + t * L, r * 0.92 + Math.sin(a) * rad + 0.12 * Math.sin(t * 3), Math.cos(a) * rad + 0.25 * Math.sin(t * 2.4)];
  }, false, false);
  put(m, g, 'aur_bark', bark, undefined, 0.35, mix(bark, MOSS, 0.35));
  for (const [t, sgn] of [[0, -1], [1, 1]] as const) {
    const rad = r * (1 - 0.18 * t), x = -L / 2 + t * L, y = r * 0.92 + 0.12 * Math.sin(t * 3), z = 0.25 * Math.sin(t * 2.4);
    put(m, cyl(rad * 0.97, rad * 0.97, 0.06, 10), 'aur_wood', '#c9a878', { p: [x + sgn * 0.01, y, z], r: [0, 0, Math.PI / 2] }, 0.1);
    put(m, cyl(rad * 0.55, rad * 0.55, 0.07, 8), 'std', '#2a1c1c', { p: [x + sgn * 0.015, y - 0.03, z], r: [0, 0, Math.PI / 2] }, 0.05);
  }
  for (let i = 0; i < 3; i++) {
    const x = rr(rand, -L * 0.35, L * 0.35), a = rr(rand, 0.3, 1.2) * (i % 2 ? 1 : -1);
    put(m, rod([x, r, 0], [x + rr(rand, -0.3, 0.3), r + Math.cos(a) * (r + 0.6), Math.sin(a) * (r + 0.6)], 0.16, 5, 0.1), 'aur_bark', bark, undefined, 0.3);
  }
  for (let i = 0; i < 4; i++) leafBlob(m, rr(rand, 0.45, 0.8), [rr(rand, -L * 0.4, L * 0.4), r * 1.75, rr(rand, -0.2, 0.3)], MOSS, rand() * 20, 0, [1.5, 0.35, 1.1]);
  const glow = pick(rand, GLOWS);
  for (let i = 0; i < 3; i++) shelfMushroom(m, [rr(rand, -L * 0.3, L * 0.3), r * rr(rand, 0.8, 1.3), r * 0.85 + 0.2], Math.PI / 2 * -1, rr(rand, 0.3, 0.5), glow);
  return fin(m);
}

function pedraMusgo(rand: Rand): Model {
  const m = new Model();
  const r = rr(rand, 1.1, 1.6), seed = rand() * 40;
  const base = jit('#5c5a7c', rand);
  const g = rockGeo(r, seed, [1.15, 0.78, 1], 2, 0.3);
  g.translate(0, r * 0.62, 0);
  m.add(paint(g, (p, n) => {
    const moss = Math.max(0, Math.min(1, (n.y - 0.45) * 3 + (n3(p.x * 2, p.y * 2, p.z * 2) - 0.5)));
    return mix(mix(dark(base, 0.4), lite(base, 0.25), p.y / (r * 1.3)), mix(MOSS, '#a8d84a', n3(p.x * 3, 1, p.z * 3)), moss);
  }), 'aur_rock');
  const a = rand() * TAU;
  put(m, rockGeo(r * 0.45, seed + 5, [1.1, 0.7, 1], 1, 0.25), 'aur_rock', base, { p: [Math.cos(a) * r * 1.1, r * 0.26, Math.sin(a) * r * 1.1] }, 0.35);
  cogumelo(m, rand, [Math.cos(a + 2) * r * 1.05, 0, Math.sin(a + 2) * r * 1.05], rr(rand, 0.35, 0.55), pick(rand, GLOWS));
  cogumelo(m, rand, [Math.cos(a + 2.5) * r * 1.2, 0, Math.sin(a + 2.5) * r * 1.2], rr(rand, 0.2, 0.3), pick(rand, GLOWS));
  return fin(m);
}

function totem(rand: Rand): Model {
  const m = new Model();
  const wood = jit(pick(rand, ['#7a5236', '#6a4a3a', '#8a5a34']), rand);
  const pal = pick(rand, [['#1f9a8a', '#e8a531', '#d8473c'], ['#3f7fd0', '#f2d24a', '#e0683c'], ['#8a4fb8', '#4fd0b0', '#f2a03c']]);
  const eye = pick(rand, ['glow_cyan', 'glow_green', 'glow_violet'] as const);
  put(m, flat(cyl(0.95, 1.1, 0.5, 8)), 'aur_stone', '#6a6884', { p: [0, 0.2, 0] }, 0.3);
  let y = 0.45;
  const hs = [rr(rand, 1.3, 1.5), rr(rand, 1.2, 1.4), rr(rand, 1.0, 1.2)];
  hs.forEach((h, i) => {
    const r = 0.72 - i * 0.07;
    put(m, flat(lathe([[r * 0.9, 0], [r, h * 0.15], [r, h * 0.85], [r * 0.88, h]], 8)), 'aur_bark', wood, { p: [0, y, 0], r: [0, Math.PI / 8, 0] }, 0.3, lite(wood, 0.25));
    put(m, flat(cyl(r + 0.06, r + 0.06, 0.14, 8)), 'std', pal[i]!, { p: [0, y + h - 0.02, 0], r: [0, Math.PI / 8, 0] }, 0.2);
    const fz = r * 0.92;
    // rosto estilizado: sobrancelha, olhos luminosos, nariz e boca entalhados
    put(m, cbox(r * 1.5, 0.16, 0.22, 0.04), 'aur_wood', dark(wood, 0.3), { p: [0, y + h * 0.72, fz], r: [0, 0, i % 2 ? 0 : 0] });
    for (const sx of [-1, 1]) {
      put(m, cyl(0.2, 0.2, 0.1, 8), 'std', pal[(i + 1) % 3]!, { p: [sx * r * 0.42, y + h * 0.52, fz], r: [Math.PI / 2, 0, 0] });
      m.add(cyl(0.11, 0.11, 0.06, 8), eye, '#ffffff', { p: [sx * r * 0.42, y + h * 0.52, fz + 0.05], r: [Math.PI / 2, 0, 0] });
    }
    put(m, flat(lathe([[0.01, 0], [0.14, 0.05], [0.09, 0.4], [0.01, 0.42]], 4)), 'aur_wood', lite(wood, 0.2), { p: [0, y + h * 0.3, fz + 0.03], r: [-0.15, Math.PI / 4, 0] });
    if (i === 0) {
      put(m, cbox(r * 0.95, 0.2, 0.14, 0.04), 'std', '#2a1c1c', { p: [0, y + h * 0.18, fz + 0.02] });
      for (let k = 0; k < 4; k++) put(m, box(0.1, 0.12, 0.08), 'std', '#f3ead8', { p: [-0.21 + k * 0.14, y + h * 0.2, fz + 0.08] });
    } else {
      put(m, xf(torus(0.2, 0.05, 4, 6, Math.PI), { p: [0, y + h * 0.2, fz + 0.04], r: [0, 0, i === 1 ? Math.PI : 0] }), 'std', pal[2]!);
    }
    y += h;
  });
  // asas-folha do segmento do meio e coroa com cristal
  const wy = 0.45 + hs[0]! + hs[1]! * 0.55;
  for (const sx of [-1, 1]) {
    const pts: V3[] = [0, 0.4, 0.75, 1].map((t) => [sx * (0.55 + t * 1.35), wy + Math.sin(t * 2.2) * 0.55, -0.05] as V3);
    m.add(tone(strip(pts, (t) => 0.42 * Math.sin(Math.PI * (0.25 + 0.72 * t)) + 0.02, [0, 1, 0]), pal[0]!, 0.25, lite(pal[1]!, 0.2)), 'aur_cloth');
    put(m, rod([sx * 0.5, wy, -0.05], [sx * 1.85, wy + 0.42, -0.05], 0.05, 4), 'aur_wood', dark(wood, 0.2));
  }
  put(m, flat(lathe([[0.5, 0], [0.62, 0.12], [0.3, 0.3]], 8)), 'aur_bark', lite(wood, 0.1), { p: [0, y, 0] });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI - Math.PI / 2; put(m, flat(lathe([[0.09, 0], [0.01, 0.55]], 4)), 'std', pal[i % 3]!, { p: [Math.sin(a) * 0.42, y + 0.15, -0.05], r: [0, 0, -a * 0.6] }); }
  prisma(m, 0.75, 0.16, eye === 'glow_green' ? 'glow_cyan' : eye, { p: [0, y + 0.25, 0], r: [0, 0.4, 0] }, rand());
  return fin(m);
}

export const BOSQUE_PROPS: PropLibrary = {
  'arvore-gigante': { radius: 7.5, collider: { radius: 2.8, height: 14 }, build: arvoreGigante },
  'arvore-bosque': { radius: 2.6, collider: { radius: 0.65, height: 6 }, build: arvoreBosque },
  'cristal-grande': { radius: 2.6, collider: { radius: 1.5, height: 4 }, build: (rand) => cristais(rand, 5 + Math.floor(rand() * 3), 3, 6, 1.5, true) },
  'cristal-pequeno': { radius: 0.9, collider: { radius: 0.5, height: 1.2 }, build: (rand) => cristais(rand, 3 + Math.floor(rand() * 2), 0.6, 1.5, 0.45, false) },
  'cogumelo-luminoso': { radius: 1.3, collider: { radius: 0.4, height: 1.8 }, build: cogumeloLuminoso },
  cachoeira: { radius: 9, collider: { radius: 6.5, height: 16 }, build: cachoeira },
  'ponte-madeira-corrimao': { radius: 3.1, collider: { radius: 0.3, height: 1.4 }, build: corrimaoMadeira },
  'arco-caverna': { radius: 6, build: arcoCaverna },
  'planta-dancarina': { radius: 1.8, build: plantaBase, animated: { build: plantaTopo, pivot: PLANT_PIVOT, motion: { kind: 'sway', axis: 'z', angle: 0.16, period: 3.4 } } },
  samambaia: { radius: 1.4, build: samambaia },
  'tronco-caido': { radius: 3.4, collider: { radius: 1.1, height: 1.5 }, build: troncoCaido },
  'pedra-musgo': { radius: 1.9, collider: { radius: 1.3, height: 1.6 }, build: pedraMusgo },
  'totem-bosque': { radius: 1.5, collider: { radius: 0.95, height: 4.2 }, build: totem },
};
