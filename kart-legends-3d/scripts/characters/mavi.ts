/** Mavi — navegadora aventureira: chapéu de aba larga com pena, trança longa, casaco azul com dragonas, luneta e lenço. */
import { THREE, box, cyl, mix, sphere, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, cuff, headPoint, legProfile, limbRing, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { ribbon, tuft } from './parts';
import { darken, lighten, paintUV, sstep, surf, sweep } from './shapes';
import { band, cap, humanHead, ringAtY, shell, v3, vAtY } from './wear';

const METAL = defineMaterial('chars_metal', { roughness: 0.38, metalness: 0.45 });
const CLOTH2 = defineMaterial('chars_cloth_ds', { roughness: 0.88, doubleSided: true });
const SKIN = '#f0c09a', HAIR = '#b8442c', HAIR_D = '#7d2a1c', BLUE = '#1f8fc4', NAVY = '#14506e', GOLD = '#f2b84b', ORANGE = '#ffb24d', CREAM = '#f4ead2', BOOT = '#4b2f22', BRASS = '#cf9a3e';

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(0.9, 0.92, 0, 0.05);
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y > 0.54) return mix(darken(SKIN, 0.2), SKIN, sstep(0.53, 0.62, p.y));
      const base = p.y < 0.2 ? '#e6d9b8' : CREAM;
      return mix(darken(base, 0.25), base, sstep(0, 0.4, p.y) * (0.75 + 0.25 * n.y));
    },
    arm: { r: armProfile(0.056, 0.046, 0.04), color: (_u, _v, _p, n) => mix(darken(BLUE, 0.35), BLUE, 0.6 + 0.4 * n.y) },
    leg: { r: legProfile(0.074, 0.062, 0.054), color: (_u, v, _p, n) => (v < 0.6 ? mix(darken(CREAM, 0.25), '#e6d9b8', 0.6 + 0.4 * n.y) : mix(darken(BOOT, 0.3), BOOT, 0.6 + 0.4 * n.y)) },
    hand: { color: '#8a5a38', scale: 1.05, mat: 'std', knuckle: '#b07a4e' },
    boot: { upper: BOOT, sole: '#1f1512', toe: '#5e3b2a', scale: 1.06, shaft: BOOT, shaftR: 0.058 },
  });
  const goldPaint = (p: THREE.Vector3, n: THREE.Vector3): THREE.Color => mix(darken(GOLD, 0.3), lighten(GOLD, 0.15), 0.5 + 0.5 * n.y);
  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    cuff(c, sfx, 0.52, 0.8, 0.058, (_u, v) => mix(NAVY, darken(NAVY, 0.2), v), 'cloth');
    cuff(c, sfx, 0.5, 0.56, 0.062, () => GOLD, METAL);
    const knee = rig.p(`shin${sfx}`);
    const ankle = new THREE.Vector3(sg * rig.ankle[0], rig.ankle[1], rig.ankle[2]);
    limbRing(c, `shin${sfx}`, knee, ankle, 0.08, 0.3, 0.07, (_u, v) => mix(lighten(BOOT, 0.12), BOOT, v), 'std'); // dobra da bota alta
    // dragona com franja
    const S = rig.p(`arm${sfx}`);
    c.rigid('chest', box(0.1, 0.022, 0.085, 0.01, 1), METAL, goldPaint, { p: [S.x + sg * 0.012, S.y + 0.058, S.z], r: [0, 0, sg * -0.22] });
    for (let k = 0; k < 5; k++) c.rigid(`arm${sfx}`, cyl(0.008, 0.006, 0.04, 5), METAL, GOLD, { p: [S.x + sg * 0.062, S.y + 0.026, S.z - 0.034 + k * 0.017], r: [0, 0, sg * 0.25] });
    c.rigid('chest', sphere(0.014, 8, 6), METAL, lighten(GOLD, 0.2), { p: [S.x - sg * 0.02, S.y + 0.074, S.z] });
  }
  // casaco aberto com barra rodada
  const open = (u: number, v: number): boolean => Math.abs(u - 0.5) < 0.03 + 0.055 * v * v + 0.02 * (1 - v) ** 3;
  const coat = shell(T, 0.07, 0.515, (t) => 0.012 + 0.05 * (1 - t) ** 2.2, { skip: open, nv: 12, nu: 28 });
  c.soft(paintUV(coat.geo, (u, v, p, n) => {
    const trim = Math.abs(u - 0.5) < 0.05 + 0.055 * v * v + 0.02 * (1 - v) ** 3 || v < 0.06;
    return trim ? mix(darken(NAVY, 0.2), NAVY, 0.5 + 0.5 * n.y) : mix(darken(BLUE, 0.35), BLUE, sstep(0.05, 0.4, p.y) * (0.7 + 0.3 * n.y));
  }), CLOTH2, rig.torsoW);
  for (const sg of [1, -1]) {
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) { const v = i / 8; pts.push(v3(coat.fn(0.5 + sg * (0.03 + 0.055 * v * v + 0.02 * (1 - v) ** 3), v))); }
    c.soft(sweep(pts, 0.008, 6, 12), METAL, rig.torsoW, GOLD);
    for (const v of [0.5, 0.68]) {
      const q = coat.fn(0.5 + sg * (0.075 + 0.04 * v), v);
      c.soft(sphere(0.013, 8, 6).scale(1, 1, 0.6), METAL, rig.torsoW, lighten(GOLD, 0.15), { p: [q.x, q.y, q.z + 0.004] });
    }
  }
  // cinto + luneta
  c.soft(paintUV(band(T, 0.2, 0.24, 0.022, 24), () => '#6b4226'), 'std', rig.torsoW);
  const bz = ringAtY(T, 0.22);
  c.soft(box(0.05, 0.046, 0.014, 0.006, 1), METAL, rig.torsoW, goldPaint, { p: [0, 0.22, bz.z + bz.rz + 0.024] });
  const sx = bz.rx + 0.045;
  const tele = (r: number, len: number, z: number, colr: string): void => { c.rigid('hips', cyl(r, r, len, 12).rotateX(Math.PI / 2 - 0.25), METAL, (p, n) => mix(darken(colr, 0.3), lighten(colr, 0.15), 0.5 + 0.5 * n.y), { p: [sx, 0.19 + z * 0.25, z] }); };
  tele(0.03, 0.09, -0.02, BRASS); tele(0.025, 0.07, 0.055, '#6b4226'); tele(0.02, 0.06, 0.115, BRASS);
  c.rigid('hips', cyl(0.033, 0.033, 0.012, 12).rotateX(Math.PI / 2 - 0.25), METAL, GOLD, { p: [sx, 0.178, -0.066] });
  c.rigid('hips', box(0.014, 0.05, 0.03, 0.004, 1), 'std', '#6b4226', { p: [sx - 0.02, 0.215, 0.0] });
  // lenço no pescoço
  c.soft(paintUV(band(T, 0.525, 0.595, 0.02, 20), (_u, _v, p) => mix(darken(ORANGE, 0.25), ORANGE, sstep(0.52, 0.6, p.y))), 'cloth', rig.torsoW);
  c.soft(sphere(0.022, 8, 6).scale(1.2, 0.9, 0.8), 'cloth', rig.torsoW, darken(ORANGE, 0.1), { p: [0.0, 0.545, 0.085] });
  for (const sg of [1, -1]) c.soft(ribbon([[0, 0.545, 0.085], [sg * 0.03, 0.5, 0.115], [sg * 0.05, 0.44, 0.125]], (t) => 0.035 + 0.03 * t, 0.008, (t) => mix(ORANGE, lighten(ORANGE, 0.3), t), { ref: [1, 0, 0], nv: 6 }), 'cloth', rig.torsoW);

  /* ---------- cabeça ---------- */
  const H = humanHead(1.0, 1.0, 2.1);
  const head = buildHead(c, {
    rings: H, mat: 'skin', faceU: 0.17, faceV0: 0.2, faceV1: 0.64,
    color: (_u, _v, p) => mix(SKIN, darken(SKIN, 0.25), sstep(0.68, 0.62, p.y)),
  });
  const np = headPoint(head.fn, 0, vAtY(H, 0.762));
  c.rigid('head', sphere(0.017, 8, 6).scale(1, 0.8, 0.8), 'skin', mix(SKIN, '#e09a78', 0.5), { p: [0, np.y, np.z + 0.004] });
  for (const sg of [1, -1]) c.rigid('head', sphere(0.04, 8, 6).scale(0.4, 1, 0.7), 'skin', SKIN, { p: [sg * 0.212, 0.78, 0.0], r: [0, sg * -0.3, 0] });
  const hairPaint = (_u: number, _v: number, p: THREE.Vector3, n: THREE.Vector3): THREE.Color => mix(HAIR_D, HAIR, sstep(0.66, 0.95, p.y) * (0.7 + 0.3 * n.y));
  const hair = cap(H, 0.67, 0.016, { skip: (u, y) => Math.abs(u - 0.5) < 0.2 && y < 0.9, nu: 24, nv: 10 });
  c.rigid('head', paintUV(hair.geo, hairPaint), 'fur');
  // franja de lado + mechas emoldurando o rosto
  [[-52, 0.15, 0.4], [-28, 0.13, 0.5], [-4, 0.12, 0.6], [22, 0.1, 0.5], [48, 0.12, -0.3]].forEach(([az, len, sw]) => {
    const b = headPoint(head.fn, az!, vAtY(H, 0.925));
    const e = headPoint(head.fn, az! + sw! * 40, vAtY(H, 0.925 - len! * 0.75));
    const o = b.clone().setY(0).normalize();
    c.rigid('head', tuft([v3(b.clone().addScaledVector(o, 0.005)), v3(b.clone().lerp(e, 0.5).addScaledVector(o, 0.03)), v3(e.clone().addScaledVector(o, 0.016))], [0.02, 0.055], HAIR, lighten(HAIR, 0.15), 8, 5, [0, 0, 1]), 'fur');
  });
  for (const sg of [1, -1]) {
    c.rigid('head', tuft([[sg * 0.19, 0.86, 0.09], [sg * 0.215, 0.76, 0.1], [sg * 0.2, 0.66, 0.1], [sg * 0.17, 0.6, 0.105]], [0.022, 0.04], HAIR, HAIR_D, 8, 6, [0, 0, 1]), 'fur');
  }
  // trança (ossos braid1..4); termina acima do encosto dos karts (mais longa, a ponta entrava no encosto/caldeira ao balançar)
  const bp: V3[] = [[0, 0.72, -0.19], [0.015, 0.63, -0.27], [0.03, 0.55, -0.32], [0.04, 0.47, -0.345], [0.045, 0.39, -0.35], [0.045, 0.34, -0.35]];
  const bb = c.chain('braid', 'head', [bp[0]!, bp[1]!, bp[2]!, bp[3]!], { roll: 0.3, pitch: 0.2, lag: 0.08, sway: [0.05, 0.03, 0.07], phase: 0.2, wind: [0.13, 0, 0], flutter: [0.08, 0.05, 0.1], bounce: 2.5 }); // vento menor: a ponta entrava no bagageiro do Flecha
  const bw = rig.chainW(bb, { parent: 'head', blend: 0.04, tip: bp[5] });
  const braid = surf((u, v) => {
    const cen = new THREE.CatmullRomCurve3(bp.map((p) => new THREE.Vector3(...p))).getPoint(Math.min(1, v));
    const r = 0.04 * (1 - 0.35 * v) * (1 + 0.22 * Math.abs(Math.sin(v * Math.PI * 7))) * Math.min(1, Math.sqrt(Math.max(0, (1 - v) / 0.05)));
    const a = u * Math.PI * 2;
    const lobe = 1 + 0.16 * Math.cos(2 * a + (Math.floor(v * 7) % 2 ? Math.PI / 2 : 0));
    return new THREE.Vector3(cen.x + Math.cos(a) * r * lobe, cen.y, cen.z - Math.sin(a) * r * 0.85 * lobe);
  }, 10, 30, { capStart: true, flip: true });
  c.soft(paintUV(braid, (u, v, _p, n) => mix(HAIR_D, HAIR, (0.35 + 0.65 * Math.abs(Math.sin(v * Math.PI * 7))) * (0.75 + 0.25 * n.y))), 'fur', bw);
  c.rigid(bb[3]!, cyl(0.03, 0.03, 0.022, 10), 'cloth', ORANGE, { p: [0.044, 0.395, -0.35] });
  c.rigid(bb[3]!, tuft([[0.045, 0.39, -0.35], [0.05, 0.335, -0.355], [0.055, 0.28, -0.36]], 0.036, HAIR, lighten(HAIR, 0.15), 8, 5), 'fur');

  // chapéu de navegadora: copa + aba larga (dobrada do lado esquerdo) + faixa + pena
  const crown = cap(H, 0.895, (t) => 0.022 + 0.012 * Math.sin(Math.PI * t), { nu: 26, nv: 9 });
  c.rigid('head', paintUV(crown.geo, (_u, _v, p, n) => mix(darken(NAVY, 0.3), NAVY, 0.55 + 0.45 * n.y + (p.y > 1.0 ? 0.1 : 0))), 'cloth');
  const r0 = ringAtY(H, 0.9);
  const brimY = (th: number, v: number): number => 0.9 - 0.012 * v + 0.13 * v ** 1.5 * Math.max(0, Math.sin(th)) ** 2.5 + 0.03 * v * v * Math.cos(th * 2);
  const brimFn = (u: number, v: number): THREE.Vector3 => {
    const th = Math.PI * 2 * u + Math.PI;
    const up = Math.max(0, Math.sin(th)) ** 2.5;
    const w = (0.2 - 0.02 * Math.cos(th)) * v * (1 - 0.3 * up * v);
    return new THREE.Vector3((r0.rx + 0.02 + w) * Math.sin(th), brimY(th, v), r0.z + (r0.rz + 0.02 + w * 1.05) * Math.cos(th));
  };
  c.rigid('head', paintUV(surf(brimFn, 32, 4), (_u, v) => mix(NAVY, mix(BLUE, NAVY, 0.45), v)), CLOTH2);
  const rim: V3[] = [];
  for (let i = 0; i < 24; i++) rim.push(v3(brimFn(i / 24, 1)));
  c.rigid('head', sweep(rim, 0.009, 5, 48, { closed: true, capStart: false, capEnd: false, ref: [0, 1, 0] }), METAL, GOLD);
  c.rigid('head', paintUV(band(H, 0.895, 0.945, 0.05, 26), () => ORANGE), 'cloth');
  c.rigid('head', sphere(0.022, 8, 6).scale(0.5, 1, 1), METAL, lighten(GOLD, 0.2), { p: [r0.rx + 0.045, 0.955, 0.02] });
  const fpts: V3[] = [[0.2, 0.93, 0.03], [0.27, 1.04, -0.03], [0.28, 1.14, -0.14], [0.24, 1.2, -0.27], [0.17, 1.2, -0.38]];
  const fb = c.chain('feather', 'head', [fpts[0]!, fpts[2]!], { roll: 0.3, pitch: 0.25, lag: 0.07, sway: [0.05, 0, 0.06], phase: 0.25, wind: [-0.18, 0, 0], flutter: [0.1, 0, 0.08], bounce: 3 });
  const fw = rig.chainW(fb, { parent: 'head', blend: 0.04, tip: fpts[4] });
  c.soft(ribbon(fpts, (t) => 0.02 + 0.1 * Math.sin(Math.PI * t ** 0.7) ** 0.7, 0.012, (t, u) => mix(mix('#ffffff', ORANGE, sstep(0.55, 0.95, t)), '#d9cdb8', Math.abs(Math.cos(u * Math.PI * 2)) < 0.2 ? 0.6 : 0), { ref: [0, 1, 0.4], nv: 14 }), 'cloth', fw);

  return {
    bg: SKIN,
    eye: { x: 70, y: c.fy(0.79), rx: 36, ry: 45, iris: '#3d9bd8', irisDark: '#17557e', irisLight: '#a8e4ff', lash: true, tilt: 4 },
    brow: { color: HAIR_D, w: 8, len: 48, gap: 9 },
    mouth: { y: c.fy(0.69), w: 38, line: '#7a3324' },
    blush: '#f58a70',
    over: () => [-1, 1].map((s) => [[34, 0], [46, 8], [58, -1], [24, 7]].map(([x, y]) => `<circle cx="${s * x!}" cy="${-c.fy(0.748) + y!}" r="3" fill="#c98058" opacity="0.75"/>`).join('')).join(''),
  };
}

export const mavi: CharDef = { id: 'mavi', build };
