/** Runi — corredor das dunas: lagarto do deserto de turbante com tecido ao vento, óculos de areia, capa rasgada e faixas. */
import { THREE, box, mix, sphere, torus, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, headPoint, legProfile, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { aimZ, plume, ribbon, tuft } from './parts';
import { darken, lighten, paintUV, ramp, ringFn, sstep, surf, sweep, type Ring } from './shapes';
import { band, cape, ringAtY, v3 } from './wear';

const METAL = defineMaterial('chars_metal', { roughness: 0.38, metalness: 0.45 });
const CLOTH2 = defineMaterial('chars_cloth_ds', { roughness: 0.88, doubleSided: true });
const SCALE = '#d9a441', SCALE_D = '#a8702a', SPOT = '#7a3b1e', BELLY = '#f6e3b4', CREAM = '#f1e2bd', CREAM_D = '#cdb98c', RUST = '#8f3f22', TURQ = '#2bb3a3', BRASS = '#c9963a';

const spot = (p: THREE.Vector3, s = 38): boolean => Math.sin(p.x * s + 1.3) * Math.sin(p.y * s * 1.2 + 0.4) * Math.sin(p.z * s * 0.9 + 2.1) > 0.3;

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(0.95, 0.97, 0.006, 0.058);
  const scalePaint = (p: THREE.Vector3, n: THREE.Vector3): THREE.Color => mix(mix(SCALE_D, SCALE, 0.55 + 0.45 * n.y), SPOT, spot(p) ? 0.75 : 0);
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y > 0.535) return p.z > 0.01 ? mix(darken(BELLY, 0.15), BELLY, sstep(0.53, 0.62, p.y)) : scalePaint(p, n);
      if (p.y < 0.18) return mix(darken(RUST, 0.35), RUST, 0.5 + 0.5 * n.y);
      const fold = p.z > 0 && Math.abs(p.x + (p.y - 0.36) * 0.35) < 0.012; // túnica transpassada
      const base = fold ? CREAM_D : CREAM;
      return mix(darken(base, 0.28), base, sstep(0.1, 0.45, p.y) * (0.75 + 0.25 * n.y));
    },
    arm: {
      r: armProfile(0.054, 0.046, 0.042), mat: 'std',
      color: (_u, v, p, n) => {
        if (v > 0.5 && v < 0.84) return mix(CREAM_D, CREAM, Math.sin(v * 95) > 0 ? 1 : 0.25);
        return scalePaint(p, n);
      },
    },
    leg: {
      r: legProfile(0.08, 0.064, 0.052),
      color: (_u, v, _p, n) => (v < 0.62 ? mix(darken(RUST, 0.35), RUST, 0.55 + 0.45 * n.y) : mix(CREAM_D, CREAM, Math.sin(v * 80) > 0 ? 1 : 0.25)),
    },
    hand: { color: SCALE, scale: 1.1, mat: 'std', knuckle: lighten(SCALE, 0.25) },
    boot: { upper: '#6b4226', sole: '#2a1c14', toe: CREAM, scale: 1.05, shaft: CREAM, shaftR: 0.056 },
  });
  // faixa larga na cintura com fivela turquesa + ponta solta
  c.soft(paintUV(band(T, 0.17, 0.26, 0.016, 24), (_u, v) => mix(darken(RUST, 0.2), RUST, 0.5 + 0.5 * Math.sin(v * Math.PI * 3))), 'cloth', rig.torsoW);
  const bz = ringAtY(T, 0.215);
  c.soft(torus(0.026, 0.008, 6, 14), METAL, rig.torsoW, BRASS, { p: [0.03, 0.215, bz.z + bz.rz + 0.018] });
  c.soft(sphere(0.018, 8, 6).scale(1, 1, 0.6), 'glossy', rig.torsoW, TURQ, { p: [0.03, 0.215, bz.z + bz.rz + 0.02] });
  c.rigid('hips', ribbon([[0.1, 0.2, bz.z + bz.rz * 0.8], [0.14, 0.13, bz.z + bz.rz * 0.75 + 0.03], [0.15, 0.05, bz.z + bz.rz * 0.7 + 0.05]], (t) => 0.05 + 0.015 * t, 0.008, (t) => mix(RUST, darken(RUST, 0.25), t), { ref: [1, 0, 0.5], nv: 6 }), 'cloth');
  // colar de contas
  for (let k = 0; k < 7; k++) {
    const a = (k - 3) * 0.3;
    c.soft(sphere(0.014, 6, 5), 'glossy', rig.torsoW, k % 2 ? TURQ : BRASS, { p: [Math.sin(a) * 0.1, 0.5 - 0.035 * Math.cos(a * 1.6), 0.005 + Math.cos(a) * 0.105] });
  }

  /* ---------- cabeça de lagarto ---------- */
  const H: Ring[] = [
    { y: 0.612, rx: 0.02, rz: 0.02, z: 0.015 },
    { y: 0.632, rx: 0.125, rz: 0.11, z: 0.015 },
    { y: 0.7, rx: 0.212, rz: 0.176, z: 0.02, e: 2.2 },
    { y: 0.775, rx: 0.238, rz: 0.192, z: 0.02, e: 2.2 },
    { y: 0.855, rx: 0.218, rz: 0.19, z: 0.016, e: 2.1 },
    { y: 0.935, rx: 0.17, rz: 0.165, z: 0.012 },
    { y: 0.992, rx: 0.095, rz: 0.095, z: 0.01 },
    { y: 1.014, rx: 0.01, rz: 0.01, z: 0.008 },
  ];
  const snout = (p: THREE.Vector3): void => {
    if (p.z <= 0) return;
    const dy = p.y - 0.722;
    const w = Math.exp(-((p.x / 0.135) ** 2)) * Math.exp(-((dy / (dy > 0 ? 0.045 : 0.06)) ** 2));
    p.z += 0.092 * w;
  };
  const head = buildHead(c, {
    rings: H, mod: snout, mat: 'std', faceU: 0.18, faceV0: 0.2, faceV1: 0.65,
    color: (u, _v, p, n) => {
      const under = sstep(0.67, 0.63, p.y) * (Math.abs(u - 0.5) < 0.22 ? 1 : 0);
      const backK = Math.abs(u - 0.5) > 0.24 ? 1 : 0;
      return mix(mix(mix(SCALE, SCALE_D, sstep(0.05, -0.16, p.z) * 0.5), SPOT, backK && spot(p, 34) ? 0.7 : 0), BELLY, under * (n.y < 0.1 ? 1 : 0.4));
    },
  });
  // crista de espinhos na nuca
  for (let k = 0; k < 4; k++) {
    const b = headPoint(head.fn, 180, 0.52 - k * 0.1);
    c.rigid('head', tuft([[0, b.y, b.z + 0.02], [0, b.y + 0.01, b.z - 0.03], [0, b.y - 0.02, b.z - 0.07 + k * 0.006]], [0.014, 0.03], SPOT, SCALE_D, 6, 4), 'std');
  }
  // "bochechas" com escamas salientes
  for (const sg of [1, -1]) for (let k = 0; k < 3; k++) {
    const b = headPoint(head.fn, sg * (82 + k * 14), 0.33 + k * 0.03);
    const o = b.clone().setY(0).normalize();
    c.rigid('head', tuft([v3(b.clone().addScaledVector(o, -0.02)), v3(b.clone().addScaledVector(o, 0.02).add(new THREE.Vector3(0, -0.01, 0))), v3(b.clone().addScaledVector(o, 0.055).add(new THREE.Vector3(0, -0.03, -0.01)))], [0.028, 0.016], SCALE, SCALE_D, 6, 4, [0, 1, 0]), 'std');
  }

  // turbante: base + voltas de tecido + joia
  const TR: Ring[] = [
    { y: 0.86, rx: 0.2, rz: 0.185, z: 0.012 }, { y: 0.9, rx: 0.238, rz: 0.222, z: 0.012 }, { y: 0.965, rx: 0.246, rz: 0.23, z: 0.01 },
    { y: 1.03, rx: 0.215, rz: 0.2, z: 0.005 }, { y: 1.08, rx: 0.155, rz: 0.145, z: 0 }, { y: 1.108, rx: 0.08, rz: 0.075, z: 0 }, { y: 1.118, rx: 0.01, rz: 0.01, z: 0 },
  ];
  const tfn = ringFn(TR);
  const tb = { geo: surf(tfn, 24, 10, { capEnd: true }), fn: (u: number, v: number): THREE.Vector3 => tfn(u, v).clone(), yOf: (v: number): number => 0.86 + (1.118 - 0.86) * v };
  c.rigid('head', paintUV(tb.geo, (_u, _v, p, n) => mix(CREAM_D, CREAM, 0.5 + 0.5 * n.y + (p.y > 1.0 ? 0.1 : 0))), 'cloth');
  const wraps: [number, number, number, string][] = [[0.13, 0.05, 0.0, CREAM], [0.3, 0.13, 2.0, '#fff6dc'], [0.44, 0.17, 4.1, CREAM], [0.52, 0.15, 0.6, RUST]];
  for (const [v0, tilt, ph, colr] of wraps) {
    const pts: V3[] = [];
    for (let i = 0; i < 18; i++) {
      const u = i / 18;
      const q = tb.fn(u, Math.min(0.74, Math.max(0.04, v0 + tilt * Math.sin(u * Math.PI * 2 + ph))));
      pts.push([q.x * 1.02, q.y, q.z * 1.02]);
    }
    c.rigid('head', sweep(pts, () => [0.03, 0.04], 6, 30, { closed: true, capStart: false, capEnd: false, ref: [0, 1, 0] }), 'cloth', (p, n) => mix(darken(colr, 0.3), colr, 0.55 + 0.45 * n.y));
  }
  const jp = tb.fn(0.5, 0.46);
  c.rigid('head', sphere(0.03, 10, 8).scale(1, 1.25, 0.6), 'glossy', (p) => mix(darken(TURQ, 0.3), lighten(TURQ, 0.4), sstep(-0.03, 0.04, p.y)), { p: [0, jp.y + 0.01, jp.z + 0.04] });
  c.rigid('head', torus(0.034, 0.008, 5, 14).scale(1, 1.25, 1), METAL, BRASS, { p: [0, jp.y + 0.01, jp.z + 0.04] });
  // tecido solto ao vento (ossos cloth1..3)
  const cp: V3[] = [[0.1, 1.0, -0.19], [0.15, 0.97, -0.31], [0.16, 0.88, -0.41], [0.14, 0.76, -0.48], [0.12, 0.64, -0.51]];
  const cb = c.chain('cloth', 'head', [cp[0]!, cp[1]!, cp[2]!], { roll: 0.3, pitch: 0.22, lag: 0.08, sway: [0.06, 0.06, 0.06], phase: 0.22, wind: [0.38, 0, 0], flutter: [0.14, 0.16, 0.1], bounce: 2.5 });
  c.soft(ribbon(cp, (t) => ramp(t, [[0, 0.07], [0.3, 0.13], [1, 0.1]]), 0.01, (t) => mix(CREAM, t > 0.86 ? RUST : '#fff6dc', sstep(0.2, 1, t)), { ref: [1, 0, 0.2], nv: 16 }), 'cloth', rig.chainW(cb, { parent: 'head', blend: 0.05, tip: cp[4] }));

  // óculos de areia (armação retangular com lente âmbar) sobre o turbante
  c.rigid('head', paintUV(band(TR, 0.92, 0.955, 0.03, 26), () => '#3b2a20'), 'std');
  for (const sg of [1, -1]) {
    const hp = tb.fn(0.5 + sg * 0.062, 0.3);
    const dir: V3 = [Math.sin(sg * 0.38), 0.28, Math.cos(0.38)];
    const o = new THREE.Vector3(...dir).normalize(), r = aimZ(dir);
    c.rigid('head', box(0.105, 0.066, 0.04, 0.022, 2), 'std', '#3b2a20', { p: v3(hp.clone().addScaledVector(o, 0.045)), r });
    c.rigid('head', box(0.082, 0.044, 0.02, 0.016, 2), 'glossy', (p) => mix('#b8480f', '#ffd27a', sstep(-0.02, 0.03, p.y + p.x * 0.3)), { p: v3(hp.clone().addScaledVector(o, 0.062)), r });
  }
  const gb = tb.fn(0.5, 0.3);
  c.rigid('head', box(0.04, 0.022, 0.02, 0.006, 1), METAL, BRASS, { p: [0, gb.y, gb.z + 0.055] });

  /* ---------- capa curta rasgada (osso cape) ---------- */
  c.chain('cape', 'chest', [[0, 0.5, -0.13]], { roll: 0.3, pitch: 0.2, lag: 0.09, sway: [0.04, 0.03, 0.04], wind: [0.4, 0, 0], flutter: [0.14, 0.06, 0.06], bounce: 2 });
  const tri = (x: number): number => Math.abs(((x % 1) + 1) % 1 - 0.5) * 2;
  const capeG = cape(T, { yTop: 0.54, len: 0.2, A: 2.05, grow: (v) => 0.02 + 0.075 * sstep(0, 0.4, v) + 0.03 * v, zig: (u) => 0.5 * tri(u * 6.5 + 0.2) - 0.1, nu: 26, nv: 8, back: (v) => 0.03 * v });
  c.soft(paintUV(capeG, (u, v) => mix(mix(RUST, darken(RUST, 0.3), v * 0.6), '#d9a441', v > 0.1 && v < 0.17 ? 0.8 : 0)), CLOTH2, (p) => {
    const k = sstep(0.47, 0.34, p.y) * sstep(-0.05, -0.14, p.z);
    return [...rig.torsoW(p).map(([b, w]) => [b, w * (1 - k)] as [number, number]), [rig.i('cape'), k]];
  });
  c.soft(paintUV(band(T, 0.52, 0.585, 0.028, 20), (_u, _v, p) => mix(darken(RUST, 0.3), RUST, sstep(0.52, 0.59, p.y))), 'cloth', rig.torsoW);

  /* ---------- cauda grossa listrada ---------- */
  const tp: V3[] = [[-0.04, 0.13, -0.09], [-0.21, 0.16, -0.16], [-0.35, 0.22, -0.28], [-0.42, 0.33, -0.42], [-0.39, 0.46, -0.54], [-0.31, 0.54, -0.6]];
  const tl = c.chain('tail', 'hips', [tp[0]!, [-0.29, 0.19, -0.22], [-0.41, 0.3, -0.38]], { roll: 0.28, pitch: 0.15, lag: 0.09, sway: [0.03, 0.1, 0.04], phase: 0.2, wind: [-0.04, 0.03, 0], flutter: [0.03, 0.06, 0.03], bounce: 2 });
  c.soft(plume(tp, (t) => ramp(t, [[0, 0.05], [0.2, 0.074], [0.6, 0.058], [1, 0.0]]) + 0.004, (t, u, n) => {
    const top = Math.cos(u * Math.PI * 2) > -0.2;
    const stripe = Math.sin(t * 30) > 0.35 && top;
    return stripe ? SPOT : mix(top ? SCALE_D : BELLY, top ? SCALE : BELLY, 0.5 + 0.5 * n.y);
  }, 12, 22, [0, 1, 0]), 'std', rig.chainW(tl, { parent: 'hips', blend: 0.07, tip: tp[5] }));

  const my = -c.fy(0.7), ey = -c.fy(0.8);
  return {
    bg: SCALE,
    eye: { x: 84, y: c.fy(0.8), rx: 40, ry: 44, iris: '#f39a1e', irisDark: '#8a3f0c', irisLight: '#ffd45a', slit: true, tilt: 6 },
    brow: { color: SPOT, w: 12, len: 60, gap: 7 },
    mouth: { y: c.fy(0.7), w: 84, line: '#5a2c16', inside: '#7a2a2a', tongue: '#f08a8a' },
    under: () => `<ellipse cx="0" cy="${my + 30}" rx="120" ry="44" fill="${BELLY}"/>`
      + [[0, -62, 9], [-26, -78, 7], [26, -78, 7], [-52, -70, 6], [52, -70, 6], [0, -92, 6], [-140, 20, 8], [140, 20, 8], [-150, 48, 6], [150, 48, 6]].map(([x, y, r]) => `<circle cx="${x}" cy="${ey + y!}" r="${r}" fill="${SPOT}" opacity="0.85"/>`).join(''),
    over: () => `<ellipse cx="-14" cy="${my - 26}" rx="4.5" ry="7" fill="#5a2c16" transform="rotate(25 -14 ${my - 26})"/><ellipse cx="14" cy="${my - 26}" rx="4.5" ry="7" fill="#5a2c16" transform="rotate(-25 14 ${my - 26})"/>`,
  };
}

export const runi: CharDef = { id: 'runi', build };
