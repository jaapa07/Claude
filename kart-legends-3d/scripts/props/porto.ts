/** PORTO DAS LANTERNAS — cidade costeira ao pôr do sol. Objetos de cenário originais. */
import { torus } from '../lib/geo';
import {
  Model, TAU, archWall, awning, barrel, beam, blob, box, cbox, coneRoof, crate, cyl, dark, door, fin, flat, gableProf, ico, jit, lathe, lite, loft,
  mix, paint, paperLantern, pick, prism, put, rawGeo, rockGeo, rod, rope, rr, sagPts, slab, tone, triSail, tube, win, xf, type ColorLike, type P2, type Rand, type V3,
} from './aurora-kit';
import type { PropLibrary } from './types';

const FACADES = ['#f7b552', '#ee7f4f', '#f8e2b0', '#f08d8c', '#e8a531'];
const ROOFS = ['#c9573b', '#b5432f', '#8d4668', '#3d6c8e', '#a4502d'];
const SHUTTERS = ['#2c7377', '#3b5a8e', '#7d3a3a', '#4b7c46', '#8a5a2b'];
const LANTERNS = ['#ff7a3c', '#ffb23c', '#ff5a5a', '#ffd34a', '#ff8fb0'];
const TRIM = '#f8eeda';
const WOOD = '#5e3b28';
const STONE = '#a99f93';
const IRON = '#2d2a36';

/** Corpo de sobrado com telhado de duas águas curvo. Devolve dimensões para acréscimos (torreão). */
function sobrado(m: Model, rand: Rand, wMin: number, wMax: number, tower = false): { w: number; d: number; H: number; fh: number; fac: ColorLike; roofC: ColorLike; shut: ColorLike; side: number } {
  const w = rr(rand, wMin, wMax), d = rr(rand, 6.2, 7.6);
  const floors = rand() < 0.45 ? 3 : 2;
  const fh = rr(rand, 2.95, 3.2);
  const H = floors * fh;
  const fac = jit(pick(rand, FACADES), rand);
  const roofC = jit(pick(rand, ROOFS), rand);
  const shut = pick(rand, SHUTTERS);
  const side = rand() < 0.5 ? -1 : 1;
  const j = 0.16;
  const zf = d / 2 + j, xs = w / 2 + j;

  // embasamento de pedra, térreo e andares em balanço
  put(m, cbox(w + 0.36, 0.9, d + 0.36, 0.1), 'aur_stone', STONE, { p: [0, 0.3, 0] }, 0.3);
  put(m, box(w, fh, d), 'aur_plaster', lite(fac, 0.12), { p: [0, fh / 2, 0] }, 0.26);
  put(m, box(w + 2 * j, H - fh, d + 2 * j), 'aur_plaster', fac, { p: [0, fh + (H - fh) / 2, 0] }, 0.3);
  put(m, box(w + 2 * j + 0.2, 0.26, d + 2 * j + 0.2), 'aur_wood', WOOD, { p: [0, fh, 0] }, 0.15);
  for (let i = 0; i < 6; i++) put(m, box(0.2, 0.22, 0.3), 'aur_wood', dark(WOOD, 0.2), { p: [-w / 2 + 0.2 + (i / 5) * (w - 0.4), fh - 0.22, zf + 0.06] }, 0.1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(m, box(0.24, H - fh, 0.24), 'aur_wood', WOOD, { p: [sx * xs, fh + (H - fh) / 2, sz * zf] }, 0.25);
  if (floors === 3) put(m, box(w + 2 * j + 0.1, 0.16, d + 2 * j + 0.1), 'aur_wood', WOOD, { p: [0, 2 * fh, 0] }, 0.1);

  // térreo: porta, vitrine com toldo, lanterna
  const dx = side * w * 0.24;
  m.addModel(door(1.2, 2.25, { color: jit(shut, rand), frame: TRIM, arch: rand() < 0.5 }), { p: [dx, 0.42, d / 2] });
  put(m, cbox(1.9, 0.42, 0.8, 0.05), 'aur_stone', lite(STONE, 0.1), { p: [dx, 0.2, d / 2 + 0.4] });
  m.addModel(win(1.7, 1.35, { frame: TRIM, bars: [2, 1] }), { p: [-side * w * 0.2, 1.75, d / 2] });
  const aw1 = pick(rand, ['#d8473c', '#2f7fa3', '#e0962a', '#3f9a6a']);
  m.addModel(awning(2.5, 1.15, 0.55, aw1, '#fbf1dc', 6), { p: [-side * w * 0.2, 2.86, d / 2 + 0.02] });
  const lx = dx + side * 0.95;
  put(m, rod([lx, 2.75, d / 2], [lx, 2.9, d / 2 + 0.7], 0.035, 4), 'metal', IRON);
  m.addModel(paperLantern(0.2, pick(rand, LANTERNS)), { p: [lx, 2.88, d / 2 + 0.66] });

  // andares superiores: varanda no primeiro, janelas com venezianas
  for (let f = 1; f < floors; f++) {
    const y0 = f * fh;
    const cy = y0 + fh * 0.52;
    if (f === 1) {
      const bw = w * 0.62, bd = 1.05, bx = side * w * 0.1;
      put(m, cbox(bw, 0.16, bd, 0.04), 'aur_wood', WOOD, { p: [bx, y0 + 0.24, zf + bd / 2] }, 0.15);
      for (const sx of [-1, 1]) put(m, beam([bx + sx * (bw / 2 - 0.15), y0 + 0.2, zf + bd - 0.15], [bx + sx * (bw / 2 - 0.15), y0 - 0.55, zf], 0.14), 'aur_wood', dark(WOOD, 0.15));
      const n = Math.round(bw / 0.36);
      for (let i = 0; i <= n; i++) put(m, box(0.06, 0.95, 0.06), 'std', TRIM, { p: [bx - bw / 2 + 0.05 + (i / n) * (bw - 0.1), y0 + 0.78, zf + bd - 0.06] }, 0.12);
      for (const sx of [-1, 1]) for (let i = 1; i < 3; i++) put(m, box(0.06, 0.95, 0.06), 'std', TRIM, { p: [bx + sx * (bw / 2 - 0.05), y0 + 0.78, zf + (i / 3) * bd] }, 0.12);
      put(m, box(bw + 0.1, 0.09, 0.12), 'aur_wood', lite(WOOD, 0.15), { p: [bx, y0 + 1.28, zf + bd - 0.06] });
      for (const sx of [-1, 1]) put(m, box(0.12, 0.09, bd), 'aur_wood', lite(WOOD, 0.15), { p: [bx + sx * (bw / 2 - 0.05), y0 + 1.28, zf + bd / 2] });
      m.addModel(win(1.15, 2.05, { frame: TRIM, arch: true, sill: false, bars: [1, 2], shutters: shut }), { p: [bx, y0 + 1.36, zf] });
      // vasos na varanda
      for (const sx of [-1, 1]) {
        put(m, cyl(0.2, 0.14, 0.3, 6), 'std', '#c46a3a', { p: [bx + sx * (bw / 2 - 0.35), y0 + 0.47, zf + bd - 0.32] });
        put(m, flat(ico(0.26, 0)), 'aur_foliage', '#4c9a44', { p: [bx + sx * (bw / 2 - 0.35), y0 + 0.78, zf + bd - 0.32] }, 0.3);
      }
      if (!tower) m.addModel(win(0.8, 1.2, { frame: TRIM, shutters: shut, lit: rand() < 0.8 }), { p: [-side * w * 0.33, cy + 0.1, zf] });
    } else {
      for (const sx of [-1, 1]) if (!tower || sx === side) m.addModel(win(0.95, 1.35, { frame: TRIM, shutters: shut, lit: rand() < 0.8, box: sx === side ? pick(rand, ['#ff6f8f', '#ffcf4a', '#ff8a3c']) : undefined }), { p: [sx * w * 0.24, cy, zf] });
    }
  }
  // laterais e fundos
  for (let f = 0; f < floors; f++) {
    const cy = f * fh + fh * 0.55;
    const off = f === 0 ? w / 2 : xs;
    for (const sx of [-1, 1]) {
      const zz = (f % 2 ? -1 : 1) * d * 0.18 * sx;
      m.addModel(win(0.9, 1.3, { frame: TRIM, lit: rand() < 0.7, shutters: f > 0 ? shut : undefined }), { p: [sx * off, cy, zz], r: [0, (sx * Math.PI) / 2, 0] });
    }
    m.addModel(win(0.9, 1.3, { frame: TRIM, lit: rand() < 0.5 }), { p: [side * w * 0.2, cy, -(f === 0 ? d / 2 : zf)], r: [0, Math.PI, 0] });
  }
  put(m, box(1.0, 2.1, 0.12), 'aur_wood', dark(shut, 0.2), { p: [-side * w * 0.2, 1.45, -d / 2 - 0.03] });

  // telhado curvo de duas águas (cumeeira em Z), empena e beiral
  const rh = rr(rand, 2.7, 3.5), p = rr(rand, 1.35, 1.7);
  const hwR = xs + 0.75, dR = d + 2 * j + 1.3;
  const prof = gableProf(hwR, rh, p, 7);
  m.add(tone(xf(slab(prof, 0.2, dR), { p: [0, H, 0] }), roofC, 0.3, lite(roofC, 0.3)), 'aur_roof');
  const gy = (x: number): number => rh * Math.pow(1 - Math.abs(x) / hwR, p) - 0.21;
  const outline: P2[] = [];
  for (let i = -8; i <= 8; i++) outline.push([(i / 8) * xs, Math.max(0, gy((i / 8) * xs))]);
  outline.push([xs, -0.02], [-xs, -0.02]);
  put(m, xf(prism(outline, d + 2 * j), { p: [0, H, 0] }), 'aur_plaster', lite(fac, 0.1), undefined, 0.15);
  for (const sz of [-1, 1]) put(m, xf(slab(prof, 0.36, 0.12), { p: [0, H + 0.02, sz * (dR / 2 + 0.02)] }), 'std', TRIM, undefined, 0.12);
  put(m, rod([0, H + rh + 0.02, -dR / 2 - 0.1], [0, H + rh + 0.02, dR / 2 + 0.1], 0.16, 6), 'aur_roof', dark(roofC, 0.25));
  put(m, flat(ico(0.24, 0)), 'metal', '#e8c267', { p: [0, H + rh + 0.3, dR / 2] });
  // óculo do sótão
  put(m, cyl(0.62, 0.62, 0.14, 10), 'std', TRIM, { p: [0, H + rh * 0.34, zf + 0.02], r: [Math.PI / 2, 0, 0] });
  m.add(cyl(0.46, 0.46, 0.06, 10), 'glow_warm', '#ffd890', { p: [0, H + rh * 0.34, zf + 0.09], r: [Math.PI / 2, 0, 0] });
  put(m, box(0.06, 0.92, 0.05), 'std', TRIM, { p: [0, H + rh * 0.34, zf + 0.12] });
  put(m, box(0.92, 0.06, 0.05), 'std', TRIM, { p: [0, H + rh * 0.34, zf + 0.12] });
  // chaminé
  const cx = -side * hwR * 0.42, cz = -d * 0.18;
  const cyTop = H + gy(cx) + 1.9;
  put(m, box(0.8, 2.6, 0.8), 'aur_stone', '#b08a76', { p: [cx, cyTop - 1.3, cz] }, 0.3);
  put(m, cbox(1.05, 0.24, 1.05, 0.05), 'aur_stone', lite(STONE, 0.1), { p: [cx, cyTop + 0.1, cz] });
  for (const sx of [-1, 1]) put(m, cyl(0.14, 0.18, 0.5, 6), 'std', '#c46a3a', { p: [cx + sx * 0.2, cyTop + 0.45, cz] });
  return { w, d, H, fh, fac, roofC, shut, side };
}


function casaTorre(rand: Rand): Model {
  const m = new Model();
  const h = sobrado(m, rand, 6.3, 7.2, true);
  const sx = -h.side;
  const cx = sx * (h.w / 2 + 0.1), cz = h.d / 2 + 0.1;
  const R = rr(rand, 1.5, 1.7), top = h.H + rr(rand, 1.2, 1.9);
  const body = lite(h.fac, 0.22);
  put(m, flat(lathe([[0.2, h.fh - 1.5], [0.5, h.fh - 1.1], [R * 0.8, h.fh - 0.35], [R + 0.1, h.fh]], 10)), 'aur_stone', STONE, { p: [cx, 0, cz] }, 0.3);
  put(m, cyl(R, R, top - h.fh, 10), 'aur_plaster', body, { p: [cx, (top + h.fh) / 2, cz] }, 0.28);
  for (const y of [h.fh + 0.1, top - 0.12]) put(m, cyl(R + 0.1, R + 0.1, 0.24, 10), 'aur_wood', WOOD, { p: [cx, y, cz] });
  const rh = rr(rand, 3.4, 4.2);
  m.add(tone(xf(coneRoof(R + 0.55, rh, 1.6, 10, 6, 1.3), { p: [cx, top, cz] }), h.roofC, 0.3, lite(h.roofC, 0.35)), 'aur_roof');
  put(m, flat(ico(0.2, 0)), 'metal', '#e8c267', { p: [cx, top + rh + 0.1, cz] });
  put(m, rod([cx, top + rh, cz], [cx, top + rh + 1.1, cz], 0.04, 4), 'metal', IRON);
  put(m, box(0.75, 0.36, 0.03), 'aur_cloth', pick(rand, LANTERNS), { p: [cx + 0.42, top + rh + 0.85, cz] }, 0.1);
  const floors = Math.round(h.H / h.fh);
  for (let f = 1; f <= floors; f++) {
    const y = f < floors ? f * h.fh + h.fh * 0.52 : top - 1.0;
    for (const da of [-0.75, 0.35, 1.45]) {
      const a = (sx > 0 ? da : -da);
      if (f === floors && Math.abs(da) > 1) continue;
      m.addModel(win(0.62, f < floors ? 1.3 : 0.8, { frame: TRIM, arch: true, lit: rand() < 0.85, bars: [1, 1] }), { p: [cx + Math.sin(a) * (R - 0.04), y, cz + Math.cos(a) * (R - 0.04)], r: [0, a, 0] });
    }
  }
  return fin(m);
}

function lanternaPoste(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 4.0, 4.6);
  const lc = pick(rand, LANTERNS);
  const dbl = rand() < 0.3;
  put(m, flat(lathe([[0.42, -0.05], [0.42, 0.12], [0.3, 0.2], [0.22, 0.75], [0.16, 0.85], [0.2, 0.95], [0.12, 1.05]], 8)), 'aur_metal', IRON, undefined, 0.1, '#55506a');
  put(m, cyl(0.07, 0.11, H - 1.0, 6), 'aur_metal', IRON, { p: [0, 1.0 + (H - 1.0) / 2, 0] }, 0.1, '#55506a');
  put(m, flat(ico(0.13, 0)), 'metal', '#e8c267', { p: [0, H + 0.1, 0] });
  for (const sx of dbl ? [-1, 1] : [1]) {
    const arm = tube([[0, H - 0.5, 0], [sx * 0.35, H - 0.05, 0], [sx * 0.8, H - 0.05, 0], [sx * 1.0, H - 0.3, 0], [sx * 0.86, H - 0.48, 0]], 0.04, 10, 4);
    put(m, arm, 'aur_metal', IRON, undefined, 0.05, '#55506a');
    put(m, tube([[0, H - 1.1, 0], [sx * 0.3, H - 0.8, 0], [sx * 0.42, H - 0.35, 0]], 0.03, 5, 4), 'aur_metal', IRON);
    m.addModel(paperLantern(rr(rand, 0.3, 0.36), lc), { p: [sx * 0.9, H - 0.42, 0] });
  }
  return fin(m);
}

function varal(rand: Rand, span = 20): Model {
  const m = new Model();
  const px = span / 2 + 0.7;
  const H = rr(rand, 9.0, 9.5);
  for (const sx of [-1, 1]) {
    put(m, cbox(0.9, 0.7, 0.9, 0.08), 'aur_stone', STONE, { p: [sx * px, 0.25, 0] }, 0.3);
    put(m, cyl(0.13, 0.2, H, 7), 'aur_wood', jit(WOOD, rand), { p: [sx * px, H / 2, 0] }, 0.3, lite(WOOD, 0.3));
    for (const y of [1.2, 4.5, H - 0.4]) put(m, cyl(0.2 - y * 0.007, 0.2 - y * 0.007, 0.12, 7, true), 'metal', IRON, { p: [sx * px, y, 0] });
    put(m, flat(ico(0.2, 0)), 'metal', '#e8c267', { p: [sx * px, H + 0.12, 0] });
    put(m, rod([sx * (px + 0.1), 3.4, 0], [sx * (px + 0.75), 3.6, 0], 0.035, 4), 'metal', IRON);
    m.addModel(paperLantern(0.26, pick(rand, LANTERNS)), { p: [sx * (px + 0.7), 3.6, 0] });
  }
  const a: V3 = [-px, H - 0.25, 0], b: V3 = [px, H - 0.25, 0];
  const sag = 0.8;
  put(m, rope(a, b, sag, 0.03, 14, 4), 'std', '#3a2d2a');
  const pts = sagPts(a, b, sag, 8);
  for (let i = 1; i <= 7; i++) {
    const p = pts[i]!;
    const r = i % 2 ? 0.36 : 0.3;
    m.addModel(paperLantern(r, pick(rand, LANTERNS)), { p: [p[0], p[1], 0], r: [0, rand() * TAU, 0] });
  }
  return fin(m);
}

function fruitCrate(m: Model, rand: Rand, p: V3, ry: number, cols: ColorLike[], tilt = 0.35): void {
  const g = new Model();
  put(g, box(0.8, 0.1, 0.6), 'aur_wood', '#b98a52', { p: [0, 0.05, 0] });
  for (const sz of [-1, 1]) put(g, box(0.8, 0.26, 0.05), 'aur_wood', '#c79a60', { p: [0, 0.16, sz * 0.3] });
  for (const sx of [-1, 1]) put(g, box(0.05, 0.26, 0.6), 'aur_wood', '#c79a60', { p: [sx * 0.4, 0.16, 0] });
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) put(g, flat(ico(0.13, 0)), 'std', jit(pick(rand, cols), rand, 0.02), { p: [-0.25 + i * 0.25, 0.3, -0.13 + k * 0.26] }, 0.25);
  m.addModel(g, { p, r: [tilt, ry, 0] });
}

function banca(rand: Rand): Model {
  const m = new Model();
  const w = rr(rand, 3.2, 3.8), d = 2.0, h = 2.5;
  const c1 = pick(rand, ['#d8473c', '#2f7fa3', '#e0962a', '#3f9a6a', '#8d4ea8']);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(m, box(0.12, h + (sz < 0 ? 0.5 : 0), 0.12), 'aur_wood', WOOD, { p: [sx * (w / 2 - 0.1), (h + (sz < 0 ? 0.5 : 0)) / 2, sz * (d / 2 - 0.1)] }, 0.2);
  // balcão com saia de pano
  put(m, cbox(w, 0.12, d * 0.8, 0.03), 'aur_wood', '#a87a4c', { p: [0, 1.0, 0.1] });
  put(m, box(w - 0.1, 0.8, 0.05), 'aur_cloth', lite(c1, 0.2), { p: [0, 0.56, d * 0.4 + 0.08] }, 0.3);
  for (let i = 0; i < 5; i++) put(m, box(0.05, 0.8, 0.06), 'aur_cloth', '#fbf1dc', { p: [-w / 2 + 0.3 + (i / 4) * (w - 0.6), 0.56, d * 0.4 + 0.09] }, 0.2);
  // toldo listrado
  const n = 8, sw = (w + 0.6) / n;
  for (let i = 0; i < n; i++) {
    const g = slab([[-0.25, 0.5], [0.6, 0.38], [1.5, 0.1], [2.5, -0.38]], 0.05, sw, 1);
    g.rotateY(-Math.PI / 2);
    const c = i % 2 ? '#fbf1dc' : c1;
    put(m, g, 'aur_cloth', c, { p: [-(w + 0.6) / 2 + sw * (i + 0.5), h, -d / 2] }, 0.2);
    put(m, xf(flat(cyl(sw / 2, sw / 2, 0.04, 6)), { r: [Math.PI / 2, 0, 0], p: [-(w + 0.6) / 2 + sw * (i + 0.5), h - 0.42, -d / 2 + 2.5] }), 'aur_cloth', c, undefined, 0.2);
  }
  // mercadorias: frutas inclinadas e peixes no gelo
  fruitCrate(m, rand, [-w * 0.3, 1.1, 0.25], 0, ['#ff6a3c', '#ff9a2c']);
  fruitCrate(m, rand, [-w * 0.02, 1.1, 0.25], 0, ['#e8c22c', '#b5d92c']);
  fruitCrate(m, rand, [-w * 0.3, 0.0, d / 2 + 0.6], 0.3, ['#d8323c', '#8d2a4a'], 0);
  put(m, box(1.0, 0.1, 0.75), 'std', '#dff1f7', { p: [w * 0.28, 1.13, 0.2], r: [0.3, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const fx = w * 0.28 - 0.33 + i * 0.22, fc = pick(rand, ['#7fb4d6', '#b9c9d6', '#e89a8a']);
    put(m, blob(0.13, 0, i, 0.05, 1, [0.55, 0.3, 2.2]), 'glossy', fc, { p: [fx, 1.22, 0.2], r: [0.3, 0, 0] }, 0.3);
    put(m, box(0.02, 0.14, 0.14), 'glossy', dark(fc, 0.2), { p: [fx, 1.14, 0.52], r: [0.3, 0, 0] });
  }
  m.addModel(crate(0.6), { p: [w * 0.3, 0, d / 2 + 0.5], r: [0, 0.4, 0] });
  m.addModel(barrel(0.36, 0.85), { p: [w / 2 + 0.5, 0, 0] });
  put(m, rod([0, h - 0.1, d / 2 - 0.1], [0, h - 0.1, d / 2 + 0.4], 0.03, 4), 'metal', IRON);
  m.addModel(paperLantern(0.2, pick(rand, LANTERNS)), { p: [0, h - 0.1, d / 2 + 0.36] });
  // prateleira de fundo com potes
  put(m, box(w - 0.2, 0.08, 0.4), 'aur_wood', '#a87a4c', { p: [0, 1.75, -d / 2 + 0.25] });
  for (let i = 0; i < 5; i++) put(m, cyl(0.12, 0.14, 0.3, 6), 'glossy', jit(pick(rand, ['#c46a3a', '#4a8fb0', '#e8c267']), rand), { p: [-w / 2 + 0.5 + (i / 4) * (w - 1.0), 1.94, -d / 2 + 0.25] });
  put(m, box(w - 0.2, 1.3, 0.05), 'aur_wood', dark(WOOD, 0.1), { p: [0, 1.1, -d / 2 + 0.05] }, 0.3);
  return fin(m);
}

/** Casco de barco (popa em −Z, proa em +Z), convés em y=deck, calado `draft`. */
function hull(L: number, B: number, deck: number, draft: number, main: ColorLike, stripe: ColorLike, bottom: ColorLike, deckC: ColorLike): ReturnType<typeof box> {
  const hw = (t: number): number => Math.max(0.05, (B / 2) * (t < 0.4 ? 0.74 + 0.26 * Math.sin((t / 0.4) * Math.PI * 0.5) : Math.pow(Math.cos(((t - 0.4) / 0.6) * Math.PI * 0.5), 0.75)));
  const dk = (t: number): number => deck + 0.55 * Math.pow(t, 3) + 0.12 * Math.pow(1 - t, 2);
  const g = loft(9, 10, (t, a) => {
    const w = hw(t), top = dk(t), bot = -draft * (1 - 0.7 * Math.pow(t, 4));
    const s = Math.sin(a), c = Math.cos(a);
    const y = s >= 0 ? top : top - (top - bot) * Math.pow(-s, 0.75);
    return [w * Math.sign(c) * Math.pow(Math.abs(c), 0.7), y, -L / 2 + t * L + 0.35 * t * t * (s >= 0 ? 1 : -0.4 * s)];
  }, true, true);
  return paint(g, (p, n) => {
    if (n.y > 0.8) return deckC;
    const t = (p.z + L / 2) / L, h = (p.y + draft) / (dk(t) + draft);
    return h < 0.3 ? bottom : h < 0.42 ? stripe : h > 0.86 ? stripe : mix(dark(main, 0.15), lite(main, 0.1), h);
  });
}
function gunwale(m: Model, L: number, B: number, deck: number, c: ColorLike): void {
  for (const sx of [-1, 1]) {
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const w = Math.max(0.05, (B / 2) * (t < 0.4 ? 0.74 + 0.26 * Math.sin((t / 0.4) * Math.PI * 0.5) : Math.pow(Math.cos(((t - 0.4) / 0.6) * Math.PI * 0.5), 0.75)));
      pts.push([sx * w, deck + 0.55 * t ** 3 + 0.12 * (1 - t) ** 2 + 0.07, -L / 2 + t * L + 0.35 * t * t]);
    }
    put(m, tube(pts, 0.085, 10, 4), 'aur_wood', c, undefined, 0.1);
  }
}

function barcoPesca(rand: Rand): Model {
  const m = new Model();
  const L = rr(rand, 6.6, 7.6), B = rr(rand, 2.5, 2.9), deck = 0.95;
  const main = jit(pick(rand, ['#2f86b8', '#d8473c', '#2f9a7a', '#e8a531', '#f3ead8']), rand);
  m.add(hull(L, B, deck, 0.28, main, '#fbf1dc', '#8d2f2a', '#c79a60'), 'aur_wood');
  gunwale(m, L, B, deck, WOOD);
  // cabine com telhado curvo e janelas acesas
  const cz = -L * 0.16, cw = B * 0.52, cd = 1.9, ch = 1.75;
  put(m, cbox(cw, ch, cd, 0.06), 'aur_plaster', '#fbf1dc', { p: [0, deck + ch / 2, cz] }, 0.2);
  const rf = slab(gableProf(cw / 2 + 0.25, 0.3, 0.7, 4), 0.1, cd + 0.5, 1.2);
  m.add(tone(xf(rf, { p: [0, deck + ch, cz] }), main, 0.25), 'aur_roof');
  m.addModel(win(0.8, 0.55, { frame: main, sill: false, bars: [1, 0] }), { p: [0, deck + ch * 0.66, cz + cd / 2] });
  for (const sx of [-1, 1]) m.addModel(win(0.5, 0.5, { frame: main, sill: false, bars: [0, 0] }), { p: [sx * cw / 2, deck + ch * 0.66, cz], r: [0, sx * Math.PI / 2, 0] });
  m.addModel(door(0.6, 1.3, { color: WOOD, frame: main, step: false }), { p: [0, deck, cz - cd / 2], r: [0, Math.PI, 0] });
  // mastro, pau de carga, cabos, lanterna
  const mz = L * 0.14, mh = rr(rand, 4.4, 5.2);
  put(m, cyl(0.07, 0.1, mh, 6), 'aur_wood', WOOD, { p: [0, deck + mh / 2, mz] }, 0.2, lite(WOOD, 0.3));
  put(m, rod([0, deck + 1.3, mz], [0, deck + 2.6, mz + 2.4], 0.05, 5), 'aur_wood', WOOD);
  put(m, rope([0, deck + mh - 0.1, mz], [0, deck + 2.6, mz + 2.4], 0.05, 0.02, 3, 3), 'std', '#3a2d2a');
  put(m, rope([0, deck + mh - 0.1, mz], [0, deck + ch + 0.25, cz], 0.1, 0.02, 4, 3), 'std', '#3a2d2a');
  put(m, rope([0, deck + mh - 0.1, mz], [0, deck + 0.75, L / 2 + 0.2], 0.1, 0.02, 4, 3), 'std', '#3a2d2a');
  m.addModel(paperLantern(0.2, pick(rand, LANTERNS)), { p: [0, deck + 2.55, mz + 2.3] });
  put(m, box(0.6, 0.3, 0.03), 'aur_cloth', pick(rand, ['#d8473c', '#f2b632']), { p: [0.33, deck + mh - 0.25, mz] }, 0.1);
  // boia, caixotes, rede amontoada
  put(m, xf(torus(0.3, 0.1, 5, 10), { p: [cw / 2 + 0.07, deck + ch * 0.4, cz - 0.4], r: [0, Math.PI / 2, 0] }), 'std', '#f26a3c', undefined, 0.2);
  m.addModel(crate(0.5), { p: [-0.5, deck, L * 0.3], r: [0, 0.3, 0] });
  put(m, blob(0.5, 1, rand() * 9, 0.25, 1.5, [1.2, 0.5, 1]), 'aur_woven', '#3f8f8a', { p: [0.45, deck + 0.2, -L * 0.38] }, 0.3);
  for (let i = 0; i < 3; i++) put(m, flat(ico(0.11, 0)), 'std', '#ff8a3c', { p: [0.2 + i * 0.25, deck + 0.42, -L * 0.38 + (i % 2) * 0.2] });
  return fin(m);
}

function veleiro(rand: Rand): Model {
  const m = new Model();
  const L = rr(rand, 7.4, 8.6), B = rr(rand, 2.1, 2.5), deck = 0.85;
  const main = jit(pick(rand, ['#f3ead8', '#2f86b8', '#3f9a8a', '#e8785a']), rand);
  const sailC = pick(rand, ['#fbf1dc', '#ffe6b0', '#ffd0c0']);
  const acc = pick(rand, ['#d8473c', '#2f7fa3', '#e0962a', '#8d4ea8']);
  m.add(hull(L, B, deck, 0.28, main, acc, '#27405e', '#c79a60'), 'aur_wood');
  gunwale(m, L, B, deck, WOOD);
  put(m, cbox(B * 0.42, 0.5, 2.0, 0.08), 'aur_plaster', '#fbf1dc', { p: [0, deck + 0.22, -L * 0.1] }, 0.2);
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) m.add(cyl(0.13, 0.13, 0.04, 8), 'glow_warm', '#ffd890', { p: [sx * B * 0.21, deck + 0.28, -L * 0.1 - 0.45 + i * 0.9], r: [0, 0, Math.PI / 2] });
  const mz = L * 0.08, mh = rr(rand, 8.6, 9.8), boom = L * 0.42;
  put(m, cyl(0.06, 0.11, mh, 6), 'aur_wood', WOOD, { p: [0, deck + mh / 2, mz] }, 0.2, lite(WOOD, 0.3));
  put(m, rod([0, deck + 1.2, mz], [0, deck + 1.35, mz - boom], 0.06, 5), 'aur_wood', WOOD);
  // vela grande e bujarrona com barriga
  const sail = (a: V3, b: V3, c: V3, belly: number, col1: ColorLike): void => {
    const geo = triSail(a, b, c, belly);
    const y0 = Math.min(a[1], b[1], c[1]), y1 = Math.max(a[1], b[1], c[1]);
    m.add(paint(geo, (p) => { const t = (p.y - y0) / (y1 - y0); return t > 0.52 && t < 0.64 ? acc : mix(dark(col1, 0.18), col1, t); }), 'aur_cloth');
  };
  const bl = rr(rand, 0.35, 0.6) * (rand() < 0.5 ? -1 : 1);
  sail([0, deck + 1.45, mz - 0.08], [0, deck + 1.55, mz - boom + 0.1], [0, deck + mh - 0.3, mz - 0.08], bl, sailC);
  sail([0, deck + 1.0, mz + 0.25], [0, deck + 0.75, L / 2 + 0.1], [0, deck + mh * 0.82, mz + 0.1], bl * 0.8, lite(sailC, 0.2));
  put(m, rope([0, deck + mh - 0.1, mz], [0, deck + 0.7, L / 2 + 0.25], 0.02, 0.02, 3, 3), 'std', '#3a2d2a');
  put(m, rope([0, deck + mh - 0.1, mz], [0, deck + 0.4, -L / 2 + 0.2], 0.05, 0.02, 3, 3), 'std', '#3a2d2a');
  put(m, box(0.8, 0.32, 0.03), 'aur_cloth', acc, { p: [0, deck + mh + 0.05, mz - 0.42], r: [0, Math.PI / 2, 0] }, 0.1);
  m.addModel(paperLantern(0.16, pick(rand, LANTERNS)), { p: [0, deck + 1.3, mz - boom - 0.05] });
  put(m, box(0.08, 0.9, 0.5), 'aur_wood', WOOD, { p: [0, deck - 0.3, -L / 2 - 0.1] });
  return fin(m);
}

function farol(rand: Rand): Model {
  const m = new Model();
  const red = jit(pick(rand, ['#d8402f', '#e2572b', '#c9365a', '#2f7fa3']), rand);
  const white = '#fbf3e2';
  const rb = rr(rand, 2.5, 2.8), rt = 1.65, y0 = 1.6, y1 = 13.4;
  put(m, flat(cyl(3.5, 3.9, 1.8, 8)), 'aur_stone', STONE, { p: [0, 0.7, 0], r: [0, Math.PI / 8, 0] }, 0.35);
  put(m, flat(cyl(3.7, 3.7, 0.22, 8)), 'aur_stone', lite(STONE, 0.2), { p: [0, 1.66, 0], r: [0, Math.PI / 8, 0] });
  const nb = 5;
  for (let i = 0; i < nb; i++) {
    const ya = y0 + ((y1 - y0) * i) / nb, yb = y0 + ((y1 - y0) * (i + 1)) / nb;
    const ra = rb + ((rt - rb) * i) / nb, rc = rb + ((rt - rb) * (i + 1)) / nb;
    put(m, cyl(rc, ra, yb - ya, 12, true), 'aur_plaster', i % 2 ? white : red, { p: [0, (ya + yb) / 2, 0] }, 0.12);
  }
  // galeria com guarda-corpo
  put(m, flat(lathe([[rt, y1 - 0.7], [rt + 0.9, y1], [rt + 0.9, y1 + 0.2], [0.01, y1 + 0.2]], 12)), 'aur_stone', STONE, undefined, 0.3);
  const gr = rt + 0.8;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU, a2 = ((i + 1) / 12) * TAU;
    put(m, box(0.07, 1.0, 0.07), 'metal', IRON, { p: [Math.cos(a) * gr, y1 + 0.7, Math.sin(a) * gr] });
    put(m, beam([Math.cos(a) * gr, y1 + 1.2, Math.sin(a) * gr], [Math.cos(a2) * gr, y1 + 1.2, Math.sin(a2) * gr], 0.07), 'metal', IRON);
    put(m, beam([Math.cos(a) * gr, y1 + 0.7, Math.sin(a) * gr], [Math.cos(a2) * gr, y1 + 0.7, Math.sin(a2) * gr], 0.04), 'metal', IRON);
  }
  // sala da lanterna luminosa e cúpula
  const lr = 1.25, lh = 2.3, ly = y1 + 0.2;
  put(m, cyl(lr + 0.12, lr + 0.2, 0.5, 10), 'aur_plaster', white, { p: [0, ly + 0.25, 0] });
  m.add(paint(cyl(lr, lr, lh, 10, true), (p) => mix('#ffc76a', '#fff6d0', p.y / lh + 0.5)), 'glow_warm', undefined, { p: [0, ly + 0.5 + lh / 2, 0] });
  m.add(flat(ico(0.55, 1)), 'glow_white', '#fffbe8', { p: [0, ly + 0.5 + lh / 2, 0] });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; put(m, box(0.07, lh, 0.07), 'metal', IRON, { p: [Math.cos(a) * (lr + 0.02), ly + 0.5 + lh / 2, Math.sin(a) * (lr + 0.02)] }); }
  const ry = ly + 0.5 + lh;
  put(m, cyl(lr + 0.3, lr + 0.3, 0.16, 10), 'metal', IRON, { p: [0, ry, 0] });
  m.add(tone(xf(coneRoof(lr + 0.3, 1.5, 0.65, 10, 5, 1.0), { p: [0, ry + 0.05, 0] }), red, 0.25, lite(red, 0.35)), 'aur_roof');
  put(m, flat(ico(0.22, 0)), 'metal', '#e8c267', { p: [0, ry + 1.7, 0] });
  put(m, rod([0, ry + 1.6, 0], [0, ry + 2.4, 0], 0.03, 4), 'metal', IRON);
  // porta e janelas em espiral
  const rAt = (y: number): number => rb + ((rt - rb) * (y - y0)) / (y1 - y0);
  m.addModel(door(1.1, 2.1, { color: red, frame: white, arch: true }), { p: [0, 1.75, rAt(2.5) - 0.02] });
  put(m, cbox(1.8, 0.4, 1.4, 0.05), 'aur_stone', lite(STONE, 0.1), { p: [0, 1.6, 3.4] });
  for (let i = 0; i < 4; i++) {
    const y = 5.0 + i * 2.3, a = 0.9 + i * 1.5;
    m.addModel(win(0.6, 1.0, { frame: white, arch: true, lit: rand() < 0.8, bars: [1, 1] }), { p: [Math.sin(a) * (rAt(y) - 0.03), y, Math.cos(a) * (rAt(y) - 0.03)], r: [0, a, 0] });
  }
  for (let i = 0; i < 5; i++) { const a = rand() * TAU, r = rr(rand, 3.9, 4.6); put(m, rockGeo(rr(rand, 0.5, 0.8), rand() * 9, [1, 0.6, 1], 1, 0.2), 'aur_rock', '#8d8794', { p: [Math.cos(a) * r, 0.32, Math.sin(a) * r] }, 0.3); }
  return fin(m);
}

function caisPoste(rand: Rand): Model {
  const m = new Model();
  const h = rr(rand, 1.4, 1.8), r = rr(rand, 0.24, 0.3);
  put(m, flat(cyl(r * 0.92, r, h + 0.2, 8)), 'aur_bark', jit('#7a5a44', rand), { p: [0, h / 2 - 0.1, 0] }, 0.35);
  put(m, flat(cyl(r * 0.7, r * 1.02, 0.14, 8)), 'metal', IRON, { p: [0, h + 0.05, 0] });
  put(m, cyl(r * 1.02, r * 1.02, 0.1, 8, true), 'metal', IRON, { p: [0, h * 0.3, 0] });
  for (let i = 0; i < 3; i++) put(m, xf(torus(r + 0.05, 0.055, 4, 9), { r: [Math.PI / 2 + rr(rand, -0.08, 0.08), 0, 0], p: [0, h * 0.62 + i * 0.1, 0] }), 'aur_hay', '#d9c08a', undefined, 0.25);
  const a = rand() * TAU, d = rr(rand, 1.0, 1.5);
  put(m, tube([[Math.cos(a) * r, h * 0.62, Math.sin(a) * r], [Math.cos(a) * (r + 0.25), h * 0.25, Math.sin(a) * (r + 0.25)], [Math.cos(a) * d * 0.7, 0.05, Math.sin(a) * d * 0.7], [Math.cos(a + 0.5) * d, 0.04, Math.sin(a + 0.5) * d]], 0.05, 8, 4), 'aur_hay', '#d9c08a', undefined, 0.2);
  put(m, xf(torus(0.3, 0.055, 4, 9), { r: [Math.PI / 2, 0, 0], p: [Math.cos(a + 0.7) * d, 0.05, Math.sin(a + 0.7) * d] }), 'aur_hay', '#d9c08a');
  const h2 = h * 0.62;
  put(m, flat(cyl(r * 0.75, r * 0.82, h2 + 0.2, 7)), 'aur_bark', '#6d5040', { p: [-Math.cos(a) * 0.62, h2 / 2 - 0.1, -Math.sin(a) * 0.62], r: [0.06, 0, 0.08] }, 0.35);
  return fin(m);
}

function arcoPedra(rand: Rand, span = 20): Model {
  const m = new Model();
  const hw = span / 2, depth = 8, spring = 6.4, rise = rr(rand, 2.2, 2.8), ringT = 0.85;
  const pw = rr(rand, 2.4, 2.9);
  const top = spring + rise + ringT + 1.3;
  const stone = jit(pick(rand, ['#b8a892', '#a9a09a', '#c2ac8c']), rand);
  const aw = archWall(hw, spring, rise, ringT, top, depth);
  put(m, aw.fill, 'aur_block', stone, undefined, 0.2);
  put(m, aw.ring, 'aur_block', lite(stone, 0.3), undefined, 0.12);
  put(m, cbox(1.0, 1.5, depth + 0.6, 0.08), 'aur_block', lite(stone, 0.35), { p: [0, spring + rise + 0.5, 0] });
  for (const sx of [-1, 1]) {
    const px = sx * (hw + ringT + pw / 2 - 0.02);
    put(m, box(pw + ringT, top + 0.1, depth), 'aur_block', stone, { p: [sx * (hw + (pw + ringT) / 2), top / 2 - 0.05, 0] }, 0.3);
    put(m, cbox(pw + 0.5, 1.2, depth + 0.5, 0.1), 'aur_stone', dark(stone, 0.12), { p: [px + sx * 0.2, 0.5, 0] }, 0.3);
    put(m, cbox(pw + 0.3, 0.4, depth + 0.4, 0.08), 'aur_block', lite(stone, 0.3), { p: [px + sx * 0.15, spring - 0.3, 0] });
    // contraforte e lanternas nas duas bocas
    for (const sz of [-1, 1]) {
      put(m, cbox(pw * 0.62, 3.0, 1.3, 0.1), 'aur_block', dark(stone, 0.06), { p: [px + sx * 0.25, 1.4, sz * (depth / 2 + 0.3)] }, 0.3);
      put(m, cbox(pw * 0.5, 1.7, 0.9, 0.1), 'aur_block', stone, { p: [px + sx * 0.25, 3.7, sz * (depth / 2 + 0.15)] }, 0.2);
      put(m, rod([px + sx * 0.25, 5.3, sz * (depth / 2)], [px + sx * 0.25, 5.6, sz * (depth / 2 + 1.2)], 0.05, 4), 'metal', IRON);
      m.addModel(paperLantern(0.42, pick(rand, LANTERNS)), { p: [px + sx * 0.25, 5.58, sz * (depth / 2 + 1.12)] });
    }
  }
  // casa da guarda no topo, com telhado curvo e janelas acesas
  const gw = Math.min(span * 0.5, 9), gh = 2.5, gd = depth * 0.72;
  const fac = jit(pick(rand, FACADES), rand), roofC = jit(pick(rand, ROOFS), rand);
  put(m, box(gw, gh, gd), 'aur_plaster', fac, { p: [0, top + gh / 2, 0] }, 0.25);
  put(m, box(span + 2 * (ringT + pw), 0.3, depth + 0.3), 'aur_block', lite(stone, 0.3), { p: [0, top + 0.1, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(m, box(0.22, gh, 0.22), 'aur_wood', WOOD, { p: [sx * gw / 2, top + gh / 2, sz * gd / 2] });
  const rg = slab(gableProf(gd / 2 + 0.8, 1.9, 1.5, 6), 0.2, gw + 1.2);
  rg.rotateY(Math.PI / 2);
  m.add(tone(xf(rg, { p: [0, top + gh, 0] }), roofC, 0.3, lite(roofC, 0.3)), 'aur_roof');
  const go: P2[] = [];
  for (let i = -6; i <= 6; i++) go.push([(i / 6) * gd / 2, Math.max(0, 1.9 * Math.pow(1 - Math.abs((i / 6) * gd / 2) / (gd / 2 + 0.8), 1.5) - 0.2)]);
  go.push([gd / 2, -0.02], [-gd / 2, -0.02]);
  put(m, xf(prism(go, gw), { r: [0, Math.PI / 2, 0], p: [0, top + gh, 0] }), 'aur_plaster', lite(fac, 0.1));
  put(m, rod([-gw / 2 - 0.7, top + gh + 1.92, 0], [gw / 2 + 0.7, top + gh + 1.92, 0], 0.15, 6), 'aur_roof', dark(roofC, 0.25));
  const nw = Math.max(2, Math.round(gw / 2.4));
  for (const sz of [-1, 1]) for (let i = 0; i < nw; i++) {
    m.addModel(win(0.9, 1.2, { frame: TRIM, shutters: pick(rand, SHUTTERS), lit: rand() < 0.85 }), { p: [-gw / 2 + (gw * (i + 0.5)) / nw, top + gh * 0.52, sz * gd / 2], r: [0, sz > 0 ? 0 : Math.PI, 0] });
  }
  // ameias nas pontas do parapeito
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = sx * (gw / 2 + 0.6 + i * ((hw + ringT + pw - gw / 2 - 1.0) / 2.2));
    put(m, box(0.7, 0.7, 0.5), 'aur_block', lite(stone, 0.2), { p: [x, top + 0.55, sz * (depth / 2 - 0.25)] });
  }
  return fin(m);
}

function mureta(rand: Rand): Model {
  const m = new Model();
  const stone = jit(pick(rand, ['#b8a892', '#a9a09a', '#c2ac8c']), rand);
  put(m, box(6, 0.95, 0.5), 'aur_block', stone, { p: [0, 0.42, 0] }, 0.3);
  for (let i = 0; i < 5; i++) put(m, cbox(1.19, 0.2, 0.68, 0.05), 'aur_stone', lite(stone, 0.25), { p: [-2.4 + i * 1.2, 0.98, 0] });
  for (const x of [-2, 2]) { put(m, cyl(0.28, 0.28, 0.1, 8), 'std', dark(stone, 0.4), { p: [x, 0.45, 0.22], r: [Math.PI / 2, 0, 0] }); }
  put(m, cbox(0.85, 1.5, 0.85, 0.06), 'aur_block', lite(stone, 0.1), { p: [0, 0.7, 0] }, 0.3);
  put(m, cbox(1.05, 0.2, 1.05, 0.05), 'aur_stone', lite(stone, 0.3), { p: [0, 1.52, 0] });
  const H = rr(rand, 3.6, 4.0);
  put(m, flat(lathe([[0.26, 1.6], [0.2, 1.75], [0.1, 1.95], [0.07, H]], 6)), 'aur_metal', IRON, undefined, 0.1, '#55506a');
  for (const sx of [-1, 1]) put(m, tube([[0, H - 0.5, 0], [sx * 0.3, H - 0.1, 0], [sx * 0.6, H - 0.25, 0]], 0.03, 5, 4), 'aur_metal', IRON);
  // lanterna de vidro em gaiola
  put(m, cyl(0.26, 0.2, 0.1, 6), 'aur_metal', IRON, { p: [0, H, 0] });
  m.add(paint(flat(cyl(0.26, 0.18, 0.55, 6, true)), (p) => mix('#ffb45e', '#fff0b8', p.y / 0.55 + 0.5)), 'glow_warm', undefined, { p: [0, H + 0.33, 0] });
  put(m, flat(lathe([[0.36, 0], [0.12, 0.25], [0.01, 0.34]], 6)), 'aur_metal', IRON, { p: [0, H + 0.6, 0] });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + TAU / 12; put(m, rod([Math.cos(a) * 0.19, H + 0.05, Math.sin(a) * 0.19], [Math.cos(a) * 0.27, H + 0.6, Math.sin(a) * 0.27], 0.015, 3), 'metal', IRON); }
  return fin(m);
}

function redePesca(rand: Rand): Model {
  const m = new Model();
  const w = rr(rand, 3.4, 4.2), h = rr(rand, 2.3, 2.7);
  const netC = jit(pick(rand, ['#3f9a94', '#4a86b8', '#c9843c']), rand);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) put(m, rod([sx * w / 2, 0, sz * 0.75], [sx * w / 2, h + 0.25, -sz * 0.08], 0.06, 5), 'aur_wood', WOOD, undefined, 0.3, lite(WOOD, 0.3));
    put(m, xf(torus(0.11, 0.035, 4, 7), { p: [sx * w / 2, h, 0], r: [Math.PI / 2, 0, 0] }), 'aur_hay', '#d9c08a');
  }
  put(m, rod([-w / 2 - 0.35, h, 0], [w / 2 + 0.35, h, 0], 0.055, 5), 'aur_wood', lite(WOOD, 0.15));
  // rede drapeada nos dois lados da vara
  const q: number[] = [], uv: number[] = [];
  const nx = 8, ny = 4;
  const P = (i: number, j: number, sz: number): V3 => {
    const u = i / nx, v = j / ny;
    const drop = (h - 0.25) * (0.75 + 0.25 * Math.sin(u * Math.PI * 3 + sz)) * v;
    return [-w / 2 + 0.15 + u * (w - 0.3), h + 0.06 - drop, sz * (0.06 + 0.62 * v + 0.08 * Math.sin(u * 9 + v * 4))];
  };
  for (const sz of [-1, 1]) for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const a = P(i, j, sz), b = P(i + 1, j, sz), c = P(i + 1, j + 1, sz), d = P(i, j + 1, sz);
    q.push(...a, ...b, ...c, ...a, ...c, ...d);
    const s = 1.2;
    uv.push(a[0] * s, a[1] * s, b[0] * s, b[1] * s, c[0] * s, c[1] * s, a[0] * s, a[1] * s, c[0] * s, c[1] * s, d[0] * s, d[1] * s);
  }
  const g = rawGeo(q, uv);
  m.add(tone(g, netC, 0.3), 'aur_net');
  for (let i = 0; i <= 6; i++) put(m, flat(ico(0.09, 0)), 'std', i % 2 ? '#ff8a3c' : '#fbf1dc', { p: [-w / 2 + 0.2 + (i / 6) * (w - 0.4), h + 0.1, 0.07] });
  // boia de vidro, cesto e corda
  m.add(flat(ico(0.28, 1)), 'glossy', '#4fc0a8', { p: [w / 2 + 0.5, 0.26, 0.5] });
  put(m, xf(torus(0.2, 0.03, 4, 8), { p: [w / 2 + 0.5, 0.52, 0.5], r: [Math.PI / 2, 0, 0] }), 'aur_hay', '#d9c08a');
  put(m, flat(lathe([[0.01, 0], [0.32, 0], [0.42, 0.5], [0.38, 0.5], [0.3, 0.06], [0.01, 0.06]], 8)), 'aur_hay', '#c9a060', { p: [-w / 2 - 0.5, 0, 0.4] }, 0.3);
  return fin(m);
}

function gaivotaPoste(rand: Rand): Model {
  const m = new Model();
  const h = rr(rand, 2.0, 2.6), r = 0.2;
  put(m, flat(cyl(r * 0.85, r, h + 0.15, 7)), 'aur_bark', jit('#7a5a44', rand), { p: [0, h / 2 - 0.075, 0] }, 0.35);
  for (let i = 0; i < 3; i++) put(m, xf(torus(r + 0.02, 0.04, 4, 8), { r: [Math.PI / 2, 0, 0], p: [0, h * 0.7 + i * 0.075, 0] }), 'aur_hay', '#d9c08a');
  const g = new Model();
  const wing = pick(rand, ['#9aa7b8', '#8e98a8', '#b0b8c4']);
  put(g, blob(0.2, 1, 3, 0.06, 1, [0.8, 0.75, 1.5], false), 'std', '#fbf7ee', { p: [0, 0.28, 0], r: [-0.25, 0, 0] }, 0.25);
  put(g, blob(0.115, 1, 5, 0.04, 1, [1, 1, 1.05], false), 'std', '#fffdf6', { p: [0, 0.5, 0.22] }, 0.15);
  put(g, xf(flat(lathe([[0.045, 0], [0.03, 0.1], [0.005, 0.17]], 5)), { r: [Math.PI / 2 + 0.15, 0, 0], p: [0, 0.49, 0.31] }), 'std', '#f2a02c');
  for (const sx of [-1, 1]) {
    put(g, blob(0.19, 1, 7, 0.06, 1, [0.25, 0.55, 1.6]), 'std', wing, { p: [sx * 0.15, 0.31, -0.07], r: [-0.3, 0, sx * 0.12] }, 0.3);
    put(g, flat(ico(0.022, 0)), 'std', '#1b1b22', { p: [sx * 0.075, 0.53, 0.3] });
    put(g, rod([sx * 0.06, 0.18, 0], [sx * 0.06, 0, 0.02], 0.014, 3), 'std', '#f2a02c');
    put(g, box(0.07, 0.015, 0.1), 'std', '#f2a02c', { p: [sx * 0.06, 0.008, 0.05] });
  }
  put(g, box(0.16, 0.03, 0.22), 'std', '#3a3f4c', { p: [0, 0.2, -0.36], r: [0.3, 0, 0] });
  m.addModel(g, { p: [0, h + 0.07, 0], r: [0, rr(rand, -1.2, 1.2), 0], s: rr(rand, 1.15, 1.35) });
  return fin(m);
}

export const PORTO_PROPS: PropLibrary = {
  'casa-porto': { radius: 4.8, collider: { radius: 3.4, height: 9 }, build: (rand) => { const m = new Model(); sobrado(m, rand, 5.2, 6.6); return fin(m); } },
  'casa-porto-torre': { radius: 5.6, collider: { radius: 4.2, height: 9 }, build: casaTorre },
  'lanterna-poste': { radius: 1.1, collider: { radius: 0.3, height: 4 }, build: lanternaPoste },
  'varal-lanternas': { radius: 1, build: varal },
  'banca-mercado': { radius: 2.6, collider: { radius: 1.9, height: 2.6 }, build: banca },
  'barco-pesca': { radius: 4, collider: { radius: 1.6, height: 2.5 }, build: barcoPesca },
  veleiro: { radius: 4.5, collider: { radius: 1.4, height: 3 }, build: veleiro },
  farol: { radius: 5, collider: { radius: 3.9, height: 14 }, build: farol },
  'cais-poste': { radius: 1.6, collider: { radius: 0.35, height: 1.6 }, build: caisPoste },
  barril: {
    radius: 0.7,
    collider: { radius: 0.5, height: 1.1 },
    build: (rand) => {
      const m = barrel(rr(rand, 0.42, 0.52), rr(rand, 0.95, 1.15), jit(pick(rand, ['#9a6336', '#8a5a3a', '#a8703c']), rand), pick(rand, ['#4a4a55', '#7a5a2c']));
      m.transform({ r: [0, rand() * TAU, 0] });
      return fin(m);
    },
  },
  caixote: {
    radius: 0.9,
    collider: { radius: 0.6, height: 1 },
    build: (rand) => {
      const s = rr(rand, 0.85, 1.05);
      const m = crate(s, jit(pick(rand, ['#b98a52', '#a87a4c', '#c79a60']), rand));
      m.transform({ r: [0, rr(rand, -0.4, 0.4), 0] });
      if (rand() < 0.6) m.addModel(crate(s * 0.55, jit('#c79a60', rand)), { p: [rr(rand, -0.1, 0.1), s, rr(rand, -0.1, 0.1)], r: [0, rand() * TAU, 0] });
      return fin(m);
    },
  },
  'arco-pedra': { radius: 4.5, build: arcoPedra },
  'ponte-pedra-mureta': { radius: 3.1, collider: { radius: 0.6, height: 3.5 }, build: mureta },
  'rede-pesca': { radius: 2.6, collider: { radius: 0.4, height: 2.4 }, build: redePesca },
  'gaivota-poste': { radius: 0.6, collider: { radius: 0.25, height: 2.4 }, build: gaivotaPoste },
};
