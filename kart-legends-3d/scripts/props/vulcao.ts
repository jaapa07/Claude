/** VULCÃO RUBRO — basalto, lava, obsidiana, árvores calcinadas e estruturas de ferro de uma forja vulcânica. */
import {
  Model, TAU, beam, blob, box, cbox, cyl, finMet, flat, ico, jit, lathe, lite, loft, mix, paint, put, rawGeo, rockGeo, rod, rr,
  tube, xf, type Geo, type Rand, type V3,
} from './kit-meteoro';
import { torus } from '../lib/geo';
import { fbm3 } from './aurora-kit';
import type { PropLibrary } from './types';

const BASALT = '#4e4648';
const ASH = '#6e6264';
const IRON = '#4a4246';
const RUST = '#8a4a2a';

/** Feixe de colunas hexagonais de basalto. */
function colunasBasalto(rand: Rand): Model {
  const m = new Model();
  const n = 5 + Math.floor(rand() * 5), H = rr(rand, 2.5, 6.5);
  for (let i = 0; i < n; i++) {
    const a = rand() * TAU, d = i === 0 ? 0 : rr(rand, 0.6, 2.2), h = H * rr(rand, 0.4, 1);
    const g = flat(cyl(0.55, 0.6, h, 6));
    put(m, g, 'met_basalto', jit(BASALT, rand), { p: [Math.cos(a) * d, h / 2 - 0.1, Math.sin(a) * d], r: [0, rand(), rr(rand, -0.06, 0.06)] }, 0.3, lite(ASH, 0.1));
  }
  for (let i = 0; i < 3; i++) put(m, rockGeo(rr(rand, 0.3, 0.6), rand() * 40, [1.2, 0.6, 1], 0, 0.25), 'met_basalto', ASH, { p: [rr(rand, -2.5, 2.5), 0.15, rr(rand, -2.5, 2.5)] }, 0.3);
  return finMet(m);
}

/** Rocha com rachaduras incandescentes. */
function rochaLava(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 1.2, 2.4), seed = rand() * 50;
  const g = rockGeo(R, seed, [1.2, 0.7, 1], 1, 0.32);
  m.add(paint(g, (p) => {
    const k = fbm3(p.x * 0.9 + seed, p.y * 0.9, p.z * 0.9);
    return Math.abs(k - 0.5) < 0.035 ? '#ff7a2a' : mix(BASALT, ASH, Math.min(1, Math.max(0, p.y / R)));
  }), 'met_obsidiana', undefined, { p: [0, R * 0.45, 0] });
  // veias de lava (faixa emissiva na base)
  put(m, xf(rockGeo(R * 1.02, seed, [1.2, 0.18, 1], 1, 0.32), { p: [0, 0.1, 0] }), 'met_brasa', '#ffffff', undefined, 0.05);
  return finMet(m);
}

function cristalObsidiana(rand: Rand): Model {
  const m = new Model();
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const h = rr(rand, 1.2, 3.4), r = rr(rand, 0.25, 0.5), a = rand() * TAU, tilt = rr(rand, 0.1, 0.5);
    const g = flat(lathe([[r, 0], [r, h * 0.75], [0.01, h]], 6));
    put(m, g, 'met_obsidiana', i % 2 ? '#2a1e2e' : '#1a1418', { p: [Math.cos(a) * 0.4, -0.1, Math.sin(a) * 0.4], r: [Math.cos(a + 1) * tilt, rand(), Math.sin(a + 1) * tilt] }, 0.1, '#6a4a7a');
  }
  put(m, rockGeo(0.8, rand() * 40, [1.3, 0.5, 1.1], 0, 0.25), 'met_basalto', BASALT, { p: [0, 0.15, 0] }, 0.3);
  m.add(flat(cyl(0.6, 0.8, 0.12, 6)), 'met_brasa', '#ffffff', { p: [0, 0.03, 0] });
  return finMet(m);
}

function arvoreQueimada(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 4, 7), lean = rr(rand, -0.6, 0.6);
  put(m, tube([[0, -0.1, 0], [lean * 0.3, H * 0.4, 0], [lean, H, 0.2]], (t) => 0.3 - 0.22 * t, 6, 6), 'aur_bark', '#2a2224', undefined, 0.3, '#4a4044');
  for (let i = 0; i < 5; i++) {
    const t = rr(rand, 0.4, 0.95), a = rand() * TAU, L = rr(rand, 1, 2.4);
    const p: V3 = [lean * t, H * t, 0.2 * t];
    const q: V3 = [p[0] + Math.cos(a) * L, p[1] + rr(rand, 0.2, 1.2), p[2] + Math.sin(a) * L];
    put(m, rod(p, q, 0.04, 4, 0.12), 'aur_bark', '#2a2224');
    if (rand() < 0.5) put(m, rod(q, [q[0] + Math.cos(a + 0.8) * 0.6, q[1] + 0.5, q[2] + Math.sin(a + 0.8) * 0.6], 0.02, 3, 0.04), 'aur_bark', '#2a2224');
  }
  m.add(flat(cyl(0.25, 0.32, 0.15, 6)), 'met_brasa', '#ffffff', { p: [0, 0.05, 0] });
  return finMet(m);
}

/** Fumarola: cone de rocha com boca incandescente. */
function fumarola(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 1.4, 2.2), H = rr(rand, 1.2, 2.2), seed = rand() * 40;
  const g = loft(6, 12, (t, a) => {
    const r = R * (1 - t * 0.7) * (0.85 + 0.3 * fbm3(Math.cos(a) * 2 + seed, t * 2, Math.sin(a) * 2));
    return [Math.cos(a) * r, t * H - 0.1, Math.sin(a) * r];
  }, false, false, false);
  put(m, g, 'met_basalto', ASH, undefined, 0.35, '#8a6a5a');
  m.add(flat(cyl(R * 0.3, R * 0.28, 0.2, 10)), 'met_brasa', '#ffffff', { p: [0, H - 0.15, 0] });
  for (let i = 0; i < 4; i++) put(m, ico(rr(rand, 0.15, 0.3), 0), 'met_basalto', '#c8b84a', { p: [Math.cos(i * 1.6) * R * 0.45, H * 0.75, Math.sin(i * 1.6) * R * 0.45] }); // enxofre
  return finMet(m);
}

/** Vulcão de fundo: cone imenso com cratera de lava e escorridos. */
function vulcao(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 70, 85), H = rr(rand, 55, 70), seed = rand() * 50, crater = 0.2;
  const g = loft(14, 40, (t, a) => {
    const prof = t < 1 - crater ? 1 - t / (1 - crater) * 0.82 : 0.18 - (t - (1 - crater)) * 0.1;
    const y = t < 1 - crater ? t / (1 - crater) * H : H - (t - (1 - crater)) / crater * 8;
    const r = R * prof * (0.86 + 0.28 * fbm3(Math.cos(a) * 2 + seed, t * 3, Math.sin(a) * 2));
    return [Math.cos(a) * r, y - 2, Math.sin(a) * r];
  }, false, false, false);
  m.add(paint(g, (p, n) => mix(mix('#2a2426', '#4a3e3c', Math.min(1, p.y / H)), '#1a1416', Math.max(0, 0.6 - n.y))), 'met_basalto');
  m.add(flat(cyl(R * 0.16, R * 0.16, 1, 16)), 'lava', '#ffffff', { p: [0, H - 9, 0] });
  // escorridos de lava descendo a encosta
  for (let i = 0; i < 6; i++) {
    const a = rand() * TAU, pts: V3[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, r = R * (0.17 + t * 0.7), wob = Math.sin(t * 6 + i) * 0.08;
      pts.push([Math.cos(a + wob) * r, H - 2.5 - t * (H - 4) + 0.6, Math.sin(a + wob) * r]);
    }
    m.add(tube(pts, (t) => 1.6 + t * 2.2, 16, 5), 'lava_fall', '#ffffff');
  }
  return finMet(m);
}

/** Cascata de lava descendo um paredão (fica ao lado da pista). */
function cascataLava(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 12, 16), W = rr(rand, 5, 7), seed = rand() * 40;
  const wall = loft(8, 14, (t, a) => {
    const r = (W + 6) * (1 - t * 0.35) * (0.8 + 0.4 * fbm3(Math.cos(a) * 1.5 + seed, t * 2, Math.sin(a) * 1.5));
    return [Math.cos(a) * r, t * H - 0.2, Math.sin(a) * r * 0.6 - 9];
  }, true, false, false);
  put(m, wall, 'met_basalto', BASALT, undefined, 0.35, ASH);
  const sheet: number[] = [];
  const nx = 6, ny = 8;
  const P = (i: number, j: number): V3 => {
    const x = (i / nx - 0.5) * W, t = j / ny;
    return [x, H * (1 - t) - 0.3, -3.9 + t * 4.2 + Math.sin(x + t * 3) * 0.2];
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
    sheet.push(...a, ...c, ...b, ...a, ...d, ...c);
  }
  m.add(rawGeo(sheet), 'lava_fall', '#ffffff');
  m.add(flat(cyl(W * 0.7, W * 0.8, 0.4, 12)), 'lava', '#ffffff', { p: [0, 0.05, 1.6] });
  return finMet(m);
}

/** Guarda-corpo de ferro de ponte (ao longo de Z). */
function grade(rand: Rand): Model {
  const m = new Model();
  const zs = [-2.9, 0, 2.9];
  for (const z of zs) {
    put(m, cbox(0.25, 1.4, 0.25, 0.03), 'met_chapa', IRON, { p: [0, 0.7, z] }, 0.2);
    put(m, flat(cyl(0.2, 0.01, 0.3, 4)), 'met_chapa', RUST, { p: [0, 1.55, z] });
  }
  for (const y of [0.5, 1.2]) put(m, box(0.12, 0.12, 5.9), 'met_chapa', IRON, { p: [0, y, 0] }, 0.15);
  for (let k = 0; k < 2; k++) put(m, beam([0, 0.5, -2.8 + k * 2.9], [0, 1.2, 0.1 + k * 2.9 - 0.2], 0.06), 'met_chapa', RUST);
  if (rand() < 0.3) m.add(box(0.06, 0.06, 1.2), 'met_brasa', '#ffffff', { p: [0.1, 1.27, rr(rand, -2, 2)] });
  return finMet(m);
}

/** Pórtico da forja: treliça de ferro com correntes e lâmpadas sobre a pista. */
function porticoForja(rand: Rand, span = 18): Model {
  const m = new Model();
  const x = span / 2 + 1.1, H = 8.2;
  for (const sx of [-1, 1]) {
    put(m, cbox(1.8, 1.0, 1.8), 'met_basalto', BASALT, { p: [sx * x, 0.5, 0] }, 0.2);
    for (const sz of [-1, 1]) put(m, beam([sx * x + sz * 0.5, 0.9, sz * 0.5], [sx * x, H + 1.4, 0], 0.3), 'met_chapa', IRON, undefined, 0.2);
    put(m, beam([sx * x - 0.5, 0.9, 0], [sx * x + 0.5, 3.5, 0], 0.12), 'met_chapa', RUST);
    m.add(box(0.5, 0.5, 0.5), 'met_brasa', '#ffffff', { p: [sx * x, 1.3, 0] });
  }
  for (const y of [H, H + 1.6]) put(m, box(x * 2 + 1, 0.3, 0.5), 'met_chapa', IRON, { p: [0, y, 0] }, 0.15);
  const nb = Math.round((x * 2) / 1.6);
  for (let i = 0; i < nb; i++) {
    const cx = -x + (i + 0.5) * ((x * 2) / nb);
    put(m, beam([cx - 0.7, H, 0], [cx + 0.7, H + 1.6, 0], 0.1), 'met_chapa', RUST);
  }
  // correntes e lâmpadas penduradas
  const lamps = Math.max(2, Math.round(span / 6));
  for (let i = 0; i < lamps; i++) {
    const cx = -x + (i + 0.5) * ((x * 2) / lamps);
    for (let k = 0; k < 4; k++) put(m, xfTorus(0.12, 0.03, [cx, H - 0.2 - k * 0.22, 0], k % 2 ? Math.PI / 2 : 0), 'metal', '#3a3a40');
    put(m, cyl(0.3, 0.22, 0.5, 6), 'metal', IRON, { p: [cx, H - 1.25, 0] });
    m.add(ico(0.25, 1), 'glow_warm', '#ffffff', { p: [cx, H - 1.55, 0] });
  }
  // placa com chevrons incandescentes
  put(m, box(4.6, 1.2, 0.2), 'met_chapa', '#2a2426', { p: [0, H + 0.8, 0.35] });
  for (let k = -2; k <= 2; k++) m.add(box(0.5, 0.12, 0.08), 'met_brasa', '#ffffff', { p: [k * 0.8, H + 0.8, 0.48], r: [0, 0, 0.7] });
  void rand;
  return finMet(m);
}
function xfTorus(r: number, t: number, p: V3, ry: number): Geo {
  return xf(torus(r, t, 4, 8), { p, r: [0, ry, 0] });
}

/** Caldeirão de mineração (vagonete com rocha incandescente). */
export function vagonete(rand: Rand): Model {
  const m = new Model();
  put(m, cbox(2.0, 1.0, 1.3), 'met_chapa', RUST, { p: [0, 0.95, 0] }, 0.25);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(m, cyl(0.3, 0.3, 0.15, 8), 'metal', '#2a2a2e', { p: [sx * 0.7, 0.3, sz * 0.62], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 5; i++) put(m, rockGeo(rr(rand, 0.25, 0.4), rand() * 40, [1, 0.8, 1], 0, 0.3), i % 2 ? 'met_brasa' : 'met_obsidiana', i % 2 ? '#ffffff' : BASALT, { p: [rr(rand, -0.6, 0.6), 1.5, rr(rand, -0.35, 0.35)] }, 0.1);
  for (const sz of [-1, 1]) put(m, box(4, 0.1, 0.12), 'metal', '#3a3438', { p: [0, 0.05, sz * 0.62] });
  return finMet(m);
}

/** Totem de alerta (placa de perigo de lava). */
function placaPerigo(rand: Rand): Model {
  const m = new Model();
  put(m, rod([0, -0.1, 0], [0, 2.2, 0], 0.06, 5), 'met_chapa', IRON);
  const a: V3 = [0, 2.95, 0.08], b: V3 = [-0.78, 1.6, 0.08], c: V3 = [0.78, 1.6, 0.08];
  put(m, rawGeo([...a, ...b, ...c, ...a, ...c, ...b]), 'paint', '#f2b21a', undefined, 0.1);
  put(m, box(0.12, 0.6, 0.06), 'std', '#1a1416', { p: [0, 2.38, 0.14] });
  put(m, box(0.13, 0.13, 0.06), 'std', '#1a1416', { p: [0, 1.95, 0.14] });
  if (rand() < 0.5) put(m, blob(0.25, 0, rand() * 9, 0.3, 2, [1, 0.6, 1]), 'met_basalto', ASH, { p: [0.2, 0.1, 0.2] }, 0.3);
  return finMet(m);
}

/** Engrenagem gigante da forja: suporte de basalto (a roda dentada gira em Z). */
function engrenagemBase(rand: Rand): Model {
  const m = new Model();
  void rand;
  put(m, cbox(3.6, 1.2, 3.0), 'met_basalto', BASALT, { p: [0, 0.6, 0] }, 0.2);
  for (const sx of [-1, 1]) put(m, beam([sx * 1.4, 1.1, 0], [sx * 0.4, 6.2, -0.6], 0.5), 'met_chapa', IRON, undefined, 0.2);
  put(m, cyl(0.5, 0.5, 1.6, 10), 'met_chapa', RUST, { p: [0, 6.2, -0.4], r: [Math.PI / 2, 0, 0] });
  m.add(box(0.8, 0.8, 0.8), 'met_brasa', '#ffffff', { p: [0, 1.3, 1.3] });
  return finMet(m);
}
const ENGRENAGEM_PIVOT: V3 = [0, 6.2, 0.6];
function engrenagemRoda(rand: Rand): Model {
  const m = new Model();
  void rand;
  const R = 3.4, teeth = 14;
  put(m, flat(cyl(R, R, 0.6, 28)), 'met_chapa', IRON, { r: [Math.PI / 2, 0, 0] }, 0.2);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * TAU;
    put(m, box(0.8, 0.9, 0.6), 'met_chapa', IRON, { p: [Math.cos(a) * (R + 0.35), Math.sin(a) * (R + 0.35), 0], r: [0, 0, a] }, 0.2);
  }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; m.add(cyl(0.55, 0.55, 0.7, 8), 'met_brasa', '#ffffff', { p: [Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, 0], r: [Math.PI / 2, 0, 0] }); }
  put(m, flat(cyl(1, 1, 0.9, 10)), 'met_chapa', RUST, { r: [Math.PI / 2, 0, 0] }, 0.2);
  return finMet(m);
}

export const VULCAO_PROPS: PropLibrary = {
  'colunas-basalto': { radius: 2.6, collider: { radius: 1.6, height: 4 }, build: colunasBasalto },
  'rocha-lava': { radius: 2.6, collider: { radius: 1.8, height: 2 }, build: rochaLava },
  'cristal-obsidiana': { radius: 1.4, collider: { radius: 0.7, height: 2 }, build: cristalObsidiana },
  'arvore-queimada': { radius: 1.6, collider: { radius: 0.35, height: 4 }, build: arvoreQueimada },
  fumarola: { radius: 2.2, collider: { radius: 1.4, height: 1.6 }, build: fumarola },
  vulcao: { radius: 70, build: vulcao },
  'cascata-lava': { radius: 9, collider: { radius: 6, height: 10 }, build: cascataLava },
  'grade-ferro': { radius: 0.4, collider: { radius: 0.2, height: 1.4 }, build: grade },
  'portico-forja': { radius: 3, build: porticoForja },
  vagonete: { radius: 2, collider: { radius: 1.2, height: 1.6 }, build: vagonete },
  'placa-perigo': { radius: 0.9, build: placaPerigo },
  'engrenagem-forja': {
    radius: 4, collider: { radius: 2, height: 6 }, build: engrenagemBase,
    animated: { build: engrenagemRoda, pivot: ENGRENAGEM_PIVOT, motion: { kind: 'spin', axis: 'z', period: 8 } },
  },
};
