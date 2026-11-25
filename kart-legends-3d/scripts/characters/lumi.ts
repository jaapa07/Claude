/** Lumi — piloto das estrelas: ser estelar esguio, capacete com viseira, antena-estrela e cachecol cometa. */
import { box, cyl, extrude, mix, torus, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, cuff, legProfile, limbRing, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { ribbon, tuft } from './parts';
import { darken, lighten, paintUV, ramp, sstep, starOutline, sweep } from './shapes';
import { band, cap, humanHead, openingLoop, ringAtY } from './wear';

const VISOR = defineMaterial('chars_visor', { roughness: 0.06, alpha: 0.16 });
const SKIN = '#aebcff', SUIT = '#5a4bd6', SUIT_D = '#2c2470', SUIT_L = '#8f82ff', WHITE = '#f1f2ff', GOLD = '#ffe66b', PINK = '#ff7ad1';

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(0.82, 0.86, 0, 0.048);
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y > 0.53) return SUIT_D;
      const panel = p.z > 0 && Math.abs(p.x) < 0.07 && p.y > 0.26 && p.y < 0.47;
      const side = Math.abs(p.x) > 0.105 && p.y > 0.05 && p.y < 0.45;
      const base = panel ? WHITE : side ? SUIT_D : SUIT;
      return mix(darken(base, 0.3), base, sstep(0, 0.45, p.y) * (0.75 + 0.25 * n.y));
    },
    torsoMat: 'glossy',
    arm: { r: armProfile(0.047, 0.038, 0.035), mat: 'glossy', color: (_u, v, _p, n) => mix(darken(SUIT, 0.3), v > 0.72 ? WHITE : v < 0.2 ? SUIT_L : SUIT, 0.6 + 0.4 * n.y) },
    leg: { r: legProfile(0.066, 0.053, 0.045), mat: 'glossy', color: (_u, v, _p, n) => mix(darken(SUIT, 0.3), v > 0.78 ? WHITE : SUIT, 0.6 + 0.4 * n.y) },
    hand: { color: WHITE, scale: 1.0, mat: 'glossy', knuckle: SUIT_L },
    boot: { upper: WHITE, sole: SUIT_D, toe: SUIT, scale: 1.0, mat: 'glossy', shaft: WHITE, shaftR: 0.05 },
  });
  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    cuff(c, sfx, 0.3, 0.38, 0.044, () => '#bff6ff', 'glow_cyan');
    cuff(c, sfx, 0.72, 0.9, 0.046, (_u, v) => mix(WHITE, lighten(SUIT_L, 0.3), v), 'glossy');
    limbRing(c, `arm${sfx}`, rig.p(`arm${sfx}`), rig.p(`forearm${sfx}`), 0.42, 0.54, 0.047, () => '#bff6ff', 'glow_cyan');
    const knee = rig.p(`shin${sfx}`), hip = rig.p(`leg${sfx}`);
    const ankle = knee.clone().set(sg * rig.ankle[0], rig.ankle[1], rig.ankle[2]);
    limbRing(c, `leg${sfx}`, hip, knee, 0.55, 0.66, 0.063, () => '#bff6ff', 'glow_cyan');
    limbRing(c, `shin${sfx}`, knee, ankle, 0.3, 0.4, 0.054, () => '#bff6ff', 'glow_cyan');
  }
  // emblema, cinto
  const cz = ringAtY(T, 0.38);
  c.soft(extrude(starOutline(0.042, 0.019), 0.012, 0.003), 'glow_warm', rig.torsoW, GOLD, { p: [0, 0.385, cz.z + cz.rz + 0.004] });
  c.soft(paintUV(band(T, 0.185, 0.225, 0.01, 22), () => SUIT_D), 'glossy', rig.torsoW);
  const bz = ringAtY(T, 0.205);
  c.soft(box(0.05, 0.036, 0.014, 0.006, 1), 'glow_warm', rig.torsoW, GOLD, { p: [0, 0.205, bz.z + bz.rz + 0.01] });

  /* ---------- cabeça + capacete ---------- */
  const H = humanHead(0.86, 0.9, 2.1);
  buildHead(c, {
    rings: H, mat: 'skin', faceU: 0.19, faceV0: 0.2, faceV1: 0.68, nu: 32, nv: 22,
    color: (_u, _v, p) => mix(SKIN, mix(SKIN, SUIT_L, 0.6), sstep(0.9, 0.99, p.y) + sstep(-0.02, -0.15, p.z) * 0.5),
  });
  const inVisor = (u: number, y: number): boolean => Math.abs(u - 0.5) < 0.205 && y > 0.675 && y < 0.945;
  const helmet = cap(H, 0.63, 0.052, { nu: 32, nv: 14, skip: inVisor });
  c.rigid('head', paintUV(helmet.geo, (_u, _v, p, n) => {
    const stripe = Math.abs(p.x) < 0.035 && (p.y > 0.93 || p.z < 0);
    const base = stripe ? SUIT : p.y < 0.67 ? SUIT_D : WHITE;
    return mix(darken(base, 0.25), base, 0.6 + 0.4 * n.y);
  }), 'glossy');
  const visor = cap(H, 0.63, 0.047, { nu: 32, nv: 14, skip: (u, y) => !inVisor(u, y), noCap: true });
  c.rigid('head', paintUV(visor.geo, (_u, _v, p) => mix('#9fd8ff', '#e8fbff', sstep(0.7, 0.95, p.y))), VISOR);
  const v0 = (0.675 - 0.63) / (helmet.yOf(1) - 0.63), v1 = (0.945 - 0.63) / (helmet.yOf(1) - 0.63);
  c.rigid('head', sweep(openingLoop(helmet.fn, 0.205, v0, v1, 5), 0.015, 7, 40, { closed: true, capStart: false, capEnd: false, ref: [0, 0, 1] }), 'glossy', (p) => mix(darken(GOLD, 0.2), GOLD, sstep(0.66, 0.95, p.y)));
  for (const sg of [1, -1]) {
    c.rigid('head', cyl(0.058, 0.066, 0.036, 14).rotateZ(Math.PI / 2), 'glossy', SUIT, { p: [sg * 0.246, 0.8, 0.0] });
    c.rigid('head', cyl(0.034, 0.034, 0.012, 12).rotateZ(Math.PI / 2), 'glow_cyan', '#bff6ff', { p: [sg * 0.268, 0.8, 0.0] });
    c.rigid('head', torus(0.045, 0.008, 5, 14).rotateY(Math.PI / 2), 'glossy', GOLD, { p: [sg * 0.264, 0.8, 0.0] });
  }
  // aletas-cometa nas laterais do capacete
  for (const sg of [1, -1]) {
    c.rigid('head', tuft([[sg * 0.22, 0.86, -0.02], [sg * 0.27, 0.93, -0.12], [sg * 0.29, 1.0, -0.26]], [0.018, 0.06], GOLD, PINK, 8, 6), 'glossy');
    c.rigid('head', tuft([[sg * 0.2, 0.74, -0.08], [sg * 0.25, 0.76, -0.18], [sg * 0.26, 0.8, -0.28]], [0.014, 0.04], GOLD, PINK, 8, 5), 'glossy');
  }
  // antena com estrela luminosa
  const top = helmet.fn(0, 1).y;
  const aPts: V3[] = [[0.0, top - 0.01, -0.02], [0.0, top + 0.07, -0.035], [0.0, top + 0.14, -0.07], [0.0, top + 0.19, -0.11]];
  const ab = c.chain('antenna', 'head', [aPts[0]!, aPts[2]!], { roll: 0.5, pitch: 0.35, lag: 0.07, sway: [0.08, 0, 0.1], phase: 0.2, wind: [-0.25, 0, 0], flutter: [0.1, 0, 0.1], bounce: 5 });
  c.soft(sweep(aPts, 0.009, 6, 10), 'glossy', rig.chainW(ab, { parent: 'head', blend: 0.03, tip: aPts[3] }), WHITE);
  c.rigid('head', cyl(0.022, 0.03, 0.02, 10), 'glossy', SUIT, { p: [0, top - 0.002, -0.02] });
  c.rigid(ab[1]!, extrude(starOutline(0.062, 0.028), 0.022, 0.007), 'glow_warm', GOLD, { p: [0, top + 0.22, -0.125], r: [-0.3, 0, 0] });

  /* ---------- cachecol cometa ---------- */
  c.soft(paintUV(band(T, 0.52, 0.595, 0.022, 20), (_u, _v, p) => mix(darken(GOLD, 0.25), GOLD, sstep(0.52, 0.6, p.y))), 'cloth', rig.torsoW);
  const sPts: V3[] = [[0.02, 0.575, -0.06], [0.03, 0.62, -0.19], [0.01, 0.615, -0.32], [-0.02, 0.58, -0.45], [0.0, 0.54, -0.57]];
  const sb = c.chain('scarf', 'chest', [sPts[0]!, sPts[1]!, sPts[2]!, sPts[3]!], { roll: 0.3, pitch: 0.25, lag: 0.08, sway: [0.06, 0.1, 0.05], phase: 0.2, wind: [0.07, 0, 0], flutter: [0.1, 0.16, 0.08], bounce: 2 });
  const sw = rig.chainW(sb, { parent: 'chest', blend: 0.05, tip: sPts[4] });
  const cometCol = (t: number): ReturnType<typeof mix> => (t < 0.4 ? mix(GOLD, '#ffab3d', t / 0.4) : t < 0.75 ? mix('#ffab3d', PINK, (t - 0.4) / 0.35) : mix(PINK, SUIT_L, (t - 0.75) / 0.25));
  c.soft(ribbon(sPts, (t) => ramp(t, [[0, 0.08], [0.25, 0.17], [0.7, 0.12], [1, 0.03]]), 0.012, cometCol, { ref: [1, 0, 0], nv: 20 }), 'cloth', sw);
  c.soft(ribbon([sPts[1]!, [0.11, 0.6, -0.31], [0.13, 0.54, -0.44]], (t) => 0.07 - 0.05 * t, 0.01, (t) => cometCol(0.3 + t * 0.6), { ref: [1, 0, 0], nv: 8 }), 'cloth', sw);
  c.soft(ribbon([sPts[1]!, [-0.09, 0.66, -0.3], [-0.13, 0.64, -0.42]], (t) => 0.065 - 0.045 * t, 0.01, (t) => cometCol(0.3 + t * 0.6), { ref: [1, 0, 0], nv: 8 }), 'cloth', sw);
  // estrelinhas um pouco acima da ponta do cachecol (mais baixas, entravam no bagageiro do Flecha)
  c.rigid(sb[3]!, extrude(starOutline(0.03, 0.013), 0.01, 0.003), 'glow_warm', GOLD, { p: [0.0, 0.6, -0.63], r: [0.4, 0.3, 0.3] });
  c.rigid(sb[2]!, extrude(starOutline(0.02, 0.009), 0.008, 0.002), 'glow_warm', GOLD, { p: [0.14, 0.58, -0.48], r: [0.2, 0.5, 0.6] });

  return {
    bg: SKIN,
    eye: { x: 64, y: c.fy(0.795), rx: 36, ry: 46, iris: '#ffd84a', irisDark: '#e8891c', irisLight: '#fff7b8', pupil: '#3a2a78', line: '#2a2466', star: true, lash: true },
    brow: { color: '#5b4fc4', w: 6, len: 40, gap: 9 },
    mouth: { y: c.fy(0.69), w: 30, line: '#2a2466', inside: '#3d2f8a', tongue: '#ff9ad5' },
    blush: PINK,
    under: () => [-1, 1].map((s) => `<path transform="translate(${s * 104} ${-c.fy(0.74)}) scale(0.9)" d="M0 -9 L2.5 -3 L9 -3 L4 1.5 L6 8 L0 4 L-6 8 L-4 1.5 L-9 -3 L-2.5 -3 Z" fill="${GOLD}"/>`).join(''),
  };
}

export const lumi: CharDef = { id: 'lumi', build };
