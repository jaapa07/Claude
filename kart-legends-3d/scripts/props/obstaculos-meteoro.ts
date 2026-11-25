/**
 * OBSTÁCULOS DINÂMICOS da Copa Meteoro (o jogo anima estes objetos; aqui só o modelo estático).
 * Mesmas convenções de obstaculos.ts: base em y=0; o pêndulo tem a cabeça na origem e a haste até ~7,2 m;
 * o rolante tem o centro em y=R.
 */
import { torus } from '../lib/geo';
import { Model, TAU, beam, blob, box, cbox, cyl, finMet, flat, ico, lite, mix, paint, put, rockGeo, rod, rope, tube, xf, type Rand, type V3 } from './kit-meteoro';
import { fbm3 } from './aurora-kit';
import type { PropLibrary } from './types';
import { vagonete } from './vulcao';

/** Caranguejo gigante de praia que atravessa a pista de lado. */
function caranguejo(rand: Rand): Model {
  const m = new Model();
  const shell = '#e8503a', belly = '#ffd0a0';
  void rand;
  put(m, blob(1.05, 1, 3, 0.08, 1.2, [1.25, 0.55, 1], false), 'glossy', shell, { p: [0, 1.05, 0] }, 0.3, lite(shell, 0.35));
  put(m, blob(0.95, 1, 5, 0.05, 1.2, [1.15, 0.3, 0.9], false), 'glossy', belly, { p: [0, 0.82, 0] }, 0.2);
  for (const sx of [-1, 1]) {
    // olhos em pedúnculos
    put(m, rod([sx * 0.35, 1.45, 0.6], [sx * 0.45, 2.0, 0.75], 0.06, 5), 'glossy', shell);
    put(m, ico(0.17, 1), 'glossy', '#ffffff', { p: [sx * 0.45, 2.08, 0.78] }, 0.05);
    put(m, ico(0.09, 1), 'glossy', '#111111', { p: [sx * 0.45, 2.1, 0.92] }, 0.05);
    // pernas (3 de cada lado)
    for (let k = 0; k < 3; k++) {
      const z = -0.45 + k * 0.42;
      const a: V3 = [sx * 1.05, 0.95, z], b: V3 = [sx * 1.75, 1.25, z + 0.1], c: V3 = [sx * 2.05, 0.0, z + 0.15];
      put(m, tube([a, b, c], 0.09, 6, 5), 'glossy', shell, undefined, 0.3);
    }
    // pinças
    const base: V3 = [sx * 0.95, 1.1, 0.7], elbow: V3 = [sx * 1.45, 1.35, 1.25];
    put(m, tube([base, elbow], 0.13, 3, 6), 'glossy', shell);
    put(m, blob(0.42, 1, sx * 4, 0.05, 1, [0.9, 0.7, 1.2], false), 'glossy', lite(shell, 0.1), { p: [sx * 1.5, 1.45, 1.65] }, 0.3);
    put(m, beam([sx * 1.4, 1.62, 1.85], [sx * 1.25, 1.75, 2.35], 0.16), 'glossy', '#c83a2a');
    put(m, beam([sx * 1.55, 1.3, 1.9], [sx * 1.4, 1.2, 2.3], 0.14), 'glossy', '#c83a2a');
  }
  return finMet(m);
}

/** Tronco-aríete pendurado por cordas (pêndulo do templo). */
function troncoPendulo(rand: Rand): Model {
  const m = new Model();
  const L = 3.0, R = 0.75;
  void rand;
  const log = flat(cyl(R, R, L, 10));
  m.add(paint(log, (p) => mix('#6a4a30', '#9a7048', 0.5 + 0.5 * fbm3(p.x * 2, p.y * 1.5, p.z * 2))), 'aur_bark', undefined, { r: [0, 0, Math.PI / 2] });
  for (const sx of [-1, 1]) {
    put(m, flat(cyl(R * 0.85, R * 0.95, 0.12, 10)), 'aur_wood', '#d8b27a', { p: [sx * (L / 2 + 0.02), 0, 0], r: [0, 0, Math.PI / 2] }, 0.2);
    put(m, xf(torus(R + 0.04, 0.08, 4, 12), { p: [sx * (L / 2 - 0.4), 0, 0], r: [0, Math.PI / 2, 0] }), 'aur_hay', '#c8b078');
    put(m, rope([sx * (L / 2 - 0.4), R, 0], [sx * 0.3, 7.2, 0], 0, 0.06, 4, 4), 'aur_hay', '#c8b078');
  }
  // cabeça entalhada de jade na ponta e espinhos
  put(m, box(0.5, 0.5, 0.2), 'glossy', '#3fbf8a', { p: [0, 0, R + 0.02] }, 0.2);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; put(m, flat(cyl(0.01, 0.14, 0.4, 4)), 'aur_bark', '#4a3220', { p: [-L / 4 + (i % 3) * (L / 4), Math.cos(a) * (R + 0.15), Math.sin(a) * (R + 0.15)], r: [a + Math.PI / 2, 0, 0] }); }
  put(m, cbox(0.9, 0.3, 0.6), 'aur_wood', '#5a4030', { p: [0, 7.3, 0] });
  return finMet(m);
}

/** Bola de magma rolante: crosta de basalto com rachaduras incandescentes. Centro em y=R. */
function bolaMagma(rand: Rand): Model {
  const m = new Model();
  const R = 1.5, seed = rand() * 30;
  const g = rockGeo(R, seed, [1, 1, 1], 2, 0.12);
  m.add(paint(g, (p) => {
    const k = fbm3(p.x * 1.4 + seed, p.y * 1.4, p.z * 1.4);
    return Math.abs(k - 0.5) < 0.05 ? '#ffb02a' : mix('#2a2224', '#4a3a38', k);
  }), 'met_obsidiana', undefined, { p: [0, R, 0] });
  m.add(rockGeo(R * 0.93, seed, [1, 1, 1], 1, 0.12), 'met_brasa', '#ffffff', { p: [0, R, 0] });
  return finMet(m);
}

/** Robô de carga lunar: base com esteiras, caixa e braço com luz giratória. */
function roboCarga(rand: Rand): Model {
  const m = new Model();
  void rand;
  for (const sx of [-1, 1]) {
    put(m, cbox(0.5, 0.6, 2.2, 0.15), 'rubber', '#2a2a30', { p: [sx * 0.85, 0.3, 0] }, 0.1);
    for (let k = 0; k < 4; k++) put(m, cyl(0.2, 0.2, 0.52, 8), 'metal', '#9aa0b0', { p: [sx * 0.85, 0.3, -0.75 + k * 0.5], r: [0, 0, Math.PI / 2] });
  }
  put(m, cbox(1.6, 0.7, 2.0, 0.1), 'met_painel', '#e8ecf2', { p: [0, 0.95, 0] }, 0.15);
  put(m, box(1.62, 0.18, 2.02), 'paint', '#ff7a2a', { p: [0, 1.0, 0] });
  put(m, cbox(1.1, 0.9, 1.0, 0.08), 'met_chapa', '#e8a23a', { p: [0, 1.75, -0.35] }, 0.2);
  // cabeça com visor
  put(m, cbox(0.8, 0.5, 0.6, 0.12), 'met_painel', '#e8ecf2', { p: [0, 1.6, 0.75] }, 0.15);
  m.add(box(0.6, 0.18, 0.05), 'glow_cyan', '#ffffff', { p: [0, 1.62, 1.06] });
  put(m, rod([0.4, 1.3, 0.2], [0.4, 2.4, 0.2], 0.04, 4), 'metal', '#c8ccd8');
  m.add(cyl(0.12, 0.12, 0.2, 8), 'glow_warm', '#ffffff', { p: [0.4, 2.5, 0.2] });
  for (const sz of [-1, 1]) m.add(box(1.4, 0.1, 0.06), 'glow_red', '#ffffff', { p: [0, 0.7, sz * 1.02] });
  return finMet(m);
}

export const METEORO_OBSTACULOS: PropLibrary = {
  caranguejo: { build: caranguejo, radius: 1.6, collider: { radius: 1.3, height: 2.2 } },
  'tronco-pendulo': { build: troncoPendulo, radius: 1.6, collider: { radius: 1.2, height: 1.6 } },
  'bola-magma': { build: bolaMagma, radius: 1.6, collider: { radius: 1.5, height: 3 } },
  'vagonete-lava': { build: vagonete, radius: 1.6, collider: { radius: 1.2, height: 1.8 } },
  'robo-carga': { build: roboCarga, radius: 1.4, collider: { radius: 1.2, height: 2.4 } },
};
