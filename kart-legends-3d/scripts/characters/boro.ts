/** Boro — pequeno inventor atarracado: óculos de latão enormes, cabelo espetado, macacão e mochila-caldeira. */
import { THREE, box, cyl, extrude, ico, lathe, mix, rng, sphere, torus, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, cuff, headPoint, legProfile, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { aimZ, ribbon, tuft } from './parts';
import { circleOutline, darken, gearOutline, lighten, paintUV, sstep, sweep } from './shapes';
import { band, cap, humanHead, ringAtY, v3, vAtY } from './wear';

const METAL = defineMaterial('chars_metal', { roughness: 0.38, metalness: 0.45 });
const SKIN = '#f1b48a', HAIR = '#b5522a', HAIR_L = '#e88a3c', TEAL = '#35a79d', TEAL_D = '#1f6f6c', SHIRT = '#f2e3c4';
const BRASS = '#d09a3c', BRASS_D = '#8a5f22', IRON = '#3d4249', LEATHER = '#5a3a24', GLOVE = '#c98b36';

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(1.13, 1.14, 0.028, 0.062);
  const brassPaint = (p: THREE.Vector3, n: THREE.Vector3): THREE.Color => mix(mix(BRASS_D, BRASS, 0.5 + 0.5 * n.y), lighten(BRASS, 0.3), Math.max(0, n.y) ** 3 * 0.6);
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y > 0.545) return mix(darken(SKIN, 0.18), SKIN, sstep(0.54, 0.62, p.y));
      const ax = Math.abs(p.x);
      const bib = p.z > 0 && ax < 0.095 && p.y < 0.475;
      const strap = ax > 0.055 && ax < 0.1 && p.y >= 0.44;
      const over = p.y < 0.37 || bib || strap;
      const base = over ? TEAL : SHIRT;
      return mix(darken(base, 0.28), base, sstep(0.0, 0.4, p.y) * (0.75 + 0.25 * n.y));
    },
    arm: {
      r: armProfile(0.064, 0.054, 0.046),
      color: (_u, v, _p, n) => (v < 0.62 ? mix(darken(SHIRT, 0.22), SHIRT, 0.6 + 0.4 * n.y) : mix(darken(SKIN, 0.2), SKIN, 0.6 + 0.4 * n.y)),
    },
    leg: {
      r: legProfile(0.092, 0.078, 0.066),
      color: (_u, v, _p, n) => mix(darken(TEAL, 0.3), v > 0.86 ? TEAL_D : TEAL, 0.55 + 0.45 * n.y),
    },
    hand: { color: GLOVE, scale: 1.3, mat: 'std', knuckle: lighten(GLOVE, 0.25) },
    boot: { upper: '#5b3b26', sole: '#231814', toe: BRASS, scale: 1.25, shaft: '#6b4630', shaftR: 0.064 },
  });
  for (const sfx of ['L', 'R'] as const) {
    cuff(c, sfx, 0.18, 0.3, 0.062, () => SHIRT, 'cloth'); // manga arregaçada
    cuff(c, sfx, 0.62, 0.9, 0.066, (_u, v) => mix(darken(GLOVE, 0.3), GLOVE, v), 'std');
    cuff(c, sfx, 0.58, 0.66, 0.074, () => BRASS_D, 'std');
  }
  // bolso do peitilho + botões
  const cz = ringAtY(T, 0.4);
  c.soft(box(0.11, 0.07, 0.02, 0.008, 1), 'cloth', rig.torsoW, (p) => mix(TEAL_D, TEAL, sstep(-0.035, 0.035, p.y)), { p: [0, 0.4, cz.z + cz.rz + 0.008] });
  c.soft(box(0.118, 0.018, 0.024, 0.006, 1), 'cloth', rig.torsoW, TEAL_D, { p: [0, 0.438, cz.z + cz.rz + 0.008] });
  for (const sg of [1, -1]) {
    c.soft(cyl(0.016, 0.016, 0.012, 10).rotateX(Math.PI / 2), METAL, rig.torsoW, brassPaint, { p: [sg * 0.078, 0.468, cz.z + cz.rz - 0.004] });
    // bolsos laterais
    const hp = ringAtY(T, 0.2);
    c.soft(box(0.02, 0.07, 0.085, 0.008, 1), 'cloth', rig.torsoW, (p) => mix(TEAL_D, TEAL, sstep(-0.035, 0.035, p.y)), { p: [sg * (hp.rx + 0.004), 0.2, 0.03] });
  }

  /* ---------- cabeça ---------- */
  const H = humanHead(1.09, 1.0, 2.45);
  const head = buildHead(c, {
    rings: H, mat: 'skin', faceU: 0.168, faceV0: 0.2, faceV1: 0.66,
    color: (_u, _v, p) => mix(SKIN, darken(SKIN, 0.25), sstep(0.68, 0.62, p.y)),
  });
  const np = headPoint(head.fn, 0, vAtY(H, 0.775));
  c.rigid('head', sphere(0.04, 12, 8).scale(1, 0.85, 0.9), 'skin', (p) => mix('#e08f70', '#f6b79a', sstep(-0.02, 0.03, p.y)), { p: [0, np.y, np.z + 0.012] });
  for (const sg of [1, -1]) {
    c.rigid('head', sphere(0.05, 10, 8).scale(0.42, 1, 0.75), 'skin', (p) => mix(darken(SKIN, 0.25), SKIN, sstep(-0.02, 0.03, Math.abs(p.x))), { p: [sg * 0.236, 0.78, -0.005], r: [0, sg * -0.35, 0] });
  }
  // cabelo: touca + espetos
  const hair = cap(H, 0.8, 0.014, { skip: (u, y) => Math.abs(u - 0.5) < 0.21 && y < 0.945, nu: 24, nv: 9 });
  c.rigid('head', paintUV(hair.geo, (_u, _v, p) => mix(darken(HAIR, 0.3), HAIR, sstep(0.8, 1.02, p.y))), 'fur');
  c.chain('hair', 'head', [[0, 1.0, 0]], { roll: 0.25, pitch: 0.15, lag: 0.06, sway: [0.04, 0, 0.05], wind: [-0.22, 0, 0], flutter: [0.06, 0, 0.05], bounce: 3 });
  const rnd = rng(77);
  const cen = new THREE.Vector3(0, 0.84, 0);
  const spikes: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) spikes.push([-90 + i * 30 + (rnd() - 0.5) * 10, 0.95, 0.15 + rnd() * 0.05]); // coroa
  for (let i = 0; i < 6; i++) spikes.push([i * 60 + 20, 0.8, 0.1 + rnd() * 0.04]);
  for (let i = 0; i < 6; i++) spikes.push([110 + i * 28, 0.62, 0.09 + rnd() * 0.03]);
  spikes.push([-30, 0.87, 0.12], [30, 0.87, 0.13], [0, 0.9, 0.16]);
  spikes.forEach(([az, v, len], i) => {
    const b = headPoint(head.fn, az, v);
    const d = b.clone().sub(cen).normalize().add(new THREE.Vector3(0, 0.55, i >= 19 ? 0.5 : -0.1)).normalize();
    const side = new THREE.Vector3((rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4);
    const p0 = b.clone().addScaledVector(d, -0.03), p1 = b.clone().addScaledVector(d, len * 0.45).addScaledVector(side, len * 0.2), p2 = b.clone().addScaledVector(d, len).addScaledVector(side, len * 0.6);
    c.rigid(v > 0.85 ? 'hair' : 'head', tuft([v3(p0), v3(p1), v3(p2)], 0.05 + rnd() * 0.012, HAIR, HAIR_L, 6, 4), 'fur');
  });

  // óculos de proteção enormes (lentes translúcidas: os olhos aparecem através delas)
  c.rigid('head', paintUV(band(H, 0.795, 0.875, 0.01, 28, { skip: (u) => Math.abs(u - 0.5) < 0.16 }), () => LEATHER), 'std');
  for (const sg of [1, -1]) {
    const hp = headPoint(head.fn, sg * 24, vAtY(H, 0.835));
    const dir: V3 = [Math.sin(sg * 0.3), 0.02, Math.cos(0.3)];
    const o = new THREE.Vector3(...dir).normalize(), r = aimZ(dir);
    const at = (d: number): V3 => v3(hp.clone().addScaledVector(o, d));
    c.rigid('head', cyl(0.078, 0.088, 0.055, 18, true).rotateX(Math.PI / 2), METAL, brassPaint, { p: at(0.004), r });
    c.rigid('head', torus(0.078, 0.015, 6, 18), METAL, brassPaint, { p: at(0.034), r });
    c.rigid('head', cyl(0.07, 0.07, 0.004, 18).rotateX(Math.PI / 2), 'glass', '#c9f4ee', { p: at(0.03), r });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.5;
      const q = hp.clone().addScaledVector(o, 0.046).add(new THREE.Vector3(Math.cos(a) * 0.078 * Math.cos(sg * 0.3), Math.sin(a) * 0.078, -Math.cos(a) * 0.078 * Math.sin(sg * 0.3)));
      c.rigid('head', ico(0.008, 0), METAL, lighten(BRASS, 0.3), { p: v3(q) });
    }
    c.rigid('head', box(0.03, 0.05, 0.05, 0.01, 1), 'std', LEATHER, { p: [sg * 0.215, 0.835, 0.085], r: [0, sg * 0.5, 0] });
  }
  const bp = headPoint(head.fn, 0, vAtY(H, 0.845));
  c.rigid('head', box(0.05, 0.026, 0.024, 0.008, 1), METAL, BRASS_D, { p: [0, bp.y, bp.z + 0.03] });

  /* ---------- mochila-caldeira (rígida no peito) ---------- */
  const bz = -0.275;
  c.rigid('chest', lathe([[0.001, 0.44], [0.07, 0.445], [0.112, 0.48], [0.118, 0.52], [0.118, 0.74], [0.1, 0.79], [0.06, 0.82], [0.001, 0.828]], 18), METAL, (p, n) => brassPaint(p, n), { p: [0, 0, bz] });
  for (const y of [0.515, 0.735]) c.rigid('chest', torus(0.12, 0.011, 5, 18).rotateX(Math.PI / 2), METAL, BRASS_D, { p: [0, y, bz] });
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; c.rigid('chest', ico(0.009, 0), METAL, lighten(BRASS, 0.25), { p: [Math.sin(a) * 0.125, 0.625, bz + Math.cos(a) * 0.125] }); }
  // fornalha luminosa com grade
  c.rigid('chest', box(0.085, 0.07, 0.02, 0.012, 1), 'glow_warm', '#ffb347', { p: [0, 0.58, bz - 0.112] });
  c.rigid('chest', box(0.105, 0.09, 0.016, 0.012, 1), METAL, IRON, { p: [0, 0.58, bz - 0.104] });
  for (const dx of [-0.022, 0, 0.022]) c.rigid('chest', box(0.007, 0.072, 0.012), METAL, IRON, { p: [dx, 0.58, bz - 0.124] });
  // chaminé
  c.rigid('chest', sweep([[0.045, 0.79, bz - 0.01], [0.05, 0.9, bz - 0.015], [0.055, 1.0, bz - 0.03], [0.058, 1.1, bz - 0.06]], (t) => 0.03 + 0.004 * t, 10, 8), METAL, (p) => mix(IRON, lighten(IRON, 0.25), sstep(0.8, 1.1, p.y)));
  c.rigid('chest', torus(0.04, 0.012, 6, 14), METAL, BRASS, { p: [0.058, 1.1, bz - 0.06], r: [Math.PI / 2 - 0.28, 0, 0] });
  c.rigid('chest', cyl(0.03, 0.03, 0.006, 10), 'matte', '#15110f', { p: [0.0585, 1.104, bz - 0.061], r: [-0.28, 0, 0] });
  // engrenagens no lado direito
  c.rigid('chest', extrude(gearOutline(0.078, 10, 0.017), 0.02, 0, [circleOutline(0.024, 10)]), METAL, (p, n) => brassPaint(p, n), { p: [-0.13, 0.63, bz - 0.01], r: [0, -Math.PI / 2, 0.2] });
  c.rigid('chest', extrude(gearOutline(0.045, 8, 0.012), 0.018, 0, [circleOutline(0.013, 8)]), METAL, '#5ad1c8', { p: [-0.127, 0.535, bz + 0.065], r: [0, -Math.PI / 2, 0] });
  c.rigid('chest', cyl(0.014, 0.014, 0.04, 8).rotateZ(Math.PI / 2), METAL, IRON, { p: [-0.125, 0.63, bz - 0.01] });
  // manômetro no lado esquerdo + cano
  c.rigid('chest', cyl(0.04, 0.04, 0.024, 14).rotateZ(Math.PI / 2), METAL, BRASS_D, { p: [0.125, 0.68, bz] });
  c.rigid('chest', cyl(0.033, 0.033, 0.004, 14).rotateZ(Math.PI / 2), 'glossy', '#fff6e0', { p: [0.139, 0.68, bz] });
  c.rigid('chest', box(0.004, 0.03, 0.006), 'matte', '#c22d2d', { p: [0.142, 0.688, bz + 0.004], r: [0.7, 0, 0] });
  c.rigid('chest', sweep([[0.11, 0.56, bz + 0.02], [0.16, 0.56, bz + 0.03], [0.17, 0.5, bz + 0.05], [0.12, 0.47, bz + 0.07]], 0.014, 7, 10), METAL, '#5ad1c8');
  // alças
  for (const sg of [1, -1]) {
    c.soft(ribbon([[sg * 0.1, 0.36, 0.135], [sg * 0.105, 0.47, 0.115], [sg * 0.105, 0.545, 0.01], [sg * 0.1, 0.52, -0.12], [sg * 0.09, 0.47, -0.19]], 0.04, 0.012, () => LEATHER, { ref: [1, 0, 0], nv: 12 }), 'std', rig.torsoW);
  }

  return {
    bg: SKIN,
    eye: { x: 92, y: c.fy(0.835), rx: 40, ry: 44, iris: '#3bb8ad', irisDark: '#1c6e6a', irisLight: '#9af0dc' },
    brow: { color: '#8a3c1c', w: 11, len: 52, gap: 4 },
    mouth: { y: c.fy(0.712), w: 54, line: '#5a2a1c' },
    blush: '#ff8f70',
    over: () => [-1, 1].map((s) => [[40, 0], [54, 9], [66, -2]].map(([x, y]) => `<circle cx="${s * x!}" cy="${-c.fy(0.752) + y!}" r="3.4" fill="#c97b52" opacity="0.8"/>`).join('')).join(''),
  };
}

export const boro: CharDef = { id: 'boro', build };
