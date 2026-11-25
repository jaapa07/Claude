/**
 * As rodas da loja (pneu + aro). Cada uma é modelada no espaço normalizado (ver parts.ts):
 * eixo X, face externa em +X, raio externo 1, largura 1. Orçamento: ≤ ~1.500 triângulos por roda.
 */
import { THREE, Model, extrude, sphere } from '../lib/geo';
import { defineMaterial } from '../lib/materials';
import { beam, boltCircle, carcass, hub, normalize, rim, valve, wallRing } from './parts';
import { latheX, quads, type P2 } from '../karts/common';

export interface TireDef { id: string; name: string; build: () => Model }

const TAU = Math.PI * 2;

/** Garra Off-road: travas grossas em blocos alternados que dobram o ombro + aro beadlock. */
function offroad(): Model {
  const m = new Model();
  const rr = 0.55;
  carcass(m, { rim: rr, r: 0.87, shoulder: 0.8, col: '#2e2f33', seg: 18, uvRepeat: 12 });
  const N = 10;
  for (let i = 0; i < N * 2; i++) {
    const side = i % 2 ? 1 : -1;
    const a = ((Math.floor(i / 2) + (i % 2) * 0.5) / N) * TAU;
    const g = new THREE.BoxGeometry(0.44, 0.15, 0.22);
    g.rotateY(side * 0.12);
    g.translate(side * 0.27, 0.925, 0);
    g.rotateX(a);
    m.add(g, 'rubber', '#3d3f44');
    if (side > 0) { // dente do ombro, visível na face externa
      const t = new THREE.BoxGeometry(0.1, 0.18, 0.18);
      t.translate(0.45, 0.79, 0);
      t.rotateX(a);
      m.add(t, 'rubber', '#3d3f44');
    }
  }
  rim(m, { rr, col: '#4a505a', wellCol: '#2a2e35', seg: 16, back: -0.05 });
  // anel beadlock vermelho parafusado sobre o lábio
  wallRing(m, rr - 0.1, rr + 0.05, 0.475, '#d8342c', 'glossy', 22);
  boltCircle(m, 8, rr - 0.025, 0.475, 0.03, '#e3e6ea');
  for (let i = 0; i < 6; i++) m.add(beam((i / 6) * TAU, 0.12, rr - 0.08, 0.085, 0.07, 0.1, 0.27), 'kart_metal', '#4a505a');
  hub(m, 0.15, 0.15, 0.44, '#3a3f47', 'kart_metal', 12, '#d8342c');
  valve(m, rr - 0.04, 0.34);
  return m;
}

/** Slick de Corrida: banda lisa e larga, perfil baixo, aro prateado de raios finos. */
function slick(): Model {
  const m = new Model();
  const rr = 0.74;
  carcass(m, { rim: rr, r: 1, shoulder: 0.05, col: '#25262a', mat: 'rubber', seg: 30 });
  wallRing(m, 0.82, 0.855, 0.497, '#ffd23f', 'std', 30);
  rim(m, { rr, col: '#d9dde3', wellCol: '#2b2e34', seg: 30, back: -0.1 });
  for (let i = 0; i < 10; i++) m.add(beam((i / 10) * TAU, 0.13, rr - 0.04, 0.035, 0.018, 0.05, 0.36, { sweep: 0.05 }), 'kart_metal', '#e6e9ee');
  hub(m, 0.15, 0.2, 0.45, '#d9dde3', 'kart_metal', 14, '#e23b4e');
  boltCircle(m, 5, 0.09, 0.42, 0.022, '#ffffff');
  valve(m, rr - 0.02, 0.38);
  return m;
}

/** Raios Dourados: roda clássica de raios de arame cruzados, aro dourado, faixa branca e borboleta central. */
function raios(): Model {
  const m = new Model();
  const rr = 0.6;
  carcass(m, { rim: rr, r: 1, shoulder: 0.6, col: '#26272b', seg: 24, uvRepeat: 14 });
  wallRing(m, 0.67, 0.8, 0.497, '#f4f1e8', 'std', 24);
  rim(m, { rr, col: '#e2b13c', wellCol: '#1c1e22', mat: 'metal', seg: 24, back: -0.16 });
  // raios de arame: 2 camadas de 14, tangenciais e cruzados (amarração)
  const n = 14;
  for (let layer = 0; layer < 2; layer++) for (let i = 0; i < n; i++) {
    const a = ((i + layer * 0.5) / n) * TAU;
    const off = (layer ? 1 : -1) * 0.55;
    const hx = layer ? 0.34 : -0.06, rx = 0.3;
    const h = new THREE.Vector3(hx, Math.cos(a + off) * 0.11, Math.sin(a + off) * 0.11);
    const r = new THREE.Vector3(rx, Math.cos(a) * (rr - 0.05), Math.sin(a) * (rr - 0.05));
    const d = r.clone().sub(h);
    const g = new THREE.CylinderGeometry(0.009, 0.009, d.length(), 3, 1, true);
    g.applyMatrix4(new THREE.Matrix4().compose(h.clone().add(r).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)));
    m.add(g, 'chrome', '#e9ebef');
  }
  hub(m, 0.12, -0.1, 0.4, '#e2b13c', 'metal', 12);
  // borboleta (knock-off) de duas orelhas
  for (const s of [1, -1]) m.add(beam(s > 0 ? 0 : Math.PI, 0.05, 0.2, 0.06, 0.035, 0.045, 0.43, { t1: 0.03 }), 'chrome', '#f1f2f4');
  valve(m, rr - 0.02, 0.36);
  return m;
}

/** Neon Turbo: pneu escuro com faixa de neon ciano na banda e na parede, cubo-turbina luminoso. */
function neon(): Model {
  const m = new Model();
  const rr = 0.64;
  carcass(m, { rim: rr, r: 0.985, shoulder: 0.3, col: '#17181c', mat: 'rubber', seg: 28 });
  // faixa luminosa em relevo no centro da banda (aparece na silhueta)
  m.add(latheX([[0.975, -0.075], [1, -0.05], [1, 0.05], [0.975, 0.075]], 28), 'tire_glow_cyan', '#16c6ee');
  wallRing(m, 0.79, 0.83, 0.498, '#8ff7ff', 'glow_cyan', 28);
  rim(m, { rr, col: '#1f2228', wellCol: '#0f1013', mat: 'glossy', seg: 24, back: -0.08 });
  // pás curvas da turbina
  for (let i = 0; i < 7; i++) m.add(beam((i / 7) * TAU, 0.17, rr - 0.05, 0.03, 0.09, 0.06, 0.3, { sweep: 0.2 }), 'glossy', '#2b2f38');
  wallRing(m, rr - 0.06, rr - 0.025, 0.4, '#8ff7ff', 'glow_cyan', 24);
  m.add(latheX([[0.2, 0.22], [0.2, 0.4], [0.15, 0.44], [0.001, 0.45]], 14), 'tire_glow_cyan', '#4fdcff');
  boltCircle(m, 5, 0.1, 0.44, 0.022, '#1a1c21', 'glossy');
  valve(m, rr - 0.03, 0.36);
  return m;
}

/** Estrela: aro com uma estrela de 5 pontas como raios, cada ponta de uma cor, e faixa arco-íris. */
function estrela(): Model {
  const m = new Model();
  const rr = 0.6;
  const RAINBOW = ['#ff5a5f', '#ffb238', '#ffe14d', '#5fd68a', '#4fb6ff'];
  carcass(m, { rim: rr, r: 1, shoulder: 0.4, grooves: 2, col: '#2a2b31', seg: 26 });
  wallRing(m, 0.68, 0.8, 0.497, (a) => RAINBOW[Math.floor((a / TAU) * 10) % 5]!, 'glossy', 30);
  rim(m, { rr, col: '#f2f4f7', wellCol: '#25202e', mat: 'glossy', seg: 25, back: -0.1 });
  const star = (rOut: number, rIn: number): P2[] => {
    const pts: P2[] = [];
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; const r = i % 2 ? rIn : rOut; pts.push([Math.sin(a) * r, Math.cos(a) * r]); }
    return pts;
  };
  const armColor = (c: THREE.Vector3): string => RAINBOW[Math.floor((((Math.atan2(c.z, c.y) + TAU + TAU / 10) % TAU) / TAU) * 5) % 5]!;
  const place = (g: THREE.BufferGeometry, x: number): THREE.BufferGeometry => { g.rotateY(Math.PI / 2); g.translate(x, 0, 0); return g; };
  m.add(quads(place(extrude(star(rr - 0.025, 0.25), 0.12), 0.3), armColor, 3), 'glossy');
  m.add(place(extrude(star(rr * 0.4, 0.15), 0.06), 0.37), 'glossy', '#fffbe8');
  hub(m, 0.12, 0.3, 0.45, '#ff5aa8', 'glossy', 12);
  valve(m, rr - 0.02, 0.36);
  return m;
}

/** Corrente de Neve: correntes cruzadas por cima da banda, anel lateral e aro de aço furado. */
function neve(): Model {
  const m = new Model();
  const rr = 0.58, R = 0.93;
  carcass(m, { rim: rr, r: R, shoulder: 0.45, col: '#30343b', wallCol: '#3a3f47', seg: 20, uvRepeat: 12 });
  rim(m, { rr, col: '#c3c9d2', wellCol: '#8d95a0', seg: 16, back: 0.2 });
  // furos do aro de aço (discos escuros rebaixados)
  for (let i = 0; i < 6; i++) {
    const g = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 6);
    g.rotateZ(Math.PI / 2);
    g.translate(0.205, 0.37, 0);
    g.rotateX(((i + 0.5) / 6) * TAU);
    m.add(g, 'matte', '#15171b');
  }
  hub(m, 0.15, 0.15, 0.4, '#e4e8ee', 'kart_metal', 10, '#9aa3ae');
  // correntes: 8 cruzadas, 4 elos cada (alternando elo deitado / elo em pé), seguindo o ombro
  const surf = (x: number): number => (Math.abs(x) < 0.3 ? R : R - (Math.abs(x) - 0.3) * 0.42);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    for (let k = 0; k < 4; k++) {
      const x = -0.39 + k * 0.26;
      const flatLink = k % 2 === 0;
      const g = new THREE.BoxGeometry(0.25, flatLink ? 0.045 : 0.11, flatLink ? 0.13 : 0.045);
      const slope = Math.abs(x) > 0.3 ? -Math.sign(x) * 0.42 : 0;
      g.rotateZ(Math.atan(slope));
      g.translate(x, surf(x) + 0.03, 0);
      g.rotateX(a);
      m.add(g, 'kart_metal', '#eef2f6');
    }
  }
  // anel lateral da corrente na face externa
  const ring = new THREE.TorusGeometry(R - 0.1, 0.022, 3, 24);
  ring.rotateY(Math.PI / 2);
  ring.translate(0.47, 0, 0);
  m.add(ring, 'kart_metal', '#eef2f6');
  valve(m, rr - 0.02, 0.3);
  return m;
}

/** Pétala: aro em forma de flor com pétalas em tons pastel, miolo amarelo e faixa de pétalas na parede. */
function flor(): Model {
  const m = new Model();
  const rr = 0.6;
  const PASTEL = ['#ffb3d1', '#c9b6ff', '#a8e6cf'];
  carcass(m, { rim: rr, r: 1, shoulder: 0.85, col: '#3e3644', seg: 24, mat: 'rubber' });
  wallRing(m, 0.66, 0.84, 0.497, (a) => PASTEL[Math.floor((a / TAU) * 12) % 3]!, 'std', 24);
  rim(m, { rr, col: '#fff0b3', wellCol: '#6d5a7a', mat: 'glossy', seg: 24, back: -0.05 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const g = sphere(1, 8, 6);
    g.scale(0.09, rr * 0.36, 0.17);
    g.translate(0.3, rr * 0.5, 0);
    g.rotateX(a);
    m.add(g, 'glossy', i % 2 ? '#c9b6ff' : '#ffb3d1');
  }
  m.add(latheX([[0.17, 0.25], [0.17, 0.36], [0.12, 0.44], [0.001, 0.47]], 14), 'glossy', '#ffd35c');
  valve(m, rr - 0.02, 0.32);
  return m;
}

export const TIRE_DEFS: TireDef[] = [
  { id: 'offroad', name: 'Garra Off-road', build: offroad },
  { id: 'slick', name: 'Slick de Corrida', build: slick },
  { id: 'raios', name: 'Raios Dourados', build: raios },
  { id: 'neon', name: 'Neon Turbo', build: neon },
  { id: 'estrela', name: 'Estrela', build: estrela },
  { id: 'neve', name: 'Corrente de Neve', build: neve },
  { id: 'flor', name: 'Pétala', build: flor },
];

/** Materiais próprios das rodas (prefixo `tire_`). */
export function registerTireMaterials(): void {
  // brilho mais contido que glow_cyan: lê como ciano (não estoura para branco) antes do bloom
  defineMaterial('tire_glow_cyan', { roughness: 0.5, emissive: [0.05, 0.7, 1], emissiveStrength: 1.1 });
}

export function buildTire(def: TireDef): Model {
  const m = def.build();
  normalize(m);
  return m;
}
