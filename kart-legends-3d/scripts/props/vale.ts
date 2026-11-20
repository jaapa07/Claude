/** VALE DOS MOINHOS — campo montanhoso. Objetos de cenário originais. */
import { torus } from '../lib/geo';
import {
  Model, TAU, barrel, beam, blob, box, cbox, coneRoof, cyl, dark, door, fin, flat, gableProf, ico, jit, lathe, leafBlob, lite,
  mix, paint, paperLantern, pick, prism, put, rawGeo, rockGeo, rod, rr, slab, strip, tone, tube, win, xf, type ColorLike, type P2, type Rand, type V3,
} from './aurora-kit';
import type { PropLibrary } from './types';

const WOOD = '#6a4630';
const WOOD_L = '#a87a4c';
const STONE = '#a8a097';
const TRIM = '#f7efdd';
const ROOFS = ['#c5503a', '#3f7396', '#4f8a5a', '#8a4a6e', '#d08a34'];

/* ---------- moinho ---------- */
const MILL_HUB: V3 = [0, 10.1, 3.55];
const MILL_BLADE = 7.2;

function moinho(rand: Rand): Model {
  const m = new Model();
  const roofC = jit(pick(rand, ROOFS), rand);
  const body = jit(pick(rand, ['#f4ead2', '#f1e2c4', '#f6efe0']), rand);
  const rb = rr(rand, 3.25, 3.5);
  const o8 = Math.PI / 8;
  const rAt = (y: number): number => (y < 2.4 ? rb + 0.3 - y * 0.08 : rb - (y - 2.4) * ((rb - 2.3) / 7.2));
  const seg = (y0: number, y1: number, r0: number, r1: number): ReturnType<typeof box> => xf(flat(cyl(r1, r0, y1 - y0, 8)), { p: [0, (y0 + y1) / 2, 0], r: [0, o8, 0] });
  put(m, seg(-0.1, 2.4, rb + 0.32, rb + 0.1), 'aur_stone', STONE, undefined, 0.35);
  put(m, seg(2.4, 9.6, rb, 2.3), 'aur_plaster', body, undefined, 0.3);
  put(m, seg(2.3, 2.62, rb + 0.22, rb + 0.16), 'aur_wood', WOOD);
  put(m, seg(6.0, 6.25, rAt(6.0) + 0.1, rAt(6.25) + 0.1), 'aur_wood', roofC);
  // cúpula giratória: colar de madeira + telhado curvo
  put(m, seg(9.5, 10.75, 2.55, 2.7), 'aur_wood', WOOD_L, undefined, 0.3);
  put(m, seg(9.42, 9.62, 2.72, 2.72), 'aur_wood', WOOD);
  const rh = rr(rand, 3.2, 3.8);
  m.add(tone(xf(coneRoof(3.25, rh, 1.35, 12, 6), { p: [0, 10.7, 0] }), roofC, 0.3, lite(roofC, 0.35)), 'aur_roof');
  put(m, cyl(3.25, 3.25, 0.14, 12), 'aur_wood', dark(roofC, 0.3), { p: [0, 10.68, 0] });
  put(m, flat(ico(0.3, 0)), 'metal', '#e8c267', { p: [0, 10.7 + rh + 0.2, 0] });
  put(m, rod([0, 10.7 + rh - 0.3, 0], [0, 10.7 + rh + 1.3, 0], 0.05, 4), 'metal', '#3a3540');
  put(m, xf(box(0.9, 0.45, 0.03), { p: [0.5, 10.7 + rh + 1.0, 0] }), 'aur_cloth', pick(rand, ['#e0483c', '#f2b632', '#3f8fd0']), undefined, 0.1);
  // casa do eixo (frontão) na frente
  put(m, box(1.5, 1.3, 1.5), 'aur_wood', WOOD_L, { p: [0, MILL_HUB[1], 2.55] }, 0.25);
  m.add(tone(xf(slab(gableProf(1.05, 0.7, 1.2, 3), 0.1, 1.9, 1.2), { p: [0, MILL_HUB[1] + 0.63, 2.5] }), roofC, 0.2), 'aur_roof');
  put(m, rod([0, MILL_HUB[1], 3.0], [0, MILL_HUB[1], MILL_HUB[2]], 0.2, 8), 'metal', '#4a4550');

  // porta e janelas em faces alternadas
  const fr = (y: number): number => rAt(y) * Math.cos(o8) - 0.02;
  const face = (k: number, y: number, mod: Model, extra = 0): void => {
    const a = k * (Math.PI / 4);
    m.addModel(mod, { p: [Math.sin(a) * (fr(y) + extra), y, Math.cos(a) * (fr(y) + extra)], r: [0, a, 0] });
  };
  const dk = rand() < 0.5 ? 1 : 7;
  face(dk, 0.2, door(1.3, 2.3, { color: jit(roofC, rand), frame: TRIM, arch: true }), 0.12);
  const porch = new Model();
  porch.add(tone(xf(slab(gableProf(1.25, 0.6, 1.2, 3), 0.1, 1.3, 1.2), { p: [0, 0, 0.6] }), roofC, 0.2), 'aur_roof');
  for (const sx of [-1, 1]) put(porch, beam([sx * 1.0, -0.05, 1.1], [sx * 1.0, -0.9, 0.05], 0.12), 'aur_wood', WOOD);
  face(dk, 3.5, porch, 0.0);
  face(0, 4.3, win(0.9, 1.3, { frame: TRIM, arch: true, shutters: roofC }));
  face(0, 7.7, win(0.75, 1.0, { frame: TRIM, arch: true }));
  for (const k of [2, 4, 6]) {
    face(k, rr(rand, 3.9, 4.6), win(0.9, 1.25, { frame: TRIM, arch: true, shutters: roofC, lit: rand() < 0.75, box: k === 2 ? '#ff7a8a' : undefined }));
    face(k, rr(rand, 7.2, 7.9), win(0.7, 0.95, { frame: TRIM, arch: true, lit: rand() < 0.75 }));
  }
  // hera e sacos de farinha ao pé
  const ia = (dk === 1 ? 5 : 3) * (Math.PI / 4);
  for (let i = 0; i < 4; i++) {
    const y = 1.2 + i * 1.3, r = rAt(y) * 0.98;
    const a = ia + Math.sin(i * 1.7) * 0.25;
    leafBlob(m, 1.3 - i * 0.2, [Math.sin(a) * r, y, Math.cos(a) * r], '#3f8f45', rand() * 9, 1, [1, 1, 0.45 + 0.5 * Math.abs(Math.sin(a))]);
  }
  const sa = (dk === 1 ? 2.2 : -2.2) * (Math.PI / 4);
  for (let i = 0; i < 3; i++) {
    const a = sa + i * 0.22, r = rb + 0.9 + (i % 2) * 0.3;
    put(m, blob(0.42, 1, rand() * 9, 0.12, 1.2, [1, 1.25, 0.8], false), 'aur_cloth', '#e9dcc0', { p: [Math.sin(a) * r, 0.42, Math.cos(a) * r], r: [0, a, rr(rand, -0.2, 0.2)] }, 0.3);
  }
  m.addModel(barrel(0.45, 1.0), { p: [Math.sin(sa - 0.35) * (rb + 1.0), 0, Math.cos(sa - 0.35) * (rb + 1.0)] });
  return fin(m);
}

/** As 4 pás do moinho (origem no cubo; giram em Z). */
function moinhoPas(rand: Rand): Model {
  const m = new Model();
  const sail = jit('#f5ead0', rand);
  const tip = pick(rand, ['#d8473c', '#e59a2c', '#3f7fb8']);
  put(m, cyl(0.5, 0.5, 0.7, 10), 'aur_wood', WOOD, { p: [0, 0, 0.2], r: [Math.PI / 2, 0, 0] });
  put(m, flat(lathe([[0.42, 0], [0.3, 0.3], [0.01, 0.5]], 8)), 'metal', '#e8c267', { p: [0, 0, 0.55], r: [Math.PI / 2, 0, 0] });
  const one = new Model();
  const L = MILL_BLADE, w = 1.55, r0 = 1.5;
  put(one, box(0.2, L, 0.16), 'aur_wood', WOOD, { p: [0, L / 2, 0.25] }, 0.1);
  put(one, box(0.09, L - r0, 0.08), 'aur_wood', WOOD_L, { p: [w, (L + r0) / 2, 0.22] }, 0.1);
  put(one, box(0.07, L - r0, 0.06), 'aur_wood', WOOD_L, { p: [w / 2, (L + r0) / 2, 0.22] }, 0.1);
  const nb = 8;
  for (let i = 0; i <= nb; i++) put(one, box(w + 0.35, 0.08, 0.07), 'aur_wood', WOOD_L, { p: [w / 2 - 0.1, r0 + (i / nb) * (L - r0 - 0.05), 0.2] }, 0.1);
  // lona recolhida em parte: cobre ~75% da treliça
  const cl = (L - r0) * 0.78;
  put(one, box(w - 0.12, cl, 0.03), 'aur_cloth', sail, { p: [w / 2, r0 + 0.1 + cl / 2, 0.15] }, 0.14);
  put(one, box(w - 0.12, 0.5, 0.035), 'aur_cloth', tip, { p: [w / 2, r0 + 0.1 + cl - 0.25, 0.152] }, 0.1);
  put(one, cyl(0.12, 0.12, w - 0.1, 6), 'aur_cloth', dark(sail, 0.15), { p: [w / 2, r0 + 0.16 + cl, 0.16], r: [0, 0, Math.PI / 2] });
  for (let k = 0; k < 4; k++) m.addModel(one, { r: [0, 0, (k * Math.PI) / 2 + 0.3] });
  return fin(m);
}


/** Telhado de perfil dado (cumeeira em Z) sobre planta w×d a partir de y, com empenas preenchidas e cumeeira. */
function roofOn(m: Model, prof: P2[], y: number, w: number, d: number, over: number, roofC: ColorLike, wallC: ColorLike, wallMat = 'aur_plaster', trim: ColorLike = TRIM): void {
  const hwR = prof[prof.length - 1]![0];
  const yAt = (x: number): number => {
    for (let i = 0; i < prof.length - 1; i++) {
      const a = prof[i]!, b = prof[i + 1]!;
      if (x >= a[0] - 1e-6 && x <= b[0] + 1e-6) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0] || 1);
    }
    return 0;
  };
  m.add(tone(xf(slab(prof, 0.2, d + 2 * over), { p: [0, y, 0] }), roofC, 0.3, lite(roofC, 0.3)), 'aur_roof');
  const outline: P2[] = [];
  const xs = new Set<number>([-w / 2, w / 2]);
  for (const p of prof) if (Math.abs(p[0]) < w / 2) xs.add(p[0]);
  for (const x of [...xs].sort((a, b) => a - b)) outline.push([x, Math.max(0, yAt(x) - 0.22)]);
  outline.push([w / 2, -0.02], [-w / 2, -0.02]);
  put(m, xf(prism(outline, d), { p: [0, y, 0] }), wallMat, wallC, undefined, 0.12);
  for (const sz of [-1, 1]) put(m, xf(slab(prof, 0.34, 0.12), { p: [0, y + 0.02, sz * (d / 2 + over + 0.02)] }), 'std', trim, undefined, 0.1);
  const top = Math.max(...prof.map((p) => p[1]));
  put(m, rod([0, y + top + 0.02, -d / 2 - over - 0.1], [0, y + top + 0.02, d / 2 + over + 0.1], 0.15, 6), 'aur_roof', dark(roofC, 0.25));
  void hwR;
}

function chimney(m: Model, p: V3, h: number, c: ColorLike = '#b08a76'): void {
  put(m, box(0.8, h, 0.8), 'aur_stone', c, { p: [p[0], p[1] + h / 2, p[2]] }, 0.3);
  put(m, cbox(1.05, 0.22, 1.05, 0.05), 'aur_stone', lite(STONE, 0.15), { p: [p[0], p[1] + h + 0.08, p[2]] });
  put(m, cyl(0.16, 0.2, 0.45, 6), 'std', '#c46a3a', { p: [p[0], p[1] + h + 0.4, p[2]] });
}

function celeiro(rand: Rand): Model {
  const m = new Model();
  const w = rr(rand, 8.5, 9.5), d = rr(rand, 11, 12.5), wh = rr(rand, 4.6, 5.2);
  const red = jit(pick(rand, ['#c23b2e', '#b5352f', '#c9502a', '#a83440']), rand);
  const roofC = jit(pick(rand, ['#5a5f78', '#4a5a6a', '#6a5560', '#7a4a3a']), rand);
  put(m, cbox(w + 0.3, 0.8, d + 0.3, 0.08), 'aur_stone', STONE, { p: [0, 0.3, 0] }, 0.3);
  put(m, box(w, wh, d), 'aur_wood', red, { p: [0, wh / 2 + 0.3, 0] }, 0.3);
  const y = wh + 0.3;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(m, box(0.3, wh, 0.3), 'std', TRIM, { p: [sx * w / 2, wh / 2 + 0.3, sz * d / 2] }, 0.15);
  for (const sz of [-1, 1]) put(m, box(w + 0.1, 0.25, 0.14), 'std', TRIM, { p: [0, y - 0.1, sz * (d / 2 + 0.02)] });
  for (const sx of [-1, 1]) put(m, box(0.14, 0.25, d), 'std', TRIM, { p: [sx * (w / 2 + 0.02), y - 0.1, 0] });
  // telhado gambrel
  const hw = w / 2 + 0.6, h1 = rr(rand, 2.5, 2.9), h2 = h1 + rr(rand, 1.3, 1.6);
  const prof: P2[] = [[-hw - 0.25, -0.3], [-hw, 0], [-hw * 0.82, h1 * 0.55], [-hw * 0.58, h1], [-hw * 0.3, h1 + (h2 - h1) * 0.62], [0, h2], [hw * 0.3, h1 + (h2 - h1) * 0.62], [hw * 0.58, h1], [hw * 0.82, h1 * 0.55], [hw, 0], [hw + 0.25, -0.3]];
  roofOn(m, prof, y, w, d, 0.8, roofC, red, 'aur_wood');
  // portão duplo com X, porta do feno com guincho, janelas
  for (const sz of [-1, 1]) {
    const z = sz * d / 2, ry = sz > 0 ? 0 : Math.PI;
    const g = new Model();
    put(g, box(3.9, 3.7, 0.12), 'std', TRIM, { p: [0, 2.15, 0.02] }, 0.1);
    for (const sx of [-1, 1]) {
      put(g, box(1.75, 3.4, 0.1), 'aur_wood', dark(red, 0.12), { p: [sx * 0.9, 2.1, 0.07] }, 0.2);
      for (const k of [-1, 1]) put(g, beam([sx * 0.9 - 0.8, 2.1 - k * 1.6, 0.14], [sx * 0.9 + 0.8, 2.1 + k * 1.6, 0.14], 0.16, 0.05), 'std', TRIM);
      for (const yy of [0.47, 2.1, 3.73]) put(g, box(1.75, 0.16, 0.05), 'std', TRIM, { p: [sx * 0.9, yy, 0.14] });
    }
    put(g, box(1.7, 1.5, 0.1), 'std', TRIM, { p: [0, 5.75, 0.02] });
    put(g, box(1.4, 1.2, 0.1), 'aur_wood', dark(red, 0.25), { p: [0, 5.75, 0.06] });
    for (const k of [-1, 1]) put(g, beam([-0.65, 5.75 - k * 0.55, 0.12], [0.65, 5.75 + k * 0.55, 0.12], 0.1, 0.04), 'std', TRIM);
    if (sz > 0) {
      put(g, box(0.18, 0.18, 1.5), 'aur_wood', WOOD, { p: [0, y + h2 - 0.75, 0.75] });
      put(g, rod([0, y + h2 - 0.8, 1.35], [0, y + h2 - 1.9, 1.35], 0.02, 3), 'aur_hay', '#d9c08a');
      put(g, flat(ico(0.1, 0)), 'metal', '#4a4a55', { p: [0, y + h2 - 1.95, 1.35] });
      m.addModel(paperLantern(0.22, '#ffb23c'), { p: [2.5, 3.9, z + 0.5] });
      put(m, rod([2.5, 3.9, z], [2.5, 3.95, z + 0.55], 0.03, 3), 'metal', '#3a3540');
    }
    m.addModel(g, { p: [0, 0.3, z], r: [0, ry, 0] });
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    m.addModel(win(0.9, 1.1, { frame: TRIM, lit: rand() < 0.6, bars: [1, 1] }), { p: [sx * w / 2, 2.6, -d * 0.3 + i * d * 0.3], r: [0, sx * Math.PI / 2, 0] });
  }
  // lanternim com cata-vento
  const cy = y + h2;
  put(m, box(1.3, 1.1, 1.3), 'aur_wood', TRIM, { p: [0, cy + 0.4, 0] }, 0.15);
  for (const a of [0, 1, 2, 3]) put(m, box(0.7, 0.5, 0.05), 'aur_wood', dark(red, 0.3), { p: [Math.sin(a * Math.PI / 2) * 0.66, cy + 0.5, Math.cos(a * Math.PI / 2) * 0.66], r: [0, a * Math.PI / 2, 0] });
  m.add(tone(xf(flat(coneRoof(1.25, 1.1, 1.4, 4, 4, 1.0)), { p: [0, cy + 0.95, 0], r: [0, Math.PI / 4, 0] }), roofC, 0.25), 'aur_roof');
  put(m, rod([0, cy + 1.9, 0], [0, cy + 2.9, 0], 0.03, 4), 'metal', '#3a3540');
  put(m, box(0.9, 0.05, 0.05), 'metal', '#3a3540', { p: [0, cy + 2.5, 0] });
  put(m, xf(rawGeo([0, 0, 0, 0.5, 0.25, 0, 0, 0.5, 0, 0, 0, 0, 0, 0.5, 0, 0.5, 0.25, 0]), { p: [0.2, cy + 2.55, 0] }), 'metal', '#e8c267');
  // fardos e barril
  const sx = rand() < 0.5 ? -1 : 1;
  for (let i = 0; i < 3; i++) put(m, cbox(1.2, 0.6, 0.7, 0.08), 'aur_hay', '#e2c25a', { p: [sx * (w / 2 + 0.75), 0.3 + (i === 2 ? 0.6 : 0), d * 0.2 + (i === 1 ? 0.8 : i === 2 ? 0.4 : 0)], r: [0, Math.PI / 2 + rr(rand, -0.1, 0.1), 0] }, 0.3);
  m.addModel(barrel(0.42, 0.95), { p: [-sx * (w / 2 + 0.7), 0, d * 0.3] });
  return fin(m);
}

function casaFazenda(rand: Rand): Model {
  const m = new Model();
  const w = rr(rand, 8, 9.2), d = rr(rand, 6.2, 7), wh = rr(rand, 3.1, 3.4);
  const wall = jit(pick(rand, ['#f4e6c4', '#f6efdc', '#f1d9a8', '#e9d2b8']), rand);
  const roofC = jit(pick(rand, ROOFS), rand);
  const shut = pick(rand, ['#3f7a4a', '#3f6a96', '#a8442f', '#7a5a8a']);
  put(m, cbox(w + 0.3, 1.0, d + 0.3, 0.08), 'aur_stone', STONE, { p: [0, 0.4, 0] }, 0.3);
  put(m, box(w, wh, d), 'aur_plaster', wall, { p: [0, wh / 2 + 0.4, 0] }, 0.25);
  const y = wh + 0.4;
  // enxaimel: cantos, cinta e X nas pontas
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(m, box(0.26, wh, 0.26), 'aur_wood', WOOD, { p: [sx * w / 2, wh / 2 + 0.4, sz * d / 2] }, 0.2);
  for (const sz of [-1, 1]) {
    put(m, box(w, 0.22, 0.1), 'aur_wood', WOOD, { p: [0, y - 0.12, sz * (d / 2 + 0.01)] });
    put(m, box(w, 0.2, 0.1), 'aur_wood', WOOD, { p: [0, 1.25, sz * (d / 2 + 0.01)] });
  }
  // corpo gira 90°: cumeeira ao longo de X (fachada comprida para a frente)
  const r = new Model();
  const rh = rr(rand, 3.0, 3.6), pp = rr(rand, 1.3, 1.55);
  roofOn(r, gableProf(d / 2 + 0.85, rh, pp, 7), 0, d, w, 0.7, roofC, wall);
  m.addModel(r, { p: [0, y, 0], r: [0, Math.PI / 2, 0] });
  for (const sx of [-1, 1]) {
    for (const k of [-1, 1]) put(m, beam([sx * (w / 2 + 0.01), 1.3, k * d * 0.1], [sx * (w / 2 + 0.01), y - 0.2, k * d * 0.42], 0.1, 0.2), 'aur_wood', WOOD);
    m.addModel(win(0.8, 1.0, { frame: TRIM, arch: true, lit: rand() < 0.8 }), { p: [sx * w / 2, y + rh * 0.3, 0], r: [0, sx * Math.PI / 2, 0] });
    m.addModel(win(0.9, 1.2, { frame: TRIM, shutters: shut, lit: rand() < 0.7 }), { p: [sx * w / 2, 2.35, 0], r: [0, sx * Math.PI / 2, 0] });
  }
  // fachada: porta com alpendre, janelas com floreiras
  const side = rand() < 0.5 ? -1 : 1;
  const dx = side * w * 0.12;
  m.addModel(door(1.2, 2.2, { color: shut, frame: TRIM }), { p: [dx, 0.55, d / 2] });
  put(m, cbox(2.6, 0.5, 1.7, 0.05), 'aur_stone', lite(STONE, 0.1), { p: [dx, 0.3, d / 2 + 0.85] });
  for (const sx of [-1, 1]) put(m, box(0.16, 2.5, 0.16), 'aur_wood', WOOD, { p: [dx + sx * 1.15, 1.8, d / 2 + 1.5] }, 0.2);
  const pr = slab([[0, 0.5], [0.9, 0.2], [1.9, -0.25]], 0.1, 3.0, 1.2);
  pr.rotateY(-Math.PI / 2);
  m.add(tone(xf(pr, { p: [dx, 3.25, d / 2] }), roofC, 0.25), 'aur_roof');
  m.addModel(paperLantern(0.16, '#ffd34a'), { p: [dx + 0.9, 2.9, d / 2 + 0.5] });
  for (const k of [-1, 1]) {
    const x = dx + k * (w * 0.28 + 0.3) - side * w * 0.05;
    if (Math.abs(x) < w / 2 - 0.9) m.addModel(win(1.0, 1.25, { frame: TRIM, shutters: shut, lit: rand() < 0.85, box: pick(rand, ['#ff6f8f', '#ffcf4a', '#ff8a3c']) }), { p: [x, 2.35, d / 2] });
  }
  for (let i = 0; i < 3; i++) m.addModel(win(0.9, 1.2, { frame: TRIM, lit: rand() < 0.5 }), { p: [-w * 0.3 + i * w * 0.3, 2.35, -d / 2], r: [0, Math.PI, 0] });
  // água-furtada na frente
  const dz = d / 2 - 0.9, dy = y + 0.25, ddx = -side * w * 0.2;
  put(m, box(1.7, 1.5, 1.6), 'aur_plaster', wall, { p: [ddx, dy + 0.75, dz] }, 0.15);
  m.add(tone(xf(slab(gableProf(1.2, 0.8, 1.2, 3), 0.12, 2.2, 1.2), { p: [ddx, dy + 1.5, dz - 0.1] }), roofC, 0.2), 'aur_roof');
  put(m, xf(prism([[-0.85, 0], [0, 0.6], [0.85, 0]], 1.6), { p: [ddx, dy + 1.5, dz] }), 'aur_plaster', wall);
  m.addModel(win(0.8, 0.9, { frame: TRIM, lit: true, sill: false }), { p: [ddx, dy + 0.85, dz + 0.8] });
  chimney(m, [side * w * 0.3, y + rh * 0.35, -d * 0.15], rh * 0.65 + 1.2);
  for (let i = 0; i < 3; i++) leafBlob(m, rr(rand, 0.5, 0.75), [-side * (w * 0.2 + i * 0.9), 0.5, d / 2 + 0.5], pick(rand, ['#3f8f45', '#2f7a4a']), rand() * 20, 0, [1.2, 0.9, 1]);
  return fin(m);
}

function silo(rand: Rand): Model {
  const m = new Model();
  const r = rr(rand, 2.0, 2.4), h = rr(rand, 9, 11);
  const c1 = jit(pick(rand, ['#e9e4d8', '#c9d4dc', '#e8d9b8']), rand), c2 = jit(pick(rand, ['#c23b2e', '#3f7396', '#4f8a5a']), rand);
  put(m, cyl(r + 0.25, r + 0.35, 0.7, 12), 'aur_stone', STONE, { p: [0, 0.3, 0] }, 0.3);
  const nb = 6;
  for (let i = 0; i < nb; i++) {
    const y0 = 0.6 + (i / nb) * (h - 0.6), y1 = 0.6 + ((i + 1) / nb) * (h - 0.6);
    put(m, cyl(r, r, y1 - y0, 14, true), 'aur_metal', i === nb - 2 ? c2 : c1, { p: [0, (y0 + y1) / 2, 0] }, 0.1);
    put(m, cyl(r + 0.05, r + 0.05, 0.12, 14, true), 'metal', '#6a6a78', { p: [0, y1, 0] });
  }
  const dome = lathe([[r + 0.12, 0], [r * 0.9, r * 0.36], [r * 0.6, r * 0.62], [r * 0.25, r * 0.76], [0.01, r * 0.8]], 14);
  put(m, dome, 'aur_metal', c2, { p: [0, h, 0] }, 0.2, lite(c2, 0.3));
  put(m, cyl(0.2, 0.3, 0.4, 6), 'metal', '#6a6a78', { p: [0, h + r * 0.8 + 0.1, 0] });
  // escada com guarda e duto
  const lx = r + 0.12;
  for (const s of [-1, 1]) put(m, box(0.06, h - 0.4, 0.06), 'metal', '#4a4a55', { p: [s * 0.28, h / 2 + 0.4, lx] });
  for (let i = 0; i < Math.floor((h - 1) / 0.5); i++) put(m, box(0.56, 0.05, 0.05), 'metal', '#4a4a55', { p: [0, 1 + i * 0.5, lx] });
  put(m, tube([[-r * 0.5, h + r * 0.5, -r * 0.5], [-r - 0.4, h + 0.4, -r - 0.4], [-r - 0.75, h - 1.5, -r - 0.75], [-r - 0.75, 0.2, -r - 0.75]], 0.2, 8, 6), 'aur_metal', '#9a9aa8', undefined, 0.2);
  m.addModel(door(0.9, 1.8, { color: c2, frame: '#6a6a78', step: false }), { p: [Math.sin(1.2) * r, 0.6, Math.cos(1.2) * r], r: [0, 1.2, 0] });
  return fin(m);
}

function cerca(rand: Rand): Model {
  const m = new Model();
  const wood = jit(pick(rand, ['#a87a4c', '#8a6240', '#c9a070', '#f3ead8']), rand);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x = -2.8 + (i / (n - 1)) * 5.6, h = rr(rand, 1.15, 1.35);
    put(m, cbox(0.2, h + 0.1, 0.2, 0.04), 'aur_wood', wood, { p: [x, h / 2 - 0.05, 0], r: [rr(rand, -0.04, 0.04), rand(), rr(rand, -0.04, 0.04)] }, 0.3);
    put(m, flat(lathe([[0.15, 0], [0.01, 0.16]], 4)), 'aur_wood', lite(wood, 0.15), { p: [x, h + 0.02, 0], r: [0, Math.PI / 4, 0] });
  }
  for (const y of [0.45, 0.95]) for (let i = 0; i < n - 1; i++) {
    const x0 = -2.8 + (i / (n - 1)) * 5.6 - 0.12, x1 = x0 + 5.6 / (n - 1) + 0.24;
    put(m, beam([x0, y + rr(rand, -0.04, 0.04), 0.11], [x1, y + rr(rand, -0.04, 0.04), 0.11], 0.16, 0.05), 'aur_wood', lite(wood, 0.08), undefined, 0.15);
  }
  const k = Math.floor(rand() * 3);
  put(m, beam([-2.8 + k * 1.87 + 0.1, 0.4, 0.15], [-2.8 + (k + 1) * 1.87 - 0.1, 1.0, 0.15], 0.14, 0.04), 'aur_wood', wood);
  for (let i = 0; i < 4; i++) {
    const x = rr(rand, -2.7, 2.7);
    leafBlob(m, rr(rand, 0.2, 0.3), [x, 0.12, rr(rand, -0.3, 0.3)], '#3f8f35', rand() * 9, 0, [1.2, 0.9, 1.2]);
    if (i % 2) put(m, flat(ico(0.08, 0)), 'std', pick(rand, ['#ffffff', '#ffd34a', '#ff8fb0']), { p: [x + 0.05, 0.38, 0.1] });
  }
  return fin(m);
}

function fardoFeno(rand: Rand): Model {
  const m = new Model();
  const hay = jit(pick(rand, ['#e2c25a', '#d9b44a', '#ecd06a']), rand);
  if (rand() < 0.55) {
    const r = rr(rand, 0.85, 1.0), L = rr(rand, 1.3, 1.5);
    put(m, cyl(r, r, L, 14), 'aur_hay', hay, { r: [0, 0, Math.PI / 2], p: [0, r, 0] }, 0.35, lite(hay, 0.25));
    for (const sx of [-1, 1]) {
      for (let k = 1; k <= 3; k++) put(m, xf(torus(r * k * 0.27, 0.035, 3, 12), { r: [0, Math.PI / 2, 0], p: [sx * (L / 2 + 0.005), r, 0] }), 'aur_hay', dark(hay, 0.25));
      put(m, cyl(r + 0.015, r + 0.015, 0.05, 14, true), 'std', '#b0683c', { r: [0, 0, Math.PI / 2], p: [sx * L * 0.25, r, 0] });
    }
    m.transform({ r: [0, rr(rand, -0.5, 0.5), 0] });
  } else {
    const bale = (p: V3, ry: number): void => {
      const g = new Model();
      put(g, cbox(1.3, 0.62, 0.75, 0.09), 'aur_hay', jit(hay, rand), { p: [0, 0.31, 0] }, 0.3, lite(hay, 0.25));
      for (const sx of [-1, 1]) put(g, box(0.04, 0.64, 0.77), 'std', '#b0683c', { p: [sx * 0.32, 0.31, 0] });
      m.addModel(g, { p, r: [0, ry, 0] });
    };
    bale([-0.35, 0, 0.1], rr(rand, -0.1, 0.1));
    bale([0.4, 0, -0.35], Math.PI / 2 + rr(rand, -0.15, 0.15));
    bale([0, 0.62, -0.1], rr(rand, 0.2, 0.5));
  }
  for (let i = 0; i < 4; i++) { const a = rand() * TAU; put(m, rod([Math.cos(a) * 0.9, 0.02, Math.sin(a) * 0.9], [Math.cos(a) * 1.25, 0.04, Math.sin(a + 0.3) * 1.25], 0.02, 3), 'aur_hay', hay); }
  return fin(m);
}

function arvoreCampo(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 6.5, 8.5);
  const bark = jit(pick(rand, ['#7a5236', '#6a4a3a', '#8a6240']), rand);
  const [c0, c1] = pick(rand, [['#2f8a3a', '#9ad84a'], ['#3f9a3a', '#c4e04a'], ['#2a7a4a', '#7fd06a'], ['#c9702a', '#ffd04a']] as const);
  const lx = rr(rand, -1.0, 1.0), lz = rr(rand, -0.8, 0.8), tH = H * 0.5;
  const ax = (t: number): V3 => [lx * Math.sin(t * Math.PI * 0.9) * t, 0.1 + t * (tH - 0.1), lz * t * t];
  put(m, tube([[0, -0.05, 0], ax(0.25), ax(0.5), ax(0.75), ax(1)], (t) => 0.42 - 0.2 * t + 0.25 * Math.exp(-t * 9), 8, 7), 'aur_bark', bark, undefined, 0.4, lite(bark, 0.25));
  const top = ax(1);
  const a0 = rand() * TAU, R = H * 0.26;
  const vols: [number, number, number, number][] = [[0, H - R * 1.05 - top[1], 0, R * 1.08], [Math.cos(a0) * R * 0.95, R * 0.35, Math.sin(a0) * R * 0.95, R * 0.8], [Math.cos(a0 + 2.6) * R, R * 0.55, Math.sin(a0 + 2.6) * R, R * 0.72]];
  vols.forEach(([x, y, z, r], i) => {
    const g = blob(r, 2, rand() * 40, 0.12, 1.2, [1.08, 0.92, 1.08]);
    g.translate(top[0] + x, top[1] + y, top[2] + z);
    m.add(tone(g, mix(c0, c1, 0.25 + (i === 0 ? 0.25 : 0)), 0.42, mix(c0, c1, 0.95)), 'aur_foliage');
    if (i > 0) put(m, rod(ax(0.8), [top[0] + x * 0.8, top[1] + y, top[2] + z * 0.8], 0.16, 5, 0.09), 'aur_bark', bark);
  });
  if (rand() < 0.5) for (let i = 0; i < 6; i++) { const a = rand() * TAU; put(m, flat(ico(0.14, 0)), 'glossy', pick(rand, ['#e0382c', '#ffb02c']), { p: [top[0] + Math.cos(a) * R * 1.15, top[1] + R * rr(rand, 0.3, 0.9), top[2] + Math.sin(a) * R * 1.15] }); }
  return fin(m);
}

function pinheiroCampo(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 9, 12.5), R = H * rr(rand, 0.2, 0.24);
  const bark = jit('#6a4632', rand);
  const [c0, c1] = pick(rand, [['#1f6a4a', '#6ac06a'], ['#1a5f5a', '#5ab8a0'], ['#2a6a3a', '#8ac85a']] as const);
  const lean = rr(rand, -0.5, 0.5);
  put(m, tube([[0, -0.05, 0], [lean * 0.1, H * 0.3, 0], [lean * 0.5, H * 0.7, 0], [lean, H * 0.97, 0]], (t) => 0.38 - 0.33 * t + 0.2 * Math.exp(-t * 10), 6, 6), 'aur_bark', bark, undefined, 0.4);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const r = R * (1 - 0.72 * t) * rr(rand, 0.92, 1.08), h = H * 0.25 * (1 - 0.3 * t);
    const y = H * 0.2 + t * H * 0.56, seg = 9;
    const ph = rand() * TAU;
    const g0 = lathe([[r * 0.5, h * 0.1], [r, 0], [r * 0.52, h * 0.5], [0.03, h]], seg);
    const p = new Model();
    p.add(g0, 'std', '#fff');
    const g = p.parts[0]!.geo;
    const pos = g.getAttribute('position');
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), z = pos.getZ(k), yy = pos.getY(k), a = Math.atan2(z, x), rad = Math.hypot(x, z);
      if (rad > r * 0.8) { const f = 1 + 0.2 * Math.sin(a * 4.5 + ph); pos.setXYZ(k, x * f, yy - 0.25 * r * Math.max(0, Math.sin(a * 4.5 + ph)), z * f); }
    }
    const gg = flat(g);
    gg.translate(lean * (0.2 + 0.75 * t) * t, y, 0);
    m.add(tone(gg, mix(c0, c1, 0.15 + 0.35 * t), 0.5, mix(c0, c1, 0.75 + 0.25 * t)), 'aur_foliage');
  }
  return fin(m);
}

function espantalho(rand: Rand): Model {
  const m = new Model();
  const shirt = jit(pick(rand, ['#c9442f', '#3f7fb8', '#e0a02c', '#5a9a4a']), rand), pants = jit(pick(rand, ['#4a5a8a', '#6a4a3a', '#3f6a5a']), rand);
  const hay = '#e2c25a';
  put(m, cbox(0.14, 3.0, 0.14, 0.03), 'aur_wood', WOOD, { p: [0, 1.45, -0.05] }, 0.3);
  put(m, cbox(2.5, 0.12, 0.12, 0.03), 'aur_wood', WOOD, { p: [0, 2.15, -0.05], r: [0, 0, rr(rand, -0.08, 0.08)] });
  // tronco e mangas
  put(m, cbox(0.8, 0.95, 0.42, 0.12), 'aur_cloth', shirt, { p: [0, 1.85, 0] }, 0.3);
  for (let i = 0; i < 3; i++) put(m, box(0.82, 0.07, 0.43), 'aur_cloth', lite(shirt, 0.3), { p: [0, 1.55 + i * 0.28, 0] });
  for (const sx of [-1, 1]) {
    put(m, rod([sx * 0.38, 2.15, 0], [sx * 1.05, 2.1 - rr(rand, 0, 0.12), 0], 0.15, 6, 0.17), 'aur_cloth', shirt, undefined, 0.25);
    for (let k = 0; k < 4; k++) put(m, rod([sx * 1.0, 2.1, 0], [sx * 1.3, 2.1 + (k - 1.5) * 0.12, (k % 2 - 0.5) * 0.15], 0.025, 3), 'aur_hay', hay);
    put(m, rod([sx * 0.2, 1.4, 0], [sx * 0.26, 0.62, rr(rand, -0.08, 0.08)], 0.17, 6, 0.15), 'aur_cloth', pants, undefined, 0.3);
    for (let k = 0; k < 3; k++) put(m, rod([sx * 0.26, 0.64, 0], [sx * 0.26 + (k - 1) * 0.12, 0.38, 0.05], 0.025, 3), 'aur_hay', hay);
  }
  put(m, box(0.2, 0.22, 0.02), 'aur_cloth', pick(rand, ['#f2d24a', '#ff8fb0', '#7fd0e0']), { p: [0.18, 1.7, 0.22], r: [0, 0, 0.2] });
  put(m, xf(torus(0.3, 0.04, 4, 8), { p: [0, 1.4, 0], r: [Math.PI / 2, 0, 0], s: [1.25, 0.75, 1] }), 'aur_hay', '#8a5a34');
  // cabeça de saco com rosto costurado e chapéu de palha
  put(m, blob(0.33, 1, rand() * 9, 0.08, 1.2, [1, 1.08, 0.95], false), 'aur_cloth', '#e6d2a4', { p: [0, 2.62, 0.02] }, 0.25);
  for (const sx of [-1, 1]) put(m, cyl(0.055, 0.055, 0.03, 6), 'std', '#2a1c1c', { p: [sx * 0.12, 2.68, 0.33], r: [Math.PI / 2, 0, 0] });
  put(m, flat(lathe([[0.01, 0], [0.06, 0.02], [0.01, 0.2]], 4)), 'std', '#f08a2c', { p: [0, 2.6, 0.3], r: [Math.PI / 2, 0, 0] });
  put(m, xf(torus(0.11, 0.015, 3, 6, Math.PI), { p: [0, 2.53, 0.31], r: [0, 0, Math.PI] }), 'std', '#2a1c1c');
  const hat = flat(lathe([[0.62, 0], [0.6, 0.04], [0.3, 0.1], [0.27, 0.34], [0.01, 0.4]], 9));
  put(m, hat, 'aur_hay', hay, { p: [0, 2.84, 0], r: [rr(rand, -0.15, 0.1), 0, rr(rand, -0.15, 0.15)] }, 0.3, lite(hay, 0.25));
  put(m, cyl(0.285, 0.305, 0.08, 9, true), 'aur_cloth', shirt, { p: [0, 2.96, 0] });
  for (let k = 0; k < 5; k++) put(m, rod([(k - 2) * 0.1, 2.36, 0.1], [(k - 2) * 0.16, 2.2, 0.22], 0.025, 3), 'aur_hay', hay);
  // corvo no braço
  const cx = (rand() < 0.5 ? -1 : 1) * 0.85;
  put(m, blob(0.13, 1, 3, 0.05, 1, [0.85, 0.85, 1.5], false), 'glossy', '#23202e', { p: [cx, 2.36, 0], r: [-0.3, 0.6, 0] }, 0.2);
  put(m, flat(ico(0.085, 0)), 'glossy', '#23202e', { p: [cx + 0.09, 2.5, 0.13] });
  put(m, flat(lathe([[0.03, 0], [0.004, 0.11]], 4)), 'std', '#f2a02c', { p: [cx + 0.14, 2.49, 0.2], r: [Math.PI / 2, 0, -0.6] });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; put(m, rod([0, 0.3, -0.05], [Math.cos(a) * 0.4, 0.02, -0.05 + Math.sin(a) * 0.4], 0.03, 3), 'aur_hay', hay); }
  return fin(m);
}

function pedraCampo(rand: Rand): Model {
  const m = new Model();
  const r = rr(rand, 0.9, 1.4), seed = rand() * 30;
  const c = jit(pick(rand, ['#a09a92', '#b0a898', '#8f9098']), rand);
  const g = rockGeo(r, seed, [1.2, 0.75, 1], 2, 0.3);
  g.translate(0, r * 0.58, 0);
  m.add(paint(g, (p, n) => mix(mix(dark(c, 0.4), lite(c, 0.3), p.y / (r * 1.2)), '#6aa83c', Math.max(0, Math.min(1, (n.y - 0.75) * 4)) * 0.6)), 'aur_rock');
  const a = rand() * TAU;
  put(m, rockGeo(r * 0.5, seed + 3, [1.1, 0.7, 1], 1, 0.25), 'aur_rock', c, { p: [Math.cos(a) * r * 1.15, r * 0.28, Math.sin(a) * r * 1.15] }, 0.35);
  put(m, rockGeo(r * 0.3, seed + 7, [1.1, 0.7, 1], 0, 0.2), 'aur_rock', lite(c, 0.1), { p: [Math.cos(a + 1.2) * r * 1.2, r * 0.16, Math.sin(a + 1.2) * r * 1.2] }, 0.3);
  for (let i = 0; i < 5; i++) {
    const b = a + 2 + i * 0.7, d = r * rr(rand, 1.05, 1.3);
    for (let k = 0; k < 3; k++) {
      const pts: V3[] = [0, 0.5, 1].map((t) => [Math.cos(b) * d + (k - 1) * 0.12 * t, t * rr(rand, 0.4, 0.6), Math.sin(b) * d + (k - 1) * 0.1 * t] as V3);
      m.add(tone(strip(pts, (t) => 0.06 * (1 - t) + 0.005, [Math.sin(b), 0, -Math.cos(b)]), '#2f8a2c', 0.3, '#7ac83c'), 'leaf');
    }
    if (i % 2 === 0) put(m, flat(ico(0.07, 0)), 'std', pick(rand, ['#ffffff', '#ffd34a', '#c48aff']), { p: [Math.cos(b) * d, 0.5, Math.sin(b) * d] });
  }
  return fin(m);
}

function ponteCoberta(rand: Rand, span = 20): Model {
  const m = new Model();
  const hw = span / 2, depth = 14, wallH = rr(rand, 7.0, 7.4);
  const red = jit(pick(rand, ['#b5352f', '#c23b2e', '#8a5a34', '#3f6a5a']), rand);
  const roofC = jit(pick(rand, ['#5a5f78', '#4a5a6a', '#7a4a3a', '#3f7396']), rand);
  const px = hw + 0.35;
  const nz = 5;
  for (const sx of [-1, 1]) {
    put(m, cbox(1.3, 1.5, depth + 0.6, 0.1), 'aur_stone', STONE, { p: [sx * (px + 0.6), 0.6, 0] }, 0.3);
    put(m, box(0.16, 2.6, depth), 'aur_wood', red, { p: [sx * (px + 0.18), 2.6, 0] }, 0.25);
    put(m, box(0.3, 0.28, depth + 0.4), 'aur_wood', TRIM, { p: [sx * px, 3.95, 0] });
    put(m, box(0.4, 0.4, depth + 0.6), 'aur_wood', WOOD, { p: [sx * px, wallH - 0.2, 0] });
    for (let i = 0; i < nz; i++) {
      const z = -depth / 2 + 0.3 + (i / (nz - 1)) * (depth - 0.6);
      put(m, box(0.42, wallH - 1.3, 0.42), 'aur_wood', i === 0 || i === nz - 1 ? TRIM : WOOD, { p: [sx * px, 1.3 + (wallH - 1.3) / 2, z] }, 0.2);
      if (i < nz - 1) {
        const z2 = z + (depth - 0.6) / (nz - 1);
        for (const k of [0, 1]) put(m, beam([sx * (px + 0.05), k ? 4.1 : wallH - 0.4, z + 0.2], [sx * (px + 0.05), k ? wallH - 0.4 : 4.1, z2 - 0.2], 0.2, 0.14), 'aur_wood', TRIM);
      }
      // mãos-francesas e tirante (todos acima de 6 m)
      put(m, beam([sx * (px - 0.15), 6.15, z], [sx * (px - 1.2), wallH - 0.35, z], 0.22), 'aur_wood', WOOD);
    }
  }
  for (let i = 0; i < nz; i++) {
    const z = -depth / 2 + 0.3 + (i / (nz - 1)) * (depth - 0.6);
    put(m, box(span + 1.4, 0.34, 0.34), 'aur_wood', WOOD, { p: [0, wallH - 0.2, z] });
    put(m, box(0.26, 2.0, 0.26), 'aur_wood', WOOD, { p: [0, wallH + 0.9, z] });
  }
  const rh = rr(rand, 3.2, 3.9);
  const prof = gableProf(px + 1.4, rh, 1.25, 7);
  roofOn(m, prof, wallH, 2 * px + 0.3, depth, 0.9, roofC, red, 'aur_wood');
  for (const sz of [-1, 1]) {
    const z = sz * (depth / 2 + 0.03);
    put(m, box(2.8, 0.75, 0.1), 'aur_wood', TRIM, { p: [0, wallH + 0.9, z + sz * 0.06] });
    put(m, box(2.4, 0.4, 0.05), 'aur_wood', red, { p: [0, wallH + 0.9, z + sz * 0.12] });
    for (const sx of [-1, 1]) {
      put(m, rod([sx * (px + 0.3), 5.0, z], [sx * (px + 0.3), 5.25, z + sz * 0.9], 0.04, 4), 'metal', '#3a3540');
      m.addModel(paperLantern(0.36, pick(rand, ['#ffb23c', '#ffd34a', '#ff7a3c'])), { p: [sx * (px + 0.3), 5.22, z + sz * 0.85] });
      put(m, cbox(1.8, 2.2, 1.1, 0.1), 'aur_stone', lite(STONE, 0.08), { p: [sx * (px + 0.85), 0.95, z + sz * 0.5] }, 0.3);
    }
  }
  return fin(m);
}

const WHEEL_PIVOT: V3 = [4.15, 2.75, 0.4];
const WHEEL_R = 2.45;
function rodaDagua(rand: Rand): Model {
  const m = new Model();
  const w = 6.2, d = rr(rand, 5.4, 6.2), h1 = 2.9, h2 = rr(rand, 2.4, 2.8);
  const wall = jit(pick(rand, ['#f4e6c4', '#f6efdc', '#f1d9a8']), rand), roofC = jit(pick(rand, ROOFS), rand);
  const shut = pick(rand, ['#3f7a4a', '#3f6a96', '#a8442f']);
  put(m, box(w, h1 + 0.2, d), 'aur_stone', jit('#b0a595', rand), { p: [0, h1 / 2 - 0.1, 0] }, 0.3);
  put(m, box(w + 0.3, h2, d + 0.3), 'aur_plaster', wall, { p: [0, h1 + h2 / 2, 0] }, 0.25);
  put(m, box(w + 0.5, 0.26, d + 0.5), 'aur_wood', WOOD, { p: [0, h1, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    put(m, box(0.24, h2, 0.24), 'aur_wood', WOOD, { p: [sx * (w / 2 + 0.15), h1 + h2 / 2, sz * (d / 2 + 0.15)] });
    put(m, beam([sx * (w / 2 + 0.17), h1 + 0.2, sz * (d / 2 - 0.2)], [sx * (w / 2 + 0.17), h1 + h2 - 0.2, sz * (d / 2 - 1.5)], 0.08, 0.18), 'aur_wood', WOOD);
  }
  const y = h1 + h2, rh = rr(rand, 2.8, 3.4);
  roofOn(m, gableProf(w / 2 + 0.15 + 0.8, rh, 1.5, 7), y, w + 0.3, d + 0.3, 0.7, roofC, wall);
  chimney(m, [-w * 0.26, y + rh * 0.3, -d * 0.15], rh * 0.7 + 1.1);
  const zf = d / 2;
  m.addModel(door(1.15, 2.15, { color: shut, frame: TRIM, arch: true }), { p: [-w * 0.2, 0.05, zf] });
  m.addModel(win(0.9, 1.1, { frame: TRIM, lit: true, bars: [1, 1] }), { p: [w * 0.22, 1.7, zf] });
  for (const sx of [-1, 1]) m.addModel(win(0.9, 1.2, { frame: TRIM, shutters: shut, lit: rand() < 0.85, box: sx > 0 ? '#ff6f8f' : undefined }), { p: [sx * w * 0.24, h1 + h2 * 0.52, zf + 0.15], r: [0, 0, 0] });
  m.addModel(win(0.75, 0.75, { frame: TRIM, lit: true, sill: false }), { p: [0, y + rh * 0.32, zf + 0.15] });
  m.addModel(win(0.9, 1.2, { frame: TRIM, shutters: shut, lit: rand() < 0.6 }), { p: [-w / 2 - 0.15, h1 + h2 * 0.52, 0], r: [0, -Math.PI / 2, 0] });
  for (let i = 0; i < 2; i++) m.addModel(win(0.9, 1.2, { frame: TRIM, lit: rand() < 0.5 }), { p: [-w * 0.22 + i * w * 0.44, h1 + h2 * 0.52, -zf - 0.15], r: [0, Math.PI, 0] });
  // eixo, mancal externo e calha d'água sobre a roda
  const [px, py, pz] = WHEEL_PIVOT;
  put(m, rod([w / 2 - 0.1, py, pz], [px + 1.05, py, pz], 0.16, 8), 'aur_wood', WOOD);
  for (const sz of [-1, 1]) put(m, beam([px + 0.95, py + 0.15, pz], [px + 0.95, -0.05, pz + sz * 1.3], 0.22), 'aur_wood', WOOD, undefined, 0.3);
  put(m, cbox(0.5, 0.4, 0.5, 0.05), 'aur_wood', dark(WOOD, 0.2), { p: [px + 0.95, py, pz] });
  const fy = py + WHEEL_R + 0.5, fz0 = pz - 0.2, fz1 = -d / 2 - 2.6;
  put(m, box(0.9, 0.08, fz0 - fz1), 'aur_wood', WOOD_L, { p: [px, fy, (fz0 + fz1) / 2] });
  for (const sx of [-1, 1]) put(m, box(0.08, 0.34, fz0 - fz1), 'aur_wood', WOOD_L, { p: [px + sx * 0.45, fy + 0.15, (fz0 + fz1) / 2] });
  m.add(paint(box(0.74, 0.06, fz0 - fz1), () => '#bfeaff'), 'aur_water', undefined, { p: [px, fy + 0.2, (fz0 + fz1) / 2] });
  for (const z of [fz1 + 0.3, (fz0 + fz1) / 2 - 0.6]) for (const sx of [-1, 1]) put(m, beam([px + sx * 0.4, fy, z], [px + sx * 0.75, -0.05, z], 0.16), 'aur_wood', WOOD, undefined, 0.3);
  const pos: number[] = [], uv: number[] = [];
  const fall: [number, number][] = [[fy + 0.2, fz0 - 0.1], [fy + 0.05, fz0 + 0.3], [fy - 0.5, fz0 + 0.55], [py + WHEEL_R - 0.5, fz0 + 0.7]];
  for (let i = 0; i < fall.length - 1; i++) {
    const a = fall[i]!, b = fall[i + 1]!;
    pos.push(px - 0.36, a[0], a[1], px + 0.36, a[0], a[1], px + 0.36, b[0], b[1], px - 0.36, a[0], a[1], px + 0.36, b[0], b[1], px - 0.36, b[0], b[1]);
    uv.push(0, i / 3, 1, i / 3, 1, (i + 1) / 3, 0, i / 3, 1, (i + 1) / 3, 0, (i + 1) / 3);
  }
  m.add(paint(rawGeo(pos, uv), () => '#e6f7ff'), 'water_fall');
  const pool = flat(lathe([[0.01, 0.08], [2.0, 0.08], [2.4, 0]], 10));
  m.add(paint(xf(pool, { p: [px, 0, pz], s: [0.75, 1, 1.5] }), () => '#5fc8e8'), 'aur_water');
  for (let i = 0; i < 5; i++) { const a = -1.2 + i * 0.6; put(m, rockGeo(rr(rand, 0.35, 0.6), rand() * 20, [1, 0.7, 1], 0, 0.2), 'aur_rock', '#8f8a84', { p: [px + 1.9 * Math.cos(a) * 0.9, 0.22, pz + Math.sin(a) * 3.4] }, 0.3); }
  for (let i = 0; i < 3; i++) put(m, blob(0.4, 1, rand() * 9, 0.12, 1.2, [1, 1.2, 0.8], false), 'aur_cloth', '#e9dcc0', { p: [-w * 0.2 + 1.3 + i * 0.5, 0.4, zf + 0.5 + (i % 2) * 0.35], r: [0, rand(), 0.15] }, 0.3);
  return fin(m);
}
function rodaDaguaRoda(rand: Rand): Model {
  const m = new Model();
  const wood = jit('#7a5236', rand), R = WHEEL_R, wd = 0.5;
  const n = 12;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
      put(m, beam([sx * wd, Math.cos(a0) * R, Math.sin(a0) * R], [sx * wd, Math.cos(a1) * R, Math.sin(a1) * R], 0.1, 0.3), 'aur_wood', wood, undefined, 0.05);
      put(m, beam([sx * wd, Math.cos(a0) * R * 0.62, Math.sin(a0) * R * 0.62], [sx * wd, Math.cos(a1) * R * 0.62, Math.sin(a1) * R * 0.62], 0.08, 0.12), 'aur_wood', dark(wood, 0.15), undefined, 0.05);
    }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI; put(m, beam([sx * wd * 0.9, Math.cos(a) * R, Math.sin(a) * R], [sx * wd * 0.9, -Math.cos(a) * R, -Math.sin(a) * R], 0.09, 0.14), 'aur_wood', lite(wood, 0.1), undefined, 0.05); }
  }
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * TAU;
    put(m, xf(box(2 * wd + 0.1, 0.07, 0.62), { r: [a + 0.5, 0, 0], p: [0, Math.cos(a) * (R - 0.08), Math.sin(a) * (R - 0.08)] }), 'aur_wood', lite(wood, 0.2), undefined, 0.05);
  }
  put(m, cyl(0.32, 0.32, 2 * wd + 0.3, 8), 'aur_wood', dark(wood, 0.2), { r: [0, 0, Math.PI / 2] });
  return fin(m);
}

function trator(rand: Rand): Model {
  const m = new Model();
  const c = jit(pick(rand, ['#d8402f', '#3f9a4a', '#2f7fc0', '#e8a02c']), rand);
  const dk = '#2c2a34';
  const wheel = (r: number, wd: number, hub: ColorLike): Model => {
    const g = new Model();
    const tire = lathe([[r * 0.62, -wd / 2], [r * 0.95, -wd / 2], [r, -wd * 0.3], [r, wd * 0.3], [r * 0.95, wd / 2], [r * 0.62, wd / 2]], 12);
    put(g, tire, 'rubber', dk, { r: [0, 0, Math.PI / 2] }, 0.1, '#4a4856');
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; put(g, box(wd * 0.9, r * 0.1, r * 0.2), 'rubber', '#1c1a24', { r: [a, 0, 0], p: [0, Math.cos(a) * r, Math.sin(a) * r] }); }
    put(g, cyl(r * 0.64, r * 0.64, wd * 0.7, 10), 'paint', hub, { r: [0, 0, Math.PI / 2] }, 0.15);
    put(g, cyl(r * 0.2, r * 0.2, wd * 0.9, 6), 'metal', '#b0b0bc', { r: [0, 0, Math.PI / 2] });
    return g;
  };
  const yel = '#f2c230';
  for (const sx of [-1, 1]) {
    m.addModel(wheel(0.85, 0.5, yel), { p: [sx * 0.95, 0.85, -0.75] });
    m.addModel(wheel(0.46, 0.3, yel), { p: [sx * 0.7, 0.46, 1.35] });
    put(m, xf(cbox(0.62, 0.1, 1.5, 0.04), { p: [sx * 0.95, 1.78, -0.75] }), 'paint', c, undefined, 0.15);
    put(m, box(0.62, 0.5, 0.08), 'paint', c, { p: [sx * 0.95, 1.55, -1.5], r: [0.3, 0, 0] });
    m.add(cyl(0.11, 0.11, 0.06, 8), 'glow_warm', '#fff0b8', { p: [sx * 0.3, 1.25, 1.83], r: [Math.PI / 2, 0, 0] });
    put(m, cyl(0.14, 0.14, 0.08, 8), 'metal', '#b0b0bc', { p: [sx * 0.3, 1.25, 1.79], r: [Math.PI / 2, 0, 0] });
  }
  put(m, cbox(0.86, 0.75, 1.9, 0.14), 'paint', c, { p: [0, 1.22, 0.85] }, 0.25, lite(c, 0.3));
  put(m, cbox(0.7, 0.5, 2.6, 0.08), 'std', dk, { p: [0, 0.75, 0.3] });
  put(m, box(0.6, 0.5, 0.05), 'metal', '#4a4a55', { p: [0, 1.2, 1.81] });
  for (let i = 0; i < 4; i++) put(m, box(0.5, 0.05, 0.03), 'metal', '#b0b0bc', { p: [0, 1.03 + i * 0.11, 1.84] });
  put(m, box(1.4, 0.12, 0.12), 'std', dk, { p: [0, 0.46, 1.35] });
  // assento, volante, capota e escapamento
  put(m, cbox(0.9, 0.4, 1.0, 0.1), 'paint', c, { p: [0, 1.15, -0.55] }, 0.2);
  put(m, cbox(0.55, 0.14, 0.5, 0.05), 'std', '#5a3a2a', { p: [0, 1.42, -0.7] });
  put(m, cbox(0.55, 0.5, 0.12, 0.05), 'std', '#5a3a2a', { p: [0, 1.7, -0.98], r: [-0.15, 0, 0] });
  put(m, rod([0, 1.5, -0.05], [0, 1.95, -0.3], 0.03, 4), 'metal', '#4a4a55');
  put(m, xf(torus(0.2, 0.03, 4, 10), { p: [0, 1.96, -0.31], r: [-1.05, 0, 0] }), 'std', dk);
  for (const sx of [-1, 1]) for (const z of [-1.25, 0.0]) put(m, rod([sx * 0.52, 1.5, z], [sx * 0.5, 2.85, z === 0 ? -0.1 : -1.15], 0.04, 4), 'metal', '#4a4a55');
  put(m, cbox(1.3, 0.1, 1.5, 0.04), 'paint', lite(c, 0.1), { p: [0, 2.88, -0.62] });
  put(m, rod([0.3, 1.55, 1.1], [0.3, 2.5, 1.1], 0.05, 6), 'metal', '#6a6a78');
  put(m, cyl(0.09, 0.07, 0.3, 6), 'metal', '#3a3a44', { p: [0.3, 2.6, 1.1] });
  put(m, box(0.16, 0.02, 0.16), 'metal', '#3a3a44', { p: [0.3, 2.78, 1.14], r: [0.5, 0, 0] });
  const k = rr(rand, 0.96, 1.06);
  m.transform({ s: [k, k, rr(rand, 0.97, 1.05)] });
  return fin(m);
}

function girassois(rand: Rand): Model {
  const m = new Model();
  const w = rr(rand, 2.8, 3.4), d = rr(rand, 1.6, 2.0);
  put(m, cbox(w, 0.28, d, 0.06), 'aur_sand', '#6a4630', { p: [0, 0.12, 0] }, 0.2);
  for (const sz of [-1, 1]) put(m, box(w + 0.16, 0.34, 0.08), 'aur_wood', WOOD_L, { p: [0, 0.15, sz * (d / 2 + 0.03)] });
  for (const sx of [-1, 1]) put(m, box(0.08, 0.34, d), 'aur_wood', WOOD_L, { p: [sx * (w / 2 + 0.04), 0.15, 0] });
  const n = 7 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.3 + ((i + 0.5) / n) * (w - 0.6), z = (i % 2 ? -1 : 1) * d * 0.2 + rr(rand, -0.15, 0.15);
    const h = rr(rand, 1.5, 2.4), lean = rr(rand, -0.15, 0.15);
    const top: V3 = [x + lean, h, z + 0.12];
    put(m, tube([[x, 0.2, z], [x + lean * 0.5, h * 0.6, z], top], 0.035, 4, 4), 'std', '#3f8f35', undefined, 0.2);
    for (const s of [-1, 1]) {
      const y = h * rr(rand, 0.35, 0.6);
      const pts: V3[] = [0, 0.5, 1].map((t) => [x + s * t * 0.5, y + Math.sin(t * 2.5) * 0.15, z] as V3);
      m.add(tone(strip(pts, (t) => 0.16 * Math.sin(Math.PI * (0.15 + 0.85 * t)) + 0.01, [0, 0, 1], 0.2), '#2f8a2c', 0.3, '#5aa83c'), 'leaf');
    }
    const r = rr(rand, 0.2, 0.28);
    const head = new Model();
    const petals: number[] = [];
    for (let k = 0; k < 12; k++) {
      const a0 = (k / 12) * TAU, a1 = ((k + 1) / 12) * TAU, am = (a0 + a1) / 2;
      petals.push(Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(a1) * r, Math.sin(a1) * r, 0, Math.cos(am) * r * 2.1, Math.sin(am) * r * 2.1, -0.04);
    }
    head.add(paint(rawGeo(petals), (p) => mix('#f2a01c', '#ffe03c', Math.hypot(p.x, p.y) / (r * 2.1))), 'leaf');
    put(head, cyl(r, r * 0.9, 0.08, 10), 'std', '#5a3418', { r: [Math.PI / 2, 0, 0], p: [0, 0, 0.03] }, 0.1);
    put(head, cyl(r * 0.55, r * 0.5, 0.1, 8), 'std', '#3a2010', { r: [Math.PI / 2, 0, 0], p: [0, 0, 0.05] }, 0.1);
    m.addModel(head, { p: top, r: [rr(rand, -0.45, -0.1), rr(rand, -0.4, 0.4), 0] });
  }
  return fin(m);
}

function caixaDagua(rand: Rand): Model {
  const m = new Model();
  const legH = rr(rand, 5.2, 6.0), r = rr(rand, 1.7, 1.95), th = rr(rand, 2.5, 2.9);
  const wood = jit(pick(rand, ['#8a5a34', '#7a5236', '#9a6a3c']), rand), roofC = jit(pick(rand, ROOFS), rand);
  const b = 2.1, t = 1.45;
  const leg = (i: number, y: number): V3 => { const sx = i % 2 ? 1 : -1, sz = i < 2 ? 1 : -1, k = b + (t - b) * (y / legH); return [sx * k, y, sz * k]; };
  for (let i = 0; i < 4; i++) {
    put(m, beam(leg(i, -0.05), leg(i, legH), 0.26), 'aur_wood', WOOD, undefined, 0.3, lite(WOOD, 0.25));
    put(m, cbox(0.6, 0.3, 0.6, 0.05), 'aur_stone', STONE, { p: [leg(i, 0)[0], 0.12, leg(i, 0)[2]] });
  }
  const pairs: [number, number][] = [[0, 1], [1, 3], [3, 2], [2, 0]];
  for (const [a, c] of pairs) {
    for (const y of [1.6, 3.6]) put(m, beam(leg(a, y), leg(c, y), 0.14), 'aur_wood', WOOD);
    put(m, beam(leg(a, 1.7), leg(c, 3.5), 0.1), 'aur_wood', WOOD_L);
    put(m, beam(leg(c, 1.7), leg(a, 3.5), 0.1), 'aur_wood', WOOD_L);
  }
  put(m, flat(cyl(r + 0.5, r + 0.5, 0.22, 8)), 'aur_wood', WOOD, { p: [0, legH + 0.1, 0], r: [0, Math.PI / 8, 0] });
  const tank = flat(lathe([[r * 0.94, 0], [r, th * 0.5], [r * 0.94, th]], 14));
  put(m, tank, 'aur_bark', wood, { p: [0, legH + 0.2, 0] }, 0.3, lite(wood, 0.2));
  for (const k of [0.15, 0.5, 0.85]) put(m, cyl(r + 0.02, r + 0.02, 0.1, 14, true), 'metal', '#4a4a55', { p: [0, legH + 0.2 + th * k, 0] });
  const ry = legH + 0.2 + th;
  m.add(tone(xf(coneRoof(r + 0.45, rr(rand, 1.5, 1.9), 1.25, 12, 5, 1.2), { p: [0, ry, 0] }), roofC, 0.3, lite(roofC, 0.3)), 'aur_roof');
  put(m, cyl(r + 0.45, r + 0.45, 0.1, 12), 'aur_wood', dark(roofC, 0.3), { p: [0, ry, 0] });
  // escada e bica
  for (const s of [-1, 1]) put(m, beam([s * 0.25, 0, b + 0.5], [s * 0.25, ry - 0.3, r + 0.12], 0.07), 'aur_wood', WOOD_L);
  const steps = Math.floor(ry / 0.55);
  for (let i = 1; i < steps; i++) { const k = i / steps; put(m, box(0.56, 0.06, 0.06), 'aur_wood', WOOD_L, { p: [0, k * (ry - 0.3), b + 0.5 + k * (r + 0.12 - b - 0.5)] }); }
  put(m, tube([[r * 0.7, legH + 0.5, -r * 0.7], [r + 0.5, legH + 0.3, -r - 0.5], [r + 0.9, legH - 0.9, -r - 0.9]], 0.11, 6, 6), 'metal', '#6a6a78');
  put(m, box(1.3, 0.6, 0.05), 'aur_wood', TRIM, { p: [0, legH + 0.2 + th * 0.5, r + 0.03] });
  put(m, flat(ico(0.2, 0)), 'std', pick(rand, ['#3f8fd0', '#d8473c', '#3f9a4a']), { p: [0, legH + 0.2 + th * 0.5, r + 0.08], s: [1.6, 1, 0.3] });
  return fin(m);
}

export const VALE_PROPS: PropLibrary = {
  moinho: { radius: 5.5, collider: { radius: 3.7, height: 11 }, build: moinho, animated: { build: moinhoPas, pivot: MILL_HUB, motion: { kind: 'spin', axis: 'z', period: 9 } } },
  celeiro: { radius: 8, collider: { radius: 5.8, height: 9 }, build: celeiro },
  'casa-fazenda': { radius: 6.2, collider: { radius: 4.6, height: 7 }, build: casaFazenda },
  silo: { radius: 3.3, collider: { radius: 2.7, height: 10 }, build: silo },
  cerca: { radius: 3.1, build: cerca },
  'fardo-feno': { radius: 1.3, collider: { radius: 1.0, height: 1.6 }, build: fardoFeno },
  'arvore-campo': { radius: 2.4, collider: { radius: 0.55, height: 4 }, build: arvoreCampo },
  'pinheiro-campo': { radius: 2.4, collider: { radius: 0.5, height: 5 }, build: pinheiroCampo },
  espantalho: { radius: 1.3, collider: { radius: 0.3, height: 2.8 }, build: espantalho },
  'pedra-campo': { radius: 1.8, collider: { radius: 1.1, height: 1.4 }, build: pedraCampo },
  'ponte-coberta': { radius: 7.5, build: ponteCoberta },
  'roda-dagua': { radius: 6.5, collider: { radius: 4.3, height: 8 }, build: rodaDagua, animated: { build: rodaDaguaRoda, pivot: WHEEL_PIVOT, motion: { kind: 'spin', axis: 'x', period: 7 } } },
  trator: { radius: 2.2, collider: { radius: 1.5, height: 2.8 }, build: trator },
  'canteiro-girassois': { radius: 2, build: girassois },
  'caixa-dagua': { radius: 3.2, collider: { radius: 2.6, height: 9 }, build: caixaDagua },
};
