/** Kora — guardiã do bosque: cabelo de folhas, galhadas, capa de folhas, braçadeiras de casca e flor luminosa. */
import { THREE, mix, rng, sphere, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, cuff, headPoint, legProfile, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { leafBlade, tuft } from './parts';
import { darken, lighten, paintUV, sstep, sweep } from './shapes';
import { band, cap, humanHead, ringAtY, v3, vAtY } from './wear';

const SKIN = '#c98d5c', LEAF = '#3fa650', LEAF_D = '#1f6b34', LEAF_L = '#9bd45a', BARK = '#6e4a2c', BARK_D = '#3f2a1a', GOLD = '#f4d35e', MOSS = '#2f7d4a', CREAM = '#efe6c8';

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const rnd = rng(404);
  const T = torsoRings(0.88, 0.9, 0, 0.05);
  buildBody(c, {
    torso: T,
    torsoColor: (u, _v, p, n) => {
      if (p.y > 0.535) return mix(darken(SKIN, 0.2), SKIN, sstep(0.53, 0.62, p.y));
      // túnica com barra em folhas
      const hem = p.y < 0.1 + 0.03 * Math.sin(u * Math.PI * 16);
      const base = hem ? LEAF_D : mix(MOSS, LEAF, sstep(0.1, 0.5, p.y));
      return mix(darken(base, 0.25), base, 0.65 + 0.35 * n.y);
    },
    arm: { r: armProfile(0.05, 0.04, 0.036), mat: 'skin', color: (u, v, _p, n) => (v < 0.3 + 0.03 * Math.sin(u * Math.PI * 10) ? mix(LEAF_D, LEAF, 0.6 + 0.4 * n.y) : mix(darken(SKIN, 0.22), SKIN, 0.6 + 0.4 * n.y)) },
    leg: { r: legProfile(0.07, 0.056, 0.046), color: (u, v, _p, n) => (v < 0.42 + 0.03 * Math.sin(u * Math.PI * 12) ? mix(LEAF_D, MOSS, 0.6 + 0.4 * n.y) : mix(darken(BARK, 0.3), BARK, 0.6 + 0.4 * n.y)) },
    hand: { color: SKIN, scale: 1.02, mat: 'skin', knuckle: lighten(SKIN, 0.15) },
    boot: { upper: BARK, sole: BARK_D, toe: MOSS, scale: 1.02, shaft: LEAF_D, shaftR: 0.058 },
  });
  // braçadeiras de casca (caneladas) e folhas no cano da bota
  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    cuff(c, sfx, 0.3, 0.84, 0.05, (u, v) => mix(BARK_D, mix(BARK, '#8b6238', 0.5 + 0.5 * Math.sin(u * Math.PI * 16)), 0.4 + 0.6 * Math.sin(Math.PI * v)), 'std', 8);
    cuff(c, sfx, 0.26, 0.33, 0.054, () => LEAF_L, 'std');
    cuff(c, sfx, 0.82, 0.89, 0.052, () => LEAF_L, 'std');
    // ombreira de folhas
    const S = rig.p(`arm${sfx}`);
    for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.7;
      c.rigid(`arm${sfx}`, leafBlade([[S.x - sg * 0.02, S.y + 0.045, S.z + Math.sin(a) * 0.02], [S.x + sg * 0.05, S.y + 0.05, S.z + Math.sin(a) * 0.07], [S.x + sg * 0.1, S.y + 0.0, S.z + Math.sin(a) * 0.12 + 0.01]], 0.085, k === 1 ? LEAF_L : LEAF, LEAF_D, [0, 0, 1]), 'leaf');
    }
  }
  // cinto de cipó com semente dourada
  c.soft(paintUV(band(T, 0.2, 0.235, 0.012, 22), (u) => mix(BARK_D, BARK, 0.5 + 0.5 * Math.sin(u * Math.PI * 40))), 'std', rig.torsoW);
  const bz = ringAtY(T, 0.218);
  c.soft(sphere(0.024, 10, 8).scale(1, 1.2, 0.7), 'glow_warm', rig.torsoW, GOLD, { p: [0, 0.218, bz.z + bz.rz + 0.012] });
  // colar de folhas
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.35, r0 = 0.06, r1 = 0.15;
    const pts: V3[] = [[Math.sin(a) * r0, 0.56, Math.cos(a) * r0], [Math.sin(a) * (r0 + r1) * 0.55, 0.56, Math.cos(a) * (r0 + r1) * 0.55], [Math.sin(a) * r1, 0.505, Math.cos(a) * r1 * 0.9]];
    c.soft(leafBlade(pts, 0.085, k % 2 ? LEAF : LEAF_L, LEAF_D, [0, 1, 0], 6), 'leaf', rig.torsoW);
  }

  /* ---------- cabeça ---------- */
  const H = humanHead(1.0, 1.0, 2.1);
  const head = buildHead(c, {
    rings: H, mat: 'skin', faceU: 0.17, faceV0: 0.2, faceV1: 0.64,
    color: (_u, _v, p) => mix(SKIN, darken(SKIN, 0.25), sstep(0.68, 0.62, p.y)),
  });
  const np = headPoint(head.fn, 0, vAtY(H, 0.765));
  c.rigid('head', sphere(0.018, 8, 6).scale(1, 0.8, 0.8), 'skin', mix(SKIN, '#b06f48', 0.4), { p: [0, np.y, np.z + 0.004] });
  for (const sg of [1, -1]) {
    // orelhas pontudas de elfa do bosque
    c.rigid('head', tuft([[sg * 0.2, 0.78, 0.0], [sg * 0.26, 0.81, -0.02], [sg * 0.32, 0.86, -0.05]], [0.045, 0.016], SKIN, lighten(SKIN, 0.1), 8, 5, [0, 1, 0]), 'skin');
  }
  // cabelo: touca verde-escura + camadas de folhas
  const hair = cap(H, 0.7, 0.012, { skip: (u, y) => Math.abs(u - 0.5) < 0.2 && y < 0.9, nu: 22, nv: 9 });
  c.rigid('head', paintUV(hair.geo, (_u, _v, p) => mix(darken(LEAF_D, 0.35), LEAF_D, sstep(0.7, 1.03, p.y))), 'leaf');
  const cen = new THREE.Vector3(0, 0.82, 0);
  const leafAt = (az: number, v: number, len: number, w: number, droop: number, bone = 'head', lift = 0.03): void => {
    const b = headPoint(head.fn, az, v);
    const out = b.clone().sub(cen).setY(0).normalize();
    const p0 = b.clone().addScaledVector(out, 0.004).add(new THREE.Vector3(0, 0.015, 0));
    const p1 = b.clone().addScaledVector(out, lift + len * 0.25).add(new THREE.Vector3(0, -len * 0.35 * droop, 0));
    const p2 = b.clone().addScaledVector(out, lift + len * 0.3).add(new THREE.Vector3(0, -len * droop, 0));
    const tone = rnd();
    const side = new THREE.Vector3(-out.z, 0, out.x);
    c.rigid(bone, leafBlade([v3(p0), v3(p1), v3(p2)], w, tone < 0.33 ? LEAF_L : tone < 0.7 ? LEAF : MOSS, LEAF_D, v3(side), 6), 'leaf');
  };
  // coroa (de cima para baixo) — atrás e dos lados
  for (let i = 0; i < 7; i++) leafAt(95 + i * 28.5 + (rnd() - 0.5) * 8, 0.92, 0.2, 0.13, 0.75);
  for (let i = 0; i < 8; i++) leafAt(80 + i * 28 + (rnd() - 0.5) * 8, 0.8, 0.24, 0.14, 0.95);
  for (let i = 0; i < 7; i++) leafAt(98 + i * 27 + (rnd() - 0.5) * 8, 0.64, 0.24, 0.13, 1.0);
  // franja
  [-56, -36, -16, 4, 24, 44, 62].forEach((az, i) => {
    const o = headPoint(head.fn, az, 0.8).sub(cen).setY(0).normalize();
    const drop = 0.855 - Math.abs(az) * 0.0012 + (i % 2) * 0.02;
    const p0 = headPoint(head.fn, az, vAtY(H, 0.975)).addScaledVector(o, 0.018);
    const p1 = headPoint(head.fn, az, vAtY(H, 0.925)).addScaledVector(o, 0.045);
    const p2 = headPoint(head.fn, az * 1.04, vAtY(H, drop)).addScaledVector(o, 0.03);
    c.rigid('head', leafBlade([v3(p0), v3(p1), v3(p2)], 0.115, i % 2 ? LEAF_L : LEAF, i % 2 ? LEAF : LEAF_D, [-o.z, 0, o.x], 5), 'leaf');
  });
  // rabo de folhas (ossos hair1..2); mais curto, a ponta entrava no encosto dos karts
  const hb = c.chain('hair', 'head', [[0, 0.74, -0.2], [0, 0.62, -0.27]], { roll: 0.35, pitch: 0.25, lag: 0.08, sway: [0.05, 0.06, 0.06], phase: 0.2, wind: [0.45, 0, 0], flutter: [0.1, 0.14, 0.08], bounce: 2.5 });
  const hw = rig.chainW(hb, { parent: 'head', blend: 0.04, tip: [0, 0.53, -0.29] });
  c.soft(sweep([[0, 0.76, -0.17], [0, 0.72, -0.22], [0, 0.62, -0.265], [0, 0.54, -0.28]], (t) => 0.035 * (1 - t * 0.7), 8, 8), 'leaf', hw, LEAF_D);
  for (let k = 0; k < 9; k++) {
    const y = 0.74 - (k % 5) * 0.05 - (k > 4 ? 0.02 : 0), a = k * 2.4;
    const z = -0.2 - (0.74 - y) * 0.42;
    c.soft(leafBlade([[0, y, z], [Math.sin(a) * 0.06, y - 0.05, z - 0.03 + Math.cos(a) * 0.03], [Math.sin(a) * 0.09, y - 0.1, z - 0.03 + Math.cos(a) * 0.04]], 0.1, k % 3 === 0 ? LEAF_L : LEAF, LEAF_D, [Math.cos(a), 0, -Math.sin(a) * 0.6], 6), 'leaf', hw);
  }
  c.soft(sphere(0.03, 8, 6).scale(1.15, 0.6, 1.15), 'std', hw, GOLD, { p: [0, 0.745, -0.205], r: [0.5, 0, 0] });

  // galhadas de cervo
  for (const sg of [1, -1]) {
    const b0 = headPoint(head.fn, sg * 52, 0.9);
    const main: V3[] = [[b0.x - sg * 0.02, b0.y - 0.03, b0.z], [b0.x + sg * 0.03, b0.y + 0.07, b0.z - 0.01], [b0.x + sg * 0.085, b0.y + 0.14, b0.z - 0.04], [b0.x + sg * 0.1, b0.y + 0.22, b0.z - 0.02]];
    const paintBark = (p: THREE.Vector3): THREE.Color => mix(BARK_D, CREAM, sstep(b0.y, b0.y + 0.24, p.y) * 0.75);
    c.rigid('head', sweep(main, (t) => 0.02 * (1 - t * 0.7), 7, 9), 'std', paintBark);
    c.rigid('head', sweep([main[1]!, [b0.x + sg * 0.035, b0.y + 0.12, b0.z + 0.05], [b0.x + sg * 0.03, b0.y + 0.17, b0.z + 0.08]], (t) => 0.014 * (1 - t * 0.7), 6, 5), 'std', paintBark);
    c.rigid('head', sweep([main[2]!, [b0.x + sg * 0.14, b0.y + 0.16, b0.z - 0.06], [b0.x + sg * 0.175, b0.y + 0.2, b0.z - 0.06]], (t) => 0.012 * (1 - t * 0.7), 6, 5), 'std', paintBark);
    c.rigid('head', leafBlade([main[3]!, [main[3]![0] + sg * 0.02, main[3]![1] + 0.03, main[3]![2] + 0.02], [main[3]![0] + sg * 0.05, main[3]![1] + 0.04, main[3]![2] + 0.045]], 0.04, LEAF_L, LEAF, [0, 0, 1], 4), 'leaf');
  }
  // flor luminosa na têmpora esquerda
  const fp = headPoint(head.fn, 62, 0.74);
  const fo = fp.clone().sub(cen).setY(0).normalize();
  const fc = fp.clone().addScaledVector(fo, 0.03);
  const fu = new THREE.Vector3(0, 1, 0), fs = new THREE.Vector3().crossVectors(fu, fo);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const d = fu.clone().multiplyScalar(Math.cos(a)).addScaledVector(fs, Math.sin(a));
    c.rigid('head', leafBlade([v3(fc), v3(fc.clone().addScaledVector(d, 0.035).addScaledVector(fo, 0.02)), v3(fc.clone().addScaledVector(d, 0.075).addScaledVector(fo, 0.012))], 0.05, '#fff3a8', GOLD, v3(new THREE.Vector3().crossVectors(d, fo)), 5), 'glow_warm');
  }
  c.rigid('head', sphere(0.02, 8, 6), 'glow_white', '#fffbe0', { p: v3(fc.clone().addScaledVector(fo, 0.02)) });

  /* ---------- capa de folhas (osso cape) ---------- */
  // vento menor: a barra da capa batia no encosto dos karts
  c.chain('cape', 'chest', [[0, 0.5, -0.12]], { roll: 0.3, pitch: 0.2, lag: 0.09, sway: [0.04, 0.03, 0.04], wind: [0.15, 0, 0], flutter: [0.12, 0.06, 0.05], bounce: 2 });
  const capeW = (p: THREE.Vector3): [number, number][] => {
    const k = sstep(0.5, 0.36, p.y) * sstep(-0.08, -0.16, p.z);
    return [[rig.i('chest'), 1 - k], [rig.i('cape'), k]];
  };
  // folhas mais curtas e rentes às costas: as pontas entravam no encosto dos karts
  const rows: [number, number, number, number][] = [[0.53, 5, 0.17, 0.15], [0.47, 4, 0.15, 0.16]];
  rows.forEach(([y, n, len, w], ri) => {
    for (let k = 0; k < n; k++) {
      const a = Math.PI + (k - (n - 1) / 2) * (ri ? 0.5 : 0.52);
      const r0 = ri ? 0.13 : 0.1, r1 = ri ? 0.25 : 0.23;
      const pts: V3[] = [[Math.sin(a) * r0, y, Math.cos(a) * r0 * 0.8], [Math.sin(a) * (r0 + r1) * 0.55, y - len * 0.3, Math.cos(a) * (r0 + r1) * 0.5], [Math.sin(a) * r1, y - len, Math.cos(a) * r1 * 0.85]];
      c.soft(leafBlade(pts, w, (k + ri) % 2 ? LEAF : MOSS, ri ? LEAF_D : darken(LEAF_D, 0.2), [Math.cos(a), 0, -Math.sin(a)], 7), 'leaf', capeW);
    }
  });

  return {
    bg: SKIN,
    eye: { x: 70, y: c.fy(0.79), rx: 37, ry: 46, iris: '#58b94a', irisDark: '#24602c', irisLight: '#c9f27a', lash: true, tilt: 5 },
    brow: { color: LEAF_D, w: 8, len: 48, gap: 9 },
    mouth: { y: c.fy(0.69), w: 36, line: '#6b3320' },
    blush: '#f0705a',
    over: () => [-1, 1].map((s) => `<path transform="translate(${s * 112} ${-c.fy(0.735)}) rotate(${s * 25})" d="M0 -11 Q8 0 0 11 Q-8 0 0 -11 Z" fill="${GOLD}"/><circle cx="${s * 96}" cy="${-c.fy(0.722)}" r="4" fill="${GOLD}"/>`).join(''),
  };
}

export const kora: CharDef = { id: 'kora', build };
