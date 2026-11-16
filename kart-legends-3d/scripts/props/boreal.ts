/**
 * PICO BOREAL — montanhas congeladas, gelo translúcido e abrigos de expedição (Copa Eclipse).
 */
import { Model, box, cone, cyl, extrude, gradY, ico, mix, plane, torus, tube, warp, type V3 } from '../lib/geo';
import { TAU, archOutline, blob, capped, loft, ngon, pick, polar, prism, rectPts, revolve, ri, rr, shade, uvBox, vary, wobbleRing, type P2, type Rand } from './kit-eclipse';
import type { PropLibrary } from './types';

const NEVE = '#f4f8ff', NEVE_SOMBRA = '#b9cdf0', GELO_A = '#7fc4f0', GELO_B = '#e4f6ff';
const neve = (y0: number, y1: number) => shade(NEVE_SOMBRA, NEVE, y0, y1, 0.12);

/** Monte de neve baixo (base de objetos). */
function monte(m: Model, rand: Rand, r: number, h: number, p: V3 = [0, 0, 0]): void {
  m.add(blob(r, rand, { detail: 1, s: [1, h / r, 1], jitter: 0.12, faceted: false, fn: (q) => { if (q.y < 0) q.y *= 0.15; } }), 'ecl_neve', neve(0, h), { p });
}

/** Pingente de gelo apontando para baixo a partir de (x, y, z). */
function pingente(m: Model, rand: Rand, x: number, y: number, z: number, len: number, r = 0.09): void {
  m.add(loft([{ y: 0.05, pts: ngon(r, 5) }, { y: -len * 0.5, pts: ngon(r * 0.6, 5, 0.5) }, { y: -len, pts: ngon(0.005, 5).map(([a, b]) => [a + rr(rand, -0.03, 0.03), b] as P2) }]), 'ecl_gelo', gradY(GELO_B, GELO_A, -len, 0), { p: [x, y, z] });
}

/** Lasca/prisma de gelo facetado com ponta. */
function lasca(m: Model, rand: Rand, r: number, h: number, x: Parameters<Model['add']>[3], mat = 'ecl_gelo'): void {
  const n = ri(rand, 5, 6), rot = rand() * 3, lean: P2 = [rr(rand, -0.15, 0.15) * h, rr(rand, -0.15, 0.15) * h];
  m.add(loft([
    { y: -0.15, pts: ngon(r, n, rot) },
    { y: h * 0.62, pts: ngon(r * 0.78, n, rot + 0.2).map(([a, b]) => [a + lean[0] * 0.6, b + lean[1] * 0.6] as P2) },
    { y: h, pts: ngon(r * 0.06, n, rot).map(([a, b]) => [a + lean[0], b + lean[1]] as P2) },
  ], { uv: 2 }), mat, gradY(GELO_A, GELO_B, 0, h), x);
}

function pinheiroNevado(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 8, 14), R = H * rr(rand, 0.2, 0.25), tiers = ri(rand, 5, 6);
  const verde = vary('#1f6a58', rand, 0.06), lean = rr(rand, -0.25, 0.25);
  m.add(loft([{ y: -0.2, pts: ngon(R * 0.2, 7) }, { y: H * 0.3, pts: ngon(R * 0.13, 7, 0.3) }, { y: H * 0.9, pts: ngon(0.03, 7) }], { uv: 2 }), 'ecl_madeira', gradY('#4a3328', '#7a5a44', 0, H * 0.4));
  monte(m, rand, R * 0.9, 0.35);
  const n = 12;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1), y = H * (0.2 + t * 0.62), r = R * (1 - t * 0.74), h = (H * 0.78) / tiers * 1.55, rot = rand() * TAU;
    const cx = lean * t * t, droop = h * 0.32;
    const star = (k: number, amp: number): P2[] => Array.from({ length: n }, (_, j) => { const a = rot + (j / n) * TAU, rk = r * k * (j % 2 ? 1 - amp : 1) * rr(rand, 0.94, 1.06); return [Math.cos(a) * rk + cx, Math.sin(a) * rk] as P2; });
    const ringsFolha = [{ y: y + h, pts: star(0.06, 0) }, { y: y + h * 0.45, pts: star(0.62, 0.22) }, { y: y - droop * 0.2, pts: star(1, 0.34) }, { y: y - droop, pts: star(0.86, 0.5) }, { y: y - droop * 0.3, pts: star(0.3, 0) }];
    m.add(loft(ringsFolha), 'matte', shade(mix(verde, '#06182a', 0.5), mix(verde, '#8fe0b8', 0.2), y - droop, y + h, 0.35));
    // neve assentada por cima dos galhos
    const sn = [{ y: y + h + 0.2, pts: star(0.1, 0) }, { y: y + h * 0.45 + 0.34, pts: star(0.72, 0.3) }, { y: y - droop * 0.05 + 0.34, pts: star(1.0, 0.6) }, { y: y - droop * 0.4 + 0.1, pts: star(0.92, 0.72) }];
    m.add(loft(sn, { uv: 2 }), 'ecl_neve', neve(y - droop, y + h));
  }
  m.add(blob(R * 0.14, rand, { detail: 1, s: [1, 1.5, 1], faceted: false }), 'ecl_neve', NEVE, { p: [lean, H * 0.95, 0] });
  return m;
}

function rochaGelo(rand: Rand): Model {
  const m = new Model();
  const r = rr(rand, 1.3, 2.1), sy = rr(rand, 0.8, 1.2);
  m.add(blob(r, rand, { detail: 1, jitter: 0.3, s: [1.1, sy, 0.9], fn: (p) => { p.y = Math.max(p.y, -r * 0.42); } }), 'ecl_gelo', shade(GELO_A, GELO_B, -r * 0.4, r * sy), { p: [0, r * 0.36, 0] });
  m.add(blob(r * 0.5, rand, { detail: 1, jitter: 0.3 }), 'ecl_gelo_solido', '#bfe9ff', { p: [0, r * 0.55, 0] });
  const k = ri(rand, 2, 4);
  for (let i = 0; i < k; i++) { const a = rand() * TAU; lasca(m, rand, r * rr(rand, 0.22, 0.34), r * rr(rand, 0.9, 1.5), { p: polar(a, r * 0.85, 0.12), r: [rr(rand, -0.25, 0.25), 0, rr(rand, -0.25, 0.25)] }); }
  m.add(blob(r * 0.62, rand, { detail: 1, s: [1.15, 0.3, 0.95], faceted: false }), 'ecl_neve', neve(-0.3, 0.3), { p: [0, r * 0.4 + r * sy * 0.82, 0] });
  monte(m, rand, r * 1.25, 0.3);
  return m;
}

function arcoGelo(rand: Rand, span = 16): Model {
  const m = new Model();
  const half = span / 2 + 0.5, spring = 6.5, rise = Math.min(3.4, span * 0.17);
  const teto = (x: number): number => spring + rise * Math.sqrt(Math.max(0, 1 - (x / half) ** 2));
  // cinco costelas de gelo com contorno externo irregular (caverna escalonada)
  for (let i = 0; i < 5; i++) {
    const side = rr(rand, 2.6, 4.8), over = rr(rand, 1.8, 3.6), ph = rand() * 6, W = half + side, top = spring + rise + over, N = 12;
    const pts: P2[] = [];
    for (let k = 0; k <= N; k++) {
      const a = Math.PI * (1 - k / N), j = k === 0 || k === N ? 1 : 1 + 0.1 * Math.sin(k * 2.3 + ph) + 0.07 * Math.sin(k * 5.1 + ph * 2);
      pts.push([Math.cos(a) * W * j, k === 0 || k === N ? 0 : Math.sin(a) ** 0.55 * top * j]);
    }
    pts.push([half, 0], [half, spring]);
    for (let k = 1; k < 10; k++) pts.push([Math.cos((k / 10) * Math.PI) * half, spring + Math.sin((k / 10) * Math.PI) * rise]);
    pts.push([-half, spring], [-half, 0]);
    m.add(uvBox(extrude(pts, 2.44), 5), 'ecl_gelo_solido', capped(NEVE, shade('#5aa6e0', '#c6ecff', 0, top), 0.5), { p: [0, 0, -4.8 + i * 2.4] });
  }
  // estalactites no teto (sempre acima de 6,2 m dentro do vão)
  const n = Math.round(span * 1.1);
  for (let i = 0; i < n; i++) {
    const x = rr(rand, -0.92, 0.92) * (half - 0.5), z = rr(rand, -5.6, 5.6), y = teto(x) + 0.1;
    const len = Math.min(rr(rand, 0.6, 2.6), y - 6.25);
    if (len > 0.3) pingente(m, rand, x, y, z, len, rr(rand, 0.12, 0.26));
  }
  // cristais e neve do lado de fora
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) lasca(m, rand, rr(rand, 0.4, 0.8), rr(rand, 2, 4.5), { p: [s * (half + rr(rand, 3.4, 4.6)), 0.2, rr(rand, -5, 5)], r: [0, 0, -s * rr(rand, 0, 0.3)] });
    monte(m, rand, 2.4, 0.8, [s * (half + 3.6), 0, 5.6]);
    monte(m, rand, 2.4, 0.8, [s * (half + 3.6), 0, -5.6]);
  }
  for (let k = 0; k < 4; k++) m.add(blob(rr(rand, 1.6, 2.6), rand, { detail: 1, s: [1.3, 0.4, 1.2], faceted: false }), 'ecl_neve', neve(-1, 1), { p: [rr(rand, -0.6, 0.6) * half, spring + rise + 2.6, -4.5 + k * 3] });
  return m;
}

function cabanaNeve(rand: Rand): Model {
  const m = new Model();
  const W = rr(rand, 5.4, 6.4), D = rr(rand, 4.4, 5), hw = rr(rand, 2.5, 2.9), hr = rr(rand, 2.1, 2.6), zf = D / 2;
  const mad = vary('#9a6a48', rand, 0.06);
  monte(m, rand, W * 0.78, 0.4);
  m.add(uvBox(box(W, hw, D), 2.2), 'ecl_madeira', shade(mix(mad, '#2a1a14', 0.45), mad, 0, hw), { p: [0, hw / 2, 0], r: [0, 0, 0] });
  // toras salientes nos cantos
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let k = 0; k < 5; k++) {
    const horiz = k % 2 === 0;
    m.add(cyl(0.17, 0.17, 0.7, 6), 'ecl_madeira', k % 2 ? '#c99a6a' : '#7a5238', { p: [sx * (W / 2 + (horiz ? 0.12 : -0.1)), 0.3 + k * (hw / 5), sz * (D / 2 + (horiz ? -0.1 : 0.12))], r: horiz ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0] });
  }
  // telhado de duas águas com manto de neve
  const ov = 0.55, tri: P2[] = [[-W / 2 - ov, 0], [0, hr], [W / 2 + ov, 0]];
  m.add(uvBox(extrude([[-W / 2, 0], [0, hr - 0.3], [W / 2, 0]], D - 0.02), 2.2), 'ecl_madeira', mad, { p: [0, hw, 0] });
  m.add(extrude([tri[0]!, [-W / 2 - ov, 0.16], [0, hr + 0.16], [W / 2 + ov, 0.16], tri[2]!, [0, hr]], D + 0.9), 'ecl_madeira', '#5a3a2a', { p: [0, hw - 0.1, 0] });
  const sl = Math.atan2(hr, W / 2 + ov), L = Math.hypot(hr, W / 2 + ov);
  for (const s of [-1, 1]) {
    m.add(box(L * 0.98, 0.34, D + 1.2, 0.16, 1), 'ecl_neve', neve(-0.2, 0.2), { p: [s * (W / 4 + ov / 2), hw + hr / 2 + 0.22, 0], r: [0, 0, -s * sl] });
    for (let k = 0; k < 7; k++) pingente(m, rand, s * (W / 2 + ov - 0.05), hw + 0.05, -D / 2 - 0.3 + k * ((D + 0.6) / 6), rr(rand, 0.25, 0.7), 0.06);
  }
  m.add(blob(0.5, rand, { detail: 1, s: [0.8, 0.6, (D + 1.2) / 1.1], faceted: false }), 'ecl_neve', NEVE, { p: [0, hw + hr + 0.28, 0] });
  // chaminé de pedra
  const cx = W * 0.24;
  m.add(uvBox(prism(rectPts(0.95, 0.95, 0.12), hw + 0.4, hw + hr + 1.3, { top: 0.88, at: [cx, -D * 0.2] }), 1.6), 'ecl_pedra', shade('#6d6a78', '#b5b3c4', hw, hw + hr + 1.3));
  m.add(box(1.05, 0.2, 1.05, 0.08, 1), 'ecl_neve', NEVE, { p: [cx, hw + hr + 1.4, -D * 0.2] });
  // porta, janela acesa e venezianas
  m.add(box(1.15, 2.0, 0.14), 'ecl_madeira', gradY('#4a2f2a', '#7a4d38', 0, 2), { p: [-W * 0.2, 1.0, zf + 0.04] });
  m.add(box(1.4, 0.16, 0.24), 'ecl_madeira', '#5a3a2a', { p: [-W * 0.2, 2.1, zf + 0.08] });
  m.add(ico(0.06, 0), 'glossy', '#e8c66a', { p: [-W * 0.2 + 0.4, 1.0, zf + 0.14] });
  m.add(box(1.7, 0.22, 0.8), 'ecl_madeira', '#7a5238', { p: [-W * 0.2, 0.2, zf + 0.4] });
  const jan = (x: number, z: number, ry: number): void => {
    const g = new Model();
    g.add(box(1.3, 1.1, 0.1), 'glow_warm', '#ffffff');
    g.add(box(1.46, 0.1, 0.16), 'ecl_madeira', '#5a3a2a', { p: [0, 0.6, 0.02] });
    g.add(box(1.5, 0.12, 0.3), 'ecl_neve', NEVE, { p: [0, -0.58, 0.1] });
    g.add(box(0.07, 1.1, 0.14), 'ecl_madeira', '#5a3a2a', { p: [0, 0, 0.03] });
    g.add(box(1.3, 0.07, 0.14), 'ecl_madeira', '#5a3a2a', { p: [0, 0, 0.03] });
    for (const s of [-1, 1]) g.add(box(0.36, 1.2, 0.07), 'paint', '#3c7a70', { p: [s * 0.86, 0, 0.04] });
    m.addModel(g, { p: [x, 1.5, z], r: [0, ry, 0] });
  };
  jan(W * 0.2, zf + 0.03, 0);
  jan(W / 2 + 0.03, 0, Math.PI / 2);
  jan(-W / 2 - 0.03, 0, -Math.PI / 2);
  // lenha empilhada
  for (let k = 0; k < 6; k++) m.add(cyl(0.14, 0.14, 0.9, 6), 'ecl_madeira', k % 2 ? '#c99a6a' : '#8a5e40', { p: [W / 2 + 0.55, 0.2 + Math.floor(k / 3) * 0.27, zf - 0.6 - (k % 3) * 0.3 + Math.floor(k / 3) * 0.15], r: [0, 0, Math.PI / 2] });
  return m;
}

function estalagmiteGelo(rand: Rand): Model {
  const m = new Model();
  const k = ri(rand, 5, 7);
  monte(m, rand, 1.5, 0.3);
  lasca(m, rand, rr(rand, 0.4, 0.55), rr(rand, 2.6, 3.8), { p: [0, 0, 0] });
  for (let i = 0; i < k; i++) {
    const a = (i / k) * TAU + rand(), d = rr(rand, 0.5, 1.15);
    lasca(m, rand, rr(rand, 0.18, 0.36), rr(rand, 0.8, 2.2), { p: polar(a, d, 0), r: [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2] });
  }
  return m;
}

function cristalGelo(rand: Rand): Model {
  const m = new Model();
  const k = ri(rand, 4, 6);
  monte(m, rand, 1.1, 0.25);
  for (let i = 0; i < k; i++) {
    const a = (i / k) * TAU + rand(), d = i === 0 ? 0 : rr(rand, 0.3, 0.6), h = i === 0 ? rr(rand, 1.8, 2.4) : rr(rand, 0.8, 1.6), r = h * 0.17;
    const tilt: V3 = i === 0 ? [0, rand(), 0] : [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5];
    const g = new Model();
    g.add(prism(ngon(r, 6), 0, h * 0.74, { top: 0.9, cap: 'none' }), 'ecl_gelo', gradY('#8fdcff', GELO_B, 0, h));
    g.add(prism(ngon(r * 0.9, 6), h * 0.74, h, { top: 0.04, cap: 'none' }), 'ecl_gelo', GELO_B);
    g.add(prism(ngon(r * 0.4, 6), 0.1, h * 0.86, { top: 0.3, cap: 'none' }), 'glow_cyan', '#ffffff');
    m.addModel(g, { p: polar(a, d, -0.05), r: tilt });
  }
  return m;
}

function picoRochoso(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 30, 50), R = rr(rand, 13, 17);
  const cor = (h: number) => (p: { x: number; y: number; z: number }, n: { y: number }) => {
    const strata = Math.sin(p.y * 0.9 + Math.sin(p.x * 0.2 + p.z * 0.15) * 2) * 0.5 + 0.5;
    const base = mix(mix('#3d4466', '#7d86a8', p.y / h), '#a3a0b8', strata * 0.45);
    const snowLine = h * 0.52 + Math.sin(p.x * 0.5 + p.z * 0.4) * h * 0.06;
    if (p.y > snowLine && n.y > 0.12) return mix(NEVE_SOMBRA, NEVE, n.y);
    if (n.y > 0.75 && p.y > h * 0.2) return NEVE_SOMBRA;
    return base;
  };
  const pico = (cx: number, cz: number, r: number, h: number): void => {
    const n = 13, ring = wobbleRing(r, n, rand, 0.16, 3);
    const tip: P2 = [rr(rand, -0.2, 0.2) * r, rr(rand, -0.2, 0.2) * r];
    const prof: [number, number][] = [[0, 1.08], [0.1, 0.94], [0.24, 0.8], [0.38, 0.6], [0.52, 0.5], [0.66, 0.34], [0.8, 0.22], [0.92, 0.1], [1, 0.005]];
    const levels = prof.map(([t, k], i) => ({ y: i === 0 ? -0.25 : h * t, pts: ring(k * rr(rand, 0.9, 1.1), i * 0.35).map(([x, z]) => { const j = rr(rand, 0.9, 1.1); return [x * j + cx + tip[0] * t, z * j + cz + tip[1] * t] as P2; }) }));
    m.add(loft(levels, { uv: 9 }), 'ecl_rocha', cor(h));
  };
  pico(0, 0, R, H);
  const a = rand() * TAU;
  pico(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, R * 0.62, H * rr(rand, 0.5, 0.66));
  pico(Math.cos(a + 2.4) * R * 0.66, Math.sin(a + 2.4) * R * 0.66, R * 0.5, H * rr(rand, 0.3, 0.45));
  if (rand() < 0.6) pico(Math.cos(a + 4.3) * R * 0.7, Math.sin(a + 4.3) * R * 0.7, R * 0.42, H * rr(rand, 0.22, 0.34));
  return m;
}

function placaNeve(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 2.6, 3.1), dir = rand() < 0.5 ? 1 : -1;
  monte(m, rand, 0.8, 0.3);
  m.add(cyl(0.09, 0.11, H, 7), 'ecl_madeira', gradY('#5a3a2a', '#8a5e40', 0, H), { p: [0, H / 2 - 0.1, 0], r: [0, 0, rr(rand, -0.05, 0.05)] });
  const seta: P2[] = [[-0.9, -0.3], [0.6, -0.3], [1.0, 0], [0.6, 0.3], [-0.9, 0.3]];
  m.add(extrude(seta, 0.09, 0.02), 'paint', vary('#f0b632', rand, 0.04), { p: [0.1 * dir, H - 0.55, 0.1], s: [dir, 1, 1], r: [0, 0, rr(rand, -0.08, 0.08)] });
  for (let i = 0; i < 3; i++) m.add(extrude([[-0.14, 0.2], [0.08, 0], [-0.14, -0.2], [0.02, -0.2], [0.24, 0], [0.02, 0.2]], 0.03), 'paint', '#20222c', { p: [(-0.45 + i * 0.42) * dir + 0.1 * dir, H - 0.55, 0.17], s: [dir, 1, 1] });
  m.add(box(1.5, 0.42, 0.08), 'ecl_madeira', '#a9744c', { p: [-0.05 * dir, H - 1.25, 0.1], r: [0, 0, rr(rand, -0.1, 0.1)] });
  for (let i = 0; i < 3; i++) m.add(box(0.26, 0.1, 0.02), 'paint', '#3c7a70', { p: [-0.5 + i * 0.45, H - 1.25, 0.15] });
  m.add(blob(0.5, rand, { detail: 1, s: [1.9, 0.32, 0.36], faceted: false }), 'ecl_neve', NEVE, { p: [0.1 * dir, H - 0.22, 0.1] });
  m.add(blob(0.22, rand, { detail: 1, s: [1, 0.7, 1], faceted: false }), 'ecl_neve', NEVE, { p: [0, H - 0.05, 0] });
  for (let k = 0; k < 3; k++) pingente(m, rand, (-0.5 + k * 0.5) * dir, H - 0.86, 0.1, rr(rand, 0.15, 0.3), 0.04);
  return m;
}

function bonecoDeNeve(rand: Rand): Model {
  const m = new Model();
  const cor = vary(pick(rand, ['#e2483f', '#2fa8c8', '#f0a02a', '#8a54d8']), rand);
  const bola = (r: number, y: number, x = 0): void => { m.add(blob(r, rand, { detail: 2, jitter: 0.05, s: [1, 0.9, 1], faceted: false }), 'ecl_neve', neve(-r, r), { p: [x, y, 0] }); };
  bola(0.8, 0.66); bola(0.58, 1.62, 0.03); bola(0.42, 2.38, 0.05);
  // cachecol com ponta ao vento
  m.add(torus(0.36, 0.11, 6, 14), 'cloth', cor, { p: [0.04, 2.02, 0], r: [Math.PI / 2, 0, 0] });
  m.add(extrude([[0, 0], [0.2, 0], [0.34, -0.7], [0.12, -0.78]], 0.07), 'cloth', gradY(mix(cor, '#000000', 0.3), cor, -0.8, 0), { p: [0.2, 2.0, 0.32], r: [0, -0.4, -0.3] });
  // óculos de corrida e nariz
  for (const s of [-1, 1]) {
    m.add(torus(0.11, 0.035, 5, 10), 'paint', '#20222c', { p: [0.05 + s * 0.15, 2.46, 0.36], r: [0.1, s * 0.3, 0] });
    m.add(cyl(0.1, 0.1, 0.03, 10), 'glossy', '#3ad0e8', { p: [0.05 + s * 0.15, 2.46, 0.365], r: [Math.PI / 2 + 0.1, 0, -s * 0.3] });
  }
  m.add(torus(0.4, 0.03, 4, 14), 'paint', '#20222c', { p: [0.05, 2.46, 0], r: [Math.PI / 2, 0, 0] });
  m.add(cone(0.07, 0.36, 7), 'matte', '#f08a2a', { p: [0.05, 2.33, 0.55], r: [Math.PI / 2 + 0.1, 0, 0] });
  // gorro com pompom
  m.add(revolve([[0.4, 0], [0.42, 0.12], [0.36, 0.16], [0.26, 0.42], [0.08, 0.58]], 10), 'cloth', gradY(mix(cor, '#000000', 0.25), cor, 0, 0.6), { p: [0.05, 2.62, -0.02], r: [-0.18, 0, 0.1] });
  m.add(ico(0.12, 1), 'ecl_neve', NEVE, { p: [-0.01, 3.24, -0.14] });
  // botões e braços de graveto, um deles com bandeirinha
  for (let i = 0; i < 3; i++) m.add(ico(0.055, 0), 'paint', '#20222c', { p: [0.03, 1.36 + i * 0.26, 0.55 - Math.abs(i - 1) * 0.06] });
  m.add(tube([[0.5, 1.7, 0], [1.0, 2.1, 0.1], [1.3, 2.6, 0.1]], 0.035, 5, 4), 'matte', '#5a3a2a');
  m.add(tube([[-0.5, 1.7, 0], [-1.0, 1.85, 0.2], [-1.35, 1.6, 0.3]], 0.035, 5, 4), 'matte', '#5a3a2a');
  m.add(cyl(0.02, 0.02, 0.9, 4), 'matte', '#5a3a2a', { p: [1.3, 3.0, 0.1] });
  m.add(extrude([[0, 0], [0.5, -0.16], [0, -0.34]], 0.02), 'cloth', cor, { p: [1.32, 3.44, 0.1] });
  monte(m, rand, 1.1, 0.22);
  return m;
}

function iglu(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 2.4, 2.9);
  monte(m, rand, R * 1.25, 0.22);
  const prof: [number, number][] = [];
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); prof.push([Math.max(0.001, Math.cos(a) * R), Math.sin(a) * R * 0.86 - 0.1]); }
  m.add(revolve(prof, 14, { uv: 2.6, smooth: false }), 'ecl_gelo_solido', shade('#8cc8ee', '#f2fbff', 0, R));
  // túnel de entrada com interior quente
  const t = extrude(archOutline(1.3, 0.75, 0.65, 0.42, 0.3, 8), 1.7);
  m.add(uvBox(t, 2.6), 'ecl_gelo_solido', shade('#8cc8ee', '#eefaff', 0, 1.8), { p: [0, -0.05, R * 0.98] });
  m.add(box(1.3, 1.36, 0.1), 'glow_warm', '#ffffff', { p: [0, 0.66, R * 0.75] });
  m.add(box(1.34, 1.5, 0.06), 'matte', '#1c2438', { p: [0, 0.7, R * 0.62] });
  m.add(blob(0.8, rand, { detail: 1, s: [1.5, 0.3, 1.2], faceted: false }), 'ecl_neve', NEVE, { p: [0, 1.74, R * 1.0] });
  m.add(blob(R * 0.5, rand, { detail: 1, s: [1, 0.25, 1], faceted: false }), 'ecl_neve', NEVE, { p: [0, R * 0.8, 0] });
  // esquis e bandeirola
  for (const s of [-1, 1]) m.add(box(0.12, 1.9, 0.03), 'paint', s > 0 ? '#e2483f' : '#f0b632', { p: [R * 0.72 + s * 0.12, 0.9, R * 0.62], r: [-0.2, 0, s * 0.06] });
  m.add(cyl(0.025, 0.025, 1.4, 4), 'matte', '#5a3a2a', { p: [0, R * 0.86 + 0.6, 0] });
  m.add(extrude([[0, 0], [0.6, -0.2], [0, -0.4]], 0.02), 'cloth', '#e2483f', { p: [0.02, R * 0.86 + 1.3, 0] });
  return m;
}

function troncoNevado(rand: Rand): Model {
  const m = new Model();
  const L = rr(rand, 3.2, 4.4), r = rr(rand, 0.4, 0.55), ring = wobbleRing(r, 9, rand, 0.08, 3);
  const g = new Model();
  g.add(loft([{ y: -L / 2, pts: ring(1) }, { y: -L * 0.2, pts: ring(0.94, 0.3) }, { y: L * 0.2, pts: ring(0.9, 0.6) }, { y: L / 2, pts: ring(0.84, 0.9) }], { uv: 1.6, cap: 'none' }), 'ecl_madeira', '#6a4a3a');
  g.add(loft([{ y: -L / 2, pts: ring(1) }], { cap: 'top' }), 'matte', '#d9b88a');
  g.add(loft([{ y: -L / 2 - 0.01, pts: ring(0.55) }], { cap: 'top' }), 'matte', '#b98c5e');
  g.add(loft([{ y: L / 2, pts: ring(0.84, 0.9) }], { cap: 'top' }), 'matte', '#d9b88a');
  g.add(cyl(0.1, 0.14, 0.7, 6), 'ecl_madeira', '#6a4a3a', { p: [0.3, L * 0.15, 0.3], r: [0.9, 0, -0.9] });
  g.add(cyl(0.07, 0.1, 0.5, 6), 'ecl_madeira', '#6a4a3a', { p: [-0.3, -L * 0.2, 0.3], r: [0.9, 0, 0.9] });
  g.transform({ r: [0, 0, Math.PI / 2], p: [0, r * 0.86, 0] });
  m.addModel(g);
  m.add(blob(r * 0.95, rand, { detail: 2, jitter: 0.2, s: [L / (r * 2.2), 0.42, 1], faceted: false }), 'ecl_neve', neve(-0.3, 0.3), { p: [0, r * 1.72, 0] });
  monte(m, rand, 0.8, 0.22, [L * 0.3, 0, -0.5]);
  monte(m, rand, 0.7, 0.2, [-L * 0.32, 0, 0.5]);
  for (let i = 0; i < 3; i++) { // cogumelos de inverno no tronco
    const x = rr(rand, -0.4, 0.4) * L;
    m.add(cyl(0.03, 0.04, 0.16, 5), 'matte', '#f2ede0', { p: [x, r * 1.0, r * 0.95] });
    m.add(revolve([[0.12, 0], [0.09, 0.07], [0.001, 0.1]], 7), 'glossy', '#e2483f', { p: [x, r * 1.07, r * 0.95] });
  }
  return m;
}

function lampiaoBoreal(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 3.4, 3.9);
  monte(m, rand, 0.7, 0.26);
  m.add(cyl(0.09, 0.13, H, 7), 'ecl_madeira', gradY('#4a3328', '#8a5e40', 0, H), { p: [0, H / 2 - 0.1, 0] });
  m.add(tube([[0, H - 0.5, 0], [0, H - 0.1, 0.1], [0, H - 0.05, 0.5], [0, H - 0.3, 0.72]], 0.035, 8, 4), 'paint', '#2a2c38');
  m.add(blob(0.2, rand, { detail: 1, s: [1, 0.6, 1], faceted: false }), 'ecl_neve', NEVE, { p: [0, H - 0.05, 0] });
  const y = H - 0.92, z = 0.72;
  m.add(cyl(0.012, 0.012, 0.3, 4), 'paint', '#2a2c38', { p: [0, y + 0.52, z] });
  m.add(prism(ngon(0.17, 6), -0.24, 0.2, { top: 1.25, cap: 'both' }), 'glow_warm', '#ffffff', { p: [0, y, z] });
  for (let i = 0; i < 6; i++) m.add(box(0.025, 0.46, 0.025), 'paint', '#2a2c38', { p: [Math.cos((i / 6) * TAU) * 0.2, y - 0.02, z + Math.sin((i / 6) * TAU) * 0.2] });
  m.add(prism(ngon(0.3, 6), 0.2, 0.38, { top: 0.15 }), 'paint', '#2a2c38', { p: [0, y, z] });
  m.add(prism(ngon(0.2, 6), -0.3, -0.24, { cap: 'both' }), 'paint', '#2a2c38', { p: [0, y, z] });
  m.add(blob(0.2, rand, { detail: 1, s: [1.2, 0.4, 1.2], faceted: false }), 'ecl_neve', NEVE, { p: [0, y + 0.4, z] });
  pingente(m, rand, 0.1, y - 0.3, z, 0.2, 0.03);
  return m;
}

function telefericoTorre(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 15, 18), b = 2.6, t = 0.7, cor = '#c7412f';
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    m.add(tube([[sx * b, 0, sz * b * 0.7], [sx * t, H, sz * t * 0.6]], 0.14, 1, 5), 'paint', gradY('#5a6278', '#aab2c8', 0, H));
    m.add(prism(rectPts(0.9, 0.9, 0.15), -0.2, 0.5, { at: [sx * b, sz * b * 0.7], top: 0.8, uv: 2 }), 'ecl_concreto', '#9aa0b4');
    m.add(blob(0.5, rand, { detail: 1, s: [1, 0.35, 1], faceted: false }), 'ecl_neve', NEVE, { p: [sx * b, 0.5, sz * b * 0.7] });
  }
  const nb = 4;
  for (let i = 0; i < nb; i++) {
    const y0 = (H * i) / nb, y1 = (H * (i + 1)) / nb, w0 = b + (t - b) * (i / nb), w1 = b + (t - b) * ((i + 1) / nb);
    for (const sz of [-1, 1]) {
      const z0 = sz * w0 * 0.68, z1 = sz * w1 * 0.66;
      m.add(tube([[-w0, y0 + 0.2, z0], [w1, y1, z1]], 0.06, 1, 4), 'paint', '#8e96ac');
      m.add(tube([[w0, y0 + 0.2, z0], [-w1, y1, z1]], 0.06, 1, 4), 'paint', '#8e96ac');
      m.add(tube([[-w1, y1, z1], [w1, y1, z1]], 0.06, 1, 4), 'paint', '#8e96ac');
    }
    for (const sx of [-1, 1]) m.add(tube([[sx * w1, y1, -w1 * 0.66], [sx * w1, y1, w1 * 0.66]], 0.06, 1, 4), 'paint', '#8e96ac');
  }
  // braço superior, roldanas e cabos
  m.add(box(8.4, 0.5, 0.7, 0.1, 1), 'paint', cor, { p: [0, H + 0.2, 0] });
  m.add(blob(0.6, rand, { detail: 1, s: [6, 0.3, 0.7], faceted: false }), 'ecl_neve', NEVE, { p: [0, H + 0.52, 0] });
  m.add(ico(0.16, 0), 'glow_red', '#ffffff', { p: [0, H + 0.9, 0] });
  for (const s of [-1, 1]) {
    const x = s * 3.6;
    for (const z of [-0.9, 0, 0.9]) {
      m.add(cyl(0.3, 0.3, 0.12, 10), 'paint', '#3a4052', { p: [x, H - 0.25, z], r: [0, 0, Math.PI / 2] });
      m.add(cyl(0.1, 0.1, 0.18, 6), 'glossy', '#f0b632', { p: [x, H - 0.25, z], r: [0, 0, Math.PI / 2] });
    }
    m.add(box(0.16, 0.2, 2.4), 'paint', cor, { p: [x, H - 0.05, 0] });
    m.add(tube([[x, H - 1.1, -9], [x, H + 0.05, -1], [x, H + 0.07, 0], [x, H + 0.05, 1], [x, H - 1.1, 9]], 0.035, 12, 4), 'paint', '#20222c');
  }
  // cabine pendurada num dos lados
  const x = (rand() < 0.5 ? -1 : 1) * 3.6, zc = rr(rand, 2.5, 4.5), yc = H - 0.3 - Math.abs(zc) * 0.1, c2 = vary(pick(rand, ['#f0b632', '#e2483f', '#2fa8c8']), rand);
  m.add(tube([[x, yc, zc], [x, yc - 0.5, zc], [x + 0.25, yc - 1.2, zc], [x, yc - 1.9, zc]], 0.05, 6, 4), 'paint', '#3a4052');
  m.add(box(0.3, 0.2, 0.7), 'paint', '#3a4052', { p: [x, yc, zc] });
  m.add(box(1.7, 1.9, 2.3, 0.3, 2), 'paint', gradY(mix(c2, '#000000', 0.3), c2, -1, 1), { p: [x, yc - 2.85, zc] });
  m.add(box(1.74, 0.8, 1.9, 0.04, 1), 'glossy', '#1c3348', { p: [x, yc - 2.55, zc] });
  m.add(box(1.3, 0.8, 2.34, 0.04, 1), 'glossy', '#1c3348', { p: [x, yc - 2.55, zc] });
  m.add(box(1.5, 0.12, 2.1, 0.05, 1), 'ecl_neve', NEVE, { p: [x, yc - 1.86, zc] });
  m.add(box(1.76, 0.1, 2.36), 'paint', '#f2ede0', { p: [x, yc - 3.2, zc] });
  return m;
}

function ponteGeloCorrimao(rand: Rand): Model {
  const m = new Model();
  for (const x of [-2.85, 0, 2.85]) {
    m.add(uvBox(prism(rectPts(0.34, 0.34, 0.07), -0.1, 1.25, { at: [x, 0], top: 0.85 }), 1.2), 'ecl_madeira', gradY('#4a3328', '#8a5e40', 0, 1.2));
    lasca(m, rand, 0.22, 0.5, { p: [x, 1.2, 0] }, 'ecl_gelo_solido');
    m.add(blob(0.3, rand, { detail: 1, s: [1, 0.4, 1], faceted: false }), 'ecl_neve', NEVE, { p: [x, 1.26, 0] });
  }
  for (const y of [1.0, 0.5]) {
    m.add(tube([[-3, y, 0], [-1.4, y - 0.05, 0], [0, y, 0], [1.4, y - 0.05, 0], [3, y, 0]], 0.07, 8, 6), 'ecl_gelo_solido', gradY(GELO_A, GELO_B, 0.4, 1.1));
    const n = y > 0.8 ? 11 : 7;
    for (let i = 0; i < n; i++) pingente(m, rand, -2.7 + (i * 5.4) / (n - 1) + rr(rand, -0.12, 0.12), y - 0.07, 0, rr(rand, 0.12, 0.42), 0.045);
  }
  m.add(blob(0.16, rand, { detail: 1, jitter: 0.25, s: [18, 0.5, 1], faceted: false }), 'ecl_neve', NEVE, { p: [0, 1.08, 0] });
  m.add(box(6, 0.12, 0.3), 'ecl_gelo_solido', '#a9dcf8', { p: [0, 0.0, 0] });
  return m;
}

function bandeiraMastro(rand: Rand): Model {
  const m = new Model();
  monte(m, rand, 1.0, 0.35);
  for (let i = 0; i < 4; i++) m.add(blob(rr(rand, 0.25, 0.4), rand, { detail: 1, jitter: 0.25 }), 'ecl_rocha', capped(NEVE, '#7d86a8', 0.5), { p: polar(i * 1.6 + rand(), 0.42, 0.2) });
  m.add(cyl(0.05, 0.075, 6, 7), 'paint', gradY('#8e96ac', '#dfe4f0', 0, 6), { p: [0, 2.95, 0] });
  m.add(ico(0.1, 1), 'glossy', '#f0b632', { p: [0, 6.0, 0] });
  for (const a of [0.6, 2.7, 4.8]) m.add(tube([[0, 2.2, 0], polar(a, 1.5, 0.1)], 0.015, 1, 3), 'matte', '#20222c');
  return m;
}
function bandeiraPano(rand: Rand): Model {
  const m = new Model();
  const cor = vary(pick(rand, ['#e2483f', '#f0a02a', '#2fa8c8']), rand), W = 2.2, Hh = 1.3;
  const g = warp(plane(W, Hh, 8, 3), (p) => { const t = (p.x + W / 2) / W; p.z = Math.sin(t * 7) * 0.14 * t; p.y -= t * t * 0.18; p.x += W / 2 + 0.06; p.y -= Hh / 2; });
  m.add(g, 'leaf', (p) => (p.y > -Hh * 0.36 && p.y < -Hh * 0.0 ? '#f2ede0' : cor));
  m.add(ico(0.16, 1), 'leaf', '#f0b632', { p: [0.7, -0.62, 0.03], s: [1, 1, 0.1] });
  return m;
}

export const BOREAL_PROPS: PropLibrary = {
  'pinheiro-nevado': { build: pinheiroNevado, radius: 3.2, collider: { radius: 0.6, height: 8 } },
  'rocha-gelo': { build: rochaGelo, radius: 2.6, collider: { radius: 1.6, height: 2 } },
  'arco-gelo': { build: arcoGelo, radius: 16 },
  'cabana-neve': { build: cabanaNeve, radius: 5, collider: { radius: 3.6, height: 5 } },
  'estalagmite-gelo': { build: estalagmiteGelo, radius: 1.7, collider: { radius: 1.1, height: 2.5 } },
  'cristal-gelo': { build: cristalGelo, radius: 1.2, collider: { radius: 0.6, height: 1.8 } },
  'pico-rochoso': { build: picoRochoso, radius: 28, collider: { radius: 20, height: 30 } },
  'placa-neve': { build: placaNeve, radius: 1.2, collider: { radius: 0.2, height: 2.6 } },
  'boneco-de-neve': { build: bonecoDeNeve, radius: 1.4, collider: { radius: 0.8, height: 2.8 } },
  iglu: { build: iglu, radius: 4.4, collider: { radius: 2.9, height: 2.4 } },
  'tronco-nevado': { build: troncoNevado, radius: 2.4, collider: { radius: 1.4, height: 1 } },
  'lampiao-boreal': { build: lampiaoBoreal, radius: 0.9, collider: { radius: 0.2, height: 3.5 } },
  'teleferico-torre': { build: telefericoTorre, radius: 5, collider: { radius: 3.2, height: 16 } },
  'ponte-gelo-corrimao': { build: ponteGeloCorrimao, radius: 3.1, collider: { radius: 0.4, height: 1.2 } },
  'bandeira-expedicao': { build: bandeiraMastro, radius: 1.6, collider: { radius: 0.2, height: 6 }, animated: { build: bandeiraPano, pivot: [0, 5.8, 0], motion: { kind: 'sway', axis: 'z', angle: 0.12, period: 2.2 } } },
};
