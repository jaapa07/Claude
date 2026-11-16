/** Zera — exploradora do gelo: leopardo-das-neves de parka, capuz com borda de pelo, protetores de orelha, cachecol e mochila com picareta. */
import { THREE, box, cyl, extrude, mix, torus, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, cuff, headPoint, legProfile, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { plume, pointedEar, ribbon, tuft } from './parts';
import { darken, lighten, loft, paintUV, ramp, scaleRings, sstep, sweep, type Ring } from './shapes';
import { band, cap, openingLoop, ringAtY } from './wear';

const METAL = defineMaterial('chars_metal', { roughness: 0.38, metalness: 0.45 });
const FUR = '#e3e8ec', FUR_D = '#aab4bd', SPOT = '#3f4852', ICE = '#58c7e8', ICE_D = '#2b8fb5', SNOW = '#f4fbff', CORAL = '#ff7d6b', CORAL_D = '#c94f47', NAVY = '#2c4a6e', PACK = '#3d6e63';

const spot = (p: THREE.Vector3, s = 36): boolean => Math.sin(p.x * s + 0.7) * Math.sin(p.y * s * 1.1 + 1.9) * Math.sin(p.z * s + 0.3) > 0.32;

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(1.06, 1.1, 0.014, 0.058);
  const quilt = (y: number): number => (Math.sin(y * 62) > 0.93 ? 0.3 : 0);
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y < 0.13) return mix(darken(NAVY, 0.3), NAVY, 0.5 + 0.5 * n.y);
      const zip = p.z > 0 && Math.abs(p.x) < 0.012;
      const base = zip ? SNOW : darken(ICE, quilt(p.y));
      return mix(darken(base, 0.3), base, sstep(0.05, 0.42, p.y) * (0.75 + 0.25 * n.y));
    },
    arm: { r: (t) => (armProfile(0.066, 0.058, 0.052)(t) as number) * (1 + 0.05 * Math.sin(t * 34)), color: (_u, v, _p, n) => mix(darken(ICE, 0.3), darken(ICE, Math.sin(v * 34) < -0.8 ? 0.25 : 0), 0.6 + 0.4 * n.y) },
    leg: { r: legProfile(0.084, 0.07, 0.058), color: (_u, _v, _p, n) => mix(darken(NAVY, 0.35), NAVY, 0.55 + 0.45 * n.y) },
    hand: { color: CORAL, scale: 1.25, mat: 'cloth', knuckle: lighten(CORAL, 0.2) },
    boot: { upper: ICE_D, sole: '#1d2f45', toe: CORAL, scale: 1.15, shaft: SNOW, shaftR: 0.07, mat: 'cloth' },
  });
  const fluffy = (colr: string) => (u: number, v: number): THREE.Color => mix(darken(colr, 0.18), colr, 0.5 + 0.5 * Math.sin(u * 50 + v * 9));
  for (const sfx of ['L', 'R'] as const) cuff(c, sfx, 0.6, 0.86, 0.066, fluffy(SNOW), 'fur', 7);
  // barra de pelo da parka + bolsos
  c.soft(paintUV(band(T, 0.11, 0.185, 0.03, 24, { mod: (p, th) => { const k = 1 + 0.035 * Math.sin(th * 13); p.x *= k; p.z *= k; } }), fluffy(SNOW)), 'fur', rig.torsoW);
  for (const sg of [1, -1]) {
    const q = ringAtY(T, 0.27);
    c.soft(box(0.075, 0.06, 0.02, 0.01, 1), 'cloth', rig.torsoW, (p) => mix(ICE_D, ICE, sstep(-0.03, 0.03, p.y)), { p: [sg * 0.1, 0.27, q.z + q.rz * 0.8 + 0.012], r: [0, sg * 0.6, 0] });
    c.soft(box(0.082, 0.02, 0.024, 0.008, 1), 'cloth', rig.torsoW, SNOW, { p: [sg * 0.1, 0.3, q.z + q.rz * 0.8 + 0.013], r: [0, sg * 0.6, 0] });
  }

  /* ---------- cabeça felina ---------- */
  const Y = (y: number): number => 0.612 + (y - 0.612) * 1.06;
  const H: Ring[] = scaleRings([
    { y: 0.612, rx: 0.02, rz: 0.02, z: 0.015 },
    { y: 0.632, rx: 0.115, rz: 0.105, z: 0.015 },
    { y: 0.7, rx: 0.19, rz: 0.165, z: 0.02 },
    { y: 0.775, rx: 0.214, rz: 0.184, z: 0.022 },
    { y: 0.86, rx: 0.205, rz: 0.19, z: 0.02 },
    { y: 0.94, rx: 0.165, rz: 0.165, z: 0.015 },
    { y: 0.995, rx: 0.09, rz: 0.095, z: 0.012 },
    { y: 1.016, rx: 0.01, rz: 0.01, z: 0.01 },
  ], 0.612, 1.06, 1.04);
  const muzzle = (p: THREE.Vector3): void => {
    if (p.z <= 0) return;
    const dy = p.y - Y(0.735);
    const w = Math.exp(-((p.x / 0.082) ** 2)) * Math.exp(-((dy / (dy > 0 ? 0.045 : 0.06)) ** 2));
    p.z += 0.066 * w;
  };
  const head = buildHead(c, {
    rings: H, mod: muzzle, mat: 'fur', faceU: 0.172, faceV0: 0.2, faceV1: 0.65,
    color: (_u, _v, p) => mix(FUR, FUR_D, sstep(0.04, -0.14, p.z) * 0.6),
  });
  const tip = headPoint(head.fn, 0, 0.405);
  c.rigid('head', box(0.044, 0.028, 0.026, 0.012, 2), 'glossy', (p) => mix('#d9607a', '#ffa6b8', sstep(-0.014, 0.014, p.y)), { p: [0, tip.y + 0.016, tip.z - 0.004] });
  for (const sg of [1, -1]) for (let k = 0; k < 2; k++) {
    c.rigid('head', tuft([[sg * 0.185, Y(0.74 - k * 0.04), 0.07], [sg * 0.245, Y(0.72 - k * 0.05), 0.065], [sg * (0.29 - k * 0.02), Y(0.69 - k * 0.06), 0.05]], [0.014, 0.03], FUR, SNOW, 6, 4, [0, 0, 1]), 'fur');
  }

  // capuz com orelhas e borda de pelo grossa
  const inFace = (u: number, y: number): boolean => Math.abs(u - 0.5) < 0.205 && y < Y(0.955);
  const hood = cap(H, 0.635, (t) => 0.04 + 0.012 * Math.sin(Math.PI * t), { nu: 26, nv: 10, skip: inFace });
  c.rigid('head', paintUV(hood.geo, (_u, _v, p, n) => mix(darken(ICE, 0.35), darken(ICE, quilt(p.x * 0.9 + 0.01)), 0.55 + 0.45 * n.y)), 'cloth');
  const v1 = (Y(0.955) - 0.635) / (hood.yOf(1) - 0.635);
  const loop = openingLoop(hood.fn, 0.205, 0.03, v1, 6, 0.012);
  c.rigid('head', sweep(loop, (t) => 0.043 * (1 + 0.16 * Math.sin(t * Math.PI * 2 * 17)), 7, 40, { closed: true, capStart: false, capEnd: false, ref: [0, 0, 1] }), 'fur', (p, n) => mix(darken(SNOW, 0.22), SNOW, 0.55 + 0.45 * n.y));
  const topY = hood.fn(0, 1).y;
  for (const sg of [1, -1]) {
    const name = sg > 0 ? 'earL' : 'earR';
    const base: V3 = [sg * 0.125, topY - 0.07, 0.0];
    c.chain(name, 'head', [base], { roll: 0.2, pitch: 0.12, lag: 0.06, sway: [0.03, 0, 0.04], wind: [-0.25, 0, 0], flutter: [0.05, 0, 0.03], bounce: 1.5 });
    c.rigid(name, pointedEar(0.15, 0.16, 0.045, ICE, SNOW, ICE_D, sg * 0.1), 'cloth', undefined, { p: [base[0], base[1] - 0.02, base[2]], r: [-0.1, sg * -0.2, sg * -0.38] });
    // protetores de orelha
    const ep: V3 = [sg * 0.262, 0.8, 0.0];
    c.rigid('head', loft([{ y: -0.035, rx: 0.045, rz: 0.045 }, { y: -0.02, rx: 0.08, rz: 0.08 }, { y: 0.01, rx: 0.085, rz: 0.085 }, { y: 0.03, rx: 0.06, rz: 0.06 }, { y: 0.038, rx: 0.01, rz: 0.01 }], 14, 6), 'fur', (p, n) => mix(CORAL_D, CORAL, 0.5 + 0.5 * n.y + 0.2 * Math.sin(p.x * 160) * Math.sin(p.z * 160)), { p: ep, r: [0, 0, sg * -Math.PI / 2] });
    c.rigid('head', cyl(0.034, 0.034, 0.012, 10).rotateZ(Math.PI / 2), 'glossy', SNOW, { p: [sg * 0.303, 0.8, 0.0] });
  }
  const arc: V3[] = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10 - 0.5) * Math.PI * 0.86; arc.push([Math.sin(a) * 0.268, 0.8 + Math.cos(a) * (topY + 0.012 - 0.8), -0.03]); }
  c.rigid('head', sweep(arc, () => [0.012, 0.022], 6, 20, { ref: [0, 0, 1] }), 'cloth', CORAL_D);

  /* ---------- cachecol comprido (ossos scarf1..3) ---------- */
  const stripes = (t: number): string => (Math.floor(t * 9) % 2 ? SNOW : CORAL);
  c.soft(paintUV(band(T, 0.5, 0.61, 0.034, 22), (u, _v, p, n) => mix(darken(stripes(u * 1.4), 0.25), stripes(u * 1.4), 0.55 + 0.45 * n.y + (p.y > 0.6 ? 0.1 : 0))), 'cloth', rig.torsoW);
  const sp: V3[] = [[0.07, 0.565, -0.09], [0.11, 0.59, -0.23], [0.115, 0.57, -0.37], [0.1, 0.52, -0.5], [0.09, 0.46, -0.6]];
  const sb = c.chain('scarf', 'chest', [sp[0]!, sp[1]!, sp[2]!], { roll: 0.3, pitch: 0.22, lag: 0.08, sway: [0.05, 0.08, 0.05], phase: 0.2, wind: [0.1, 0, 0], flutter: [0.1, 0.15, 0.08], bounce: 2 });
  const sw = rig.chainW(sb, { parent: 'chest', blend: 0.05, tip: sp[4] });
  c.soft(ribbon(sp, 0.1, 0.02, (t) => stripes(t), { ref: [1, 0, 0.25], nv: 20 }), 'cloth', sw);
  for (let k = 0; k < 4; k++) c.soft(tuft([[0.055 + k * 0.024, 0.465, -0.595], [0.052 + k * 0.026, 0.44, -0.625], [0.05 + k * 0.028, 0.41, -0.64]], 0.011, CORAL, CORAL_D, 5, 3), 'cloth', sw);
  // ponta curta na frente
  c.soft(ribbon([[-0.06, 0.55, 0.1], [-0.075, 0.47, 0.135], [-0.08, 0.38, 0.14]], 0.085, 0.018, (t) => stripes(t * 0.5 + 0.1), { ref: [1, 0, 0], nv: 8 }), 'cloth', rig.torsoW);

  /* ---------- mochila de expedição com picareta ---------- */
  const pz = -0.3;
  c.rigid('chest', box(0.25, 0.27, 0.14, 0.045, 1), 'cloth', (p, n) => mix(darken(PACK, 0.35), PACK, 0.5 + 0.5 * n.y), { p: [0, 0.535, pz] });
  c.rigid('chest', box(0.255, 0.1, 0.15, 0.04, 1), 'cloth', (p, n) => mix(darken(PACK, 0.2), lighten(PACK, 0.12), 0.5 + 0.5 * n.y), { p: [0, 0.635, pz - 0.004] });
  c.rigid('chest', box(0.15, 0.1, 0.05, 0.02, 1), 'cloth', darken(PACK, 0.12), { p: [0, 0.48, pz - 0.075] });
  for (const dx of [-0.06, 0.06]) {
    c.rigid('chest', box(0.022, 0.13, 0.012, 0.004, 1), 'std', '#e9d9a8', { p: [dx, 0.6, pz - 0.078] });
    c.rigid('chest', box(0.03, 0.022, 0.016, 0.005, 1), METAL, '#c9ced6', { p: [dx, 0.575, pz - 0.082] });
  }
  // saco de dormir enrolado
  c.rigid('chest', cyl(0.058, 0.058, 0.28, 12).rotateZ(Math.PI / 2), 'cloth', (p, n) => mix(CORAL_D, CORAL, 0.5 + 0.5 * n.y), { p: [0, 0.735, pz + 0.005] });
  for (const dx of [-0.08, 0.08]) c.rigid('chest', torus(0.06, 0.008, 5, 14).rotateY(Math.PI / 2), 'std', '#e9d9a8', { p: [dx, 0.735, pz + 0.005] });
  for (const sg of [1, -1]) c.rigid('chest', cyl(0.03, 0.03, 0.006, 10).rotateZ(Math.PI / 2), 'cloth', SNOW, { p: [sg * 0.142, 0.735, pz + 0.005] });
  // picareta de gelo (lado direito)
  const ax = -0.15;
  c.rigid('chest', cyl(0.013, 0.013, 0.36, 8), METAL, (p) => mix('#7a8794', '#dfe6ee', sstep(-0.18, 0.18, p.y)), { p: [ax, 0.56, pz - 0.02], r: [0.12, 0, 0] });
  c.rigid('chest', cyl(0.017, 0.017, 0.1, 8), 'rubber', CORAL_D, { p: [ax, 0.44, pz - 0.035], r: [0.12, 0, 0] });
  const pick: [number, number][] = [[-0.11, -0.03], [-0.07, 0.004], [-0.02, 0.02], [0.03, 0.02], [0.07, 0.012], [0.075, -0.02], [0.05, -0.008], [0.02, -0.004], [-0.02, -0.006], [-0.06, -0.016]];
  c.rigid('chest', extrude(pick, 0.012, 0.003), METAL, (p) => mix('#8d98a6', '#eef3f8', sstep(-0.03, 0.02, p.y)), { p: [ax, 0.745, pz - 0.045], r: [0.12, Math.PI / 2, 0] });
  // corda enrolada (lado esquerdo) e alças
  c.rigid('chest', torus(0.05, 0.014, 6, 16).rotateY(Math.PI / 2), 'cloth', '#e9d9a8', { p: [0.135, 0.52, pz] });
  c.rigid('chest', torus(0.05, 0.014, 6, 16).rotateY(Math.PI / 2), 'cloth', '#d6c48e', { p: [0.15, 0.52, pz] });
  for (const sg of [1, -1]) {
    c.soft(ribbon([[sg * 0.1, 0.34, 0.145], [sg * 0.108, 0.45, 0.13], [sg * 0.11, 0.53, 0.02], [sg * 0.1, 0.5, -0.13], [sg * 0.09, 0.45, -0.24]], 0.04, 0.014, () => darken(PACK, 0.25), { ref: [1, 0, 0], nv: 12 }), 'cloth', rig.torsoW);
  }

  /* ---------- cauda grossa pintada ---------- */
  const tp: V3[] = [[0.04, 0.13, -0.09], [0.22, 0.17, -0.16], [0.37, 0.25, -0.26], [0.45, 0.38, -0.36], [0.44, 0.54, -0.42], [0.36, 0.66, -0.43]];
  const tl = c.chain('tail', 'hips', [tp[0]!, [0.3, 0.21, -0.21], [0.44, 0.35, -0.34]], { roll: 0.28, pitch: 0.15, lag: 0.09, sway: [0.03, 0.09, 0.05], phase: 0.2, wind: [-0.06, 0.03, 0], flutter: [0.03, 0.06, 0.03], bounce: 2.2 });
  c.soft(plume(tp, (t) => ramp(t, [[0, 0.05], [0.2, 0.068], [0.75, 0.072], [0.92, 0.06], [1, 0.0]]) + 0.004, (t, u, n) => {
    const ringK = t > 0.55 && Math.sin(t * 46) > 0.5;
    const sp2 = t <= 0.55 && Math.sin(t * 60) * Math.sin(u * Math.PI * 10 + t * 20) > 0.45;
    return t > 0.93 || ringK || sp2 ? SPOT : mix(FUR_D, FUR, 0.5 + 0.5 * n.y);
  }, 12, 26, [0, 1, 0]), 'fur', rig.chainW(tl, { parent: 'hips', blend: 0.07, tip: tp[5] }));
  void spot;

  const ey = -c.fy(Y(0.82)), my = -c.fy(Y(0.705));
  const ros = (x: number, y: number, r: number): string => `<circle cx="${x}" cy="${ey + y}" r="${r}" fill="none" stroke="${SPOT}" stroke-width="${r * 0.55}" stroke-dasharray="${r * 2.2} ${r * 1.1}" opacity="0.85"/>`;
  return {
    bg: FUR,
    eye: { x: 72, y: c.fy(Y(0.82)), rx: 38, ry: 46, iris: '#4fc3ea', irisDark: '#1c6f96', irisLight: '#c4f3ff', tilt: 8, lash: true },
    brow: { color: SPOT, w: 9, len: 50, gap: 9 },
    mouth: { y: c.fy(Y(0.705)), w: 38, line: '#3f4852', cat: true },
    blush: '#ff9aa8',
    under: () => `<ellipse cx="0" cy="${my + 4}" rx="74" ry="42" fill="${SNOW}"/><ellipse cx="0" cy="${my - 26}" rx="36" ry="30" fill="${SNOW}"/>`
      + ros(0, -78, 9) + ros(-34, -86, 8) + ros(34, -86, 8) + ros(-128, 30, 8) + ros(128, 30, 8) + ros(-112, 58, 6) + ros(112, 58, 6)
      + [-1, 1].map((s) => [[40, 6], [54, 14], [46, 22]].map(([x, y]) => `<circle cx="${s * x!}" cy="${my + y!}" r="2.6" fill="${SPOT}"/>`).join('')).join(''),
  };
}

export const zera: CharDef = { id: 'zera', build };
