/** Tiko — mecânico veloz: sagui de boné para trás, macacão, chave inglesa no cinto e cauda longa enrolada. */
import { THREE, box, cyl, extrude, mix, paint, sphere, warp, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, cuff, headPoint, legProfile, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { plume, ribbon, tuft } from './parts';
import { darken, lighten, paintUV, ramp, sstep } from './shapes';
import { band, cap, humanHead, ringAtY, vAtY } from './wear';

const METAL = defineMaterial('chars_metal', { roughness: 0.38, metalness: 0.45 });
const FUR = '#8a5a3c', FUR_D = '#5a3724', FUR_L = '#f3d2a2', RED = '#e23b4e', RED_D = '#a3202f', YEL = '#ffd23f', GREY = '#56606d', DARK = '#2a2d33';

function roundEar(r: number, outer: string, inner: string): THREE.BufferGeometry {
  const g = warp(sphere(r, 14, 9).scale(1, 1, 0.32), (p) => { if (p.z > 0) p.z *= 0.25 - 0.9 * Math.max(0, 1 - Math.hypot(p.x, p.y) / (r * 0.8)); });
  return paint(g, (p, n) => (n.z > 0 && Math.hypot(p.x, p.y) < r * 0.72 ? mix(inner, darken(inner, 0.3), 1 - Math.hypot(p.x, p.y) / (r * 0.72)) : mix(darken(outer, 0.2), outer, 0.5 + 0.5 * n.y)));
}

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(0.93, 0.96, 0.008, 0.054);
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y > 0.54) return mix(FUR_D, FUR, sstep(0.53, 0.62, p.y));
      const ax = Math.abs(p.x);
      const zip = p.z > 0 && ax < 0.009 && p.y > 0.22;
      const stripe = ax > 0.118 && p.y > 0.03 && p.y < 0.46;
      const backPanel = p.z < 0 && ax < 0.075 && p.y > 0.3 && p.y < 0.44;
      const collar = p.y > 0.49;
      const base = zip ? DARK : stripe || backPanel ? YEL : collar ? RED_D : RED;
      return mix(darken(base, 0.3), base, sstep(0, 0.4, p.y) * (0.75 + 0.25 * n.y));
    },
    arm: { r: armProfile(0.054, 0.045, 0.04), color: (_u, v, _p, n) => mix(darken(RED, 0.3), v < 0.6 ? RED : FUR, 0.6 + 0.4 * n.y) },
    leg: { r: legProfile(0.078, 0.064, 0.052), color: (_u, v, p, n) => mix(darken(RED, 0.3), v > 0.52 && v < 0.68 && p.y > 0.2 ? YEL : RED, 0.6 + 0.4 * n.y) },
    hand: { color: GREY, scale: 1.15, mat: 'std', knuckle: YEL },
    boot: { upper: YEL, sole: '#f4f1e6', toe: '#ffffff', scale: 1.12, shaft: RED_D, shaftR: 0.058 },
  });
  for (const sfx of ['L', 'R'] as const) {
    cuff(c, sfx, 0.2, 0.33, 0.054, () => RED_D); // manga dobrada
    cuff(c, sfx, 0.66, 0.9, 0.05, (_u, v) => mix(DARK, GREY, v), 'std');
  }
  // cinto de ferramentas
  c.soft(paintUV(band(T, 0.19, 0.235, 0.013, 24), () => DARK), 'std', rig.torsoW);
  const bz = ringAtY(T, 0.212);
  c.soft(box(0.046, 0.04, 0.014, 0.006, 1), METAL, rig.torsoW, YEL, { p: [0, 0.212, bz.z + bz.rz + 0.013] });
  // bolsa (esquerda) com chaves de fenda
  c.rigid('hips', box(0.03, 0.085, 0.09, 0.01, 1), 'std', (p) => mix('#3b2a20', '#6b4a30', sstep(-0.04, 0.04, p.y)), { p: [bz.rx + 0.022, 0.165, 0.02] });
  c.rigid('hips', cyl(0.011, 0.011, 0.07, 8), 'glossy', '#35c9c0', { p: [bz.rx + 0.022, 0.235, 0.0] });
  c.rigid('hips', cyl(0.011, 0.011, 0.06, 8), 'glossy', YEL, { p: [bz.rx + 0.022, 0.23, 0.04] });
  // chave inglesa (direita)
  const jaw: [number, number][] = [];
  for (let i = 0; i <= 12; i++) { const a = -Math.PI * 0.5 + 0.55 + (i / 12) * (Math.PI * 2 - 1.1); jaw.push([Math.cos(a) * 0.04, Math.sin(a) * 0.04]); }
  jaw.push([0.011, -0.012], [0.011, 0.012], [-0.011, 0.012], [-0.011, -0.012]);
  const wr: [number, number, number] = [-0.25, 0.25, 0];
  c.rigid('hips', extrude(jaw, 0.014, 0.003), METAL, (p) => mix('#8d98a6', '#e3e9f0', sstep(-0.04, 0.04, p.y)), { p: [-(bz.rx + 0.024), 0.085, 0.085], r: [wr[0] + Math.PI, Math.PI / 2, 0] });
  c.rigid('hips', box(0.014, 0.17, 0.03, 0.005, 1), METAL, (p) => mix('#8d98a6', '#e3e9f0', sstep(-0.08, 0.08, p.y)), { p: [-(bz.rx + 0.024), 0.19, 0.06], r: [wr[0], 0, 0] });
  c.rigid('hips', box(0.02, 0.04, 0.05, 0.006, 1), 'std', '#3b2a20', { p: [-(bz.rx + 0.02), 0.215, 0.052], r: [wr[0], 0, 0] });
  // etiqueta no peito
  const cz = ringAtY(T, 0.4);
  c.soft(box(0.06, 0.032, 0.012, 0.005, 1), 'cloth', rig.torsoW, YEL, { p: [0.065, 0.405, cz.z + cz.rz * 0.9 + 0.004], r: [0, 0.45, 0] });

  /* ---------- cabeça ---------- */
  const H = humanHead(1.02, 0.98, 2.0);
  const muzzle = (p: THREE.Vector3): void => {
    if (p.z <= 0) return;
    const w = Math.exp(-((p.x / 0.105) ** 2)) * Math.exp(-(((p.y - 0.722) / 0.058) ** 2));
    p.z += 0.055 * w;
  };
  const head = buildHead(c, {
    rings: H, mod: muzzle, mat: 'fur', faceU: 0.178, faceV0: 0.2, faceV1: 0.66,
    color: (_u, _v, p) => mix(FUR, FUR_D, sstep(0.05, -0.15, p.z) * 0.4 + sstep(0.67, 0.62, p.y) * 0.4),
  });
  for (const sg of [1, -1]) {
    const name = sg > 0 ? 'earL' : 'earR';
    const base: V3 = [sg * 0.2, 0.82, -0.01];
    c.chain(name, 'head', [base], { roll: 0.15, pitch: 0.1, lag: 0.05, sway: [0.02, 0.05, 0.03], wind: [0, sg * 0.25, 0], flutter: [0, 0.06, 0.03], bounce: 1 });
    c.rigid(name, roundEar(0.095, FUR, '#f0b9a0'), 'fur', undefined, { p: [sg * 0.262, 0.84, -0.005], r: [0, sg * 0.45, sg * -0.12] });
    // costeletas
    for (let k = 0; k < 3; k++) c.rigid('head', tuft([[sg * 0.19, 0.74 - k * 0.03, 0.06], [sg * 0.235, 0.715 - k * 0.035, 0.05], [sg * (0.265 - k * 0.015), 0.68 - k * 0.04, 0.03]], [0.014, 0.03], FUR, lighten(FUR, 0.15), 6, 4, [0, 0, 1]), 'fur');
  }
  // boné para trás
  const capG = cap(H, 0.88, 0.018, { nu: 26, nv: 9 });
  c.rigid('head', paintUV(capG.geo, (u, _v, p, n) => {
    const panel = Math.abs(((u * 6) % 1) - 0.5) > 0.47;
    return mix(darken(RED, 0.3), panel ? RED_D : RED, 0.6 + 0.4 * n.y - (p.y < 0.9 ? 0.2 : 0));
  }), 'cloth');
  const topY = capG.fn(0, 1).y;
  c.rigid('head', sphere(0.02, 8, 6).scale(1, 0.6, 1), 'cloth', YEL, { p: [0, topY + 0.004, 0.005] });
  const rb = ringAtY(H, 0.885);
  c.rigid('head', ribbon([[0, 0.9, -(rb.rb - 0.03)], [0, 0.888, -(rb.rb + 0.06)], [0, 0.868, -(rb.rb + 0.13)], [0, 0.85, -(rb.rb + 0.175)]], (t) => ramp(t, [[0, 0.3], [0.45, 0.26], [0.85, 0.19], [1, 0.1]]), 0.016, (t) => mix(RED_D, RED, sstep(0, 0.6, t)), { ref: [1, 0, 0], nv: 8, nu: 10 }), 'cloth');
  c.rigid('head', paintUV(band(H, 0.878, 0.905, 0.021, 26), () => RED_D), 'cloth');
  // abertura do ajuste na testa + topete escapando
  const fp = headPoint(head.fn, 0, vAtY(H, 0.915));
  c.rigid('head', box(0.09, 0.045, 0.01, 0.02, 2), 'fur', FUR_D, { p: [0, 0.918, fp.z + 0.016], r: [-0.35, 0, 0] });
  c.rigid('head', box(0.1, 0.012, 0.014, 0.004, 1), 'std', YEL, { p: [0, 0.898, fp.z + 0.026], r: [-0.3, 0, 0] });
  for (const [x, len] of [[-0.05, 0.03], [0, 0.05], [0.05, 0.035]] as [number, number][]) {
    c.rigid('head', tuft([[x, 0.89, fp.z + 0.0], [x * 1.2, 0.885 - len * 0.2, fp.z + 0.055], [x * 1.5, 0.87 - len * 0.6, fp.z + 0.06 + len * 0.3]], [0.028, 0.02], FUR_D, FUR, 6, 5), 'fur');
  }

  /* ---------- cauda longa enrolada ---------- */
  const tp: V3[] = [[-0.04, 0.14, -0.09], [-0.2, 0.19, -0.15], [-0.33, 0.31, -0.24], [-0.37, 0.48, -0.3], [-0.33, 0.63, -0.33], [-0.24, 0.72, -0.34], [-0.21, 0.82, -0.34], [-0.28, 0.88, -0.34], [-0.36, 0.84, -0.34], [-0.36, 0.76, -0.34], [-0.3, 0.75, -0.34], [-0.29, 0.8, -0.34]];
  const tb = c.chain('tail', 'hips', [tp[0]!, tp[2]!, tp[4]!, tp[6]!], { roll: 0.25, pitch: 0.15, lag: 0.08, sway: [0.03, 0.08, 0.06], phase: 0.2, wind: [-0.06, 0.03, 0], flutter: [0.04, 0.06, 0.04], bounce: 2.5 });
  c.soft(plume(tp, (t) => 0.034 - 0.014 * t + 0.008 * sstep(0.1, 0, t), (t, _u, n) => {
    const ringK = t > 0.25 && Math.sin(t * 44) > 0.55;
    return mix(darken(FUR, 0.25), t > 0.93 ? FUR_D : ringK ? FUR_D : FUR, 0.55 + 0.45 * n.y);
  }, 9, 44, [0, 0, 1]), 'fur', rig.chainW(tb, { parent: 'hips', blend: 0.06, tip: tp[8] }));

  const ey = -c.fy(0.8), my = -c.fy(0.722);
  return {
    bg: FUR,
    eye: { x: 66, y: c.fy(0.8), rx: 36, ry: 44, iris: '#d98a2b', irisDark: '#7d4312', irisLight: '#ffd27a' },
    brow: { color: '#3a2216', w: 10, len: 50, gap: 8 },
    mouth: { y: c.fy(0.7), w: 50, line: '#4a2a1c' },
    under: () => `<ellipse cx="-62" cy="${ey + 4}" rx="56" ry="62" fill="${FUR_L}"/><ellipse cx="62" cy="${ey + 4}" rx="56" ry="62" fill="${FUR_L}"/><ellipse cx="0" cy="${my + 8}" rx="92" ry="56" fill="${FUR_L}"/>`
      + `<ellipse cx="0" cy="${my + 14}" rx="70" ry="36" fill="#ffe6c4"/>`,
    over: () => `<ellipse cx="-9" cy="${my - 16}" rx="5" ry="7" fill="#4a2a1c" transform="rotate(20 -9 ${my - 16})"/><ellipse cx="9" cy="${my - 16}" rx="5" ry="7" fill="#4a2a1c" transform="rotate(-20 9 ${my - 16})"/>`,
  };
}

export const tiko: CharDef = { id: 'tiko', build };
