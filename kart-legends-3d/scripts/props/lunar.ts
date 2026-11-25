/** ESTAÇÃO LUNAR — cúpulas, módulos, antenas, painéis solares, foguete, tubos pressurizados e um planeta no céu. */
import { torus } from '../lib/geo';
import {
  Model, TAU, THREE, beam, blob, box, cbox, cyl, dark, finMet, flat, ico, jit, lathe, lite, mix, paint, pick, put, rockGeo, rod, rr,
  tube, xf, type Rand, type V3,
} from './kit-meteoro';
import type { PropLibrary } from './types';

const HULL = '#e8ecf2';
const TRIM = '#3a4660';
const ACCENTS = ['#ff7a2a', '#2ab8e0', '#ffd23a', '#e8463a'];
const REGOLITH = '#9a9aa2';

/** Cúpula habitacional: base em anel, domo de vidro com nervuras e porta pressurizada. */
function cupula(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 4.5, 6.5), acc = pick(rand, ACCENTS);
  put(m, cyl(R + 0.4, R + 0.6, 1.4, 24), 'met_painel', HULL, { p: [0, 0.7, 0] }, 0.15);
  m.add(xf(torus(R + 0.45, 0.12, 4, 32), { r: [Math.PI / 2, 0, 0], p: [0, 1.0, 0] }), 'glow_cyan', '#ffffff');
  const dome = lathe(Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * (Math.PI / 2); return [Math.max(0.01, Math.cos(a) * R), Math.sin(a) * R * 0.85] as [number, number]; }), 24);
  m.add(dome, 'met_vidro', '#ffffff', { p: [0, 1.4, 0] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, pts: V3[] = [];
    for (let k = 0; k <= 8; k++) { const t = (k / 8) * (Math.PI / 2); pts.push([Math.cos(a) * Math.cos(t) * (R + 0.05), 1.4 + Math.sin(t) * R * 0.85 + 0.02, Math.sin(a) * Math.cos(t) * (R + 0.05)]); }
    put(m, tube(pts, 0.08, 10, 4), 'metal', '#c8ccd8');
  }
  // jardim interno (árvores esféricas) e luz
  for (let i = 0; i < 3; i++) put(m, ico(rr(rand, 0.8, 1.4), 1), 'aur_foliage', pick(rand, ['#3ab85a', '#6ad06a']), { p: [rr(rand, -R / 2, R / 2), 2.2, rr(rand, -R / 2, R / 2)] }, 0.3);
  m.add(ico(0.4, 1), 'glow_white', '#ffffff', { p: [0, 1.4 + R * 0.85 - 0.5, 0] });
  // porta com faixa colorida
  put(m, cbox(2.2, 2.4, 2.4), 'met_painel', HULL, { p: [0, 1.2, R + 0.6] }, 0.15);
  put(m, box(1.4, 1.9, 0.1), 'paint', TRIM, { p: [0, 1.15, R + 1.82] });
  put(m, box(2.3, 0.25, 2.5), 'paint', acc, { p: [0, 2.3, R + 0.6] });
  m.add(box(0.8, 0.12, 0.06), 'glow_green', '#ffffff', { p: [0, 2.0, R + 1.86] });
  return finMet(m);
}

/** Módulo cilíndrico deitado com janelas e pés. */
function modulo(rand: Rand): Model {
  const m = new Model();
  const L = rr(rand, 7, 10), R = rr(rand, 1.6, 2.0), acc = pick(rand, ACCENTS);
  put(m, cyl(R, R, L, 16), 'met_painel', HULL, { p: [0, R + 0.8, 0], r: [Math.PI / 2, 0, 0] }, 0.18);
  for (const sz of [-1, 1]) {
    put(m, flat(lathe([[R, 0], [R * 0.9, 0.4], [R * 0.5, 0.7], [0.01, 0.75]], 16)), 'met_painel', lite(HULL, 0.2), { p: [0, R + 0.8, sz * L / 2], r: [sz * Math.PI / 2, 0, 0] }, 0.15);
    put(m, xf(torus(R + 0.05, 0.12, 4, 20), { p: [0, R + 0.8, sz * (L / 2 - 0.6)] }), 'paint', acc);
  }
  for (let i = 0; i < 4; i++) {
    const z = -L / 2 + 1.4 + i * ((L - 2.8) / 3);
    for (const sx of [-1, 1]) m.add(cyl(0.32, 0.32, 0.1, 10), 'glow_warm', '#ffffff', { p: [sx * (R - 0.02), R + 1.1, z], r: [0, 0, Math.PI / 2] });
  }
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) put(m, beam([sx * R * 0.6, R * 0.3, sz * L * 0.32], [sx * R * 0.95, -0.05, sz * L * 0.36], 0.2), 'metal', '#9aa0b0');
  put(m, box(0.5, 0.3, L * 0.8), 'paint', TRIM, { p: [0, R * 2 + 0.85, 0] });
  m.add(box(0.2, 0.08, L * 0.7), 'glow_cyan', '#ffffff', { p: [0, R * 2 + 1.02, 0] });
  return finMet(m);
}

/** Antena parabólica gigante: base fixa (a parte móvel gira em Y). */
function antenaBase(rand: Rand): Model {
  const m = new Model();
  void rand;
  put(m, cbox(3.2, 1.0, 3.2), 'met_painel', HULL, { p: [0, 0.5, 0] }, 0.15);
  put(m, cyl(0.7, 1.0, 4.4, 10), 'met_painel', lite(HULL, 0.1), { p: [0, 3.2, 0] }, 0.15);
  put(m, cyl(1.2, 1.2, 0.4, 12), 'paint', TRIM, { p: [0, 5.4, 0] });
  return finMet(m);
}
const ANTENA_PIVOT: V3 = [0, 5.6, 0];
function antenaPrato(rand: Rand): Model {
  const m = new Model();
  void rand;
  put(m, box(1.4, 1.2, 1.4), 'paint', TRIM, { p: [0, 0.6, 0] });
  const dish = new Model();
  const prof = Array.from({ length: 8 }, (_, i) => { const r = 0.05 + (i / 7) * 4.2; return [r, r * r * 0.07] as [number, number]; });
  dish.add(lathe(prof, 24), 'met_painel', '#f2f4f8');
  dish.add(lathe(prof.map(([r, y]) => [r, y - 0.08] as [number, number]).reverse(), 24), 'paint', '#9aa0b0');
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; dish.add(rod([Math.cos(a) * 3.6, 0.9, Math.sin(a) * 3.6], [0, 3.2, 0], 0.05, 4), 'metal', '#c8ccd8'); }
  dish.add(cyl(0.3, 0.2, 0.6, 8), 'paint', TRIM, { p: [0, 3.3, 0] });
  dish.add(ico(0.18, 0), 'glow_red', '#ffffff', { p: [0, 3.7, 0] });
  m.addModel(dish, { p: [0, 1.6, 0.6], r: [-0.75, 0, 0] });
  return m;
}

function painelSolar(rand: Rand): Model {
  const m = new Model();
  const n = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 3.6;
    put(m, rod([x, -0.1, 0], [x, 1.6, 0], 0.08, 6), 'metal', '#9aa0b0');
    const panel = new Model();
    panel.add(box(3.2, 0.08, 2.0), 'metal', '#9aa0b0');
    for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) panel.add(box(0.72, 0.03, 0.6), 'glossy', mix('#1a2a6a', '#2a4aa8', ((a + b) % 2) * 0.4), { p: [-1.2 + a * 0.8, 0.06, -0.66 + b * 0.66] });
    m.addModel(panel, { p: [x, 1.7, 0], r: [0.55, 0, 0] });
  }
  return finMet(m);
}

/** Foguete na plataforma de lançamento, com torre de serviço. */
function foguete(rand: Rand): Model {
  const m = new Model();
  const acc = pick(rand, ['#e8463a', '#2a7ae0']);
  put(m, cbox(12, 1.2, 12), 'met_chapa', '#7a7e88', { p: [0, 0.6, 0] }, 0.15);
  m.add(xf(torus(4, 0.15, 4, 24), { r: [Math.PI / 2, 0, 0], p: [0, 1.25, 0] }), 'glow_warm', '#ffffff');
  const body = lathe([[0.01, 0], [1.6, 0], [1.8, 1], [1.8, 13], [1.5, 16], [0.8, 18.5], [0.01, 19.5]], 20);
  m.add(paint(body, (p) => (p.y > 13 && p.y < 14 ? acc : p.y > 16 ? acc : HULL)), 'met_painel', undefined, { p: [0, 2.4, 0] });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    put(m, beam([Math.cos(a) * 1.7, 3.2, Math.sin(a) * 1.7], [Math.cos(a) * 3.2, 1.3, Math.sin(a) * 3.2], 1.5, 0.15), 'paint', acc, undefined, 0.15);
    put(m, cyl(0.5, 0.8, 1.2, 10), 'metal', '#3a3a44', { p: [Math.cos(a) * 0.9, 1.9, Math.sin(a) * 0.9] });
  }
  for (let i = 0; i < 4; i++) m.add(cyl(0.35, 0.35, 0.12, 10), 'glow_cyan', '#ffffff', { p: [0, 10 + i * 0.9, 1.76], r: [Math.PI / 2, 0, 0] });
  // torre de serviço treliçada
  const tx = 5.2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(m, box(0.25, 22, 0.25), 'paint', '#c84a2a', { p: [tx + sx * 1.1, 12.2, sz * 1.1] });
  for (let y = 2; y < 22; y += 2.2) {
    put(m, box(2.4, 0.15, 0.15), 'paint', '#c84a2a', { p: [tx, y, 1.1] });
    put(m, box(2.4, 0.15, 0.15), 'paint', '#c84a2a', { p: [tx, y, -1.1] });
    put(m, beam([tx - 1.1, y, 1.1], [tx + 1.1, y + 2.2, 1.1], 0.1), 'paint', '#a83a22');
  }
  for (const y of [8, 15]) put(m, box(3.2, 0.3, 0.8), 'paint', '#7a7e88', { p: [tx - 2.6, y, 0] });
  m.add(ico(0.3, 0), 'glow_red', '#ffffff', { p: [tx, 23.4, 0] });
  return finMet(m);
}

/** Tubo pressurizado sobre a pista (túnel transparente com anéis). */
function tuboPressurizado(rand: Rand, span = 18): Model {
  const m = new Model();
  const hw = span / 2 + 1.2, W = 5.2, V = 3, D = 10;
  void rand;
  // anéis estruturais
  for (let i = 0; i < 3; i++) {
    const z = -D / 2 + (i * D) / 2;
    const pts: V3[] = [];
    for (let k = 0; k <= 16; k++) {
      const a = Math.PI * (k / 16);
      pts.push([-Math.cos(a) * hw, k === 0 || k === 16 ? -0.1 : W + Math.sin(a) * V, z]);
    }
    pts[1] = [-hw, W, z]; pts[15] = [hw, W, z];
    put(m, tube(pts, 0.35, 40, 6), 'met_painel', HULL, undefined, 0.15);
    m.add(tube(pts.map(([x, y, zz]) => [x * 0.985, y - 0.2, zz + 0.38] as V3), 0.07, 40, 4), 'glow_cyan', '#ffffff');
  }
  // casca de vidro (meia cilindro deitado ao longo de Z)
  const glassShell = new THREE.CylinderGeometry(hw, hw, D, 18, 1, true, -Math.PI / 2, Math.PI);
  glassShell.rotateX(-Math.PI / 2);
  glassShell.scale(1, V / hw, 1);
  m.add(glassShell, 'met_vidro', '#ffffff', { p: [0, W, 0] });
  // paredes laterais baixas
  for (const sx of [-1, 1]) put(m, box(0.6, W, D + 0.8), 'met_painel', HULL, { p: [sx * (hw + 0.1), W / 2, 0] }, 0.15);
  put(m, box(hw * 1.1, 0.8, 1.2), 'paint', TRIM, { p: [0, W + V + 0.6, D / 2] });
  m.add(box(hw * 0.9, 0.2, 0.1), 'glow_warm', '#ffffff', { p: [0, W + V + 0.6, D / 2 + 0.62] });
  return finMet(m);
}

/** Baliza de pista: poste com luz piscante. */
function baliza(rand: Rand): Model {
  const m = new Model();
  const c = pick(rand, ['glow_cyan', 'glow_warm']);
  put(m, cyl(0.25, 0.35, 0.3, 8), 'paint', TRIM, { p: [0, 0.15, 0] });
  put(m, cyl(0.08, 0.08, 1.4, 6), 'metal', '#c8ccd8', { p: [0, 1.0, 0] });
  m.add(cyl(0.16, 0.16, 0.35, 8), c, '#ffffff', { p: [0, 1.85, 0] });
  put(m, box(0.04, 0.5, 0.3), 'paint', '#ffd23a', { p: [0.1, 1.1, 0] });
  return finMet(m);
}

function rochaLunar(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 0.8, 2.2);
  put(m, rockGeo(R, rand() * 40, [1.2, 0.6, 1], 1, 0.35), 'aur_rock', jit(REGOLITH, rand), { p: [0, R * 0.3, 0] }, 0.35, '#c8c8d0');
  for (let i = 0; i < 3; i++) put(m, rockGeo(R * rr(rand, 0.2, 0.4), rand() * 40, [1, 0.7, 1], 0, 0.3), 'aur_rock', dark(REGOLITH, 0.1), { p: [rr(rand, -R, R) * 1.3, R * 0.1, rr(rand, -R, R) * 1.3] }, 0.3);
  return finMet(m);
}

/** Planeta gigante com anéis, para o céu (y≈0 no centro; posicionado alto com `dy`). */
function planeta(rand: Rand): Model {
  const m = new Model();
  const R = 60, seed = rand() * 20;
  const sph = blob(R, 3, seed, 0.0, 1, [1, 1, 1], false);
  m.add(paint(sph, (p) => {
    const band = Math.sin(p.y / R * 9 + Math.sin(p.x / R * 3 + seed) * 0.6);
    return mix(mix('#e8a86a', '#c8645a', band * 0.5 + 0.5), '#f6e0c0', Math.max(0, p.z / R) * 0.3);
  }), 'met_planeta');
  m.add(xf(torus(R * 1.65, R * 0.22, 3, 48), { s: [1, 1, 0.06], r: [Math.PI / 2 - 0.35, 0, 0.3] }), 'met_vidro', '#f6dcb0');
  return m;
}

/** Robô-guindaste estacionado (carga). */
function caixaCarga(rand: Rand): Model {
  const m = new Model();
  const n = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const s = rr(rand, 1.0, 1.6), x = rr(rand, -1.5, 1.5), z = rr(rand, -1.2, 1.2);
    put(m, cbox(s, s, s, 0.08), 'met_chapa', pick(rand, ['#d8dce4', '#e8a23a', '#5a8ad0']), { p: [x, s / 2 + (i > 1 ? 1.2 : 0), z], r: [0, rand(), 0] }, 0.2);
  }
  return finMet(m);
}

/** Portal de largada lunar (sobre a pista): duas torres com painéis e luzes. */
function porticoLunar(rand: Rand, span = 18): Model {
  const m = new Model();
  const x = span / 2 + 1, H = 7;
  void rand;
  for (const sx of [-1, 1]) {
    put(m, cbox(1.6, H + 1.6, 1.6), 'met_painel', HULL, { p: [sx * x, (H + 1.6) / 2, 0] }, 0.15);
    for (let k = 0; k < 5; k++) m.add(box(0.1, 0.5, 1.0), k % 2 ? 'glow_cyan' : 'glow_warm', '#ffffff', { p: [sx * (x - 0.82), 1 + k * 1.3, 0] });
  }
  put(m, cbox(x * 2 + 1.6, 1.2, 1.6), 'met_painel', HULL, { p: [0, H + 0.6, 0] }, 0.15);
  put(m, box(x * 2 - 1, 0.6, 0.1), 'paint', TRIM, { p: [0, H + 0.6, 0.82] });
  const lights = Math.max(4, Math.round(span / 2.5));
  for (let i = 0; i < lights; i++) m.add(box(0.5, 0.25, 0.1), i % 2 ? 'glow_cyan' : 'glow_white', '#ffffff', { p: [-x + 1 + (i + 0.5) * ((x * 2 - 2) / lights), H + 0.6, 0.9] });
  return finMet(m);
}

export const LUNAR_PROPS: PropLibrary = {
  cupula: { radius: 7, collider: { radius: 6, height: 5 }, build: cupula },
  'modulo-lunar': { radius: 5, collider: { radius: 2.5, height: 4 }, build: modulo },
  'antena-radar': {
    radius: 4.5, collider: { radius: 1.6, height: 6 }, build: antenaBase,
    animated: { build: antenaPrato, pivot: ANTENA_PIVOT, motion: { kind: 'spin', axis: 'y', period: 14 } },
  },
  'painel-solar': { radius: 4, collider: { radius: 2.5, height: 2 }, build: painelSolar },
  foguete: { radius: 9, collider: { radius: 6, height: 20 }, build: foguete },
  'tubo-pressurizado': { radius: 5, build: tuboPressurizado },
  baliza: { radius: 0.5, build: baliza },
  'rocha-lunar': { radius: 2.2, collider: { radius: 1.2, height: 1.4 }, build: rochaLunar },
  planeta: { radius: 80, build: planeta },
  'caixa-carga': { radius: 2.4, collider: { radius: 1.5, height: 2 }, build: caixaCarga },
  'portico-lunar': { radius: 2, build: porticoLunar },
};
