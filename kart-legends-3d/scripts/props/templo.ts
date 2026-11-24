/** TEMPLO ESMERALDA — ruínas na selva: árvores com sapopemas, pirâmides em degraus, cabeças de pedra e portais. */
import {
  Model, TAU, beam, blob, box, cbox, cyl, dark, finMet, flat, ico, jit, leafBlob, lite, mix, pick, put, rockGeo, rod, rope, rr,
  strip, tone, tube, type Rand, type V3,
} from './kit-meteoro';
import type { PropLibrary } from './types';

const STONE = '#a8a08a';
const MOSS = '#5a8a3a';
const JADE = '#3fbf8a';
const LEAF: [string, string][] = [['#1f6a2a', '#7fd04a'], ['#2a7a3a', '#a8e05a'], ['#1a5f3a', '#6ac88a']];

function cipos(m: Model, rand: Rand, from: V3, n: number, len: number): void {
  for (let i = 0; i < n; i++) {
    const x = from[0] + rr(rand, -1.5, 1.5), z = from[2] + rr(rand, -1.5, 1.5), l = len * rr(rand, 0.5, 1);
    put(m, tube([[x, from[1], z], [x + 0.2, from[1] - l * 0.5, z + 0.1], [x - 0.1, from[1] - l, z]], 0.04, 5, 3), 'aur_bark', '#3a6a2a', undefined, 0.2);
    put(m, blob(0.18, 0, rand() * 9, 0.3, 2, [1, 1.4, 1]), 'leaf', '#3a9a3a', { p: [x - 0.1, from[1] - l, z] }, 0.3);
  }
}

function arvoreSelva(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 13, 19), bark = jit('#7a6a52', rand);
  const [c0, c1] = pick(rand, LEAF);
  put(m, tube([[0, -0.1, 0], [0.2, H * 0.35, 0.1], [-0.2, H * 0.7, 0], [0, H, 0]], (t) => 0.55 - 0.25 * t, 8, 8), 'aur_bark', bark, undefined, 0.35, lite(bark, 0.2));
  // sapopemas (raízes tabulares)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rand() * 0.4, r = rr(rand, 1.4, 2.2);
    put(m, strip([[0, 2.6, 0], [Math.cos(a) * r * 0.5, 0.9, Math.sin(a) * r * 0.5], [Math.cos(a) * r, -0.1, Math.sin(a) * r]], (t) => 0.15 + (1 - t) * 0.05, [0, 1, 0], 0), 'leaf', dark(bark, 0.1));
    put(m, beam([0, 2.2, 0], [Math.cos(a) * r, -0.1, Math.sin(a) * r], 0.18, 0.5), 'aur_bark', bark, undefined, 0.3);
  }
  // galhos e copa em camadas
  const crowns: V3[] = [[0, H, 0], [2.6, H - 1.8, 1.2], [-2.4, H - 1.2, -1.4], [0.6, H - 2.6, -2.6]];
  crowns.forEach((p, i) => {
    if (i > 0) put(m, rod([0, H - 3, 0], p, 0.14, 5, 0.25), 'aur_bark', bark);
    leafBlob(m, rr(rand, 2.6, 3.6), p, mix(c0, c1, 0.3 + i * 0.1), rand() * 40, 1, [1.25, 0.55, 1.25], c1);
  });
  cipos(m, rand, [0, H - 2.2, 0], 6, rr(rand, 4, 7));
  if (rand() < 0.5) for (let i = 0; i < 3; i++) put(m, ico(0.22, 0), 'glossy', pick(rand, ['#ff4a5a', '#ffb02a', '#ff7ac8']), { p: [rr(rand, -2, 2), H - rr(rand, 1, 2.5), rr(rand, -2, 2)] });
  return finMet(m);
}

function folhagem(rand: Rand): Model {
  const m = new Model();
  const [c0, c1] = pick(rand, LEAF);
  const n = 7 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand() * 0.5, L = rr(rand, 1.2, 2.2), up = rr(rand, 0.5, 1.2);
    const pts: V3[] = [[0, 0.05, 0], [Math.cos(a) * L * 0.4, up, Math.sin(a) * L * 0.4], [Math.cos(a) * L, up * 0.8, Math.sin(a) * L], [Math.cos(a) * L * 1.25, up * 0.3, Math.sin(a) * L * 1.25]];
    m.add(tone(strip(pts, (t) => 0.05 + Math.sin(t * Math.PI) * 0.42, [-Math.sin(a), 0, Math.cos(a)], -0.25), mix(c0, c1, 0.3), 0.4, c1), 'leaf');
  }
  if (rand() < 0.4) put(m, ico(0.2, 1), 'glossy', pick(rand, ['#ff3a5a', '#ff9a2a']), { p: [0, 0.9, 0] });
  return finMet(m);
}

/** Pirâmide em degraus com templo no topo e escadaria frontal (+Z). */
function piramide(rand: Rand): Model {
  const m = new Model();
  const steps = 5 + Math.floor(rand() * 2), W0 = rr(rand, 18, 22), h = 2.2;
  const stone = jit(STONE, rand);
  for (let i = 0; i < steps; i++) {
    const w = W0 * (1 - (i / steps) * 0.75);
    const g = cbox(w, h, w, 0.1);
    m.add(tone(g, stone, 0.25), 'met_templo', undefined, { p: [0, h / 2 + i * h, 0] });
    // franja de musgo no topo de cada degrau
    put(m, box(w + 0.1, 0.15, w + 0.1), 'met_templo', mix(stone, MOSS, 0.7), { p: [0, h * (i + 1) - 0.05, 0] }, 0.2);
  }
  const top = steps * h, wt = W0 * 0.25;
  // escadaria
  const sw = W0 * 0.18;
  for (let k = 0; k < steps * 4; k++) {
    const y = (k + 0.5) * (h / 4), z = W0 / 2 - (k * (W0 * 0.375)) / (steps * 4);
    put(m, box(sw, h / 4, 0.9), 'met_templo', lite(stone, 0.08), { p: [0, y, z] }, 0.1);
  }
  for (const sx of [-1, 1]) put(m, beam([sx * (sw / 2 + 0.3), 0, W0 / 2 + 0.3], [sx * (sw / 2 + 0.3), top + 0.2, wt / 2], 0.6, 0.6), 'met_templo', dark(stone, 0.1), undefined, 0.15);
  // santuário
  put(m, cbox(wt * 0.9, 3.4, wt * 0.9), 'met_templo', stone, { p: [0, top + 1.7, 0] }, 0.2);
  put(m, box(1.6, 2.4, 0.4), 'std', '#1a1612', { p: [0, top + 1.2, wt * 0.45] });
  put(m, flat(cyl(wt * 0.2, wt * 0.62, 2.2, 4)), 'met_templo', lite(stone, 0.1), { p: [0, top + 4.5, 0], r: [0, Math.PI / 4, 0] }, 0.2);
  put(m, ico(0.9, 0), 'glossy', JADE, { p: [0, top + 6.1, 0] }, 0.2);
  for (let i = 0; i < 4; i++) cipos(m, rand, [rr(rand, -W0 / 3, W0 / 3), rr(rand, h * 2, top), rr(rand, -W0 / 3, W0 / 3)], 2, 3);
  for (let i = 0; i < 6; i++) leafBlob(m, rr(rand, 1.2, 2), [rr(rand, -W0 / 2, W0 / 2), rr(rand, 1, top * 0.7), rr(rand, -W0 / 2, -W0 / 4)], '#2a7a3a', rand() * 40, 1, [1.3, 0.6, 1.3]);
  return finMet(m);
}

/** Cabeça colossal de pedra (estilo original: olhos de jade, coroa de penas de pedra). */
function cabecaPedra(rand: Rand): Model {
  const m = new Model();
  const stone = jit('#9a947e', rand), s = rr(rand, 0.9, 1.15);
  put(m, rockGeo(1.6 * s, rand() * 40, [1.4, 0.5, 1.3], 1, 0.2), 'met_templo', dark(stone, 0.2), { p: [0, 0.3, 0] }, 0.3);
  const head = box(3.2 * s, 3.8 * s, 2.8 * s, 0.6 * s, 3);
  m.add(tone(head, stone, 0.3, lite(stone, 0.15)), 'met_templo', undefined, { p: [0, 2.4 * s, 0] });
  put(m, box(0.8 * s, 1.3 * s, 0.6 * s, 0.2, 2), 'met_templo', stone, { p: [0, 2.4 * s, 1.5 * s] }, 0.2); // nariz
  for (const sx of [-1, 1]) {
    put(m, box(0.9 * s, 0.35 * s, 0.2), 'std', '#2a2622', { p: [sx * 0.8 * s, 3.1 * s, 1.42 * s] });
    put(m, ico(0.22 * s, 1), 'glossy', JADE, { p: [sx * 0.8 * s, 3.1 * s, 1.5 * s] });
    put(m, box(0.5 * s, 1.6 * s, 0.9 * s, 0.15, 2), 'met_templo', dark(stone, 0.1), { p: [sx * 1.75 * s, 2.5 * s, 0] }, 0.2); // orelhas
    put(m, rod([0, 0, 0], [0, 0.4 * s, 0], 0.28 * s, 8), 'glossy', JADE, { p: [sx * 1.75 * s, 1.6 * s, 0.2] });
  }
  put(m, box(1.6 * s, 0.3 * s, 0.25), 'std', '#2a2622', { p: [0, 1.4 * s, 1.42 * s] }); // boca
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.62 * s;
    put(m, beam([x, 4.2 * s, 0], [x * 1.25, 5.6 * s - Math.abs(i - 2) * 0.35, -0.4], 0.5 * s, 0.25), 'met_templo', i % 2 ? lite(stone, 0.1) : stone, undefined, 0.2);
  }
  for (let i = 0; i < 5; i++) put(m, blob(rr(rand, 0.4, 0.8), 0, rand() * 9, 0.3, 1.5, [1.3, 0.4, 1.3]), 'aur_foliage', MOSS, { p: [rr(rand, -1.4, 1.4) * s, 4.3 * s, rr(rand, -1, 1) * s] }, 0.3);
  cipos(m, rand, [0, 4.2 * s, -0.4], 4, 2.6);
  return finMet(m);
}

function colunaQuebrada(rand: Rand): Model {
  const m = new Model();
  const stone = jit(STONE, rand), H = rr(rand, 2.5, 5.5);
  put(m, cbox(1.8, 0.6, 1.8), 'met_templo', dark(stone, 0.1), { p: [0, 0.3, 0] }, 0.2);
  const drums = Math.ceil(H / 1.1);
  for (let i = 0; i < drums; i++) {
    const g = flat(cyl(0.62, 0.66, 1.05, 10));
    put(m, g, 'met_templo', jit(stone, rand), { p: [rr(rand, -0.05, 0.05), 0.6 + 0.55 + i * 1.08, 0], r: [0, rand(), rr(rand, -0.04, 0.04)] }, 0.2);
  }
  if (rand() < 0.6) put(m, flat(cyl(0.62, 0.62, 1.0, 10)), 'met_templo', stone, { p: [1.4, 0.45, 0.6], r: [Math.PI / 2, 0.6, 0] }, 0.2);
  put(m, blob(0.6, 0, rand() * 9, 0.3, 1.5, [1.3, 0.4, 1.3]), 'aur_foliage', MOSS, { p: [0, 0.6 + drums * 1.08, 0] }, 0.3);
  cipos(m, rand, [0, 0.4 + drums * 1.08, 0.3], 2, 2);
  return finMet(m);
}

/** Portal do templo sobre a pista: pilares com serpentes de pedra e lintel com glifos de jade. */
function portalTemplo(rand: Rand, span = 18): Model {
  const m = new Model();
  const x = span / 2 + 2.3, H = 7.6, stone = jit(STONE, rand);
  for (const sx of [-1, 1]) {
    put(m, cbox(2.6, H, 2.6), 'met_templo', stone, { p: [sx * x, H / 2, 0] }, 0.25);
    put(m, cbox(3.2, 0.8, 3.2), 'met_templo', dark(stone, 0.1), { p: [sx * x, 0.4, 0] }, 0.2);
    // serpente enrolada no pilar
    const pts: V3[] = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, a = t * TAU * 1.6 + (sx > 0 ? 0 : Math.PI); pts.push([sx * x + Math.cos(a) * 1.55, 0.8 + t * (H - 1.6), Math.sin(a) * 1.55]); }
    put(m, tube(pts, (t) => 0.22 + 0.08 * t, 48, 6), 'met_templo', mix(stone, JADE, 0.35), undefined, 0.2);
    const head = pts[pts.length - 1]!;
    put(m, box(0.8, 0.6, 1.1, 0.2, 2), 'met_templo', mix(stone, JADE, 0.35), { p: [head[0], head[1] + 0.2, head[2] + 0.5] }, 0.2);
    put(m, ico(0.12, 0), 'glow_green', '#ffffff', { p: [head[0] + 0.25, head[1] + 0.4, head[2] + 0.95] });
    put(m, ico(0.12, 0), 'glow_green', '#ffffff', { p: [head[0] - 0.25, head[1] + 0.4, head[2] + 0.95] });
  }
  // lintel em degraus
  put(m, cbox(x * 2 + 3, 1.4, 3), 'met_templo', stone, { p: [0, H + 0.7, 0] }, 0.2);
  put(m, cbox(x * 2 + 1.2, 1.0, 2.4), 'met_templo', lite(stone, 0.08), { p: [0, H + 1.9, 0] }, 0.2);
  put(m, cbox(x * 1.2, 1.0, 1.8), 'met_templo', stone, { p: [0, H + 2.9, 0] }, 0.2);
  const glyphs = Math.max(3, Math.round(span / 4));
  for (let i = 0; i < glyphs; i++) {
    const gx = -x + 1 + (i + 0.5) * ((x * 2 - 2) / glyphs);
    put(m, box(1.0, 0.9, 0.12, 0.1, 1), 'glossy', JADE, { p: [gx, H + 0.7, 1.52] }, 0.2);
    put(m, box(0.5, 0.4, 0.06), 'std', dark(stone, 0.35), { p: [gx, H + 0.7, 1.6] });
  }
  put(m, ico(0.8, 0), 'glossy', JADE, { p: [0, H + 3.9, 0] }, 0.2);
  for (let i = 0; i < 6; i++) leafBlob(m, rr(rand, 0.7, 1.2), [rr(rand, -x, x), H + rr(rand, 1.4, 3), rr(rand, -1.2, 1.2)], MOSS, rand() * 40, 1, [1.4, 0.5, 1.2]);
  cipos(m, rand, [0, H, 1.4], 7, 1.4);
  return finMet(m);
}

/** Braseiro de pedra com chama (beira de pista). */
function braseiroTemplo(rand: Rand): Model {
  const m = new Model();
  const stone = jit(STONE, rand);
  put(m, flat(cyl(0.5, 0.65, 1.2, 8)), 'met_templo', stone, { p: [0, 0.6, 0] }, 0.2);
  put(m, flat(cyl(0.75, 0.45, 0.45, 8)), 'met_templo', lite(stone, 0.1), { p: [0, 1.42, 0] }, 0.2);
  m.add(flat(cyl(0.01, 0.42, 0.9, 7)), 'met_brasa', '#ffffff', { p: [0, 2.0, 0] });
  m.add(flat(cyl(0.01, 0.25, 0.6, 5)), 'glow_warm', '#ffffff', { p: [0.15, 2.0, 0.1] });
  return finMet(m);
}

/** Poste de ponte de cordas (ao longo de Z). */
function postePonteCorda(rand: Rand): Model {
  const m = new Model();
  const wood = jit('#7a5a3a', rand), zs = [-2.85, 0, 2.85];
  zs.forEach((z) => {
    put(m, flat(cyl(0.12, 0.16, 1.7, 6)), 'aur_bark', wood, { p: [0, 0.8, z] }, 0.3, lite(wood, 0.2));
    put(m, flat(cyl(0.18, 0.01, 0.3, 6)), 'aur_bark', dark(wood, 0.1), { p: [0, 1.8, z] });
  });
  for (let i = 0; i < 2; i++) {
    put(m, rope([0, 1.5, zs[i]!], [0, 1.5, zs[i + 1]!], 0.3, 0.04, 6, 4), 'aur_hay', '#c8b078');
    put(m, rope([0, 0.7, zs[i]!], [0, 0.7, zs[i + 1]!], 0.15, 0.03, 6, 4), 'aur_hay', '#c8b078');
  }
  if (rand() < 0.5) put(m, blob(0.3, 0, rand() * 9, 0.3, 2, [1, 1.3, 1]), 'leaf', '#3a9a3a', { p: [0.1, 1.2, 1.4] }, 0.3);
  return finMet(m);
}

function pedraMusgoTemplo(rand: Rand): Model {
  const m = new Model();
  const n = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const r = rr(rand, 0.6, 1.4), a = rand() * TAU, d = i === 0 ? 0 : rr(rand, 0.8, 1.6);
    const g = rand() < 0.5 ? cbox(r * 1.6, r, r * 1.2, 0.1) : rockGeo(r, rand() * 40, [1.2, 0.7, 1], 1, 0.25);
    m.add(tone(g, jit(STONE, rand), 0.3), 'met_templo', undefined, { p: [Math.cos(a) * d, r * 0.45, Math.sin(a) * d], r: [rr(rand, -0.2, 0.2), rand() * TAU, rr(rand, -0.2, 0.2)] });
    put(m, blob(r * 0.6, 0, rand() * 9, 0.3, 1.5, [1.3, 0.35, 1.3]), 'aur_foliage', MOSS, { p: [Math.cos(a) * d, r * 0.9, Math.sin(a) * d] }, 0.3);
  }
  return finMet(m);
}

export const TEMPLO_PROPS: PropLibrary = {
  'arvore-selva': { radius: 3.2, collider: { radius: 0.9, height: 10 }, build: arvoreSelva },
  folhagem: { radius: 1.6, build: folhagem },
  'piramide-degraus': { radius: 12, collider: { radius: 10, height: 12 }, build: piramide },
  'cabeca-pedra': { radius: 2.8, collider: { radius: 2, height: 5 }, build: cabecaPedra },
  'coluna-quebrada': { radius: 1.5, collider: { radius: 0.8, height: 4 }, build: colunaQuebrada },
  'portal-templo': { radius: 4, build: portalTemplo },
  'braseiro-templo': { radius: 0.9, collider: { radius: 0.6, height: 1.6 }, build: braseiroTemplo },
  'poste-ponte-corda': { radius: 0.4, collider: { radius: 0.2, height: 1.6 }, build: postePonteCorda },
  'pedra-musgo-templo': { radius: 2.2, collider: { radius: 1.2, height: 1.4 }, build: pedraMusgoTemplo },
};
