/**
 * JARDIM CELESTE — ilhas suspensas, ruínas aéreas e jardins sobre as nuvens (Copa Eclipse).
 */
import { Model, box, cone, cyl, extrude, gradY, ico, mix, plane, sphere, torus, tube, warp, type V3 } from '../lib/geo';
import { TAU, archOutline, blob, capped, loft, ngon, pick, polar, prism, rectPts, revolve, ri, rr, shade, uvBox, uvScale, vary, wobbleRing, type P2, type Rand } from './kit-eclipse';
import type { PropLibrary } from './types';

const ROCHA_ALTA = '#b89a86', ROCHA_MEIO = '#8a7596', ROCHA_FUNDA = '#4c4a80';
const rochaCor = (depth: number) => (p: { y: number }, n: { y: number }) => {
  const t = Math.min(1, Math.max(0, -p.y / depth));
  const c = t < 0.4 ? mix(ROCHA_ALTA, ROCHA_MEIO, t / 0.4) : mix(ROCHA_MEIO, ROCHA_FUNDA, (t - 0.4) / 0.6);
  return n.y < -0.5 ? c.multiplyScalar(0.82) : c;
};

interface IlhaOpts { seg?: number; raizes?: number; cristais?: number; pontas?: number; lobes?: number }
/** Corpo de ilha suspensa: topo gramado plano em y=0, beiral de grama, rocha em estalactite invertida, raízes e cristais. */
function corpoIlha(m: Model, rand: Rand, R: number, depth: number, o: IlhaOpts = {}): (a: number) => number {
  const seg = o.seg ?? 24;
  const ring = wobbleRing(R, seg, rand, 0.09, o.lobes ?? 3);
  const grama = vary('#8fd66a', rand, 0.06);
  const top = ring(1);
  m.add(loft([{ y: 0, pts: top }], { cap: 'top', uv: 5 }), 'ecl_grama', (p) => mix(grama, '#c9ec7c', Math.hypot(p.x, p.z) / R - 0.35));
  m.add(loft([{ y: 0, pts: top }, { y: -0.35, pts: ring(1.035) }, { y: -1.0, pts: ring(0.965) }], { uv: 5 }), 'ecl_grama', gradY('#3f8f52', grama, -1, 0));
  const tip: P2 = [rr(rand, -0.16, 0.16) * R, rr(rand, -0.16, 0.16) * R];
  const prof: [number, number][] = [[0.055, 0.955], [0.16, 0.84], [0.3, 0.66], [0.46, 0.47], [0.62, 0.3], [0.78, 0.17], [0.9, 0.08], [1, 0.012]];
  const levels = [{ y: -1.0, pts: ring(0.965) }];
  for (const [t, k] of prof) {
    const kk = k * rr(rand, 0.92, 1.08), tw = rr(rand, -0.5, 0.5);
    levels.push({ y: -depth * t, pts: ring(kk, tw).map(([x, z]) => { const j = rr(rand, 0.93, 1.07); return [x * j + tip[0] * t, z * j + tip[1] * t] as P2; }) });
  }
  m.add(loft(levels, { uv: 6, uvV: 5 }), 'ecl_rocha', rochaCor(depth));
  // estalactites secundárias
  const pontas = o.pontas ?? ri(rand, 5, 8);
  for (let i = 0; i < pontas; i++) {
    const a = rand() * TAU, f = rr(rand, 0.25, 0.72), rb = rr(rand, 0.9, 1.7) * (R / 10), len = rr(rand, 0.2, 0.42) * depth;
    const cx = Math.cos(a) * R * f, cz = Math.sin(a) * R * f, y0 = -depth * (1 - f) * 0.62;
    const n = ri(rand, 5, 6), rot = rand() * 3;
    m.add(loft([
      { y: y0 + rb, pts: ngon(rb * 1.25, n, rot).map(([x, z]) => [x + cx, z + cz] as P2) },
      { y: y0 - len * 0.5, pts: ngon(rb * 0.62, n, rot + 0.4).map(([x, z]) => [x + cx + rr(rand, -0.2, 0.2), z + cz] as P2) },
      { y: y0 - len, pts: ngon(0.04, n, rot).map(([x, z]) => [x + cx + rr(rand, -0.3, 0.3), z + cz + rr(rand, -0.3, 0.3)] as P2) },
    ], { uv: 4 }), 'ecl_rocha', rochaCor(depth));
  }
  // raízes pendentes na borda
  const raizes = o.raizes ?? ri(rand, 6, 9);
  for (let i = 0; i < raizes; i++) {
    const a = rand() * TAU, len = rr(rand, 0.18, 0.5) * depth, r0 = R * rr(rand, 0.8, 0.93), w = rr(rand, 0.4, 1.1);
    const pts: V3[] = [];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4, rk = r0 * (1 - t * 0.12) + Math.sin(t * 5 + i) * w * 0.4;
      pts.push([Math.cos(a + t * 0.25 * Math.sin(i)) * rk, -0.9 - t * len, Math.sin(a + t * 0.25 * Math.sin(i)) * rk]);
    }
    m.add(tube(pts, (t) => (R / 10) * (0.17 - t * 0.14), 8, 5), 'matte', gradY('#3d2c2a', '#7a5a44', -len, 0));
  }
  // cristais luminosos na parte de baixo
  const cristais = o.cristais ?? ri(rand, 3, 5);
  for (let i = 0; i < cristais; i++) {
    const a = rand() * TAU, f = rr(rand, 0.45, 0.8), s = rr(rand, 0.5, 1) * (R / 10);
    m.add(prism(ngon(0.32 * s, 5), -1.6 * s, 1.2 * s, { top: 0.1, cap: 'bottom' }), 'glow_cyan', '#ffffff', { p: [Math.cos(a) * R * f, -depth * (1 - f) * 0.78 - 0.4, Math.sin(a) * R * f], r: [Math.PI + rr(rand, -0.5, 0.5), 0, rr(rand, -0.5, 0.5)] });
  }
  const amp = top.map(([x, z]) => Math.hypot(x, z));
  return (a) => amp[Math.round((((a % TAU) + TAU) % TAU) / TAU * seg) % seg]!;
}

function ilhaFlutuante(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 9.4, 10.6), depth = rr(rand, 15, 18);
  const raio = corpoIlha(m, rand, R, depth, { lobes: ri(rand, 2, 4) });
  // pedras baixas e tufos na borda (o miolo fica livre e plano)
  const k = ri(rand, 4, 7);
  for (let i = 0; i < k; i++) {
    const a = rand() * TAU, rk = raio(a) * rr(rand, 0.84, 0.93), s = rr(rand, 0.35, 0.8);
    m.add(blob(s, rand, { detail: 1, s: [1.2, 0.7, 1] }), 'ecl_rocha', capped('#9fe07a', vary('#a99aa8', rand), 0.6), { p: [Math.cos(a) * rk, s * 0.2, Math.sin(a) * rk] });
  }
  return m;
}


const MARMORE_A = '#cfc8e0', MARMORE_B = '#fffaf2', OURO = '#e8c66a';
const COPAS = ['#ff9ccf', '#c9a2ff', '#ffb8a8', '#f7a6e8'];
const marmore = (y0: number, y1: number) => shade(MARMORE_A, MARMORE_B, y0, y1, 0.18);

/** Copa "em nuvem": lóbulos arredondados com luz no topo. */
function copa(m: Model, rand: Rand, c: V3, r: number, cor: string, n = 5, det = 2): void {
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * TAU + rand(), d = i === 0 ? 0 : r * rr(rand, 0.55, 0.8), rk = i === 0 ? r : r * rr(rand, 0.5, 0.72);
    m.add(blob(rk, rand, { detail: det, jitter: 0.1, s: [1, 0.82, 1], faceted: false }), 'matte', shade(mix(cor, '#6a3f9a', 0.45), mix(cor, '#fff4fa', 0.45), -rk * 0.8, rk * 0.8, 0.1), { p: [c[0] + Math.cos(a) * d, c[1] + (i === 0 ? r * 0.25 : rr(rand, -0.25, 0.1) * r), c[2] + Math.sin(a) * d] });
  }
}

/** Trepadeira em espiral com folhas e flores. */
function trepadeira(m: Model, rand: Rand, r: number, y0: number, y1: number, cx = 0, cz = 0, voltas = 1.6): void {
  const pts: V3[] = [], a0 = rand() * TAU, n = 10;
  for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + t * voltas * TAU; pts.push([cx + Math.cos(a) * r, y0 + (y1 - y0) * t, cz + Math.sin(a) * r]); }
  m.add(tube(pts, 0.045, 20, 4), 'matte', '#3f8f52');
  for (let i = 1; i < n; i++) {
    const p = pts[i]!, flor = rand() < 0.35;
    m.add(ico(flor ? 0.13 : 0.16, 0), flor ? 'glossy' : 'leaf', flor ? pick(rand, COPAS) : vary('#6fc85a', rand, 0.1), { p: [p[0] + (p[0] - cx) * 0.18, p[1] + 0.05, p[2] + (p[2] - cz) * 0.18], s: flor ? 1 : [1, 0.45, 1.3], r: [rand(), rand() * 3, rand()] });
  }
}

function ilhaPequena(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 3.6, 4.4), depth = rr(rand, 6, 8.5);
  corpoIlha(m, rand, R, depth, { seg: 14, raizes: ri(rand, 3, 4), cristais: 2, pontas: 3 });
  const tipo = ri(rand, 0, 2), cor = pick(rand, COPAS);
  if (tipo === 0) { // arvorezinha
    m.add(tube([[0.3, 0, 0], [0.5, 1.2, 0.1], [0.2, 2.4, 0]], (t) => 0.22 - t * 0.1, 6, 6), 'matte', gradY('#8a7a9a', '#e8e0f0', 0, 2.4));
    copa(m, rand, [0.2, 3.1, 0], 1.5, cor, 4);
  } else if (tipo === 1) { // pedras e arbustos floridos
    for (let i = 0; i < 3; i++) m.add(blob(rr(rand, 0.6, 1.1), rand, { detail: 1, s: [1, 0.8, 1] }), 'ecl_rocha', capped('#9fe07a', '#a99aa8', 0.6), { p: polar(i * 2.2 + rand(), R * 0.35, 0.3) });
    copa(m, rand, [-0.6, 0.7, 0.5], 0.9, cor, 3);
  } else { // coluna em ruína
    m.add(prism(rectPts(1.3, 1.3, 0.15), 0, 0.4, { uv: 2 }), 'ecl_marmore', marmore(0, 0.4));
    m.add(revolve([[0.45, 0.4], [0.4, 2.6], [0.3, 3.0]], 8, { uv: 2 }), 'ecl_marmore', marmore(0, 3));
    trepadeira(m, rand, 0.5, 0.3, 2.8);
    copa(m, rand, [1.4, 0.5, -0.8], 0.8, cor, 3);
  }
  return m;
}

function arvoreCeleste(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 6, 8.5), cor = pick(rand, COPAS), lean = rr(rand, -0.8, 0.8);
  const casca = gradY('#8a7a9a', '#efe6f6', 0, H * 0.7);
  m.add(tube([[0, -0.2, 0], [lean * 0.2, H * 0.22, 0.1], [lean * 0.8, H * 0.46, -0.1], [lean, H * 0.66, 0]], (t) => 0.42 - t * 0.2, 10, 8), 'matte', casca);
  for (let i = 0; i < 4; i++) m.add(tube([polar(i * 1.57 + 0.3, 0.3, 0.5), polar(i * 1.57 + 0.3, 0.75, 0.05), polar(i * 1.57 + 0.5, 1.1, -0.15)], (t) => 0.16 - t * 0.1, 4, 5), 'matte', casca);
  const galhos: V3[] = [[lean + 1.7, H * 0.8, 0.4], [lean - 1.6, H * 0.76, -0.5], [lean + 0.1, H * 0.84, -1.5], [lean - 0.2, H * 0.78, 1.5]];
  for (const g of galhos) m.add(tube([[lean * 0.85, H * 0.5, 0], [(lean + g[0]) / 2, H * 0.66, g[2] * 0.5], g], (t) => 0.2 - t * 0.12, 6, 5), 'matte', casca);
  copa(m, rand, [lean, H * 0.92, 0], H * 0.24, cor, 6);
  for (const g of galhos) copa(m, rand, [g[0], g[1] + 0.3, g[2]], H * 0.17, pick(rand, [cor, cor, pick(rand, COPAS)]), 4, 1);
  // pétalas caídas e brilho
  for (let i = 0; i < 6; i++) m.add(ico(0.12, 0), 'leaf', cor, { p: polar(rand() * TAU, rr(rand, 0.8, 2.4), 0.04), s: [1, 0.15, 1] });
  for (let i = 0; i < 4; i++) m.add(ico(0.07, 0), 'glow_white', '#ffffff', { p: [lean + rr(rand, -2, 2), H * rr(rand, 0.6, 0.78), rr(rand, -2, 2)] });
  return m;
}

/** Tambor de coluna canelada entre y0 e y1. */
function fuste(m: Model, r: number, y0: number, y1: number, cx = 0, cz = 0, r1 = r * 0.88): void {
  const n = 20, ring = (rk: number): P2[] => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU, k = i % 2 ? 0.9 : 1; return [cx + Math.cos(a) * rk * k, cz + Math.sin(a) * rk * k] as P2; });
  m.add(loft([{ y: y0, pts: ring(r) }, { y: y1, pts: ring(r1) }], { uv: 2.5, cap: 'top' }), 'ecl_marmore', marmore(y0 - 1, y1 + 1));
}

/** Pilar de ruína: plinto, fuste canelado, capitel. Devolve a altura do topo. */
function pilar(m: Model, _rand: Rand, x: number, z: number, h: number, r = 0.7): void {
  m.add(uvBox(prism(rectPts(r * 2.8, r * 2.8, 0.12), -0.2, 0.5, { at: [x, z] }), 2.5), 'ecl_marmore', marmore(0, 0.6));
  m.add(revolve([[r * 1.25, 0.5], [r * 1.3, 0.68], [r * 1.05, 0.86]], 12), 'ecl_marmore', MARMORE_B, { p: [x, 0, z] });
  fuste(m, r, 0.86, h - 0.7, x, z);
  m.add(revolve([[r * 0.9, h - 0.7], [r * 1.0, h - 0.5], [r * 1.3, h - 0.28]], 12), 'ecl_marmore', MARMORE_B, { p: [x, 0, z] });
  m.add(torus(r * 0.98, 0.05, 4, 12), 'glossy', OURO, { p: [x, h - 0.62, z], r: [Math.PI / 2, 0, 0] });
  m.add(uvBox(prism(rectPts(r * 2.9, r * 2.9, 0.1), h - 0.28, h, { at: [x, z], cap: 'both' }), 2.5), 'ecl_marmore', marmore(h - 1, h));
}

function ruinaArcoCeleste(rand: Rand, span = 16): Model {
  const m = new Model();
  const x = span / 2 + 1.4, spring = 6.6, rise = Math.min(span * 0.3, 4.6);
  for (const s of [-1, 1]) {
    pilar(m, rand, s * x, 0, spring, 0.78);
    trepadeira(m, rand, 0.86, 0.3, rr(rand, 4, 6.4), s * x, 0, 1.4);
  }
  // arco de aduelas com fecho dourado
  const ring = archOutline(span + 0.5, spring, rise, 1.3, 1.2, 14), xo = span / 2 + 2.45, yt = spring + rise + 1.2;
  const quebrado: P2[] = [[-xo, spring], [-xo, spring + rise * 0.5], [-xo + 0.9, spring + rise * 0.5 + 0.5], [-xo + 1.1, yt - 0.4], [-span * 0.2, yt], [-span * 0.16, yt - 0.5], [span * 0.05, yt - 0.3], [span * 0.1, yt + 0.1], [xo - 2.2, yt], [xo - 1.8, spring + rise * 0.7], [xo - 0.7, spring + rise * 0.62], [xo, spring + rise * 0.2], [xo, spring]];
  m.add(uvBox(extrude([...quebrado, ...ring.slice(5, -1)], 1.5, 0.05), 2.5), 'ecl_marmore', marmore(spring, spring + rise + 1.4));
  const nv = 9;
  for (let i = 0; i <= nv; i++) {
    const a = (i / nv) * Math.PI, rx = span / 2 + 0.25, px = Math.cos(a) * rx, py = spring + Math.sin(a) * rise;
    m.add(box(0.16, 0.5, 1.62), 'ecl_marmore', MARMORE_A, { p: [px, py + 0.2, 0], r: [0, 0, a - Math.PI / 2] });
  }
  m.add(prism(ngon(0.5, 4), -0.82, 0.82, { cap: 'both' }), 'glossy', OURO, { p: [0, spring + rise + 0.62, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 1.3] });
  m.add(ico(0.2, 1), 'glow_white', '#ffffff', { p: [0, spring + rise + 0.62, 0.86] });
  m.add(ico(0.2, 1), 'glow_white', '#ffffff', { p: [0, spring + rise + 0.62, -0.86] });
  // topo quebrado: blocos soltos flutuando e vegetação
  const top = spring + rise + 1.2;
  for (let i = 0; i < 5; i++) {
    const s = rr(rand, 0.4, 0.9), px = rr(rand, -0.5, 0.5) * span;
    m.add(uvBox(box(s * 1.4, s, s, 0.06, 1), 2.5), 'ecl_marmore', marmore(-0.5, 0.5), { p: [px, top + rr(rand, 0.8, 2.6), rr(rand, -0.4, 0.4)], r: [rand(), rand(), rand()] });
  }
  copa(m, rand, [-(span / 2) * 0.55, top + 0.3, 0], 0.9, pick(rand, COPAS), 3, 1);
  copa(m, rand, [span / 2 + 1.6, top - rise * 0.42, 0.2], 0.8, '#8fd66a', 3, 1);
  for (const s of [-1, 1]) m.add(tube([[s * span * 0.3, top - 0.1, 0.8], [s * span * 0.31, top - 0.8, 0.86], [s * span * 0.3, top - 1.3, 0.82]], 0.04, 4, 4), 'matte', '#3f8f52');
  return m;
}

function ruinaColunaCeleste(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 4.2, 6.4), r = rr(rand, 0.62, 0.74);
  m.add(uvBox(prism(rectPts(r * 3, r * 3, 0.14), -0.2, 0.5), 2.5), 'ecl_marmore', marmore(0, 0.6));
  m.add(revolve([[r * 1.3, 0.5], [r * 1.34, 0.7], [r * 1.05, 0.9]], 12), 'ecl_marmore', MARMORE_B);
  const cut = H * rr(rand, 0.45, 0.6);
  fuste(m, r, 0.9, cut);
  fuste(m, r * 0.94, cut + 0.02, H, rr(rand, -0.06, 0.06), rr(rand, -0.06, 0.06), r * 0.86);
  // topo fraturado
  m.add(uvBox(prism(ngon(r * 0.8, 7, rand()), H, H + rr(rand, 0.5, 0.9), { top: 0.35, shift: [rr(rand, -0.25, 0.25), rr(rand, -0.25, 0.25)] }), 2.5), 'ecl_marmore', marmore(H - 1, H + 1));
  // tambor caído e fragmentos
  const g = new Model();
  fuste(g, r * 0.9, -0.6, 0.6);
  g.transform({ r: [Math.PI / 2, 0, 0.1], p: [1.7, r * 0.82, 0.5] });
  m.addModel(g, { r: [0, rand() * TAU, 0] });
  for (let i = 0; i < 3; i++) m.add(uvBox(box(0.5, 0.36, 0.42, 0.05, 1), 2.5), 'ecl_marmore', marmore(-0.3, 0.3), { p: polar(rand() * TAU, rr(rand, 1.2, 1.9), 0.14), r: [0.2, rand() * 3, 0.1] });
  trepadeira(m, rand, r * 1.02, 0.4, H * 0.95, 0, 0, 2.2);
  copa(m, rand, [0.1, H + 0.5, 0], 0.55, pick(rand, COPAS), 3);
  return m;
}

function nuvem(rand: Rand): Model {
  const m = new Model();
  const W = rr(rand, 10, 18), n = ri(rand, 6, 8), hBase = W * 0.2;
  const cor = shade('#b9c2ee', '#ffffff', 0, hBase * 1.6, 0.12);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1), x = (t - 0.5) * W * 0.72 + rr(rand, -0.5, 0.5), mid = 1 - Math.abs(t - 0.5) * 1.5;
    const r = W * (0.13 + 0.12 * mid) * rr(rand, 0.85, 1.15), z = rr(rand, -0.14, 0.14) * W;
    m.add(blob(r, rand, { detail: 2, jitter: 0.07, s: [1.15, 0.82, 1], faceted: false, fn: (p) => { if (p.y < -r * 0.3) p.y = -r * 0.3 + (p.y + r * 0.3) * 0.25; p.y += r * 0.38; } }), 'ecl_nuvem', cor, { p: [x, hBase * 0.25 * mid + rr(rand, 0, 0.5), z] });
  }
  for (let i = 0; i < 3; i++) { // tufos menores à frente e atrás
    const r = W * rr(rand, 0.08, 0.11);
    m.add(blob(r, rand, { detail: 1, jitter: 0.07, s: [1.2, 0.7, 1], faceted: false, fn: (p) => { p.y = Math.max(p.y, -r * 0.2) + r * 0.2; } }), 'ecl_nuvem', cor, { p: [rr(rand, -0.36, 0.36) * W, 0, (i % 2 ? 1 : -1) * W * rr(rand, 0.14, 0.2)] });
  }
  return m;
}

/** Fita de água em queda: nasce na borda (z0) com velocidade horizontal e cai `drop` metros. UV v ao longo da queda. */
function queda(w0: number, w1: number, z0: number, y0: number, drop: number, reach: number): ReturnType<typeof plane> {
  const g = warp(plane(1, 1, 3, 12), (p) => {
    const t = 0.5 - p.y, w = w0 + (w1 - w0) * t, bow = 1 - (p.x * 2) ** 2;
    p.set(p.x * w, y0 - drop * t ** 1.7, z0 + reach * Math.sqrt(t) + bow * 0.18);
  });
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, ((1 - uv.getY(i)) * drop) / 4);
  return g;
}

function cachoeiraCeleste(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 5.6, 6.6), depth = rr(rand, 9, 11.5);
  const raio = corpoIlha(m, rand, R, depth, { seg: 18, raizes: 4, cristais: 3, pontas: 4 });
  const zb = raio(Math.PI / 2) + 0.15, w = rr(rand, 2, 2.6);
  // nascente e riacho até a borda
  m.add(cyl(1.7, 1.7, 0.06, 12), 'ecl_agua', '#ffffff', { p: [0, 0.03, -0.4] });
  m.add(torus(1.8, 0.22, 5, 12), 'ecl_rocha', capped('#9fe07a', '#a99aa8', 0.7), { p: [0, 0.02, -0.4], r: [Math.PI / 2, 0, 0] });
  m.add(box(w, 0.06, zb), 'ecl_agua', '#ffffff', { p: [0, 0.03, zb / 2] });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) m.add(blob(rr(rand, 0.4, 0.75), rand, { detail: 1, s: [1, 0.8, 1] }), 'ecl_rocha', capped('#9fe07a', vary('#a99aa8', rand), 0.6), { p: [s * (w / 2 + 0.4), 0.15, zb * (0.35 + i * 0.3)] });
  // véu principal, véus laterais e espuma
  const drop = 16;
  m.add(queda(w, w * 1.5, zb, 0.06, drop, 2.2), 'water_fall', '#ffffff');
  m.add(queda(w * 0.5, w * 0.9, zb + 0.12, 0.08, drop * 0.94, 2.5), 'water_fall', '#e8fbff');
  for (const s of [-1, 1]) {
    const g = queda(0.3, 0.7, zb - 0.1, 0.05, drop * rr(rand, 0.5, 0.8), 1.6);
    m.add(g, 'water_fall', '#ffffff', { p: [s * (w / 2 + 0.15), 0, 0] });
  }
  for (let i = 0; i < 4; i++) m.add(blob(rr(rand, 0.4, 0.6), rand, { detail: 1, jitter: 0.1, faceted: false }), 'ecl_nuvem', '#ffffff', { p: [(-0.5 + i / 3) * w, 0.05, zb + 0.25], s: [1, 0.6, 1] });
  for (let i = 0; i < 5; i++) m.add(blob(rr(rand, 0.9, 1.6), rand, { detail: 1, jitter: 0.1, faceted: false }), 'ecl_nuvem', '#ffffff', { p: [rr(rand, -1.6, 1.6), -drop + rr(rand, -0.6, 1.2), zb + 2.2 + rr(rand, -0.8, 0.8)] });
  copa(m, rand, [-R * 0.45, 0.6, -R * 0.3], 0.9, pick(rand, COPAS), 3);
  return m;
}

function florBase(rand: Rand): Model {
  const m = new Model();
  const verde = vary('#5fc06a', rand, 0.06);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + rand() * 0.4, L = rr(rand, 1.1, 1.6);
    const folha: P2[] = [[0, -0.12], [L * 0.5, -0.36], [L, 0], [L * 0.5, 0.36], [0, 0.12]];
    m.add(warp(extrude(folha, 0.05), (p) => { p.y += 0; p.z += Math.sin((p.x / L) * Math.PI) * 0.35 - (p.x / L) ** 2 * 0.2; }), 'leaf', gradY(mix(verde, '#1f5f4a', 0.5), verde, -0.4, 0.4), { r: [-Math.PI / 2, 0, a], p: [0, 0.08, 0] });
  }
  m.add(revolve([[0.34, -0.05], [0.3, 0.2], [0.16, 0.38]], 8), 'matte', mix(verde, '#1f5f4a', 0.4));
  return m;
}
function florHaste(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 2.8, 3.6), cor = pick(rand, ['#ff7fb8', '#ffb347', '#b88cff', '#ff6f6f']), lean = rr(rand, 0.2, 0.5);
  m.add(tube([[0, 0, 0], [lean * 0.3, H * 0.4, 0], [lean, H * 0.8, 0], [lean * 1.15, H, 0.25]], (t) => 0.13 - t * 0.05, 10, 6), 'matte', gradY('#2f7f52', '#7fd66a', 0, H));
  m.add(ico(0.3, 0), 'leaf', '#5fc06a', { p: [lean * 0.4, H * 0.45, 0.2], s: [0.5, 0.15, 1.4], r: [0.5, 0, 0] });
  const f = new Model();
  const np = ri(rand, 7, 9);
  for (let i = 0; i < np; i++) {
    const a = (i / np) * TAU;
    f.add(blob(0.5, rand, { detail: 1, jitter: 0.04, s: [0.62, 0.14, 1.25], faceted: false }), 'matte', (p) => mix(mix(cor, '#fff6c8', 0.5), cor, (p.z + 0.6) / 1.2), { p: [Math.sin(a) * 0.72, 0.1, Math.cos(a) * 0.72], r: [-0.35, a, 0] });
  }
  f.add(blob(0.44, rand, { detail: 1, jitter: 0.05, s: [1, 0.55, 1], faceted: false }), 'glow_warm', '#ffffff', { p: [0, 0.12, 0] });
  f.add(revolve([[0.1, -0.3], [0.4, -0.05], [0.5, 0.05]], 8), 'matte', '#3f9f5a');
  f.transform({ r: [0.75, 0, -0.1], p: [lean * 1.2, H + 0.1, 0.35] });
  m.addModel(f);
  return m;
}

function pergolaCeleste(rand: Rand, span = 16): Model {
  const m = new Model();
  const x = span / 2 + 1.05, yb = 6.9, zs = 2.6;
  for (const s of [-1, 1]) for (const z of [-zs, zs]) {
    pilar(m, rand, s * x, z, yb, 0.42);
    trepadeira(m, rand, 0.52, 0.3, yb - 0.4, s * x, z, 2.4);
  }
  // vigas principais (sobre a pista) e caibros com pontas recortadas
  const L = x * 2 + 2.4;
  const viga: P2[] = [[-L / 2, 0.3], [-L / 2 + 0.5, 0], [L / 2 - 0.5, 0], [L / 2, 0.3], [L / 2, 0.5], [-L / 2, 0.5]];
  for (const z of [-zs, zs]) m.add(uvBox(extrude(viga, 0.34, 0.03), 2.5), 'ecl_marmore', marmore(yb, yb + 0.6), { p: [0, yb, z] });
  const nc = Math.round(L / 1.6), Lc = zs * 2 + 2.2;
  const caibro: P2[] = [[-Lc / 2, 0.22], [-Lc / 2 + 0.4, 0], [Lc / 2 - 0.4, 0], [Lc / 2, 0.22], [Lc / 2, 0.36], [-Lc / 2, 0.36]];
  for (let i = 0; i < nc; i++) m.add(extrude(caibro, 0.2), 'ecl_marmore', MARMORE_B, { p: [-L / 2 + 0.7 + (i * (L - 1.4)) / (nc - 1), yb + 0.5, 0], r: [0, Math.PI / 2, 0] });
  // glicínias pendentes (curtas: o vão continua livre) e folhagem por cima
  const cor = pick(rand, ['#c9a2ff', '#ff9ccf']);
  const ng = Math.round(span / 1.5);
  for (let i = 0; i < ng; i++) {
    const px = -span / 2 + (i + 0.5) * (span / ng) + rr(rand, -0.3, 0.3), z = (i % 2 ? 1 : -1) * zs + rr(rand, -0.25, 0.25), len = rr(rand, 0.28, 0.42);
    m.add(prism(ngon(0.17, 5), -len, 0.05, { top: 1, cap: 'none' }), 'matte', gradY(mix(cor, '#fff4fa', 0.5), cor, -len, 0), { p: [px, yb + 0.02, z] });
    m.add(prism(ngon(0.17, 5), 0, 0.14, { top: 0.1, cap: 'none' }), 'matte', mix(cor, '#fff4fa', 0.5), { p: [px, yb - len - 0.14 + 0.02, z], r: [Math.PI, 0, 0] });
  }
  for (let i = 0; i < Math.round(span / 3.2); i++) copa(m, rand, [rr(rand, -0.5, 0.5) * span, yb + 1.05, rr(rand, -0.8, 0.8) * zs], rr(rand, 0.7, 1.1), i % 3 ? '#8fd66a' : cor, 3, 1);
  for (let i = 0; i < 4; i++) m.add(ico(0.12, 1), 'glow_white', '#ffffff', { p: [(-0.5 + (i + 0.5) / 4) * span, yb + 0.2, (i % 2 ? 1 : -1) * zs] });
  return m;
}

function fonteCeleste(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 2.3, 2.7);
  m.add(revolve([[R * 1.12, -0.2], [R * 1.12, 0.12], [R * 1.02, 0.2], [R, 0.62], [R * 1.08, 0.8], [R * 0.86, 0.8], [R * 0.84, 0.3], [0.001, 0.3]], 16, { uv: 2.5 }), 'ecl_marmore', marmore(0, 0.9));
  m.add(cyl(R * 0.85, R * 0.85, 0.04, 16), 'ecl_agua', '#ffffff', { p: [0, 0.62, 0] });
  m.add(revolve([[0.5, 0.3], [0.34, 0.9], [0.22, 1.5], [0.3, 1.7], [0.9, 1.85], [1.25, 2.2], [1.12, 2.2], [0.8, 1.98], [0.001, 1.95]], 12, { uv: 2.5 }), 'ecl_marmore', marmore(0.3, 2.3));
  m.add(cyl(1.1, 1.1, 0.03, 12), 'ecl_agua', '#ffffff', { p: [0, 2.12, 0] });
  m.add(revolve([[0.2, 1.95], [0.13, 2.6], [0.26, 2.75], [0.5, 2.95], [0.44, 2.97], [0.001, 2.86]], 10), 'ecl_marmore', MARMORE_B);
  m.add(ico(0.2, 1), 'glow_white', '#ffffff', { p: [0, 3.2, 0] });
  m.add(torus(0.3, 0.035, 4, 12), 'glossy', OURO, { p: [0, 2.72, 0], r: [Math.PI / 2, 0, 0] });
  m.add(torus(R * 1.08, 0.05, 4, 20), 'glossy', OURO, { p: [0, 0.82, 0], r: [Math.PI / 2, 0, 0] });
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + 0.3;
    const pts: V3[] = [];
    for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push(polar(a, 1.2 + t * (R * 0.7 - 1.2), 2.18 + Math.sin(t * Math.PI * 0.55) * 0.28 - t * t * 1.8)); }
    m.add(uvScale(tube(pts, (t) => 0.05 + t * 0.03, 6, 4), 1, 1), 'water_fall', '#ffffff');
    m.add(revolve([[0.08, -0.06], [0.14, 0.06], [0.1, 0.12]], 6), 'glossy', OURO, { p: polar(a, 1.22, 2.2) });
  }
  for (let i = 0; i < 4; i++) m.add(ico(0.18, 0), 'leaf', pick(rand, COPAS), { p: polar(rand() * TAU, R * rr(rand, 0.3, 0.75), 0.66), s: [1, 0.12, 1] });
  return m;
}

function balaustre(m: Model, x: number, h: number): void {
  m.add(revolve([[0.11, 0], [0.07, h * 0.12], [0.14, h * 0.38], [0.08, h * 0.72], [0.06, h * 0.86], [0.11, h]], 6), 'ecl_marmore', marmore(0.2, 1.1), { p: [x, 0.24, 0] });
}
function ponteCelesteCorrimao(rand: Rand): Model {
  const m = new Model();
  m.add(uvBox(box(6, 0.24, 0.42, 0.04, 1), 2.5), 'ecl_marmore', marmore(0, 0.3), { p: [0, 0.1, 0] });
  m.add(uvBox(extrude([[-0.24, 0], [0.24, 0], [0.2, 0.12], [0.1, 0.18], [-0.1, 0.18], [-0.2, 0.12]], 5.2), 2.5), 'ecl_marmore', MARMORE_B, { p: [0, 0.98, 0], r: [0, Math.PI / 2, 0] });
  for (let i = 0; i < 9; i++) balaustre(m, -2.1 + i * 0.525, 0.74);
  for (const s of [-1, 1]) {
    const x = s * 2.72;
    m.add(uvBox(prism(rectPts(0.5, 0.5, 0.06), 0.2, 1.22, { at: [x, 0] }), 2.5), 'ecl_marmore', marmore(0, 1.3));
    m.add(uvBox(prism(rectPts(0.62, 0.62, 0.06), 1.22, 1.34, { at: [x, 0], cap: 'both' }), 2.5), 'ecl_marmore', MARMORE_B);
    m.add(revolve([[0.1, 1.34], [0.2, 1.46], [0.24, 1.66], [0.17, 1.74], [0.22, 1.8], [0.16, 1.8], [0.001, 1.72]], 8), 'glossy', mix(OURO, '#ffffff', 0.2), { p: [x, 0, 0] });
    copa(m, rand, [x, 2.0, 0], 0.3, pick(rand, COPAS), 3, 1);
    m.add(tube([[x, 1.78, 0.1], [x + 0.05, 1.6, 0.3], [x, 1.3, 0.34]], 0.025, 4, 4), 'matte', '#3f8f52');
  }
  return m;
}

function lanternaBase(rand: Rand): Model {
  const m = new Model();
  m.add(revolve([[0.5, -0.1], [0.48, 0.12], [0.34, 0.2], [0.3, 0.34], [0.001, 0.34]], 8, { uv: 1.5 }), 'ecl_marmore', marmore(0, 0.4));
  m.add(cyl(0.2, 0.2, 0.03, 8), 'glow_white', '#ffffff', { p: [0, 0.35, 0] });
  m.add(torus(0.42, 0.03, 4, 12), 'glossy', OURO, { p: [0, 0.14, 0], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 3; i++) m.add(ico(0.1, 0), 'leaf', pick(rand, COPAS), { p: polar(i * 2.1 + rand(), 0.6, 0.03), s: [1, 0.15, 1] });
  return m;
}
function lanternaCorpo(rand: Rand): Model {
  const m = new Model();
  const s = rr(rand, 0.9, 1.15);
  m.add(revolve([[0.16, -0.36], [0.34, -0.2], [0.4, 0.05], [0.3, 0.3], [0.14, 0.4]], 10), 'glow_white', '#ffffff');
  for (let i = 0; i < 6; i++) m.add(tube([polar((i / 6) * TAU, 0.17, -0.36), polar((i / 6) * TAU, 0.36, -0.2), polar((i / 6) * TAU, 0.42, 0.05), polar((i / 6) * TAU, 0.32, 0.3), polar((i / 6) * TAU, 0.15, 0.4)], 0.016, 6, 3), 'glossy', OURO);
  m.add(revolve([[0.16, 0.4], [0.2, 0.46], [0.06, 0.56], [0.001, 0.66]], 8), 'glossy', OURO);
  m.add(cyl(0.17, 0.12, 0.08, 8), 'glossy', OURO, { p: [0, -0.4, 0] });
  m.add(torus(0.07, 0.015, 4, 8), 'glossy', OURO, { p: [0, 0.72, 0] });
  m.add(cyl(0.012, 0.012, 0.3, 3), 'matte', '#d86a9a', { p: [0, -0.58, 0] });
  m.add(prism(ngon(0.06, 5), -0.26, 0, { top: 0.4, cap: 'none' }), 'cloth', '#ff9ccf', { p: [0, -0.74, 0] });
  m.transform({ s });
  return m;
}

function topiaria(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 2.6, 3.4), verde = vary('#4fae5c', rand, 0.06);
  m.add(revolve([[0.4, -0.1], [0.5, 0.1], [0.62, 0.62], [0.68, 0.7], [0.56, 0.7], [0.5, 0.56], [0.001, 0.56]], 10, { uv: 1.5 }), 'ecl_marmore', marmore(0, 0.7));
  m.add(torus(0.6, 0.035, 4, 12), 'glossy', OURO, { p: [0, 0.5, 0], r: [Math.PI / 2, 0, 0] });
  m.add(cyl(0.07, 0.09, H - 0.4, 6), 'matte', '#6b5560', { p: [0, 0.56 + (H - 0.4) / 2, 0] });
  const pts: V3[] = [], voltas = 3.2, n = 26;
  for (let i = 0; i <= n; i++) { const t = i / n, a = t * voltas * TAU; pts.push([Math.cos(a) * (0.62 - t * 0.5), 0.9 + t * (H - 1.1), Math.sin(a) * (0.62 - t * 0.5)]); }
  m.add(tube(pts, (t) => 0.34 - t * 0.2, 52, 6), 'matte', shade(mix(verde, '#123f3a', 0.5), mix(verde, '#d8ff9a', 0.3), 0.7, H, 0.3));
  m.add(blob(0.3, rand, { detail: 1, jitter: 0.06, faceted: false }), 'matte', mix(verde, '#d8ff9a', 0.3), { p: [0, H + 0.12, 0] });
  for (let i = 0; i < 7; i++) { const p = pts[2 + i * 3]!; m.add(ico(0.08, 0), 'glossy', pick(rand, COPAS), { p: [p[0] * 1.45, p[1] + 0.1, p[2] * 1.45] }); }
  return m;
}

function passaroEstatua(rand: Rand): Model {
  const m = new Model();
  const hp = rr(rand, 1.1, 1.5);
  m.add(uvBox(prism(rectPts(1.3, 1.3, 0.14), -0.2, 0.3), 2), 'ecl_marmore', marmore(0, 0.4));
  m.add(revolve([[0.5, 0.3], [0.4, 0.44], [0.36, hp - 0.2], [0.52, hp], [0.001, hp]], 8, { uv: 2 }), 'ecl_marmore', marmore(0, hp));
  m.add(torus(0.4, 0.035, 4, 12), 'glossy', OURO, { p: [0, hp - 0.22, 0], r: [Math.PI / 2, 0, 0] });
  const b = new Model(), cor = marmore(-0.6, 0.9);
  b.add(blob(0.42, rand, { detail: 2, jitter: 0.03, s: [0.8, 0.9, 1.25], faceted: false }), 'ecl_marmore', cor, { p: [0, 0.5, 0], r: [-0.5, 0, 0] });
  b.add(sphere(0.22, 10, 8), 'ecl_marmore', cor, { p: [0, 1.02, 0.34] });
  b.add(cone(0.07, 0.3, 6), 'glossy', OURO, { p: [0, 1.0, 0.62], r: [Math.PI / 2, 0, 0] });
  b.add(tube([[0, 1.2, 0.3], [0, 1.42, 0.14], [0, 1.5, -0.1]], (t) => 0.05 - t * 0.03, 5, 4), 'glossy', OURO);
  for (const s of [-1, 1]) {
    const asa: P2[] = [[0, 0], [0.5, 0.42], [1.3, 0.72], [1.02, 0.3], [1.16, 0.06], [0.82, -0.02], [0.86, -0.3], [0.5, -0.2], [0.42, -0.42], [0, -0.3]];
    b.add(extrude(asa, 0.07, 0.02), 'ecl_marmore', cor, { p: [s * 0.24, 0.72, -0.05], r: [0.2, s > 0 ? -0.5 : Math.PI + 0.5, s * 0.5] });
    b.add(cyl(0.035, 0.035, 0.3, 5), 'glossy', OURO, { p: [s * 0.14, 0.06, 0.05] });
    b.add(ico(0.035, 0), 'matte', '#3a3350', { p: [s * 0.12, 1.08, 0.5] });
  }
  b.add(extrude([[0, 0], [0.3, -0.75], [0, -0.6], [-0.3, -0.75]], 0.05), 'ecl_marmore', cor, { p: [0, 0.34, -0.4], r: [1.0, 0, 0] });
  m.addModel(b, { p: [0, hp, 0], r: [0, rr(rand, -0.4, 0.4), 0] });
  return m;
}

function moinhoBase(rand: Rand): Model {
  const m = new Model();
  m.add(revolve([[0.62, -0.2], [0.58, 0.16], [0.36, 0.3], [0.2, 0.7]], 10, { uv: 1.5 }), 'ecl_marmore', marmore(0, 0.7));
  m.add(revolve([[0.14, 0.7], [0.1, 4.6], [0.16, 4.75], [0.16, 5.2], [0.001, 5.3]], 8, { uv: 1.5 }), 'ecl_marmore', marmore(0, 5));
  for (const y of [0.9, 2.6, 4.4]) m.add(torus(0.15, 0.035, 4, 10), 'glossy', OURO, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
  m.add(cyl(0.05, 0.05, 0.5, 6), 'glossy', OURO, { p: [0, 5, 0.25], r: [Math.PI / 2, 0, 0] });
  trepadeira(m, rand, 0.2, 0.4, 3.4, 0, 0, 3);
  // seta de vento na ponta
  m.add(extrude([[-0.6, 0], [-0.2, 0.2], [-0.2, 0.05], [0.5, 0.05], [0.5, 0.2], [0.8, 0], [0.5, -0.2], [0.5, -0.05], [-0.2, -0.05], [-0.2, -0.2]], 0.04), 'glossy', OURO, { p: [0, 5.55, 0], r: [0, rand() * 3, 0] });
  m.add(cyl(0.02, 0.02, 0.4, 4), 'glossy', OURO, { p: [0, 5.4, 0] });
  return m;
}
function moinhoPas(rand: Rand): Model {
  const m = new Model();
  const n = ri(rand, 6, 8), cores = ['#ff9ccf', '#ffd27a', '#9fe0ff', '#c9a2ff'];
  for (let i = 0; i < n; i++) {
    const pa: P2[] = [[0, 0], [0.5, 0.16], [1.5, 0.62], [1.72, 0.3], [1.5, -0.1], [0.6, -0.14]];
    m.add(warp(extrude(pa, 0.04), (p) => { p.z += (p.y + 0.1) * 0.5 * (p.x / 1.7); }), 'leaf', gradY('#ffffff', cores[i % cores.length]!, -0.3, 0.6), { r: [0, 0, (i / n) * TAU] });
  }
  m.add(revolve([[0.26, -0.06], [0.2, 0.1], [0.001, 0.16]], 8), 'glossy', OURO, { r: [Math.PI / 2, 0, 0] });
  m.add(ico(0.09, 1), 'glow_white', '#ffffff', { p: [0, 0, 0.18] });
  return m;
}

export const CELESTE_PROPS: PropLibrary = {
  'ilha-flutuante': { build: ilhaFlutuante, radius: 12 },
  'ilha-pequena': { build: ilhaPequena, radius: 5 },
  'arvore-celeste': { build: arvoreCeleste, radius: 3, collider: { radius: 0.5, height: 5 } },
  'ruina-arco-celeste': { build: ruinaArcoCeleste, radius: 11 },
  'ruina-coluna-celeste': { build: ruinaColunaCeleste, radius: 2.4, collider: { radius: 0.9, height: 4.5 } },
  nuvem: { build: nuvem, radius: 9 },
  'cachoeira-celeste': { build: cachoeiraCeleste, radius: 9 },
  'flor-gigante': { build: florBase, radius: 1.7, animated: { build: florHaste, pivot: [0, 0.3, 0], motion: { kind: 'sway', axis: 'x', angle: 0.1, period: 3.6 } } },
  'pergola-celeste': { build: pergolaCeleste, radius: 11 },
  'fonte-celeste': { build: fonteCeleste, radius: 3.2, collider: { radius: 2.9, height: 1.2 } },
  'ponte-celeste-corrimao': { build: ponteCelesteCorrimao, radius: 3.1, collider: { radius: 0.4, height: 1.2 } },
  'lanterna-celeste': { build: lanternaBase, radius: 0.7, animated: { build: lanternaCorpo, pivot: [0, 2.3, 0], motion: { kind: 'bob', height: 0.35, period: 3.2 } } },
  topiaria: { build: topiaria, radius: 1, collider: { radius: 0.6, height: 2.6 } },
  'passaro-estatua': { build: passaroEstatua, radius: 1.1, collider: { radius: 0.7, height: 2.4 } },
  'moinho-de-vento-celeste': { build: moinhoBase, radius: 1, collider: { radius: 0.4, height: 5 }, animated: { build: moinhoPas, pivot: [0, 5, 0.5], motion: { kind: 'spin', axis: 'z', period: 4 } } },
};
