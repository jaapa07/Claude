/** VALE DOS MOINHOS — campo montanhoso. Objetos de cenário originais. */
import {
  Model, TAU, archProf, awning, barrel, beam, blob, box, cbox, coneRoof, crate, cyl, dark, door, fin, flat, gableProf, ico, jit, lathe, leafBlob, lite, loft,
  mix, paint, pick, prism, put, rockGeo, rod, rope, rr, slab, tone, tube, win, xf, type ColorLike, type P2, type Rand, type V3,
} from './aurora-kit';
import type { PropLibrary } from './types';

const WOOD = '#6a4630';
const WOOD_L = '#a87a4c';
const STONE = '#a8a097';
const TRIM = '#f7efdd';
const CREAM = '#f3e8cf';
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
  const litK = [0, 2, 4, 6, 3, 5];
  face(0, 4.3, win(0.9, 1.3, { frame: TRIM, arch: true, shutters: roofC }));
  face(0, 7.7, win(0.75, 1.0, { frame: TRIM, arch: true }));
  for (const k of [2, 4, 6]) {
    face(k, rr(rand, 3.9, 4.6), win(0.9, 1.25, { frame: TRIM, arch: true, shutters: roofC, lit: rand() < 0.75, box: k === 2 ? '#ff7a8a' : undefined }));
    face(k, rr(rand, 7.2, 7.9), win(0.7, 0.95, { frame: TRIM, arch: true, lit: rand() < 0.75 }));
  }
  void litK;
  // hera e sacos de farinha ao pé
  const ia = (dk === 1 ? 5 : 3) * (Math.PI / 4);
  for (let i = 0; i < 4; i++) {
    const y = 0.8 + i * 1.3, r = rAt(y) * 0.98;
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

export const VALE_PROPS: PropLibrary = {
  moinho: {
    radius: 5.5,
    collider: { radius: 3.7, height: 11 },
    build: moinho,
    animated: { build: moinhoPas, pivot: MILL_HUB, motion: { kind: 'spin', axis: 'z', period: 9 } },
  },
};

void [TAU, archProf, awning, cbox, crate, loft, mix, paint, prism, rockGeo, rope, tube];
export type { ColorLike, P2 };
