/** RECIFE DE CORAL — ilha tropical: palmeiras, cabanas de palha, corais, passarelas e farol listrado. */
import { torus } from '../lib/geo';
import {
  Model, TAU, beam, blob, box, cbox, cyl, dark, finMet, flat, ico, jit, lathe, lite, mix, paint, pick, put, rawGeo, rockGeo, rod, rope, rr,
  strip, tone, tube, xf, type ColorLike, type Geo, type Rand, type V3,
} from './kit-meteoro';
import type { PropLibrary } from './types';

const WOOD = '#a8774a';
const PALM_GREENS: [string, string][] = [['#2f8f3a', '#9fe05a'], ['#3a9a4a', '#c8e86a'], ['#25864a', '#7fd87a']];
const CORALS = ['#ff6f7a', '#ff9a4a', '#c86ae0', '#ffd24a', '#5ad8c8', '#ff7ab8'];

/** Fronde de palmeira: nervura curva com folíolos em V. Base em `base`, aponta para o ângulo `a`. */
function frond(m: Model, base: V3, a: number, len: number, droop: number, c0: ColorLike, c1: ColorLike): void {
  const pts: V3[] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const r = len * t, y = Math.sin(t * Math.PI * 0.75) * len * 0.22 - droop * t * t * len;
    pts.push([base[0] + Math.cos(a) * r, base[1] + y, base[2] + Math.sin(a) * r]);
  }
  const side: V3 = [-Math.sin(a), 0, Math.cos(a)];
  m.add(tone(strip(pts, (t) => (0.12 + Math.sin(t * Math.PI) * 0.78) * (1 - t * 0.35), side, -0.35), mix(c0, c1, 0.35), 0.4, c1), 'leaf');
}

function palmeira(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 7, 10.5), lean = rr(rand, 0.8, 2.4), dir = rand() * TAU;
  const bark = jit('#8a6a48', rand);
  const [c0, c1] = pick(rand, PALM_GREENS);
  const ax = (t: number): V3 => [Math.cos(dir) * lean * t * t, t * H, Math.sin(dir) * lean * t * t];
  // tronco em anéis (gomos)
  const rings = 9;
  for (let i = 0; i < rings; i++) {
    const t0 = i / rings, t1 = (i + 1) / rings;
    const r0 = 0.32 - 0.12 * t0, r1 = 0.32 - 0.12 * t1;
    put(m, rod(ax(t0), ax(t1 + 0.01), r1 * 0.92, 7, r0), 'aur_bark', i % 2 ? bark : lite(bark, 0.12), undefined, 0.2);
  }
  const top = ax(1);
  put(m, blob(0.42, 0, rand() * 9, 0.15, 1.2, [1, 0.8, 1]), 'aur_bark', dark(bark, 0.2), { p: [top[0], top[1] - 0.1, top[2]] }, 0.2);
  const n = 8;
  for (let i = 0; i < n; i++) frond(m, top, (i / n) * TAU + rand() * 0.4, rr(rand, 3.0, 4.0), rr(rand, 0.35, 0.6), c0, c1);
  for (let i = 0; i < 4; i++) {
    const a = rand() * TAU;
    put(m, ico(0.2, 0), 'glossy', '#6a4a22', { p: [top[0] + Math.cos(a) * 0.32, top[1] - 0.35, top[2] + Math.sin(a) * 0.32] }, 0.2);
  }
  return finMet(m);
}

/** Cabana de palha sobre palafitas (bar de praia). */
function cabana(rand: Rand): Model {
  const m = new Model();
  const W = rr(rand, 4.2, 5.2), D = rr(rand, 3.6, 4.4), hp = 0.9, hw = 2.3;
  const wood = jit(WOOD, rand);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    put(m, flat(cyl(0.13, 0.16, hp + hw + 0.4, 6)), 'aur_bark', wood, { p: [sx * W / 2, (hp + hw + 0.4) / 2, sz * D / 2] }, 0.3);
  }
  put(m, box(W + 0.6, 0.18, D + 0.6), 'aur_wood', lite(wood, 0.1), { p: [0, hp, 0] }, 0.2);
  // balcão com bancos e meia parede de bambu
  put(m, box(W * 0.8, 1.0, 0.4), 'aur_wood', dark(wood, 0.1), { p: [0, hp + 0.5, D / 2 - 0.1] }, 0.2);
  put(m, box(W * 0.84, 0.08, 0.6), 'aur_wood', lite(wood, 0.2), { p: [0, hp + 1.05, D / 2] }, 0.1);
  for (let i = 0; i < 3; i++) put(m, cyl(0.2, 0.18, 0.08, 8), 'glossy', pick(rand, ['#ff6a3a', '#2ac0c8', '#ffd04a']), { p: [-W * 0.3 + i * W * 0.3, hp + 0.7, D / 2 + 0.7] });
  for (let i = 0; i < 3; i++) put(m, cyl(0.04, 0.04, 0.7, 4), 'metal', '#c9c9c9', { p: [-W * 0.3 + i * W * 0.3, hp + 0.35, D / 2 + 0.7] });
  for (let k = 0; k < 9; k++) put(m, cyl(0.06, 0.06, 1.0, 5), 'aur_bark', '#c9a860', { p: [-W / 2 + 0.2, hp + 0.5, -D / 2 + 0.3 + k * (D - 0.6) / 8] }, 0.2);
  // telhado de palha em pirâmide com franja
  const roof = flat(lathe([[W * 0.78, 0], [W * 0.45, 0.7], [0.01, 2.2]], 4));
  roof.rotateY(Math.PI / 4);
  roof.scale(1, 1, D / W);
  put(m, roof, 'met_palha', '#d9b26a', { p: [0, hp + hw, 0] }, 0.3);
  // escada e tochas
  for (let k = 0; k < 3; k++) put(m, box(1.0, 0.1, 0.3), 'aur_wood', wood, { p: [W / 2 + 0.6, 0.25 + k * 0.28, -0.6 + k * 0.3] });
  for (const sx of [-1, 1]) {
    put(m, rod([sx * (W / 2 + 0.4), 0, D / 2 + 0.6], [sx * (W / 2 + 0.4), 2.2, D / 2 + 0.6], 0.06, 5), 'aur_bark', '#6a4a2a');
    m.add(cone(0.16, 0.36), 'met_brasa', '#ffffff', { p: [sx * (W / 2 + 0.4), 2.4, D / 2 + 0.6] });
  }
  // placa
  put(m, box(1.6, 0.5, 0.08), 'aur_wood', '#3fb8c0', { p: [0, hp + hw - 0.2, D / 2 + 0.45] }, 0.1);
  return finMet(m);
}

function cone(r: number, h: number): Geo { return flat(cyl(0.01, r, h, 6)); }

function guardaSol(rand: Rand): Model {
  const m = new Model();
  const c1 = pick(rand, ['#ff5a4a', '#2a9ae0', '#ffcc3a', '#2ac08a']), c2 = '#fff6e6';
  put(m, rod([0, -0.2, 0], [0.2, 2.6, 0], 0.04, 5), 'metal', '#e8e8e8');
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, R = 1.6;
    const p0: V3 = [0.2, 2.75, 0];
    const pa: V3 = [0.2 + Math.cos(a0) * R, 2.25, Math.sin(a0) * R], pb: V3 = [0.2 + Math.cos(a1) * R, 2.25, Math.sin(a1) * R];
    m.add(tone(rawGeo([...p0, ...pa, ...pb, ...p0, ...pb, ...pa]), i % 2 ? c1 : c2, 0.12), 'aur_cloth');
  }
  // espreguiçadeira e toalha
  const s = rand() < 0.5 ? 1 : -1;
  put(m, beam([s * 1.2, 0.35, -0.9], [s * 1.2, 0.35, 0.6], 0.6, 0.08), 'aur_wood', '#f0f0f0', undefined, 0.1);
  put(m, beam([s * 1.2, 0.35, 0.6], [s * 1.2, 0.9, 1.1], 0.6, 0.08), 'aur_wood', '#f0f0f0', undefined, 0.1);
  put(m, box(0.9, 0.02, 1.7), 'aur_cloth', pick(rand, ['#ff7ab8', '#3fd0e0', '#ffd24a']), { p: [-s * 1.1, 0.02, 0.2] }, 0.1);
  put(m, ico(0.22, 1), 'glossy', '#ffffff', { p: [-s * 0.6, 0.22, 1.2] }, 0.05);
  return finMet(m);
}

/** Ramo de coral: galhos tubulares que se bifurcam. */
function coralGalho(m: Model, rand: Rand, base: V3, h: number, c: ColorLike): void {
  const grow = (p: V3, dir: V3, len: number, r: number, depth: number): void => {
    const q: V3 = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
    put(m, rod(p, q, r * 0.7, 5, r), 'met_coral', c, undefined, 0.25, lite(c, 0.35));
    if (depth <= 0) { put(m, ico(r * 0.9, 0), 'met_coral', lite(c, 0.3), { p: q }); return; }
    for (let k = 0; k < 2; k++) {
      const a = rand() * TAU, sp = rr(rand, 0.35, 0.7);
      const nd: V3 = [dir[0] * 0.6 + Math.cos(a) * sp, Math.max(0.4, dir[1] * 0.8), dir[2] * 0.6 + Math.sin(a) * sp];
      const l = Math.hypot(...nd);
      grow(q, [nd[0] / l, nd[1] / l, nd[2] / l], len * 0.72, r * 0.7, depth - 1);
    }
  };
  grow(base, [0, 1, 0], h * 0.4, 0.16 * h, 2);
}

/** Leque de coral: placa ondulada com furos simulados por cor. */
function coralLeque(m: Model, rand: Rand, base: V3, h: number, c: ColorLike): void {
  const R = h, pts: V3[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (0.15 + 0.7 * (i / 8));
    pts.push([base[0] + Math.cos(a) * R * 0.9, base[1] + Math.sin(a) * R, base[2] + Math.sin(i * 1.7) * 0.12]);
  }
  const pos: number[] = [];
  for (let i = 0; i < 8; i++) pos.push(...base, ...pts[i]!, ...pts[i + 1]!);
  for (let i = 0; i < 8; i++) pos.push(...base, ...pts[i + 1]!, ...pts[i]!);
  const g = rawGeo(pos);
  m.add(paint(g, (p) => mix(dark(c, 0.3), lite(c, 0.3), (p.y - base[1]) / R)), 'leaf');
  void rand;
}

function coral(rand: Rand): Model {
  const m = new Model();
  put(m, rockGeo(rr(rand, 0.9, 1.3), rand() * 40, [1.3, 0.5, 1.1], 1, 0.3), 'aur_rock', '#d8c8a8', { p: [0, 0.1, 0] }, 0.3);
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = rand() * TAU, d = rr(rand, 0.2, 1.1), c = pick(rand, CORALS);
    const base: V3 = [Math.cos(a) * d, 0.35, Math.sin(a) * d];
    if (rand() < 0.6) coralGalho(m, rand, base, rr(rand, 1.0, 1.9), c);
    else coralLeque(m, rand, base, rr(rand, 0.9, 1.5), c);
  }
  for (let i = 0; i < 3; i++) put(m, blob(rr(rand, 0.25, 0.4), 0, rand() * 9, 0.3, 2, [1, 0.6, 1]), 'met_coral', pick(rand, CORALS), { p: [rr(rand, -1, 1), 0.3, rr(rand, -1, 1)] }, 0.3);
  return finMet(m);
}

/** Arco de coral e rocha que passa sobre a pista. */
function arcoCoral(rand: Rand, span = 20): Model {
  const m = new Model();
  const hw = span / 2 + 1.2, H = 7.8;
  const rock = '#cdb894';
  // pilares de rocha calcária empilhada
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const r = rr(rand, 1.5, 1.9) - k * 0.12;
      put(m, rockGeo(r, rand() * 50, [1, 0.75, 1], 1, 0.25), 'aur_rock', jit(rock, rand), { p: [sx * (hw + 1.6) + rr(rand, -0.2, 0.2), 0.8 + k * 1.9, rr(rand, -0.4, 0.4)] }, 0.3);
    }
  }
  // arco: blocos ao longo de uma semicurva
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = Math.PI * (1 - t);
    const x = Math.cos(a) * (hw + 1.4), y = H + Math.sin(a) * 2.6;
    put(m, rockGeo(rr(rand, 1.2, 1.6), rand() * 50, [1.1, 0.8, 1.2], 1, 0.25), 'aur_rock', jit(rock, rand), { p: [x, y, rr(rand, -0.3, 0.3)] }, 0.3);
  }
  // corais e algas penduradas
  for (let i = 0; i < 9; i++) {
    const t = rand(), a = Math.PI * (1 - t), x = Math.cos(a) * (hw + 0.6), y = H + Math.sin(a) * 2.6 + 1.0;
    const c = pick(rand, CORALS);
    if (rand() < 0.5) coralGalho(m, rand, [x, y, rr(rand, -0.6, 0.6)], rr(rand, 0.9, 1.4), c);
    else put(m, blob(rr(rand, 0.35, 0.6), 0, rand() * 9, 0.3, 2, [1, 0.6, 1]), 'met_coral', c, { p: [x, y - 0.2, rr(rand, -0.8, 0.8)] }, 0.3);
  }
  for (let i = 0; i < 8; i++) {
    const x = rr(rand, -hw * 0.7, hw * 0.7), y0 = H + 1.6 * Math.sqrt(Math.max(0, 1 - (x / hw) ** 2)) - 0.4;
    put(m, tube([[x, y0, 0.9], [x + 0.15, y0 - 0.6, 1.0], [x - 0.1, y0 - 1.2, 1.0]], 0.05, 4, 4), 'leaf', '#3aa060');
  }
  // estrela-do-mar de destaque
  const star = new Model();
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + Math.PI / 2; put(star, flat(cyl(0.05, 0.28, 1.1, 4)), 'met_coral', '#ff7a3a', { p: [Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0], r: [0, 0, a - Math.PI / 2] }, 0.2); }
  m.addModel(star, { p: [0, H + 2.9, 1.3] });
  return finMet(m);
}

/** Poste de passarela com corda (beira de ponte de madeira); posts ao longo de Z. */
function passarelaPoste(rand: Rand): Model {
  const m = new Model();
  const wood = jit('#9a6a40', rand);
  const zs = [-2.85, 0, 2.85];
  zs.forEach((z) => {
    put(m, flat(cyl(0.12, 0.15, 1.5, 6)), 'aur_bark', wood, { p: [0, 0.7, z] }, 0.3, lite(wood, 0.2));
    put(m, xf(torus(0.15, 0.035, 4, 7), { r: [Math.PI / 2, 0, 0], p: [0, 1.15, z] }), 'aur_hay', '#e0c890');
  });
  for (let i = 0; i < 2; i++) put(m, rope([0, 1.15, zs[i]!], [0, 1.15, zs[i + 1]!], 0.2, 0.04, 6, 4), 'aur_hay', '#e0c890');
  if (rand() < 0.35) put(m, xf(torus(0.32, 0.09, 6, 12), { p: [0.18, 0.9, 1.4], r: [0, Math.PI / 2, 0] }), 'glossy', '#ff5a3a');
  return finMet(m);
}

function farolBase(rand: Rand): Model {
  const m = new Model();
  void rand;
  put(m, rockGeo(4.2, 11, [1.2, 0.5, 1.1], 1, 0.25), 'aur_rock', '#b8a888', { p: [0, 0.6, 0] }, 0.3);
  const H = 16, n = 6;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    put(m, cyl(2.0 - 0.7 * t1, 2.0 - 0.7 * t0, H / n, 16), 'aur_plaster', i % 2 ? '#e8463a' : '#fbf6ee', { p: [0, 1.6 + (t0 + t1) / 2 * H, 0] }, 0.12);
  }
  put(m, cyl(1.9, 1.9, 0.3, 16), 'metal', '#2a2a32', { p: [0, H + 1.8, 0] });
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; put(m, rod([Math.cos(a) * 1.75, H + 1.9, Math.sin(a) * 1.75], [Math.cos(a) * 1.75, H + 2.6, Math.sin(a) * 1.75], 0.03, 3), 'metal', '#2a2a32'); }
  put(m, xf(torus(1.75, 0.04, 3, 20), { r: [Math.PI / 2, 0, 0], p: [0, H + 2.6, 0] }), 'metal', '#2a2a32');
  put(m, cyl(1.0, 1.0, 1.8, 12, true), 'glass', '#dff6ff', { p: [0, H + 2.85, 0] });
  put(m, flat(lathe([[1.25, 0], [0.01, 1.3]], 10)), 'metal', '#c83a30', { p: [0, H + 3.75, 0] }, 0.15);
  for (let i = 0; i < 5; i++) put(m, box(0.5, 0.9, 0.1), 'aur_wood', '#3a6ab8', { p: [Math.cos(i) * 2.05, 4 + i * 2.6, Math.sin(i) * 2.05], r: [0, -i + Math.PI / 2, 0] });
  return finMet(m);
}
const FAROL_PIVOT: V3 = [0, 18.85, 0];
function farolLuz(): Model {
  const m = new Model();
  m.add(cyl(0.45, 0.45, 0.9, 10), 'glow_warm', '#ffffff');
  m.add(xf(flat(cyl(0.6, 0.05, 6, 8, true)), { r: [0, 0, Math.PI / 2], p: [3, 0, 0] }), 'glow_warm', '#fff6d0');
  return m;
}

function tochaTiki(rand: Rand): Model {
  const m = new Model();
  const h = rr(rand, 2.2, 2.6);
  put(m, rod([0, -0.1, 0], [0, h, 0], 0.07, 5, 0.09), 'aur_bark', '#7a5a3a');
  for (let k = 0; k < 3; k++) put(m, xf(torus(0.1, 0.025, 3, 6), { r: [Math.PI / 2, 0, 0], p: [0, h * (0.3 + k * 0.2), 0] }), 'aur_hay', '#d9c08a');
  put(m, cyl(0.16, 0.12, 0.4, 7), 'met_palha', '#c9a060', { p: [0, h + 0.15, 0] });
  m.add(flat(cyl(0.01, 0.15, 0.5, 6)), 'met_brasa', '#ffffff', { p: [0, h + 0.55, 0] });
  return finMet(m);
}

function rochaPraia(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 1.4, 2.4);
  put(m, rockGeo(R, rand() * 40, [1.2, 0.6, 1], 1, 0.3), 'aur_rock', jit('#a89a80', rand), { p: [0, R * 0.35, 0] }, 0.35, '#d8cfb8');
  put(m, rockGeo(R * 0.55, rand() * 40, [1.1, 0.7, 1], 1, 0.3), 'aur_rock', jit('#958a72', rand), { p: [R * 0.9, R * 0.2, R * 0.3] }, 0.35);
  for (let i = 0; i < 5; i++) { const a = rand() * TAU; put(m, flat(cyl(0.06, 0.1, 0.12, 5)), 'std', '#e8e0d0', { p: [Math.cos(a) * R * 0.7, R * 0.55, Math.sin(a) * R * 0.6] }); }
  if (rand() < 0.5) put(m, blob(0.3, 0, rand() * 9, 0.2, 1.4, [1, 0.5, 1]), 'leaf', '#3a8a4a', { p: [0, R * 0.75, 0] });
  return finMet(m);
}

function torreSalvaVidas(rand: Rand): Model {
  const m = new Model();
  void rand;
  const H = 3.2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(m, beam([sx * 1.1, 0, sz * 1.1], [sx * 0.8, H, sz * 0.8], 0.14), 'aur_wood', '#f6f2ea');
  put(m, box(2.2, 0.15, 2.2), 'aur_wood', '#f6f2ea', { p: [0, H, 0] });
  put(m, cbox(2.0, 1.6, 2.0), 'aur_plaster', '#e8463a', { p: [0, H + 0.9, 0] }, 0.1);
  put(m, box(1.4, 0.6, 0.05), 'glass', '#cfe9ff', { p: [0, H + 1.1, 1.01] });
  put(m, flat(lathe([[1.7, 0], [0.01, 0.8]], 4)), 'aur_wood', '#f6f2ea', { p: [0, H + 1.7, 0], r: [0, Math.PI / 4, 0] });
  for (let k = 0; k < 6; k++) put(m, box(0.9, 0.08, 0.25), 'aur_wood', '#d8d0c0', { p: [0, 0.3 + k * 0.5, 1.6 + k * 0.05], r: [0.3, 0, 0] });
  put(m, rod([0.9, H + 1.7, 0.9], [0.9, H + 4, 0.9], 0.04, 4), 'metal', '#c9c9c9');
  put(m, box(0.04, 0.6, 0.9), 'aur_cloth', '#ffd24a', { p: [0.92, H + 3.6, 1.35] });
  put(m, xf(torus(0.35, 0.1, 6, 12), { p: [0, H + 0.6, 1.1] }), 'glossy', '#ff7a3a');
  return finMet(m);
}

function canoa(rand: Rand): Model {
  const m = new Model();
  const L = rr(rand, 4, 5.4), c = pick(rand, ['#e8463a', '#2a9ae0', '#f2b23a']);
  const hull = flat(lathe([[0.01, 0], [0.42, 0.12], [0.5, 0.45], [0.46, 0.55]], 10));
  hull.scale(1, 1, L / 1);
  put(m, hull, 'aur_wood', c, { p: [0, 0, 0] }, 0.25);
  put(m, box(0.8, 0.06, 0.25), 'aur_wood', '#d8c8a0', { p: [0, 0.45, 0.6] });
  put(m, beam([0.2, 0.5, -0.4], [1.6, 0.05, 0.9], 0.06), 'aur_wood', '#8a6a48');
  return finMet(m);
}

export const RECIFE_PROPS: PropLibrary = {
  palmeira: { radius: 1.6, collider: { radius: 0.45, height: 6 }, build: palmeira },
  'cabana-praia': { radius: 3.8, collider: { radius: 2.8, height: 4 }, build: cabana },
  'guarda-sol': { radius: 1.9, build: guardaSol },
  coral: { radius: 1.7, build: coral },
  'arco-coral': { radius: 4, build: arcoCoral },
  'passarela-poste': { radius: 0.4, collider: { radius: 0.2, height: 1.4 }, build: passarelaPoste },
  'farol-listrado': {
    radius: 5, collider: { radius: 2.4, height: 20 }, build: farolBase,
    animated: { build: farolLuz, pivot: FAROL_PIVOT, motion: { kind: 'spin', axis: 'y', period: 6 } },
  },
  'tocha-tiki': { radius: 0.5, build: tochaTiki },
  'rocha-praia': { radius: 2.6, collider: { radius: 1.6, height: 1.6 }, build: rochaPraia },
  'torre-salva-vidas': { radius: 2.2, collider: { radius: 1.4, height: 5 }, build: torreSalvaVidas },
  canoa: { radius: 2.4, build: canoa },
};
