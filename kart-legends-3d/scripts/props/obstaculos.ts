/**
 * OBSTÁCULOS DINÂMICOS da Copa Eclipse: o jogo anima estes objetos; aqui só o modelo estático,
 * centrado na origem e com a base em y=0 (salvo quando indicado: objetos que pairam e o martelo-pêndulo).
 */
import { Model, box, cone, cyl, extrude, gradY, ico, mix, torus, tube, type V3 } from '../lib/geo';
import { TAU, alignY, blob, fora, ngon, pick, polar, prism, rectPts, revolve, ri, rr, shade, uvBox, vary, type P2, type Rand } from './kit-eclipse';
import { barril } from './fortaleza';
import type { PropLibrary } from './types';

const FERRO = '#3b3948', FERRO_CLARO = '#77748c', OURO = '#c9b46a';

/** Drone de carga: paira a ~0,3 m (a folga já está no modelo). */
function droneCarga(rand: Rand): Model {
  const m = new Model();
  const cor = vary(pick(rand, ['#f0a02a', '#2fb6d0', '#e2483f']), rand), y = 1.25;
  m.add(box(1.25, 0.5, 1.5, 0.2, 2), 'paint', shade(mix(cor, '#000000', 0.4), mix(cor, '#ffffff', 0.15), y - 0.3, y + 0.3), { p: [0, y, 0] });
  m.add(box(0.9, 0.22, 1.0, 0.1, 1), 'paint', '#1a1e2c', { p: [0, y + 0.3, -0.05] });
  m.add(box(0.8, 0.16, 0.1), 'glow_cyan', '#ffffff', { p: [0, y + 0.04, 0.74] }); // visor frontal
  m.add(box(0.5, 0.08, 0.06), 'glow_red', '#ffffff', { p: [0, y + 0.04, -0.76] });
  m.add(cyl(0.02, 0.02, 0.5, 4), 'paint', '#8b96b4', { p: [0.3, y + 0.62, -0.4] });
  m.add(ico(0.05, 0), 'glow_red', '#ffffff', { p: [0.3, y + 0.9, -0.4] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { // braços e rotores carenados
    const px = sx * 0.95, pz = sz * 0.9;
    m.add(tube([[sx * 0.5, y + 0.05, sz * 0.55], [sx * 0.75, y + 0.2, sz * 0.74], [px, y + 0.22, pz]], 0.06, 4, 5), 'paint', '#2a3150');
    m.add(torus(0.36, 0.05, 5, 14), 'paint', '#1a1e2c', { p: [px, y + 0.3, pz], r: [Math.PI / 2, 0, 0] });
    m.add(torus(0.37, 0.018, 4, 14), 'glow_cyan', '#ffffff', { p: [px, y + 0.36, pz], r: [Math.PI / 2, 0, 0] });
    m.add(cyl(0.07, 0.07, 0.16, 6), 'paint', '#8b96b4', { p: [px, y + 0.3, pz] });
    m.add(cyl(0.33, 0.33, 0.015, 12), 'glass', '#cfe9ff', { p: [px, y + 0.34, pz] });
    for (let k = 0; k < 2; k++) m.add(box(0.62, 0.012, 0.07), 'paint', '#2a3150', { p: [px, y + 0.33, pz], r: [0, k * 1.57 + sx * 0.4, 0] });
  }
  // garras e caixa de carga
  for (const sx of [-1, 1]) m.add(tube([[sx * 0.4, y - 0.2, 0], [sx * 0.62, y - 0.5, 0], [sx * 0.52, y - 0.75, 0]], 0.04, 5, 4), 'paint', '#8b96b4');
  m.add(uvBox(box(0.96, 0.62, 0.96, 0.04, 1), 1.2), 'ecl_madeira', '#c99a6a', { p: [0, 0.62, 0] });
  for (const sx of [-1, 1]) m.add(box(0.1, 0.66, 1.0), 'paint', '#20222c', { p: [sx * 0.28, 0.62, 0] });
  m.add(box(0.4, 0.3, 0.02), 'glow_warm', '#ffffff', { p: [0, 0.62, 0.49] });
  return m;
}

function carrinhoLimpeza(rand: Rand): Model {
  const m = new Model();
  const cor = vary(pick(rand, ['#f0c02a', '#3ad0b8', '#f07a3a']), rand);
  m.add(box(1.5, 0.75, 1.9, 0.26, 2), 'paint', shade(mix(cor, '#000000', 0.4), mix(cor, '#ffffff', 0.2), 0.2, 1.1), { p: [0, 0.68, 0] });
  m.add(box(1.2, 0.5, 1.0, 0.2, 2), 'paint', '#e8ecf5', { p: [0, 1.2, -0.25] });
  m.add(box(0.96, 0.24, 0.1, 0.04, 1), 'paint', '#12151f', { p: [0, 1.22, 0.24] }); // rosto: viseira com olhos
  for (const s of [-1, 1]) m.add(box(0.2, 0.12, 0.04), 'glow_cyan', '#ffffff', { p: [s * 0.24, 1.22, 0.3], r: [0, 0, s * 0.15] });
  m.add(cyl(0.12, 0.14, 0.1, 8), 'paint', '#2a3150', { p: [0, 1.5, -0.3] });
  m.add(cyl(0.1, 0.1, 0.16, 8), 'glow_warm', '#ffffff', { p: [0, 1.62, -0.3] });
  for (let i = 0; i < 5; i++) m.add(box(0.18, 0.1, 0.02), i % 2 ? 'paint' : 'paint', i % 2 ? '#12151f' : '#f0c02a', { p: [-0.6 + i * 0.3, 0.42, 0.96], r: [0, 0, 0.5] });
  m.add(box(1.52, 0.1, 0.06), 'glow_red', '#ffffff', { p: [0, 0.75, -0.95] });
  for (const s of [-1, 1]) { // escovas rotativas e rodas
    m.add(cyl(0.44, 0.5, 0.12, 12), 'paint', '#2a3150', { p: [s * 0.52, 0.2, 1.0] });
    for (let k = 0; k < 10; k++) m.add(cone(0.035, 0.22, 4), 'matte', k % 2 ? '#3ad0e8' : '#e8ecf5', { p: [s * 0.52 + Math.cos((k / 10) * TAU) * 0.44, 0.07, 1.0 + Math.sin((k / 10) * TAU) * 0.44], r: [Math.PI, 0, 0] });
    for (const z of [-0.6, 0.3]) {
      m.add(cyl(0.26, 0.26, 0.2, 10), 'rubber', '#15161c', { p: [s * 0.74, 0.26, z], r: [0, 0, Math.PI / 2] });
      m.add(cyl(0.12, 0.12, 0.22, 6), 'paint', '#c4cce0', { p: [s * 0.74, 0.26, z], r: [0, 0, Math.PI / 2] });
    }
  }
  m.add(tube([[0.5, 1.4, -0.6], [0.56, 1.8, -0.62], [0.5, 2.0, -0.5]], 0.02, 4, 3), 'paint', '#8b96b4');
  m.add(ico(0.06, 0), 'glow_red', '#ffffff', { p: [0.5, 2.02, -0.48] });
  return m;
}

/** Martelo-pêndulo: origem no CENTRO DA CABEÇA; haste de 7 m para +Y. */
function marteloPendulo(_rand: Rand): Model {
  const m = new Model();
  const R = 1.1, L = 2.5;
  const g = new Model();
  g.add(revolve([[0.001, -L / 2], [R * 0.82, -L / 2], [R, -L / 2 + 0.2], [R, L / 2 - 0.2], [R * 0.82, L / 2], [0.001, L / 2]], 12, { uv: 2.5, smooth: false }), 'ecl_pedra', shade('#4d4a66', '#aeabc6', -L / 2, L / 2, 0.2));
  for (const y of [-L / 2 + 0.3, 0, L / 2 - 0.3]) g.add(cyl(R + 0.05, R + 0.05, 0.26, 12, true), 'paint', gradY(FERRO, FERRO_CLARO, -0.2, 0.2), { p: [0, y, 0] });
  for (const s of [-1, 1]) {
    g.add(cyl(R * 0.6, R * 0.8, 0.12, 12), 'paint', FERRO_CLARO, { p: [0, s * (L / 2 + 0.05), 0], r: s > 0 ? [0, 0, 0] : [Math.PI, 0, 0] });
    g.add(cone(0.3, 0.5, 6), 'paint', '#d9d5ea', { p: [0, s * (L / 2 + 0.3), 0], r: s > 0 ? [0, 0, 0] : [Math.PI, 0, 0] });
    for (let i = 0; i < 8; i++) g.add(cone(0.11, 0.26, 4), 'paint', OURO, { p: [Math.cos((i / 8) * TAU) * (R + 0.14), s * (L / 2 - 0.3), Math.sin((i / 8) * TAU) * (R + 0.14)], r: [0, -(i / 8) * TAU, -Math.PI / 2] });
  }
  for (let i = 0; i < 6; i++) g.add(extrude([[0.06, 0.3], [-0.14, -0.04], [0, -0.04], [-0.08, -0.34], [0.14, 0.04], [0, 0.04]], 0.04), 'glow_violet', '#ffffff', { p: polar((i / 6) * TAU + 0.26, R + 0.03, (i % 2 ? 1 : -1) * 0.62), r: [0, fora((i / 6) * TAU + 0.26), 0], s: 0.9 });
  g.transform({ r: [0, 0, Math.PI / 2] });
  m.addModel(g);
  // haste, braçadeiras e olhal
  m.add(uvBox(prism(rectPts(0.34, 0.34, 0.07), R * 0.8, 7), 1.4), 'ecl_madeira', gradY('#5a3a2a', '#a9744c', 0, 7));
  for (const y of [R + 0.25, 2.6, 4.4, 6.2]) m.add(prism(rectPts(0.44, 0.44, 0.09), y, y + 0.22, { cap: 'both' }), 'paint', FERRO_CLARO);
  m.add(box(0.7, 0.5, 0.7, 0.08, 1), 'paint', FERRO, { p: [0, R + 0.02, 0] });
  m.add(torus(0.3, 0.09, 6, 14), 'paint', FERRO_CLARO, { p: [0, 7.2, 0], r: [0, Math.PI / 2, 0] });
  return m;
}

function gradeMovel(_rand: Rand): Model {
  const m = new Model();
  const W = 5, H = 4, D = 0.8;
  for (const s of [-1, 1]) m.add(uvBox(prism(rectPts(0.5, D, 0.1), 0, H), 2.5), 'ecl_pedra', shade('#77728f', '#c4c0dc', 0, H), { p: [s * (W / 2 - 0.25), 0, 0] });
  m.add(uvBox(box(W, 0.5, D, 0.08, 1), 2.5), 'ecl_pedra', '#c4c0dc', { p: [0, H - 0.25, 0] });
  for (let i = 0; i < 7; i++) {
    const x = -1.8 + i * 0.6;
    m.add(box(0.16, H - 0.6, 0.16), 'paint', gradY(FERRO, FERRO_CLARO, 0, H), { p: [x, (H - 0.6) / 2 + 0.3, 0], r: [0, Math.PI / 4, 0] });
    m.add(cone(0.15, 0.34, 4), 'paint', '#d9d5ea', { p: [x, 0.17, 0], r: [Math.PI, 0, 0] });
  }
  for (const y of [0.75, 1.75, 2.75]) {
    m.add(box(W - 0.9, 0.16, 0.3), 'paint', FERRO, { p: [0, y, 0] });
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) m.add(ico(0.07, 0), 'paint', OURO, { p: [-1.8 + i * 0.6, y, s * 0.17] });
  }
  for (const s of [-1, 1]) {
    m.add(extrude([[0.06, 0.3], [-0.14, -0.04], [0, -0.04], [-0.08, -0.34], [0.14, 0.04], [0, 0.04]], 0.04), 'glow_violet', '#ffffff', { p: [s * (W / 2 - 0.25), H * 0.55, D / 2 + 0.01] });
    m.add(extrude([[0.06, 0.3], [-0.14, -0.04], [0, -0.04], [-0.08, -0.34], [0.14, 0.04], [0, 0.04]], 0.04), 'glow_violet', '#ffffff', { p: [s * (W / 2 - 0.25), H * 0.55, -D / 2 - 0.01], r: [0, Math.PI, 0] });
    m.add(torus(0.2, 0.05, 5, 10), 'paint', FERRO_CLARO, { p: [s * 1.5, H + 0.16, 0] });
  }
  return m;
}

function roloNeve(rand: Rand): Model {
  const m = new Model();
  const R = 1.6;
  m.add(blob(R, rand, { detail: 3, jitter: 0.045, faceted: false }), 'ecl_neve', shade('#b9cdf0', '#ffffff', -R, R, 0.1), { p: [0, R, 0] });
  // grumos de neve grudados e lascas de gelo incrustadas
  const dir = (): V3 => { const u = rand() * TAU, v = Math.acos(rr(rand, -0.85, 0.95)); return [Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)]; };
  for (let i = 0; i < 9; i++) { const d = dir(), r = rr(rand, 0.3, 0.55); m.add(blob(r, rand, { detail: 1, jitter: 0.1, faceted: false }), 'ecl_neve', shade('#b9cdf0', '#ffffff', -r, r, 0.1), { p: [d[0] * R * 0.9, R + d[1] * R * 0.9, d[2] * R * 0.9] }); }
  const n = ri(rand, 8, 10);
  for (let i = 0; i < n; i++) {
    const d = dir(), h = rr(rand, 0.45, 0.85);
    m.add(prism(ngon(rr(rand, 0.14, 0.24), 5), -0.3, h, { top: 0.1 }), 'ecl_gelo', gradY('#7fc4f0', '#e4f6ff', 0, h), { p: [d[0] * R * 0.93, R + d[1] * R * 0.93, d[2] * R * 0.93], r: alignY(d) });
  }
  for (let i = 0; i < 4; i++) m.add(tube([[0, 0, 0], [0.3, 0.4, 0.1]], 0.03, 1, 3), 'matte', '#5a3a2a', { p: polar(rand() * TAU, R * 0.86, R + rr(rand, 0, 0.8)) });
  return m;
}

function pedraRolante(rand: Rand): Model {
  const m = new Model();
  const R = 1.5, cor = vary('#8d86a0', rand, 0.05);
  m.add(blob(R, rand, { detail: 2, jitter: 0.07 }), 'ecl_rocha', shade(mix(cor, '#2a2440', 0.5), mix(cor, '#ffffff', 0.25), -R, R, 0.2), { p: [0, R, 0] });
  // anéis de glifos entalhados e luminosos
  for (const [rx, rz] of [[0, 0], [Math.PI / 2, 0], [Math.PI / 2, Math.PI / 2]] as P2[]) {
    m.add(torus(R * 1.0, 0.05, 4, 24), 'glow_cyan', '#ffffff', { p: [0, R, 0], r: [rx, 0, rz] });
  }
  const eixos: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
  for (const [i, e] of eixos.entries()) {
    const ry = Math.atan2(e[0], e[2]);
    const g = new Model();
    g.add(torus(0.42, 0.05, 4, 6), 'glow_cyan', '#ffffff');
    g.add(extrude(i % 2 ? [[0, 0.26], [0.22, -0.14], [-0.22, -0.14]] : [[-0.05, 0.28], [0.05, 0.28], [0.05, 0.05], [0.24, 0.05], [0.24, -0.05], [0.05, -0.05], [0.05, -0.28], [-0.05, -0.28], [-0.05, -0.05], [-0.24, -0.05], [-0.24, 0.05], [-0.05, 0.05]], 0.06), 'glow_cyan', '#ffffff');
    m.addModel(g, { p: [e[0] * R * 0.985, R, e[2] * R * 0.985], r: [0, ry, 0] });
  }
  for (let i = 0; i < 5; i++) { const u = rand() * TAU, v = rr(rand, 0.5, 2.6); m.add(blob(0.3, rand, { detail: 0, jitter: 0.3 }), 'ecl_rocha', mix(cor, '#2a2440', 0.3), { p: [Math.sin(v) * Math.cos(u) * R * 0.95, R + Math.cos(v) * R * 0.95, Math.sin(v) * Math.sin(u) * R * 0.95] }); }
  return m;
}

function barrilRolante(rand: Rand): Model {
  const m = new Model();
  const r = 0.75, L = 1.7;
  const b = barril(rand, r, L);
  for (let i = 0; i < 4; i++) b.add(cone(0.08, 0.2, 4), 'paint', OURO, { p: polar((i / 4) * TAU, r * 1.0, L * 0.5), r: [0, -(i / 4) * TAU, -Math.PI / 2] });
  b.add(torus(r * 0.4, 0.04, 4, 10), 'glow_warm', '#ffffff', { p: [0, L + 0.01, 0], r: [Math.PI / 2, 0, 0] });
  b.add(torus(r * 0.4, 0.04, 4, 10), 'glow_warm', '#ffffff', { p: [0, -0.01, 0], r: [Math.PI / 2, 0, 0] });
  b.transform({ p: [0, -L / 2, 0] });
  b.transform({ r: [0, 0, Math.PI / 2] });
  b.transform({ p: [0, r, 0] });
  m.addModel(b);
  return m;
}

/** Nuvem de trovão: paira (a ponta dos raios fica a ~0,3 m do chão). */
function nuvemTrovao(rand: Rand): Model {
  const m = new Model();
  const cor = shade('#2c2748', '#7a74a8', 1.2, 2.6, 0.3);
  const lobes: V3[] = [[0, 1.9, 0], [0.75, 1.75, 0.1], [-0.78, 1.72, -0.1], [0.2, 1.7, 0.6], [-0.2, 1.72, -0.6], [0.3, 2.25, -0.1], [-0.4, 2.2, 0.15]];
  for (const [i, c] of lobes.entries()) m.add(blob(i === 0 ? 0.72 : rr(rand, 0.42, 0.58), rand, { detail: 2, jitter: 0.08, s: [1.1, 0.8, 1], faceted: false }), 'matte', cor, { p: c });
  // olhos bravos (original) e raios
  for (const s of [-1, 1]) m.add(extrude([[-0.16, 0.02], [0.16, 0.12], [0.16, -0.06], [-0.16, -0.06]], 0.05), 'glow_violet', '#ffffff', { p: [s * 0.3, 1.9, 0.86], s: [s, 1, 1], r: [0, s * 0.2, 0] });
  const raio = (x: number, z: number, h: number, ry: number): void => {
    m.add(extrude([[0.02, 0], [0.26, 0], [0.06, -h * 0.42], [0.2, -h * 0.42], [-0.12, -h], [0, -h * 0.56], [-0.14, -h * 0.56]], 0.07), 'glow_violet', '#ffffff', { p: [x, 0.3 + h, z], r: [0, ry, 0] });
  };
  raio(0, 0.1, 1.15, 0.2);
  raio(0.62, -0.1, 0.8, 1.2);
  raio(-0.6, 0.05, 0.9, -0.9);
  for (let i = 0; i < 3; i++) m.add(ico(0.06, 0), 'glow_white', '#ffffff', { p: [rr(rand, -0.8, 0.8), rr(rand, 1.0, 1.3), rr(rand, -0.5, 0.5)] });
  return m;
}

export const OBSTACULO_PROPS: PropLibrary = {
  'drone-carga': { build: droneCarga, radius: 1.4, collider: { radius: 1.1, height: 1.9 } },
  'carrinho-limpeza': { build: carrinhoLimpeza, radius: 1.3, collider: { radius: 1.05, height: 1.5 } },
  'martelo-pendulo': { build: marteloPendulo, radius: 1.6, collider: { radius: 1.3, height: 2.2 } },
  'grade-movel': { build: gradeMovel, radius: 2.6, collider: { radius: 2.5, height: 4 } },
  'rolo-neve': { build: roloNeve, radius: 1.7, collider: { radius: 1.6, height: 3.2 } },
  'pedra-rolante': { build: pedraRolante, radius: 1.6, collider: { radius: 1.5, height: 3 } },
  'barril-rolante': { build: barrilRolante, radius: 1, collider: { radius: 0.85, height: 1.5 } },
  'nuvem-trovao': { build: nuvemTrovao, radius: 1.4, collider: { radius: 1.1, height: 2.6 } },
};
