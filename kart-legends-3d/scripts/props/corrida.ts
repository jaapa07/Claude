/** GENÉRICOS DE CORRIDA — sinalização, barreiras, público e publicidade fictícia original. */
import { torus } from '../lib/geo';
import {
  Model, TAU, beam, blob, box, cbox, cyl, dark, fin, flat, ico, jit, lathe, lite, mix, paintTri, pick, put, rawGeo, rod, rope, rr, sagPts, signPlane, slab,
  tone, xf, type ColorLike, type Rand, type V3,
} from './aurora-kit';
import type { PropLibrary } from './types';

const RED = '#e3202e';
const WHITE = '#f6f2ea';
const STEEL = '#5a6070';
const DARK = '#23222c';
const BRIGHT = ['#e3202e', '#ffcf1a', '#2a8fe0', '#2fb86a', '#ff7a1c', '#b04fd8', '#ff5fa0', '#19c2c9'];
const SKINS = ['#f2c9a0', '#d9a070', '#a86a44', '#7a4a30', '#f6dcc0'];

/** Poste listrado (vermelho/branco) de base na origem. */
function stripedPost(m: Model, x: number, z: number, h: number, r = 0.09, c1: ColorLike = RED): void {
  const n = Math.max(2, Math.round(h / 0.6));
  for (let i = 0; i < n; i++) put(m, cyl(r, r, h / n, 7, true), 'paint', i % 2 ? WHITE : c1, { p: [x, (i + 0.5) * (h / n), z] }, 0.06);
  put(m, cyl(r * 2.2, r * 2.6, 0.16, 7), 'std', DARK, { p: [x, 0.05, z] });
}

function placaSeta(rand: Rand, mirror: boolean): Model {
  const m = new Model();
  const w = 3.0, h = 1.5, y = rr(rand, 1.75, 1.95), tilt = rr(rand, -0.03, 0.03);
  for (const sx of [-1, 1]) { stripedPost(m, sx * 1.15, -0.08, y + h / 2 + 0.15); put(m, flat(ico(0.11, 0)), 'paint', WHITE, { p: [sx * 1.15, y + h / 2 + 0.22, -0.08] }); }
  const b = new Model();
  put(b, cbox(w + 0.14, h + 0.14, 0.1, 0.03), 'paint', DARK, { p: [0, 0, -0.03] });
  b.add(signPlane(w, h, mirror), 'aur_chevron', '#ffffff', { p: [0, 0, 0.025] });
  for (const sy of [-1, 1]) put(b, box(w - 0.3, 0.06, 0.06), 'metal', STEEL, { p: [0, sy * 0.45, -0.1] });
  m.addModel(b, { p: [0, y, 0], r: [0, 0, tilt] });
  return fin(m);
}

function tire(r: number, c: ColorLike): Model {
  const g = new Model();
  put(g, xf(torus(r * 0.72, r * 0.28, 5, 10), { r: [Math.PI / 2, 0, 0], s: [1, 0.78, 1] }), 'rubber', c, undefined, 0.25);
  put(g, cyl(r * 0.5, r * 0.5, r * 0.3, 10, true), 'rubber', dark(c, 0.45), undefined, 0.05);
  return g;
}

function barreiraPneus(rand: Rand): Model {
  const m = new Model();
  const r = 0.37, cols = 4, c1 = pick(rand, BRIGHT), c2 = pick(rand, [WHITE, '#ffcf1a']);
  for (let i = 0; i < cols; i++) for (let k = 0; k < 3; k++) {
    const x = -1.5 + r + i * ((3 - 2 * r) / (cols - 1));
    const c = k === 2 ? (i % 2 ? c1 : c2) : k === 1 ? (i % 2 ? c2 : c1) : DARK;
    m.addModel(tire(r, jit(c, rand, 0.005, 0.03, 0.03)), { p: [x + rr(rand, -0.02, 0.02), 0.11 + k * 0.215, rr(rand, -0.03, 0.03)], r: [0, rand() * TAU, 0] });
  }
  for (let i = 0; i < cols - 1; i++) m.addModel(tire(r * 0.92, DARK), { p: [-1.5 + r + (i + 0.5) * ((3 - 2 * r) / (cols - 1)), 0.11 + 3 * 0.215, 0.02], r: [0, rand() * TAU, 0] });
  return fin(m);
}

function cone(rand: Rand): Model {
  const m = new Model();
  const h = rr(rand, 0.68, 0.78), c = jit(pick(rand, ['#ff6a1c', '#ff7a1c', '#f0481c']), rand);
  put(m, cbox(0.5, 0.06, 0.5, 0.02), 'rubber', dark(c, 0.3), { p: [0, 0.03, 0] });
  const ts = [0, 0.3, 0.55, 0.72, 0.86, 1];
  const prof: [number, number][] = ts.map((t) => [0.19 - 0.145 * t, 0.05 + h * t]);
  prof.push([0.01, 0.05 + h]);
  m.add(paintTri(flat(lathe(prof, 10)), (p) => { const t = (p.y - 0.05) / h; return (t > 0.3 && t < 0.55) || (t > 0.72 && t < 0.86) ? WHITE : mix(dark(c, 0.12), lite(c, 0.1), t); }), 'std');
  m.transform({ r: [rr(rand, -0.03, 0.03), rand() * TAU, 0] });
  return fin(m);
}

function espectador(m: Model, rand: Rand, p: V3, cheer: boolean): void {
  const shirt = pick(rand, BRIGHT), skin = pick(rand, SKINS);
  put(m, xf(flat(cyl(0.17, 0.22, 0.55, 5)), { p: [p[0], p[1] + 0.3, p[2]] }), 'aur_cloth', shirt, undefined, 0.22);
  put(m, flat(ico(0.16, 0)), 'skin', skin, { p: [p[0], p[1] + 0.74, p[2]] }, 0.12);
  const hair = rand();
  if (hair < 0.6) put(m, flat(lathe([[0.17, 0], [0.13, 0.1], [0.01, 0.14]], 5)), 'std', pick(rand, ['#2a1c1c', '#6a4424', '#e8c267', BRIGHT[Math.floor(rand() * 8)]!]), { p: [p[0], p[1] + 0.8, p[2] - 0.02] });
  if (cheer) for (const sx of [-1, 1]) put(m, rod([p[0] + sx * 0.18, p[1] + 0.5, p[2]], [p[0] + sx * 0.34, p[1] + 0.98, p[2] + 0.05], 0.045, 3), 'skin', skin);
}

function arquibancada(rand: Rand): Model {
  const m = new Model();
  const W = 10, rows = 5, rd = 0.85, rh = rr(rand, 0.48, 0.56);
  const c1 = pick(rand, BRIGHT.slice(0, 5)), base = jit('#8a90a0', rand);
  for (let r = 0; r < rows; r++) {
    put(m, box(W, rh * (r + 1), rd), 'aur_metal', base, { p: [0, (rh * (r + 1)) / 2, -r * rd] }, 0.25);
    put(m, box(W - 0.3, 0.1, 0.42), 'paint', r % 2 ? c1 : WHITE, { p: [0, rh * (r + 1) + 0.2, -r * rd - 0.15] });
    const n = 11;
    for (let i = 0; i < n; i++) if (rand() < 0.86) espectador(m, rand, [-W / 2 + 0.5 + (i / (n - 1)) * (W - 1) + rr(rand, -0.08, 0.08), rh * (r + 1) + 0.25, -r * rd - 0.15], rand() < 0.3);
  }
  const back = -(rows - 1) * rd - rd / 2, top = rows * rh;
  put(m, box(W, top + 1.3, 0.12), 'paint', c1, { p: [0, (top + 1.3) / 2, back - 0.05] }, 0.25);
  for (const sx of [-1, 1]) {
    put(m, xf(rawGeo([0, 0, rd / 2, 0, 0, back, 0, top + 1.3, back, 0, 0, rd / 2, 0, top + 1.3, back, 0, rh + 1.0, rd / 2, 0, 0, rd / 2, 0, rh + 1.0, rd / 2, 0, 0, rd / 2]), { p: [sx * (W / 2 + 0.03), 0, 0] }), 'aur_cloth', WHITE, undefined, 0.2);
    put(m, box(0.14, top + 3.4, 0.14), 'metal', STEEL, { p: [sx * (W / 2 - 0.1), (top + 3.4) / 2, back + 0.1] });
    put(m, box(0.12, rh + 3.2, 0.12), 'metal', STEEL, { p: [sx * (W / 2 - 0.1), (rh + 3.2) / 2 + 0.3, rd / 2 - 0.1] });
    put(m, rod([sx * (W / 2 - 0.1), top + 3.4, back + 0.1], [sx * (W / 2 - 0.1), top + 4.6, back + 0.1], 0.03, 4), 'metal', STEEL);
    m.add(tone(xf(rawGeo([0, 0.25, 0, 0, -0.25, 0, 0.8, 0, 0, 0, 0.25, 0, 0.8, 0, 0, 0, -0.25, 0]), { p: [sx * (W / 2 - 0.1), top + 4.3, back + 0.1] }), pick(rand, BRIGHT), 0.1), 'aur_cloth');
  }
  put(m, box(W, 0.07, 0.07), 'metal', STEEL, { p: [0, rh + 1.0, rd / 2 - 0.1] });
  for (let i = 0; i <= 5; i++) put(m, box(0.06, 0.8, 0.06), 'metal', STEEL, { p: [-W / 2 + 0.1 + (i / 5) * (W - 0.2), rh + 0.6, rd / 2 - 0.1] });
  // cobertura listrada
  const n = 10, sw = (W + 0.8) / n;
  for (let i = 0; i < n; i++) {
    const g = slab([[0, 0], [2.4, 0.5], [4.9, 0.25]], 0.06, sw, 1);
    g.rotateY(-Math.PI / 2);
    put(m, g, 'aur_cloth', i % 2 ? WHITE : c1, { p: [-(W + 0.8) / 2 + sw * (i + 0.5), top + 3.3, back - 0.3] }, 0.15);
  }
  // faixa frontal
  put(m, box(W, rh - 0.04, 0.05), 'paint', c1, { p: [0, rh / 2, rd / 2 + 0.03] }, 0.2);
  for (let i = 0; i < 8; i++) put(m, box(0.5, 0.2, 0.02), 'paint', i % 2 ? WHITE : '#ffcf1a', { p: [-W / 2 + 0.9 + i * ((W - 1.8) / 7), rh / 2, rd / 2 + 0.06] });
  return fin(m);
}

function bandeirolas(rand: Rand, span = 20): Model {
  const m = new Model();
  const px = span / 2 + 0.6, H = rr(rand, 8.6, 9.0);
  for (const sx of [-1, 1]) {
    stripedPost(m, sx * px, 0, H, 0.11, pick(rand, [RED, '#2a8fe0', '#ff7a1c']));
    put(m, cbox(0.7, 0.5, 0.7, 0.06), 'std', DARK, { p: [sx * px, 0.2, 0] });
    put(m, flat(ico(0.2, 0)), 'metal', '#f0c24a', { p: [sx * px, H + 0.15, 0] });
  }
  const off = Math.floor(rand() * BRIGHT.length);
  for (const [dz, dy, sag] of [[0, -0.2, 0.75], [0.03, -0.9, 0.5]] as const) {
    const a: V3 = [-px, H + dy, dz], b: V3 = [px, H + dy, dz];
    put(m, rope(a, b, sag, 0.025, 12, 3), 'std', WHITE);
    const n = Math.round((2 * px) / 0.85);
    const pts = sagPts(a, b, sag, n);
    const pos: number[] = [];
    const cols: string[] = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i]!, q = pts[i + 1]!, w = 0.1;
      pos.push(p[0] + w, p[1], dz, q[0] - w, q[1], dz, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 0.72, dz + 0.04);
      cols.push(BRIGHT[(i + off) % BRIGHT.length]!);
    }
    let k = 0;
    m.add(paintTri(rawGeo(pos), () => cols[k++]!), 'aur_cloth');
  }
  return fin(m);
}

function torreCamera(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 6.4, 7.2), b = 1.25, c1 = pick(rand, BRIGHT);
  const leg = (i: number, y: number): V3 => [(i % 2 ? 1 : -1) * b, y, (i < 2 ? 1 : -1) * b];
  for (let i = 0; i < 4; i++) { put(m, beam(leg(i, 0), leg(i, H), 0.12), 'metal', STEEL, undefined, 0.2); put(m, cbox(0.4, 0.12, 0.4, 0.03), 'std', DARK, { p: [leg(i, 0)[0], 0.05, leg(i, 0)[2]] }); }
  const pairs: [number, number][] = [[0, 1], [1, 3], [3, 2], [2, 0]];
  const lv = 3;
  for (const [a, c] of pairs) for (let k = 0; k < lv; k++) {
    const y0 = (k / lv) * H, y1 = ((k + 1) / lv) * H;
    put(m, beam(leg(a, y1), leg(c, y1), 0.08), 'metal', STEEL);
    put(m, beam(leg(a, y0 + 0.1), leg(c, y1 - 0.1), 0.05), 'metal', lite(STEEL, 0.2));
    put(m, beam(leg(c, y0 + 0.1), leg(a, y1 - 0.1), 0.05), 'metal', lite(STEEL, 0.2));
  }
  put(m, cbox(3.1, 0.14, 3.1, 0.04), 'aur_wood', '#a87a4c', { p: [0, H + 0.07, 0] });
  for (let i = 0; i < 4; i++) {
    const a = leg(i, H + 0.1), c = leg(pairs[i]![1] === i ? pairs[i]![0] : pairs.find((q) => q[0] === i)![1], H + 0.1);
    put(m, box(0.07, 1.1, 0.07), 'metal', STEEL, { p: [a[0] * 1.18, H + 0.65, a[2] * 1.18] });
    put(m, beam([a[0] * 1.18, H + 1.2, a[2] * 1.18], [c[0] * 1.18, H + 1.2, c[2] * 1.18], 0.07), 'paint', c1);
    put(m, beam([a[0] * 1.18, H + 0.7, a[2] * 1.18], [c[0] * 1.18, H + 0.7, c[2] * 1.18], 0.05), 'metal', STEEL);
  }
  // faixa lateral, escada
  put(m, box(2.6, 0.9, 0.04), 'paint', c1, { p: [0, H - 0.75, b + 0.08] }, 0.15);
  for (let i = 0; i < 3; i++) put(m, flat(ico(0.22, 0)), 'paint', i === 1 ? '#ffcf1a' : WHITE, { p: [-0.7 + i * 0.7, H - 0.75, b + 0.1], s: [1, 1, 0.2] });
  for (const s of [-1, 1]) put(m, box(0.05, H, 0.05), 'metal', STEEL, { p: [s * 0.25, H / 2, -b - 0.12] });
  for (let i = 1; i < Math.floor(H / 0.45); i++) put(m, box(0.5, 0.04, 0.04), 'metal', STEEL, { p: [0, i * 0.45, -b - 0.12] });
  // câmera em tripé, operador, guarda-sol
  const cy = H + 0.14;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; put(m, rod([Math.cos(a) * 0.4, cy, 0.5 + Math.sin(a) * 0.4], [0, cy + 1.2, 0.5], 0.03, 4), 'metal', DARK); }
  const cam = new Model();
  put(cam, cbox(0.36, 0.36, 0.75, 0.05), 'paint', DARK, { p: [0, 0.2, 0] });
  put(cam, cyl(0.15, 0.12, 0.4, 8), 'metal', '#3a3a48', { p: [0, 0.2, 0.55], r: [Math.PI / 2, 0, 0] });
  put(cam, cyl(0.17, 0.17, 0.08, 8), 'metal', DARK, { p: [0, 0.2, 0.76], r: [Math.PI / 2, 0, 0] });
  cam.add(cyl(0.12, 0.12, 0.02, 8), 'glossy', '#3fa8e0', { p: [0, 0.2, 0.805], r: [Math.PI / 2, 0, 0] });
  cam.add(flat(ico(0.045, 0)), 'glow_red', '#ff6060', { p: [0.12, 0.42, 0.3] });
  put(cam, cbox(0.14, 0.2, 0.3, 0.03), 'paint', c1, { p: [0, 0.48, -0.1] });
  put(cam, rod([0, 0.1, -0.35], [0.3, -0.1, -0.75], 0.025, 4), 'metal', STEEL);
  m.addModel(cam, { p: [0, cy + 1.2, 0.5], r: [0.18, rr(rand, -0.5, 0.5), 0] });
  const ox = 0.35, oz = -0.25;
  put(m, flat(cyl(0.2, 0.25, 0.7, 6)), 'aur_cloth', '#3a4a6a', { p: [ox, cy + 0.35, oz] });
  put(m, flat(cyl(0.22, 0.24, 0.6, 6)), 'aur_cloth', c1, { p: [ox, cy + 1.0, oz] });
  put(m, flat(ico(0.19, 1)), 'skin', pick(rand, SKINS), { p: [ox, cy + 1.48, oz] });
  put(m, flat(lathe([[0.3, 0], [0.2, 0.04], [0.19, 0.14], [0.01, 0.18]], 7)), 'paint', DARK, { p: [ox, cy + 1.56, oz + 0.03] });
  put(m, xf(torus(0.2, 0.035, 4, 8, Math.PI), { p: [ox, cy + 1.5, oz] }), 'std', DARK);
  put(m, rod([-0.9, cy, -0.8], [-0.9, cy + 2.6, -0.8], 0.03, 4), 'metal', STEEL);
  const um = flat(lathe([[1.5, 0], [0.9, 0.35], [0.01, 0.5]], 8));
  m.add(paintTri(xf(um, { p: [-0.9, cy + 2.4, -0.8] }), (p) => (Math.floor(((Math.atan2(p.x + 0.9, p.z + 0.8) + TAU) % TAU) / TAU * 8) % 2 ? WHITE : c1)), 'aur_cloth');
  return fin(m);
}

const BALLOON_PIVOT: V3 = [0, 9, 0];
function balaoBase(rand: Rand): Model {
  const m = new Model();
  const c = pick(rand, BRIGHT);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + rand(), d = rr(rand, 1.3, 1.7);
    put(m, blob(0.34, 1, rand() * 20, 0.1, 1.2, [1.1, 0.75, 0.9], false), 'aur_cloth', '#d9c8a0', { p: [Math.cos(a) * d, 0.22, Math.sin(a) * d], r: [0, a, 0] }, 0.3);
    put(m, rod([Math.cos(a) * d * 1.2, -0.05, Math.sin(a) * d * 1.2], [Math.cos(a) * d * 1.3, 0.4, Math.sin(a) * d * 1.3], 0.04, 4), 'aur_wood', '#6a4630');
    put(m, rope([Math.cos(a) * d * 1.25, 0.3, Math.sin(a) * d * 1.25], [Math.cos(a) * 0.55, BALLOON_PIVOT[1] + 0.1, Math.sin(a) * 0.55], 0.35, 0.025, 6, 3), 'aur_hay', '#d9c08a');
  }
  put(m, cbox(1.5, 0.12, 1.5, 0.03), 'aur_wood', '#a87a4c', { p: [0, 0.06, 0] });
  put(m, box(0.5, 0.26, 0.02), 'aur_cloth', c, { p: [0, 0.75, 0.9] });
  put(m, rod([0, 0, 0.9], [0, 0.9, 0.9], 0.03, 4), 'aur_wood', '#6a4630');
  return fin(m);
}
function balaoTopo(rand: Rand): Model {
  const m = new Model();
  const c1 = pick(rand, BRIGHT), c2 = pick(rand, [WHITE, '#ffcf1a', '#fff2c0']), c3 = pick(rand, BRIGHT);
  const R = rr(rand, 4.2, 4.8), y0 = 3.0, Hh = R * 2.45, gores = 12;
  // cesto de vime, queimador e cabos
  put(m, flat(lathe([[0.01, 0], [0.6, 0], [0.72, 0.5], [0.75, 1.05], [0.66, 1.05], [0.62, 0.12], [0.01, 0.12]], 8)), 'aur_hay', '#b88848', undefined, 0.3, '#e0b870');
  put(m, xf(torus(0.74, 0.07, 4, 8), { r: [Math.PI / 2, 0, 0], p: [0, 1.05, 0] }), 'aur_wood', '#6a4630');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    put(m, rod([Math.cos(a) * 0.68, 1.05, Math.sin(a) * 0.68], [Math.cos(a) * 1.25, y0 + 0.15, Math.sin(a) * 1.25], 0.025, 3), 'aur_hay', '#d9c08a');
    put(m, blob(0.2, 0, i, 0.1, 1, [0.8, 1.2, 0.6], false), 'aur_cloth', '#d9c8a0', { p: [Math.cos(a) * 0.78, 0.6, Math.sin(a) * 0.78] });
  }
  put(m, cyl(0.2, 0.26, 0.4, 6), 'metal', '#6a6a78', { p: [0, 2.0, 0] });
  m.add(flat(lathe([[0.16, 0], [0.24, 0.3], [0.01, 0.8]], 6)), 'glow_warm', '#fff0b8', { p: [0, 2.2, 0] });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; put(m, rod([Math.cos(a) * 0.5, 1.05, Math.sin(a) * 0.5], [Math.cos(a) * 0.14, 1.9, Math.sin(a) * 0.14], 0.02, 3), 'metal', '#6a6a78'); }
  // envelope em gomos (formato de gota invertida) com faixas
  const prof: [number, number][] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.45)), 0.6) * (t < 0.02 ? 0 : 1) + (i === 0 ? 1.25 : 0);
    prof.push([Math.max(0.02, r), y0 + t * Hh]);
  }
  const env = flat(lathe(prof, gores));
  m.add(paintTri(env, (p) => {
    const t = (p.y - y0) / Hh, g = Math.floor(((Math.atan2(p.x, p.z) + TAU) % TAU) / TAU * gores);
    const band = t > 0.56 && t < 0.67;
    const base = band ? c3 : g % 2 ? c1 : c2;
    return mix(dark(base, 0.3), lite(base, 0.12), Math.min(1, t * 1.1));
  }), 'aur_cloth');
  put(m, cyl(1.3, 1.2, 0.5, gores, true), 'aur_cloth', c3, { p: [0, y0 - 0.2, 0] }, 0.2);
  put(m, flat(ico(0.3, 0)), 'paint', c3, { p: [0, y0 + Hh, 0], s: [1, 0.5, 1] });
  // flâmulas no equador
  for (let i = 0; i < gores; i += 2) {
    const a = ((i + 0.5) / gores) * TAU, ye = y0 + Hh * 0.63;
    m.add(tone(xf(rawGeo([-0.3, 0, 0, 0.3, 0, 0, 0, -0.8, 0.05]), { p: [Math.sin(a) * R * 0.97, ye, Math.cos(a) * R * 0.97], r: [0, a, 0] }), c3, 0.1), 'aur_cloth');
  }
  return fin(m);
}

function placaPatrocinio(rand: Rand): Model {
  const m = new Model();
  const W = 6, Hh = 2.5, y = rr(rand, 2.9, 3.3);
  const sign = pick(rand, ['aur_sign_turbo', 'aur_sign_pneus', 'aur_sign_tiko'] as const);
  const frame = pick(rand, ['#2c3a5a', '#3a2c3a', '#2c4a3a']);
  for (const sx of [-1, 1]) {
    put(m, box(0.22, y + Hh / 2, 0.22), 'metal', STEEL, { p: [sx * 2.1, (y + Hh / 2) / 2, -0.2] }, 0.25);
    put(m, beam([sx * 2.1, 0.1, -1.3], [sx * 2.1, y, -0.25], 0.12), 'metal', STEEL);
    put(m, cbox(0.6, 0.3, 1.9, 0.05), 'aur_stone', '#8a8a94', { p: [sx * 2.1, 0.1, -0.65] });
    for (const k of [-1, 1]) put(m, beam([sx * 2.1, y - 1.0, -0.2], [sx * (2.1 - k * 0.0), y - 1.6, -0.2], 0.05), 'metal', STEEL);
  }
  put(m, beam([-2.1, 0.5, -0.2], [2.1, y - Hh / 2, -0.2], 0.07), 'metal', lite(STEEL, 0.15));
  put(m, beam([2.1, 0.5, -0.2], [-2.1, y - Hh / 2, -0.2], 0.07), 'metal', lite(STEEL, 0.15));
  put(m, cbox(W + 0.3, Hh + 0.3, 0.22, 0.05), 'paint', frame, { p: [0, y, -0.02] }, 0.2);
  m.add(signPlane(W, Hh), sign, '#ffffff', { p: [0, y, 0.1] });
  for (const sy of [-1, 1]) put(m, box(W - 0.2, 0.08, 0.08), 'metal', STEEL, { p: [0, y + sy * 0.7, -0.17] });
  // refletores e passarela
  for (let i = 0; i < 3; i++) {
    const x = -2 + i * 2;
    put(m, rod([x, y + Hh / 2 + 0.15, -0.05], [x, y + Hh / 2 + 0.55, 0.75], 0.03, 4), 'metal', DARK);
    put(m, cbox(0.34, 0.14, 0.26, 0.03), 'metal', DARK, { p: [x, y + Hh / 2 + 0.55, 0.78], r: [0.7, 0, 0] });
    m.add(box(0.26, 0.03, 0.18), 'glow_warm', '#fff0b8', { p: [x, y + Hh / 2 + 0.49, 0.73], r: [0.7, 0, 0] });
  }
  put(m, box(W + 0.2, 0.06, 0.6), 'metal', STEEL, { p: [0, y - Hh / 2 - 0.2, 0.3] });
  put(m, box(W + 0.2, 0.05, 0.05), 'metal', STEEL, { p: [0, y - Hh / 2 + 0.35, 0.58] });
  for (let i = 0; i <= 4; i++) put(m, box(0.04, 0.55, 0.04), 'metal', STEEL, { p: [-W / 2 + (i / 4) * W, y - Hh / 2 + 0.08, 0.58] });
  return fin(m);
}

export const CORRIDA_PROPS: PropLibrary = {
  'placa-seta-esq': { radius: 1.7, collider: { radius: 1.3, height: 2.8 }, build: (rand) => placaSeta(rand, true) },
  'placa-seta-dir': { radius: 1.7, collider: { radius: 1.3, height: 2.8 }, build: (rand) => placaSeta(rand, false) },
  'barreira-pneus': { radius: 1.6, collider: { radius: 1.3, height: 0.9 }, build: barreiraPneus },
  cone: { radius: 0.4, collider: { radius: 0.25, height: 0.8 }, build: cone },
  arquibancada: { radius: 5.6, collider: { radius: 4.5, height: 4 }, build: arquibancada },
  bandeirolas: { radius: 1, build: bandeirolas },
  'torre-camera': { radius: 2.4, collider: { radius: 1.9, height: 8 }, build: torreCamera },
  'balao-ar': { radius: 2.4, build: balaoBase, animated: { build: balaoTopo, pivot: BALLOON_PIVOT, motion: { kind: 'bob', height: 0.8, period: 6 } } },
  'placa-patrocinio': { radius: 3.3, collider: { radius: 2.4, height: 5 }, build: placaPatrocinio },
};
