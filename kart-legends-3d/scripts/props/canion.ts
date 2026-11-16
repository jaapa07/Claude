/** CÂNION SOLAR — deserto rochoso com ruínas solares originais. Objetos de cenário. */
import { torus } from '../lib/geo';
import {
  Model, TAU, beam, blob, box, cbox, cyl, dark, fbm3, fin, flat, heightDisc, ico, jit, lathe, lite, loft, mix, n3, openingProf, paint, paintTri, paperLantern, pick, put,
  rawGeo, rockGeo, rod, rope, rr, sagPts, shell, signPlane, strata, strip, tone, tube, xf, type ColorLike, type P2, type Rand, type V3,
} from './aurora-kit';
import type { PropLibrary } from './types';

const STRATA: string[][] = [
  ['#7a3428', '#b04a30', '#d86a3c', '#f0a25a', '#c85a34', '#f4c078', '#b84e30', '#e88a4c', '#f6d08c'],
  ['#6a2f3a', '#a8443c', '#d0603c', '#eb9a58', '#f2c47c', '#c25c38', '#e07a44', '#f8d898', '#d87044'],
  ['#80402a', '#b85c30', '#e0843c', '#f4b060', '#d06a34', '#f8cc80', '#b05030', '#e89450', '#fae0a0'],
];
const SANDSTONE = '#dcb888';
const SAND = '#f0cf94';
const GOLD = '#f0c24a';
const CLOTHS = ['#d8473c', '#2f8fa8', '#e8a02c', '#8d4ea8', '#3f9a6a', '#f06a3c'];

function mesa(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 20, 40), R = rr(rand, 9, 13), seed = rand() * 60;
  const bands = pick(rand, STRATA);
  const el = rr(rand, 0.68, 0.9), rot = rand() * TAU;
  const prof = (t: number): number => {
    if (t < 0.24) return 1.5 - 1.9 * t;
    const step = Math.floor((t - 0.24) / 0.19);
    return 1.04 - step * 0.055 - 0.05 * ((t - 0.24) / 0.19 - step) + (t > 0.9 ? 0.07 : 0);
  };
  const g = loft(20, 22, (t, a) => {
    const y = -0.2 + t * (H + 0.2);
    const flute = 1 + 0.07 * Math.sin(a * 9 + seed) * (t > 0.24 ? 1 : 0.3) + 0.05 * Math.sin(a * 17 + t * 6);
    const lump = 0.72 + 0.56 * fbm3(Math.cos(a) * 1.4 + seed, t * 2.2, Math.sin(a) * 1.4 - seed);
    const r = R * prof(t) * flute * lump;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * el;
    return [x * Math.cos(rot) - z * Math.sin(rot), y, x * Math.sin(rot) + z * Math.cos(rot)];
  }, true, false, false);
  m.add(strata(g, bands, 0, H, seed, 0.9), 'aur_rock');
  // pináculo satélite e pedregulhos de tálus
  const a = rand() * TAU, h2 = H * rr(rand, 0.38, 0.6), r2 = R * 0.3, d = R * 1.05;
  const g2 = loft(9, 9, (t, an) => {
    const r = r2 * (1.25 - 0.75 * t + (t > 0.8 ? 0.22 : 0)) * (0.8 + 0.4 * fbm3(Math.cos(an) + seed, t * 3, Math.sin(an)));
    return [Math.cos(a) * d + Math.cos(an) * r, -0.2 + t * (h2 + 0.2), Math.sin(a) * d * el + Math.sin(an) * r];
  }, true, false, false);
  m.add(strata(g2, bands, 0, H, seed, 0.9), 'aur_rock');
  for (let i = 0; i < 6; i++) {
    const b = a + 1 + i * 0.9, rr2 = rr(rand, 1.0, 2.2);
    put(m, rockGeo(rr2, rand() * 50, [1.1, 0.75, 1], 1, 0.3), 'aur_rock', bands[1 + (i % 3)]!, { p: [Math.cos(b) * R * 1.5, rr2 * 0.72, Math.sin(b) * R * 1.5 * el] }, 0.3, bands[3]);
  }
  for (let i = 0; i < 3; i++) put(m, blob(rr(rand, 0.8, 1.3), 0, rand() * 9, 0.2, 1.3, [1.2, 0.6, 1.2]), 'aur_foliage', '#7a8a3c', { p: [rr(rand, -R, R) * 0.4, H + 0.3, rr(rand, -R, R) * 0.3] }, 0.3);
  return fin(m);
}

function hoodoo(m: Model, rand: Rand, H: number, R: number, bands: string[], ox: number, oz: number): void {
  const seed = rand() * 60, lean = rr(rand, -1.2, 1.2), ph = rand() * TAU;
  const g = loft(13, 10, (t, a) => {
    const cap = t > 0.8 && t < 0.97 ? 1.75 : t >= 0.97 ? 1.1 : 1;
    const r = R * (1.25 - 0.78 * Math.min(t, 0.8) / 0.8 * 0.9) * (1 + 0.22 * Math.sin(t * 13 + ph)) * cap * (0.8 + 0.4 * fbm3(Math.cos(a) * 1.2 + seed, t * 3, Math.sin(a) * 1.2));
    return [ox + Math.cos(a) * r + lean * t * t, -0.2 + t * (H + 0.2), oz + Math.sin(a) * r + lean * 0.4 * Math.sin(t * 3)];
  }, true, false, false);
  m.add(strata(g, bands, 0, H * 1.02, seed, 0.8), 'aur_rock');
}

function agulha(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 12, 20), bands = pick(rand, STRATA);
  hoodoo(m, rand, H, rr(rand, 1.5, 2.1), bands, 0, 0);
  const a = rand() * TAU;
  hoodoo(m, rand, H * rr(rand, 0.4, 0.6), 1.0, bands, Math.cos(a) * 2.6, Math.sin(a) * 2.6);
  for (let i = 0; i < 3; i++) { const b = a + 2 + i, r = rr(rand, 0.5, 0.9); put(m, rockGeo(r, rand() * 50, [1.1, 0.7, 1], 1, 0.25), 'aur_rock', bands[2]!, { p: [Math.cos(b) * 3, r * 0.4, Math.sin(b) * 3] }, 0.3, bands[3]); }
  return fin(m);
}

function arcoRochoso(rand: Rand, span = 20): Model {
  const m = new Model();
  const hw = span / 2, depth = rr(rand, 6, 7.5), spring = 7.3, rise = rr(rand, 3.0, 4.2), seed = rand() * 50;
  const bands = pick(rand, STRATA);
  const inner = openingProf(hw, spring, rise, 10);
  const zs = [depth / 2, depth / 6, -depth / 6, -depth / 2];
  const fat = rand() < 0.5 ? 1 : -1;
  const outer = (i: number, zi: number): P2 => {
    const p = inner[Math.min(inner.length - 2, Math.max(1, i))]!;
    const z = zs[zi]!;
    const edge = zi === 0 || zi === zs.length - 1 ? 0.6 : 1;
    const side = 1 + 0.45 * fat * Math.sign(p[0]) * (p[1] < spring + 0.1 ? 1 : 0.3);
    const crown = p[1] > spring + rise * 0.6 ? 0.55 : 1;
    const T = (3.0 + 3.2 * fbm3(p[0] * 0.14 + seed, p[1] * 0.2, z * 0.25 + seed)) * edge * side * crown;
    if (i === 0 || i === inner.length - 1) return [inner[i]![0] + Math.sign(p[0]) * T * 1.25, -0.1];
    const dx = p[0], dy = (p[1] - 2) * 1.3, l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / l) * T, Math.max(0.8, p[1] + (dy / l) * T + (p[1] > spring ? 0.6 : 0))];
  };
  m.add(strata(shell(inner, outer, zs), bands, 0, spring + rise + 4.5, seed, 1.0), 'aur_rock');
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const r = rr(rand, 0.8, 1.7);
    put(m, rockGeo(r, rand() * 50, [1.1, 0.75, 1], 1, 0.28), 'aur_rock', bands[1 + i]!, { p: [sx * (hw + rr(rand, 4.5, 7)), r * 0.74, rr(rand, -depth / 2, depth / 2) * 1.3] }, 0.3, bands[3]);
  }
  put(m, rockGeo(1.3, seed, [1.3, 0.6, 1], 1, 0.25), 'aur_rock', bands[4]!, { p: [fat * hw * 0.5, spring + rise + 2.6, 0] }, 0.3, bands[5]);
  secoGalhos(m, rand, [-fat * hw * 0.3, spring + rise + 2.2, 0.5], 1.4);
  return fin(m);
}

/** Painel de glifos solares (textura aur_glyph) encostado numa face voltada para +Z. */
function glyphPanel(m: Model, w: number, h: number, x: { p: V3; r?: V3 }, c: ColorLike = SANDSTONE): void {
  put(m, xf(signPlane(w, h), { p: [0, 0, 0.012] }), 'aur_glyph', lite(c, 0.25), x, 0.08);
}

function sunDisc(m: Model, r: number, p: V3, ry = 0, glow = true): void {
  const g = new Model();
  put(g, cyl(r, r, r * 0.16, 12), 'metal', GOLD, { r: [Math.PI / 2, 0, 0] }, 0.2);
  if (glow) g.add(cyl(r * 0.5, r * 0.5, r * 0.22, 10), 'glow_warm', '#fff0b8', { r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    put(g, xf(flat(lathe([[r * 0.16, 0], [0.01, r * 0.62]], 4)), { r: [0, 0, a - Math.PI / 2], p: [Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08, 0], s: [1, 1, 0.4] }), 'metal', GOLD, undefined, 0.1);
  }
  m.addModel(g, { p, r: [0, ry, 0] });
}

function drum(r: number, h: number, c: ColorLike): Model {
  const g = new Model();
  const geo = flat(cyl(r, r, h, 10));
  put(g, geo, 'aur_block', c, { p: [0, h / 2, 0] }, 0.22);
  for (let i = 0; i < 10; i++) { const a = ((i + 0.5) / 10) * TAU; put(g, box(0.07, h * 0.86, 0.05), 'std', dark(c, 0.3), { p: [Math.sin(a) * r * 0.955, h / 2, Math.cos(a) * r * 0.955], r: [0, a, 0] }, 0.05); }
  return g;
}

function ruinaColuna(rand: Rand): Model {
  const m = new Model();
  const c = jit(pick(rand, [SANDSTONE, '#e2c498', '#d0a878']), rand);
  put(m, cbox(2.5, 0.5, 2.5, 0.06), 'aur_block', dark(c, 0.1), { p: [0, 0.2, 0] }, 0.3);
  put(m, cbox(2.0, 1.9, 2.0, 0.05), 'aur_block', c, { p: [0, 1.35, 0] }, 0.25);
  put(m, cbox(2.25, 0.3, 2.25, 0.06), 'aur_block', lite(c, 0.15), { p: [0, 2.4, 0] });
  for (let k = 0; k < 4; k++) glyphPanel(m, 0.8, 1.6, { p: [Math.sin(k * Math.PI / 2) * 1.0, 1.35, Math.cos(k * Math.PI / 2) * 1.0], r: [0, k * Math.PI / 2, 0] }, c);
  let y = 2.55;
  const n = 2 + Math.floor(rand() * 3), r = rr(rand, 0.72, 0.82);
  for (let i = 0; i < n; i++) {
    const h = rr(rand, 1.2, 1.5);
    m.addModel(drum(r, h, jit(c, rand)), { p: [rr(rand, -0.05, 0.05), y, rr(rand, -0.05, 0.05)], r: [0, rand(), 0] });
    put(m, cyl(r + 0.05, r + 0.05, 0.1, 10), 'metal', GOLD, { p: [0, y + 0.02, 0] });
    y += h;
  }
  // topo quebrado em bisel
  const brk = flat(lathe([[r, 0], [r, 0.3], [0.01, 0.3]], 10));
  const pos = brk.getAttribute('position');
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.1) pos.setY(i, 0.3 + pos.getX(i) * 0.7 + 0.25 * n3(pos.getX(i) * 3, 0, pos.getZ(i) * 3));
  brk.computeVertexNormals();
  put(m, brk, 'aur_block', lite(c, 0.1), { p: [0, y, 0], r: [0, rand() * TAU, 0] }, 0.2);
  // tambor e capitel caídos, cascalho
  const a = rand() * TAU;
  m.addModel(drum(r, 1.3, dark(c, 0.05)), { p: [Math.cos(a) * 2.6, r * 0.95, Math.sin(a) * 2.6], r: [Math.PI / 2, 0, a] });
  put(m, cbox(1.5, 0.5, 1.5, 0.08), 'aur_block', c, { p: [Math.cos(a + 1.5) * 2.4, 0.3, Math.sin(a + 1.5) * 2.4], r: [0.25, a, 0.1] }, 0.3);
  for (let i = 0; i < 4; i++) put(m, rockGeo(rr(rand, 0.2, 0.4), rand() * 30, [1, 0.7, 1], 0, 0.2), 'aur_block', c, { p: [Math.cos(a + 3 + i * 0.6) * rr(rand, 1.6, 2.4), 0.15, Math.sin(a + 3 + i * 0.6) * rr(rand, 1.6, 2.4)] }, 0.3);
  return fin(m);
}

function pylon(m: Model, x: number, w0: number, w1: number, d0: number, d1: number, h: number, c: ColorLike): void {
  const g = loft(1, 4, (t, a) => {
    const w = w0 + (w1 - w0) * t, d = d0 + (d1 - d0) * t;
    const k = Math.SQRT2;
    return [x + Math.cos(a + Math.PI / 4) * w / 2 * k, -0.1 + t * (h + 0.1), Math.sin(a + Math.PI / 4) * d / 2 * k];
  }, true, false, false);
  put(m, g, 'aur_block', c, undefined, 0.28);
}

function ruinaPortal(rand: Rand, span = 20): Model {
  const m = new Model();
  const hw = span / 2;
  const c = jit(pick(rand, [SANDSTONE, '#e2c498', '#d0a878']), rand);
  const pw = rr(rand, 3.0, 3.6), pd = rr(rand, 3.4, 4.0), ph = rr(rand, 8.6, 9.6), lintY = 6.5;
  const broken = rand() < 0.5 ? -1 : 1;
  for (const sx of [-1, 1]) {
    const px = sx * (hw + pw / 2 + 0.25);
    const h = sx === broken ? ph - rr(rand, 1.0, 1.8) : ph;
    put(m, cbox(pw + 0.4, 0.8, pd + 0.8, 0.08), 'aur_block', dark(c, 0.12), { p: [px + sx * 0.1, 0.3, 0] }, 0.3);
    pylon(m, px, pw, pw * 0.82, pd, pd * 0.82, h, c);
    if (sx !== broken) {
      put(m, cbox(pw * 0.82 + 0.5, 0.45, pd * 0.82 + 0.5, 0.1), 'aur_block', lite(c, 0.15), { p: [px, h + 0.15, 0] });
      put(m, cbox(pw * 0.6, 0.5, pd * 0.6, 0.08), 'aur_block', c, { p: [px, h + 0.6, 0] });
    } else {
      for (let i = 0; i < 3; i++) put(m, cbox(rr(rand, 0.9, 1.4), rr(rand, 0.5, 0.9), rr(rand, 0.9, 1.4), 0.08), 'aur_block', jit(c, rand), { p: [px + rr(rand, -0.7, 0.7), h + 0.3, rr(rand, -0.8, 0.8)], r: [0, rand(), rr(rand, -0.15, 0.15)] }, 0.25);
    }
    for (const sz of [-1, 1]) {
      glyphPanel(m, 1.5, 3.0, { p: [px, 3.2, sz * (pd * 0.455)], r: [sz * -0.045, sz > 0 ? 0 : Math.PI, 0] }, c);
      put(m, cbox(pw * 0.5, 0.25, 0.3, 0.05), 'metal', GOLD, { p: [px, 5.2, sz * pd * 0.43] });
    }
    for (let i = 0; i < 3; i++) { const r = rr(rand, 0.4, 0.8); put(m, rockGeo(r, rand() * 40, [1.1, 0.7, 1], 0, 0.2), 'aur_block', c, { p: [px + sx * rr(rand, 1.8, 3.2), r * 0.4, rr(rand, -2.5, 2.5)] }, 0.3); }
  }
  // lintel partido em dois blocos, com o disco solar ao centro
  const L = span + 1.2, gap = broken * span * 0.12;
  const l1 = L / 2 + gap - 0.12, l2 = L / 2 - gap - 0.12;
  put(m, cbox(l1, 1.5, pd * 0.62, 0.1), 'aur_block', lite(c, 0.08), { p: [-L / 2 + l1 / 2, lintY + 0.75, 0], r: [0, 0, 0.012] }, 0.22);
  put(m, cbox(l2, 1.5, pd * 0.62, 0.1), 'aur_block', c, { p: [L / 2 - l2 / 2, lintY + 0.78, 0], r: [0, 0, -0.016] }, 0.22);
  put(m, cbox(L + 1.0, 0.4, pd * 0.72, 0.1), 'aur_block', lite(c, 0.18), { p: [0, lintY + 1.72, 0] });
  for (const sz of [-1, 1]) {
    sunDisc(m, 1.25, [0, lintY + 2.9, sz * 0.05], sz > 0 ? 0 : Math.PI);
    for (let i = 0; i < 5; i++) { const x = (i - 2) * span * 0.17; if (i !== 2) glyphPanel(m, 0.55, 1.1, { p: [x, lintY + 0.78, sz * (pd * 0.31 + 0.005)], r: [0, sz > 0 ? 0 : Math.PI, 0] }, c); }
  }
  put(m, cbox(2.2, 0.9, pd * 0.5, 0.1), 'aur_block', c, { p: [0, lintY + 2.3, 0] });
  return fin(m);
}

function ruinaEstatua(rand: Rand): Model {
  const m = new Model();
  const c = jit(pick(rand, [SANDSTONE, '#e2c498', '#d0a878']), rand);
  put(m, cbox(3.4, 0.5, 3.0, 0.06), 'aur_block', dark(c, 0.1), { p: [0, 0.2, 0] }, 0.3);
  put(m, cbox(2.8, 1.5, 2.4, 0.06), 'aur_block', c, { p: [0, 1.15, 0] }, 0.25);
  glyphPanel(m, 0.75, 1.4, { p: [0, 1.15, 1.2] }, c);
  for (const sx of [-1, 1]) glyphPanel(m, 0.6, 1.2, { p: [sx * 1.4, 1.15, 0], r: [0, sx * Math.PI / 2, 0] }, c);
  // guardião solar sentado, geométrico: pernas, tronco, ombros, braços estendendo o disco
  const y0 = 1.9;
  for (const sx of [-1, 1]) {
    put(m, cbox(0.75, 0.75, 1.6, 0.1), 'aur_block', c, { p: [sx * 0.6, y0 + 0.4, 0.35] }, 0.2);
    put(m, cbox(0.7, 1.3, 0.7, 0.1), 'aur_block', c, { p: [sx * 0.6, y0 - 0.2 + 0.2, 1.0] }, 0.2);
  }
  put(m, flat(lathe([[0.95, 0], [1.15, 0.3], [1.05, 1.6], [1.25, 2.3], [0.6, 2.6]], 6)), 'aur_block', c, { p: [0, y0 + 0.5, -0.25], s: [1, 1, 0.75] }, 0.25);
  put(m, cbox(2.9, 0.55, 1.0, 0.12), 'aur_block', lite(c, 0.1), { p: [0, y0 + 2.75, -0.25] });
  put(m, cbox(1.5, 0.3, 0.2, 0.05), 'metal', GOLD, { p: [0, y0 + 2.2, 0.55] });
  const armBroken = rand() < 0.5 ? -1 : 1;
  for (const sx of [-1, 1]) {
    put(m, cbox(0.6, 1.3, 0.65, 0.1), 'aur_block', c, { p: [sx * 1.2, y0 + 2.0, -0.2] }, 0.2);
    if (sx !== armBroken) put(m, beam([sx * 1.2, y0 + 1.5, 0], [sx * 0.75, y0 + 1.9, 1.3], 0.5, 0.5, 0.08), 'aur_block', c, undefined, 0.15);
    else put(m, cbox(0.5, 0.5, 1.2, 0.08), 'aur_block', c, { p: [sx * 2.4, 0.3, 1.4], r: [0.1, 0.6 * sx, 0.2] }, 0.3);
  }
  sunDisc(m, 0.75, [-armBroken * 0.25, y0 + 2.0, 1.45], 0, true);
  // cabeça caída ao lado (coroa de raios), pescoço partido
  put(m, flat(cyl(0.4, 0.5, 0.35, 6)), 'aur_block', dark(c, 0.1), { p: [0, y0 + 3.15, -0.25], r: [0.1, 0, 0.15] });
  const head = new Model();
  put(head, cbox(1.0, 1.15, 0.95, 0.16), 'aur_block', c, { p: [0, 0.58, 0] }, 0.2);
  put(head, cbox(1.1, 0.16, 0.2, 0.04), 'std', dark(c, 0.3), { p: [0, 0.8, 0.45] });
  for (const sx of [-1, 1]) put(head, box(0.24, 0.1, 0.06), 'std', dark(c, 0.45), { p: [sx * 0.24, 0.66, 0.48] });
  put(head, box(0.14, 0.4, 0.14), 'aur_block', lite(c, 0.1), { p: [0, 0.5, 0.5] });
  for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.42; put(head, flat(lathe([[0.13, 0], [0.01, 0.6]], 4)), 'metal', GOLD, { p: [Math.sin(a) * 0.5, 1.1 + Math.cos(a) * 0.12, 0], r: [0, 0, -a] }); }
  const ha = rr(rand, 0.6, 2.4);
  m.addModel(head, { p: [Math.cos(ha) * 2.9, 0.28, 1.2 + Math.sin(ha) * 1.2], r: [-1.25, rr(rand, -0.6, 0.6), rr(rand, -0.3, 0.3)] });
  for (let i = 0; i < 4; i++) put(m, rockGeo(rr(rand, 0.2, 0.42), rand() * 40, [1, 0.7, 1], 0, 0.2), 'aur_block', c, { p: [rr(rand, -2.4, 2.4), 0.16, rr(rand, 1.8, 2.6)] }, 0.3);
  return fin(m);
}

function duna(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 8.5, 9.5), H = rr(rand, 3.4, 4.8), ph = rand() * TAU, bend = rr(rand, 0.25, 0.5) * (rand() < 0.5 ? -1 : 1);
  const c = jit(pick(rand, [SAND, '#f4c880', '#eed8a0']), rand);
  const h = (x: number, z: number): number => {
    const e = Math.max(0, 1 - (x * x + z * z) / (R * R));
    const zc = bend * 3 * Math.sin(x / R * 2.2 + ph);
    const dz = z - zc;
    const ridge = dz < 0 ? Math.exp(-(dz * dz) / 26) : Math.exp(-(dz * dz) / 3.2) * 0.9 + 0.1 * Math.exp(-(dz * dz) / 30);
    return H * Math.pow(e, 0.8) * ridge * (0.85 + 0.15 * Math.cos(x / R * 2)) + 0.12 * e * Math.sin(x * 1.5 + z * 0.4);
  };
  const g = heightDisc(R, 7, 22, h);
  m.add(paint(g, (p, n) => mix(mix(dark(c, 0.38), c, Math.min(1, p.y / H + 0.25)), lite(c, 0.5), Math.max(0, n.z < 0 ? 0.5 : 0) * Math.min(1, p.y / H * 1.5)).multiplyScalar(0.92 + 0.12 * n.y)), 'aur_sand');
  for (let i = 0; i < 2; i++) { const a = rand() * TAU; secoGalhos(m, rand, [Math.cos(a) * R * 0.7, 0.2, Math.sin(a) * R * 0.7], 0.7); }
  return fin(m);
}

function cacto(rand: Rand): Model {
  const m = new Model();
  const g0 = jit(pick(rand, ['#3f9a5a', '#4aa84a', '#2f8a6a']), rand);
  const variant = Math.floor(rand() * 3);
  const ribbed = (pts: V3[], r0: number, r1: number, n = 8): void => {
    const g = tube(pts, (t) => (r0 + (r1 - r0) * t) * (t > 0.92 ? 0.6 + 0.4 * Math.sqrt(Math.max(0, (1 - t) / 0.08)) : 1), n, 10);
    m.add(paint(g, (p, nn) => mix(dark(g0, 0.35), lite(g0, 0.3), 0.5 + 0.5 * Math.sin(Math.atan2(nn.z, nn.x) * 5)).multiplyScalar(0.8 + 0.25 * Math.min(1, p.y / 4))), 'std');
  };
  const flower = (p: V3, s = 1): void => { put(m, flat(ico(0.16 * s, 0)), 'std', pick(rand, ['#ff5a8a', '#ffd34a', '#ff8a3c']), { p, s: [1.3, 0.7, 1.3] }, 0.1); };
  if (variant === 0) {
    const H = rr(rand, 4.2, 6.2), r = rr(rand, 0.4, 0.5);
    ribbed([[0, -0.1, 0], [0.05, H * 0.5, 0], [0, H, 0]], r, r * 0.9, 8);
    flower([0, H + 0.05, 0]);
    const n = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(), y = H * rr(rand, 0.3, 0.55), out = rr(rand, 0.9, 1.3), up = rr(rand, 1.2, 2.4);
      ribbed([[0, y, 0], [Math.cos(a) * out * 0.8, y + 0.1, Math.sin(a) * out * 0.8], [Math.cos(a) * out, y + 0.7, Math.sin(a) * out], [Math.cos(a) * out, y + up, Math.sin(a) * out]], r * 0.68, r * 0.6, 8);
      if (i % 2 === 0) flower([Math.cos(a) * out, y + up + 0.04, Math.sin(a) * out], 0.8);
    }
  } else if (variant === 1) {
    for (let i = 0; i < 3; i++) {
      const r = rr(rand, 0.4, 0.75) * (i === 0 ? 1.2 : 0.8), a = i * 2.2 + rand(), d = i === 0 ? 0 : rr(rand, 0.8, 1.1);
      const g = lathe([[0.01, -0.05], [r * 0.8, 0], [r, r * 0.6], [r * 0.85, r * 1.25], [r * 0.4, r * 1.55], [0.01, r * 1.6]], 12);
      m.add(paint(xf(g, { p: [Math.cos(a) * d, 0, Math.sin(a) * d] }), (p, nn) => mix(dark(g0, 0.35), lite(g0, 0.3), 0.5 + 0.5 * Math.sin(Math.atan2(nn.z, nn.x) * 6))), 'std');
      for (let k = 0; k < 4; k++) flower([Math.cos(a) * d + Math.cos(k * 1.57) * r * 0.25, r * 1.6, Math.sin(a) * d + Math.sin(k * 1.57) * r * 0.25], 0.6);
    }
  } else {
    const pad = (p: V3, r: number, ry: number, tilt: number, depth: number): void => {
      put(m, blob(r, 1, rand() * 30, 0.08, 1.2, [0.85, 1.15, 0.22], false), 'std', jit(g0, rand), { p, r: [tilt, ry, rr(rand, -0.3, 0.3)] }, 0.3, lite(g0, 0.3));
      if (depth < 2) {
        const n = depth === 0 ? 2 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 2);
        for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.9; pad([p[0] + Math.sin(a) * r * 0.9 * Math.cos(ry), p[1] + r * 1.55 * Math.cos(a) * 0.95, p[2] - Math.sin(a) * r * 0.9 * Math.sin(ry)], r * 0.8, ry + rr(rand, -0.7, 0.7), rr(rand, -0.2, 0.2), depth + 1); }
      } else if (rand() < 0.8) put(m, flat(ico(0.11, 0)), 'std', '#e0386a', { p: [p[0], p[1] + r * 1.15, p[2]], s: [1, 1.4, 1] });
    };
    pad([0, 0.75, 0], rr(rand, 0.6, 0.75), rand() * TAU, 0, 0);
  }
  for (let i = 0; i < 3; i++) { const a = rand() * TAU; put(m, rockGeo(rr(rand, 0.15, 0.28), rand() * 30, [1, 0.6, 1], 0, 0.2), 'aur_rock', '#c98a5a', { p: [Math.cos(a) * 0.9, 0.08, Math.sin(a) * 0.9] }, 0.3); }
  return fin(m);
}

function secoGalhos(m: Model, rand: Rand, p: V3, s: number): void {
  const c = jit('#8a6a48', rand);
  const grow = (a: V3, dir: V3, len: number, r: number, d: number): void => {
    const b: V3 = [a[0] + dir[0] * len, a[1] + dir[1] * len, a[2] + dir[2] * len];
    put(m, rod(a, b, r, d === 0 ? 5 : 3, r * 0.6), 'aur_bark', d > 1 ? lite(c, 0.2) : c, undefined, 0.2);
    if (d >= 3) return;
    const n = d === 0 ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const az = rand() * TAU, sp = rr(rand, 0.5, 0.9);
      const nd: V3 = [dir[0] + Math.cos(az) * sp, dir[1] * 0.8 + 0.25, dir[2] + Math.sin(az) * sp];
      const l = Math.hypot(...nd);
      grow(b, [nd[0] / l, nd[1] / l, nd[2] / l], len * rr(rand, 0.6, 0.8), r * 0.6, d + 1);
    }
  };
  grow([p[0], p[1] - 0.1, p[2]], [rr(rand, -0.15, 0.15), 1, rr(rand, -0.15, 0.15)], 0.45 * s, 0.07 * s, 0);
}

function arbustoSeco(rand: Rand): Model {
  const m = new Model();
  secoGalhos(m, rand, [0, 0, 0], rr(rand, 1.2, 1.7));
  secoGalhos(m, rand, [rr(rand, -0.4, 0.4), 0, rr(rand, -0.4, 0.4)], rr(rand, 0.7, 1.0));
  for (let i = 0; i < 5; i++) { const a = rand() * TAU, d = rr(rand, 0.3, 0.9); put(m, flat(ico(0.09, 0)), 'aur_foliage', pick(rand, ['#b8a04a', '#9a9a4a', '#c88a3c']), { p: [Math.cos(a) * d, rr(rand, 0.6, 1.3), Math.sin(a) * d], s: [1.4, 0.6, 1] }); }
  put(m, rockGeo(0.22, rand() * 20, [1.2, 0.6, 1], 0, 0.2), 'aur_rock', '#c98a5a', { p: [0.3, 0.08, 0.2] }, 0.3);
  return fin(m);
}

function jar(m: Model, p: V3, s: number, c: ColorLike, band: ColorLike): void {
  put(m, flat(lathe([[0.01, 0], [0.16, 0], [0.3, 0.25], [0.32, 0.45], [0.2, 0.7], [0.13, 0.78], [0.18, 0.88], [0.13, 0.88]], 8)), 'std', c, { p, s }, 0.3, lite(c, 0.3));
  put(m, cyl(0.325 * s, 0.31 * s, 0.07 * s, 8, true), 'std', band, { p: [p[0], p[1] + 0.42 * s, p[2]] });
}

function tenda(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 2.7, 3.1), eave = rr(rand, 2.1, 2.4), H = rr(rand, 4.0, 4.6);
  const c1 = pick(rand, CLOTHS), c2 = pick(rand, ['#f6ead2', '#f2d9a8', '#fbf1dc']);
  const k = 10;
  // cobertura em gomos listrados com barriga; a frente (2 gomos) fica aberta
  const roof = lathe([[R + 0.25, eave - 0.12], [R * 0.72, eave + (H - eave) * 0.22], [R * 0.36, eave + (H - eave) * 0.55], [0.12, H - 0.15], [0.02, H]], k);
  m.add(paintTri(flat(roof), (p) => { const a = (Math.atan2(p.x, p.z) + TAU) % TAU; return mix(Math.floor((a / TAU) * k) % 2 ? c1 : c2, '#2c2046', 0.2 * (1 - (p.y - eave) / (H - eave))); }), 'aur_cloth');
  const pos: number[] = [];
  for (let i = 0; i < k; i++) {
    const a0 = (i / k) * TAU, a1 = ((i + 1) / k) * TAU, front = i === 0 || i === k - 1;
    const P = (a: number, y: number, r: number): V3 => [Math.sin(a) * r, y, Math.cos(a) * r];
    if (!front) pos.push(...P(a0, eave, R), ...P(a1, eave, R), ...P(a1, 0, R * 1.04), ...P(a0, eave, R), ...P(a1, 0, R * 1.04), ...P(a0, 0, R * 1.04));
    const am = (a0 + a1) / 2;
    pos.push(...P(a0, eave - 0.1, R + 0.26), ...P(am, eave - 0.6, R + 0.3), ...P(a1, eave - 0.1, R + 0.26));
    put(m, rod(P(a0, 0, R * 1.04), P(a0, eave, R), 0.05, 4), 'aur_wood', '#6a4630');
  }
  m.add(paintTri(rawGeo(pos), (p) => (p.y > eave - 0.5 && Math.hypot(p.x, p.z) > R + 0.15 ? c1 : mix(dark(c2, 0.2), c2, p.y / eave))), 'aur_cloth');
  // abas da entrada recolhidas, mastro e flâmula
  for (const sx of [-1, 1]) {
    const a = sx * (TAU / k);
    put(m, xf(rawGeo([Math.sin(a) * R, eave, Math.cos(a) * R, Math.sin(a) * R * 1.04, 0, Math.cos(a) * R * 1.04, Math.sin(a * 0.55) * R, eave, Math.cos(a * 0.55) * R * 1.02]), {}), 'aur_cloth', c1, undefined, 0.2);
  }
  put(m, cyl(0.08, 0.1, H + 0.9, 6), 'aur_wood', '#6a4630', { p: [0, (H + 0.9) / 2, 0] });
  put(m, flat(ico(0.14, 0)), 'metal', GOLD, { p: [0, H + 0.95, 0] });
  m.add(tone(strip([[0, H + 0.7, 0], [0.5, H + 0.75, 0.05], [1.0, H + 0.62, 0]], (t) => 0.2 * (1 - t) + 0.02, [0, 1, 0]), c1, 0.1), 'aur_cloth');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + TAU / 8;
    put(m, rope([Math.sin(a) * (R + 0.2), eave, Math.cos(a) * (R + 0.2)], [Math.sin(a) * (R + 1.5), 0.1, Math.cos(a) * (R + 1.5)], 0.08, 0.02, 3, 3), 'aur_hay', '#d9c08a');
    put(m, rod([Math.sin(a) * (R + 1.5), -0.05, Math.cos(a) * (R + 1.5)], [Math.sin(a) * (R + 1.6), 0.3, Math.cos(a) * (R + 1.6)], 0.035, 4), 'aur_wood', '#6a4630');
  }
  // tapetes, almofadas, jarros, mesinha e lanterna
  const rug = (w: number, d: number, p: V3, ry: number, c: ColorLike): void => {
    put(m, box(w, 0.05, d), 'aur_woven', c, { p, r: [0, ry, 0] }, 0.1);
    put(m, box(w + 0.16, 0.03, d - 0.2), 'std', lite(c, 0.4), { p: [p[0], p[1] - 0.005, p[2]], r: [0, ry, 0] });
  };
  rug(2.6, 1.7, [0, 0.03, 0.4], rr(rand, -0.15, 0.15), pick(rand, CLOTHS));
  rug(1.6, 1.0, [0.5, 0.06, R + 0.9], rr(rand, -0.4, 0.4), pick(rand, CLOTHS));
  for (let i = 0; i < 3; i++) put(m, blob(0.32, 1, rand() * 9, 0.08, 1, [1.2, 0.45, 1], false), 'aur_cloth', pick(rand, CLOTHS), { p: [-0.9 + i * 0.55, 0.2, -0.2 - (i % 2) * 0.4], r: [0, rand(), 0] }, 0.25);
  put(m, cyl(0.45, 0.45, 0.06, 8), 'aur_wood', '#8a5a34', { p: [0.9, 0.36, 0.3] });
  put(m, cyl(0.08, 0.2, 0.34, 6), 'aur_wood', '#6a4630', { p: [0.9, 0.17, 0.3] });
  jar(m, [0.9, 0.39, 0.3], 0.4, '#3f8fa8', GOLD);
  const ja = rr(rand, 0.9, 1.3);
  jar(m, [Math.sin(ja) * (R + 0.7), 0, Math.cos(ja) * (R + 0.7)], 1.2, '#c4683a', '#f6ead2');
  jar(m, [Math.sin(ja + 0.25) * (R + 1.2), 0, Math.cos(ja + 0.25) * (R + 1.2)], 0.85, '#d98a4a', '#2f8fa8');
  jar(m, [Math.sin(ja - 0.2) * (R + 1.3), 0, Math.cos(ja - 0.2) * (R + 1.3)], 0.65, '#b8523a', GOLD);
  m.addModel(paperLantern(0.2, '#ffb23c'), { p: [0, eave - 0.05, R + 0.2] });
  return fin(m);
}

function ponteCordaPoste(rand: Rand): Model {
  const m = new Model();
  const wood = jit(pick(rand, ['#8a5a34', '#7a5236', '#9a6a3c']), rand);
  const xs = [-2.85, 0, 2.85];
  const hs = xs.map((_, i) => (i === 1 ? rr(rand, 2.3, 2.7) : rr(rand, 1.5, 1.7)));
  xs.forEach((x, i) => {
    const h = hs[i]!;
    put(m, flat(cyl(0.12, 0.17, h + 0.1, 6)), 'aur_bark', wood, { p: [x, h / 2 - 0.05, 0], r: [0, rand(), rr(rand, -0.04, 0.04)] }, 0.35, lite(wood, 0.25));
    for (const y of [0.7, h - 0.25]) put(m, xf(torus(0.16, 0.035, 4, 7), { r: [Math.PI / 2, 0, 0], p: [x, y, 0] }), 'aur_hay', '#d9c08a');
    put(m, flat(lathe([[0.15, 0], [0.19, 0.08], [0.01, 0.26]], 6)), 'metal', GOLD, { p: [x, h, 0] });
    put(m, rockGeo(0.3, rand() * 20, [1.2, 0.6, 1], 0, 0.2), 'aur_rock', '#c98a5a', { p: [x + 0.15, 0.1, 0.2] }, 0.3);
  });
  for (let i = 0; i < 2; i++) {
    const a: V3 = [xs[i]!, hs[i]! - 0.25, 0], b: V3 = [xs[i + 1]!, hs[i + 1]! - 0.25, 0];
    put(m, rope(a, b, 0.25, 0.035, 6, 4), 'aur_hay', '#d9c08a', undefined, 0.15);
    put(m, rope([xs[i]!, 0.7, 0], [xs[i + 1]!, 0.7, 0], 0.12, 0.035, 6, 4), 'aur_hay', '#d9c08a', undefined, 0.15);
    const pts = sagPts(a, b, 0.25, 6);
    for (let k = 1; k < 6; k++) {
      const p = pts[k]!, c = CLOTHS[(k + i * 2 + Math.floor(rand() * 2)) % CLOTHS.length]!;
      m.add(paint(rawGeo([p[0] - 0.17, p[1], 0, p[0] + 0.17, p[1], 0, p[0], p[1] - 0.48, 0.03]), () => c), 'aur_cloth');
    }
  }
  return fin(m);
}

function pedregulho(rand: Rand): Model {
  const m = new Model();
  const r = rr(rand, 1.3, 2.2), seed = rand() * 40, bands = pick(rand, STRATA);
  const g = rockGeo(r, seed, [1.15, 0.85, 1], 2, 0.32);
  g.translate(0, r * 0.78, 0);
  m.add(strata(g, bands.slice(1, 6), -0.2, r * 1.6, seed, 0.8), 'aur_rock');
  const a = rand() * TAU;
  for (let i = 0; i < 3; i++) { const rr2 = r * rr(rand, 0.2, 0.42); put(m, rockGeo(rr2, seed + i * 3, [1.1, 0.75, 1], 1, 0.28), 'aur_rock', bands[2 + i]!, { p: [Math.cos(a + i * 1.1) * r * 1.2, rr2 * 0.45, Math.sin(a + i * 1.1) * r * 1.2] }, 0.3, bands[3]); }
  return fin(m);
}

function obelisco(rand: Rand): Model {
  const m = new Model();
  const c = jit(pick(rand, [SANDSTONE, '#e2c498', '#d0a878']), rand);
  const H = rr(rand, 8.5, 10.5), w0 = rr(rand, 1.25, 1.45), w1 = w0 * 0.62;
  put(m, cbox(3.4, 0.45, 3.4, 0.06), 'aur_block', dark(c, 0.12), { p: [0, 0.18, 0] }, 0.3);
  put(m, cbox(2.7, 0.45, 2.7, 0.06), 'aur_block', c, { p: [0, 0.6, 0] }, 0.2);
  put(m, cbox(2.0, 1.0, 2.0, 0.06), 'aur_block', lite(c, 0.08), { p: [0, 1.3, 0] }, 0.2);
  const y0 = 1.8;
  const g = loft(1, 4, (t, a) => { const w = (w0 + (w1 - w0) * t) / 2 * Math.SQRT2; return [Math.cos(a + Math.PI / 4) * w, y0 + t * (H - y0 - 1.1), Math.sin(a + Math.PI / 4) * w]; }, false, false, false);
  put(m, g, 'aur_block', c, undefined, 0.3, lite(c, 0.3));
  const slope = Math.atan2((w0 - w1) / 2, H - y0 - 1.1);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    const yy = y0 + 2.1, wAt = (w0 + (w1 - w0) * (2.1 / (H - y0 - 1.1))) / 2;
    const g2 = new Model();
    glyphPanel(g2, 0.72, 2.6, { p: [0, 0, 0], r: [-slope, 0, 0] }, c);
    m.addModel(g2, { p: [Math.sin(a) * wAt, yy, Math.cos(a) * wAt], r: [0, a, 0] });
  }
  for (const t of [0.02, 0.62]) { const w = w0 + (w1 - w0) * t + 0.1; put(m, box(w, 0.22, w), 'metal', GOLD, { p: [0, y0 + t * (H - y0 - 1.1) + 0.1, 0] }); }
  // piramídio luminoso
  const tip = flat(lathe([[w1 / 2 * Math.SQRT2 + 0.04, 0], [0.01, 1.1]], 4));
  m.add(paint(xf(tip, { p: [0, H - 1.1, 0], r: [0, Math.PI / 4, 0] }), (p) => mix('#ffb040', '#fff4c0', (p.y - H + 1.1) / 1.1)), 'glow_warm');
  put(m, box(w1 + 0.16, 0.14, w1 + 0.16), 'metal', GOLD, { p: [0, H - 1.12, 0] });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; put(m, flat(lathe([[0.22, 0], [0.3, 0.3], [0.01, 0.6]], 4)), 'aur_block', c, { p: [Math.cos(a) * 1.6, 0.4, Math.sin(a) * 1.6], r: [0, Math.PI / 4, 0] }); }
  return fin(m);
}

const VANE_PIVOT: V3 = [0, 6.4, 0.55];
function cataventoBase(rand: Rand): Model {
  const m = new Model();
  const wood = jit(pick(rand, ['#8a5a34', '#7a5236', '#9a6a3c']), rand);
  const top = VANE_PIVOT[1];
  const b = rr(rand, 1.25, 1.5);
  const leg = (i: number, y: number): V3 => { const a = (i / 3) * TAU + Math.PI / 6, k = b * (1 - (y / top) * 0.86); return [Math.cos(a) * k, y, Math.sin(a) * k]; };
  for (let i = 0; i < 3; i++) {
    put(m, beam(leg(i, -0.05), leg(i, top - 0.1), 0.16), 'aur_wood', wood, undefined, 0.3, lite(wood, 0.25));
    const j = (i + 1) % 3;
    for (const y of [1.2, 2.9, 4.4]) put(m, beam(leg(i, y), leg(j, y), 0.09), 'aur_wood', lite(wood, 0.1));
    put(m, beam(leg(i, 1.3), leg(j, 2.8), 0.06), 'aur_wood', lite(wood, 0.15));
    put(m, beam(leg(j, 3.0), leg(i, 4.3), 0.06), 'aur_wood', lite(wood, 0.15));
    put(m, rockGeo(0.3, rand() * 20, [1.2, 0.6, 1], 0, 0.2), 'aur_rock', '#c98a5a', { p: [leg(i, 0)[0] * 1.15, 0.1, leg(i, 0)[2] * 1.15] }, 0.3);
  }
  put(m, cbox(0.5, 0.5, 1.1, 0.06), 'aur_wood', dark(wood, 0.15), { p: [0, top, 0.05] });
  // leme de cauda de pano
  put(m, rod([0, top, -0.4], [0, top + 0.15, -2.3], 0.04, 4), 'aur_wood', wood);
  const c = pick(rand, CLOTHS);
  m.add(tone(xf(rawGeo([0, 0.55, -1.2, 0, -0.4, -1.3, 0, 0.75, -2.5, 0, -0.4, -1.3, 0, -0.55, -2.5, 0, 0.75, -2.5]), { p: [0, top + 0.12, 0] }), c, 0.15), 'aur_cloth');
  put(m, flat(cyl(0.5, 0.42, 0.7, 8)), 'aur_bark', '#9a6336', { p: [leg(0, 0)[0] * 0.3, 0.35, leg(0, 0)[2] * 0.3 + 0.6] }, 0.3);
  return fin(m);
}
function cataventoRotor(rand: Rand): Model {
  const m = new Model();
  const n = 8, R = rr(rand, 2.0, 2.3);
  const off = Math.floor(rand() * CLOTHS.length);
  put(m, cyl(0.2, 0.2, 0.4, 8), 'aur_wood', '#6a4630', { r: [Math.PI / 2, 0, 0], p: [0, 0, 0.1] });
  put(m, flat(lathe([[0.2, 0], [0.01, 0.3]], 6)), 'metal', GOLD, { r: [Math.PI / 2, 0, 0], p: [0, 0, 0.3] });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, a2 = a + (TAU / n) * 0.82;
    put(m, rod([0, 0, 0.15], [Math.cos(a) * R, Math.sin(a) * R, 0.15], 0.03, 4), 'aur_wood', '#8a5a34');
    const c = CLOTHS[(i + off) % CLOTHS.length]!;
    const g = rawGeo([Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0.16, Math.cos(a) * R, Math.sin(a) * R, 0.16, Math.cos(a2) * R * 0.95, Math.sin(a2) * R * 0.95, 0.42, Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0.16, Math.cos(a2) * R * 0.95, Math.sin(a2) * R * 0.95, 0.42, Math.cos(a2) * 0.5, Math.sin(a2) * 0.5, 0.3]);
    m.add(paint(g, (p) => mix(dark(c, 0.2), lite(c, 0.15), Math.hypot(p.x, p.y) / R)), 'aur_cloth');
  }
  put(m, xf(torus(R, 0.025, 3, 16), { p: [0, 0, 0.15] }), 'aur_hay', '#d9c08a');
  return fin(m);
}

export const CANION_PROPS: PropLibrary = {
  'mesa-rochosa': { radius: 20, collider: { radius: 14, height: 20 }, build: mesa },
  'agulha-rochosa': { radius: 4.5, collider: { radius: 2.4, height: 12 }, build: agulha },
  'arco-rochoso': { radius: 6, build: arcoRochoso },
  'ruina-coluna': { radius: 3.4, collider: { radius: 1.5, height: 5 }, build: ruinaColuna },
  'ruina-portal': { radius: 4.5, build: ruinaPortal },
  'ruina-estatua': { radius: 3.8, collider: { radius: 2.1, height: 5 }, build: ruinaEstatua },
  duna: { radius: 9.5, build: duna },
  cacto: { radius: 1.5, collider: { radius: 0.55, height: 2.5 }, build: cacto },
  'arbusto-seco': { radius: 1.3, build: arbustoSeco },
  'tenda-nomade': { radius: 4.8, collider: { radius: 3.1, height: 3 }, build: tenda },
  'ponte-corda-poste': { radius: 3.1, collider: { radius: 0.3, height: 2.3 }, build: ponteCordaPoste },
  pedregulho: { radius: 2.8, collider: { radius: 1.8, height: 2 }, build: pedregulho },
  'obelisco-solar': { radius: 2.5, collider: { radius: 1.5, height: 9 }, build: obelisco },
  'catavento-areia': { radius: 2.4, collider: { radius: 1.5, height: 6 }, build: cataventoBase, animated: { build: cataventoRotor, pivot: VANE_PIVOT, motion: { kind: 'spin', axis: 'z', period: 3.2 } } },
};
