/** Tuca — tucano acrobata: bico enorme laranja de ponta preta, peito branco, colete verde-limão com losango nas costas, faixa na testa e cauda empinada. */
import { THREE, box, cyl, extrude, mix, sphere, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, headPoint, legProfile, limbRing, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { leafBlade, ribbon, tuft } from './parts';
import { circleOutline, darken, lighten, paintUV, ramp, roundEnds, scaleRings, sstep, surf, sweepFn, type Ring } from './shapes';
import { band, clothPaint, ringAtY, shell, v3, vAtY } from './wear';

const INK = '#1c1e27', INK_L = '#3a3f52', WHITE = '#fbf6e6', THROAT = '#ffe27a', LIME = '#9bd43a', LIME_D = '#5f9a1f', YEL = '#ffcc1f';
const BEAK = '#ffa51f', BEAK_D = '#ff6a12', BEAK_R = '#e8451c', LEG = '#4f7fd1', RED = '#e8333f', BLUE = '#2f6fd6';

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(0.97, 1.04, 0.02, 0.056);
  const feather = (p: THREE.Vector3, n: THREE.Vector3): THREE.Color => mix(darken(INK, 0.3), mix(INK, INK_L, 0.25 + 0.25 * Math.max(0, n.y)), 0.55 + 0.45 * n.y + 0.05 * Math.sin(p.y * 120));
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      const bib = p.z > 0 ? sstep(0.12, 0.07, Math.abs(p.x)) * sstep(0.3, 0.38, p.y) : 0;
      if (bib > 0) return mix(feather(p, n), mix(WHITE, THROAT, sstep(0.48, 0.6, p.y)), bib);
      return feather(p, n);
    },
    torsoMat: 'fur',
    arm: { r: armProfile(0.054, 0.046, 0.042), mat: 'fur', color: (_u, _v, p, n) => feather(p, n) },
    leg: {
      r: (t) => (t < 0.52 ? 0.088 * (0.9 + 0.1 * sstep(0, 0.15, t)) * roundEnds(t, 0.08, 0) : (legProfile(0.07, 0.044, 0.042)(t) as number)),
      mat: 'fur',
      color: (_u, v, p, n) => (v < 0.52 ? feather(p, n) : mix(darken(LEG, 0.3), LEG, 0.55 + 0.45 * n.y)),
    },
    hand: { color: WHITE, scale: 1.12, mat: 'cloth', knuckle: LIME },
    boot: { upper: LIME, sole: '#f4f1e6', toe: WHITE, scale: 1.1, shaft: YEL, shaftR: 0.052, mat: 'cloth' },
  });

  /* ---------- asas: penas presas aos braços ---------- */
  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    const S = rig.p(`arm${sfx}`), E = rig.p(`forearm${sfx}`), Hn = rig.p(`hand${sfx}`);
    const back = E.clone().sub(Hn).normalize();
    for (let k = 0; k < 4; k++) {
      const t = 0.15 + k * 0.2;
      const o = E.clone().lerp(Hn, t).add(new THREE.Vector3(sg * 0.025, -0.02, 0));
      const len = 0.15 - k * 0.022;
      const dir = back.clone().multiplyScalar(0.75).add(new THREE.Vector3(sg * 0.35, -0.55, 0)).normalize();
      const mid = o.clone().addScaledVector(dir, len * 0.5).add(new THREE.Vector3(0, -0.01, 0));
      const end = o.clone().addScaledVector(dir, len);
      c.rigid(`forearm${sfx}`, leafBlade([v3(o), v3(mid), v3(end)], 0.065, INK, k === 3 ? INK_L : '#2a3550', [sg, 0, 0.3], 5), 'fur');
    }
    for (let k = 0; k < 3; k++) {
      const t = 0.3 + k * 0.25;
      const o = S.clone().lerp(E, t).add(new THREE.Vector3(sg * 0.035, -0.02, -0.01));
      const dir = new THREE.Vector3(sg * 0.3, -0.7, -0.6).normalize();
      const len = 0.13 - k * 0.015;
      c.rigid(`arm${sfx}`, leafBlade([v3(o), v3(o.clone().addScaledVector(dir, len * 0.5)), v3(o.clone().addScaledVector(dir, len))], 0.055, INK, '#2a3550', [sg, 0, 0.3], 5), 'fur');
    }
    // munhequeira da luva
    limbRing(c, `forearm${sfx}`, E, Hn, 0.76, 0.9, 0.05, (_u, v) => mix(LIME_D, LIME, v), 'cloth');
  }

  /* ---------- colete verde-limão aberto ---------- */
  const open = (u: number, v: number): boolean => Math.abs(u - 0.5) < 0.06 + 0.05 * v;
  const vest = shell(T, 0.13, 0.5, (t) => 0.014 + 0.004 * Math.sin(Math.PI * t), { skip: open, nv: 10 });
  c.soft(paintUV(vest.geo, (u, v, p, n) => {
    const trim = Math.abs(u - 0.5) < 0.075 + 0.05 * v || v < 0.08 || v > 0.92;
    return trim ? mix(darken(YEL, 0.2), YEL, 0.5 + 0.5 * n.y) : clothPaint(LIME, 0.13, 0.5)(u, v, p, n);
  }), 'cloth', rig.torsoW);
  // losango e círculo nas costas
  const bk = ringAtY(T, 0.33);
  const bz = bk.z - bk.rb - 0.022;
  c.soft(extrude([[0, 0.085], [0.11, 0], [0, -0.085], [-0.11, 0]], 0.006, 0.002), 'cloth', rig.torsoW, YEL, { p: [0, 0.33, bz], r: [0, Math.PI, 0] });
  c.soft(extrude(circleOutline(0.045, 18), 0.006, 0.002), 'cloth', rig.torsoW, BLUE, { p: [0, 0.33, bz - 0.005], r: [0, Math.PI, 0] });
  c.soft(box(0.08, 0.008, 0.004), 'cloth', rig.torsoW, WHITE, { p: [0, 0.333, bz - 0.009], r: [0, 0, -0.18] });
  // bolso do peito com caneta
  for (const sg of [1, -1]) {
    const pp = vest.fn(0.5 + sg * 0.15, 0.6).clone();
    c.soft(box(0.06, 0.05, 0.016, 0.006, 1), 'cloth', rig.torsoW, (p) => mix(LIME_D, LIME, sstep(-0.025, 0.025, p.y)), { p: [pp.x, pp.y, pp.z + 0.004], r: [0, sg * 0.75, 0] });
  }
  // cós da bermuda de penas
  c.soft(paintUV(band(T, 0.1, 0.135, 0.01, 24), () => LIME_D), 'cloth', rig.torsoW);

  /* ---------- cabeça redonda ---------- */
  const Y = (y: number): number => 0.612 + (y - 0.612) * 1.05;
  const H: Ring[] = scaleRings([
    { y: 0.612, rx: 0.02, rz: 0.02, z: 0.015 },
    { y: 0.632, rx: 0.11, rz: 0.105, z: 0.015 },
    { y: 0.7, rx: 0.185, rz: 0.172, z: 0.02 },
    { y: 0.78, rx: 0.205, rz: 0.19, z: 0.022 },
    { y: 0.865, rx: 0.198, rz: 0.19, z: 0.016 },
    { y: 0.94, rx: 0.16, rz: 0.16, z: 0.01 },
    { y: 0.995, rx: 0.088, rz: 0.09, z: 0.008 },
    { y: 1.016, rx: 0.01, rz: 0.01, z: 0.008 },
  ], 0.612, 1.05, 1.02);
  const throatY = Y(0.735);
  const head = buildHead(c, {
    rings: H, mat: 'fur', faceU: 0.18, faceV0: 0.2, faceV1: 0.74,
    color: (_u, _v, p, n) => {
      const w = p.z > -0.02 ? sstep(throatY + 0.012, throatY - 0.012, p.y) * sstep(-0.02, 0.06, p.z) : 0;
      return mix(feather(p, n), mix(WHITE, THROAT, sstep(Y(0.68), Y(0.63), p.y)), w);
    },
  });

  /* ---------- bico ---------- */
  const fr = headPoint(head.fn, 0, vAtY(H, Y(0.775)));
  const z0 = fr.z;
  const beakPts: V3[] = [[0, Y(0.782), z0 - 0.05], [0, Y(0.784), z0 + 0.05], [0, Y(0.774), z0 + 0.15], [0, Y(0.75), z0 + 0.24], [0, Y(0.715), z0 + 0.3]];
  const beakR = (t: number): [number, number] => {
    const k = roundEnds(t, 0, 0.16);
    return [ramp(t, [[0, 0.08], [0.2, 0.074], [0.65, 0.048], [1, 0.026]]) * k, ramp(t, [[0, 0.056], [0.25, 0.05], [0.7, 0.032], [1, 0.018]]) * k];
  };
  const beakFn = sweepFn(beakPts, beakR, { ref: [0, 1, 0] });
  const beak = surf(beakFn, 20, 18, { capStart: true });
  c.rigid('head', paintUV(beak, (u, v, _p, n) => {
    const th = Math.PI * 2 * u, cy = Math.cos(th);
    if (v < 0.06) return INK;
    if (Math.abs(cy + 0.12) < 0.07 && v > 0.1 && v < 0.97) return darken(BEAK_D, 0.55); // linha entre as mandíbulas
    if (v > 0.84 && cy > -0.2) return mix(INK, INK_L, 0.3 + 0.3 * n.y); // ponta preta
    const ridge = sstep(0.8, 0.95, cy) * sstep(0.1, 0.3, v);
    const base = mix(mix(BEAK, BEAK_D, sstep(0.2, 0.8, v)), BEAK_R, ridge * 0.85);
    return mix(darken(base, 0.18), lighten(base, 0.12), 0.5 + 0.5 * n.y);
  }), 'glossy');
  // narinas na base do bico
  for (const sg of [1, -1]) c.rigid('head', sphere(0.009, 6, 4).scale(1.6, 0.7, 1), 'matte', '#140c08', { p: [sg * 0.03, Y(0.84), z0 + 0.03] });

  /* ---------- topete e faixa na testa ---------- */
  [[-0.04, 0.06, -0.04], [0.0, 0.085, -0.06], [0.04, 0.06, -0.04], [0.0, 0.07, -0.12]].forEach(([x, len, z]) => {
    c.rigid('head', tuft([[x!, Y(1.005), z!], [x! * 1.3, Y(1.04), z! - 0.02], [x! * 1.6, Y(1.02) + len! * 0.4, z! - 0.02 - len!]], [0.028, 0.02], INK, INK_L, 6, 5), 'fur');
  });
  c.rigid('head', paintUV(band(H, Y(0.905), Y(0.955), 0.012, 30), (_u, _v, p) => (Math.abs(p.y - Y(0.93)) < 0.007 ? YEL : LIME)), 'cloth');
  const kb = ringAtY(H, Y(0.93));
  const knot: V3 = [0, Y(0.93), kb.z - kb.rb - 0.01];
  c.chain('band', 'head', [knot], { roll: 0.3, pitch: 0.2, lag: 0.08, sway: [0.05, 0.08, 0.05], wind: [0.55, 0, 0], flutter: [0.16, 0.2, 0.1], bounce: 2 });
  c.rigid('band', sphere(0.022, 10, 8).scale(1.1, 0.9, 0.8), 'cloth', LIME_D, { p: knot });
  for (const sg of [1, -1]) {
    c.rigid('band', ribbon([knot, [sg * 0.035, knot[1] - 0.02, knot[2] - 0.05], [sg * 0.06, knot[1] - 0.06, knot[2] - 0.1], [sg * 0.07, knot[1] - 0.1, knot[2] - 0.13]], 0.035, 0.008, (t) => (t > 0.85 ? YEL : LIME), { ref: [1, 0, 0.3], nv: 8 }), 'cloth');
  }

  /* ---------- cauda empinada ---------- */
  const tp: V3[] = [[0, 0.15, -0.1], [0, 0.21, -0.23], [0, 0.32, -0.33], [0, 0.45, -0.4], [0, 0.56, -0.44]];
  const tb = c.chain('tail', 'hips', [tp[0]!, tp[1]!, tp[2]!], { roll: 0.25, pitch: 0.2, lag: 0.08, sway: [0.03, 0.08, 0.05], phase: 0.2, wind: [-0.12, 0, 0], flutter: [0.05, 0.05, 0.03], bounce: 2.4 });
  const tw = rig.chainW(tb, { parent: 'hips', blend: 0.06, tip: tp[4] });
  c.soft(ribbon(tp, (t) => ramp(t, [[0, 0.09], [0.3, 0.15], [1, 0.19]]), 0.03, (t) => mix(INK, INK_L, sstep(0.6, 1, t) * 0.5), { ref: [1, 0, 0], nv: 16, nu: 8 }), 'fur', tw);
  for (const sg of [1, -1, 0]) {
    c.soft(leafBlade([[sg * 0.03, 0.2, -0.2], [sg * 0.06, 0.36, -0.34], [sg * 0.08, 0.52, -0.42]], 0.07, INK, INK_L, [1, 0, 0]), 'fur', tw);
  }
  // penas vermelhas sob a cauda e brancas por cima
  c.rigid('hips', sphere(0.06, 12, 8).scale(1.3, 0.8, 1), 'fur', (p, n) => mix(darken(RED, 0.3), RED, 0.5 + 0.5 * n.y + 0.1 * Math.sin(p.x * 200)), { p: [0, 0.09, -0.12] });
  c.rigid('hips', sphere(0.05, 12, 8).scale(1.4, 0.7, 0.9), 'fur', (_p, n) => mix(darken(WHITE, 0.2), WHITE, 0.5 + 0.5 * n.y), { p: [0, 0.2, -0.16] });
  void cyl;

  const ey = -c.fy(Y(0.835));
  return {
    bg: INK,
    eye: { x: 98, y: c.fy(Y(0.835)), rx: 34, ry: 40, iris: '#3a6fb0', irisDark: '#14284a', irisLight: '#86c4ff', line: '#0c0c12', tilt: 6 },
    brow: { color: '#e9edf6', w: 9, len: 48, gap: 12 },
    mouth: { y: c.fy(Y(0.75)), w: 30, line: '#0c0c12' },
    blush: '#ff7a8a',
    under: () => `<rect x="-400" y="${-c.fy(throatY)}" width="800" height="400" fill="${WHITE}"/>`
      + `<rect x="-400" y="${-c.fy(Y(0.68))}" width="800" height="400" fill="${THROAT}" opacity="0.7"/>`
      + [-1, 1].map((s) => `<ellipse cx="${s * 98}" cy="${ey}" rx="58" ry="64" fill="${BEAK}"/><ellipse cx="${s * 98}" cy="${ey}" rx="43" ry="49" fill="${BLUE}"/>`).join(''),
  };
}

export const tuca: CharDef = { id: 'tuca', build };
