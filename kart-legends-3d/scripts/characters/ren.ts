/** Ren — ninja do trovão: cabelo vermelho rebelde preso num rabinho espetado, jaqueta acolchoada roxa com raios amarelos, gola de pelo amarela, cachecol curto e prancha roxa com raios nas costas. */
import { THREE, box, cyl, extrude, mix, rng, smoothOutline, sphere, torus, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, cuff, headPoint, legProfile, limbRing, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { aimZ, mirrorX, ribbon, tuft } from './parts';
import { darken, lighten, loft, paintUV, sstep, sweep } from './shapes';
import { band, cap, humanHead, ringAtY, shell, v3, vAtY } from './wear';

const METAL = defineMaterial('chars_metal', { roughness: 0.38, metalness: 0.45 });
const SKIN = '#f6c8a0', HAIR = '#e8332b', HAIR_D = '#a71c1f', HAIR_L = '#ff7a4f';
const PURPLE = '#7a3cff', PURPLE_D = '#4f25b0', YELLOW = '#ffcf2e', YELLOW_D = '#e09a10', INK = '#1d1b24';
const PANTS = '#2e2a3a', GLOVE = '#27242f', STRAP = '#24212c', BUCKLE = '#e6e1f2';

/** Raio em ziguezague (contorno para extrude), apontando para baixo, altura ~2r. */
function bolt(r: number): [number, number][] {
  return ([[0.2, 1], [-0.5, -0.08], [-0.02, -0.08], [-0.25, -1], [0.55, 0.18], [0.06, 0.18], [0.45, 1]] as [number, number][]).map(([x, y]) => [x * r, y * r]);
}

/** Emblema original: raio amarelo dentro de um anel, sobre disco roxo. Origem no centro, frente em +Z. */
function boltEmblem(c: Ctx, bone: string, r: number, at: V3, rot: V3): void {
  const o = new THREE.Vector3(...at);
  const fwd = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(...rot));
  const up = (k: number): V3 => v3(o.clone().addScaledVector(fwd, k));
  c.rigid(bone, cyl(r * 1.25, r * 1.25, 0.006, 16).rotateX(Math.PI / 2), 'glossy', PURPLE_D, { p: at, r: rot });
  c.rigid(bone, torus(r * 1.05, r * 0.13, 4, 18), 'glossy', YELLOW, { p: up(0.004), r: rot });
  c.rigid(bone, extrude(bolt(r * 0.78), 0.005), 'glossy', YELLOW, { p: up(0.005), r: rot });
}

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(1.04, 1.06, 0.01, 0.052);
  const puff = (y: number): number => Math.abs(Math.sin((y - 0.13) * 34)); // gomos do acolchoado
  const zig = (y: number): number => Math.abs(((y / 0.07) % 2 + 2) % 2 - 1) * 2 - 1; // −1..1 em dente de serra
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y > 0.54) return mix(darken(SKIN, 0.2), SKIN, sstep(0.53, 0.62, p.y));
      if (p.y < 0.15) return mix(darken(PANTS, 0.3), PANTS, 0.55 + 0.45 * n.y);
      return mix(PURPLE_D, PURPLE, 0.6 + 0.4 * n.y);
    },
    arm: {
      r: (t) => (armProfile(0.066, 0.058, 0.05)(t) as number) * (1 + 0.06 * Math.abs(Math.sin(t * 13))),
      color: (_u, v, _p, n) => {
        const base = v < 0.2 ? YELLOW : PURPLE;
        return mix(darken(base, 0.3), darken(base, Math.abs(Math.sin(v * 13)) < 0.25 ? 0.22 : 0), 0.6 + 0.4 * n.y);
      },
    },
    leg: {
      r: legProfile(0.082, 0.068, 0.056),
      color: (_u, _v, _p, n) => mix(darken(PANTS, 0.35), PANTS, 0.55 + 0.45 * n.y),
    },
    hand: { color: SKIN, scale: 1.12, mat: 'skin', knuckle: lighten(SKIN, 0.15) },
    boot: { upper: PURPLE_D, sole: INK, toe: YELLOW, scale: 1.3, shaft: INK, shaftR: 0.07, mat: 'cloth' },
  });

  /* ---------- jaqueta roxa com painéis laterais em raio amarelo ---------- */
  const jacket = shell(T, 0.13, 0.52, (t) => 0.02 + 0.006 * Math.sin(Math.PI * t), {
    nu: 24, nv: 12,
    mod: (p) => { const k = 1 + 0.045 * puff(p.y) ** 0.6; p.x *= k; p.z *= k; },
  });
  c.soft(paintUV(jacket.geo, (_u, v, p, n) => {
    const side = Math.abs(p.x) > 0.125 + 0.025 * zig(p.y) && p.z < 0.07; // borda do painel em ziguezague (raio)
    const yoke = v > 0.82;
    const seam = puff(p.y) < 0.14;
    const base = side ? YELLOW : yoke ? INK : PURPLE;
    const k = seam ? 0.25 : 0;
    return mix(darken(base, 0.28 + k), darken(base, k), sstep(0.13, 0.4, p.y) * (0.65 + 0.35 * n.y));
  }), 'cloth', rig.torsoW);
  const zipPts: V3[] = [0.17, 0.26, 0.35, 0.44, 0.5].map((y) => { const r = ringAtY(T, y); return [0, y, r.z + r.rz + 0.026 + 0.012 * puff(y) ** 0.6]; });
  c.soft(sweep(zipPts, () => [0.009, 0.004], 4, 8, { ref: [0, 0, 1] }), 'glossy', rig.torsoW, YELLOW);
  c.soft(paintUV(band(T, 0.12, 0.165, 0.032, 20), (_u, _v, _p, n) => mix(darken(INK, 0.2), lighten(INK, 0.1), 0.5 + 0.5 * n.y)), 'cloth', rig.torsoW);
  // gola de pelo amarela
  const fluffy = (colr: string) => (u: number, v: number): THREE.Color => mix(darken(colr, 0.18), lighten(colr, 0.06), 0.5 + 0.5 * Math.sin(u * 60 + v * 9));
  c.soft(paintUV(band(T, 0.49, 0.59, 0.052, 22, { mod: (p, th) => { const k = 1 + 0.06 * Math.sin(th * 15); p.x *= k; p.z *= k; } }), fluffy(YELLOW)), 'fur', rig.torsoW);

  /* ---------- braços: punhos pretos, luvas sem dedos, joelheiras amarelas ---------- */
  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    cuff(c, sfx, 0.6, 0.8, 0.064, (_u, v) => mix(INK, lighten(INK, 0.15), v), 'cloth');
    cuff(c, sfx, 0.74, 0.79, 0.066, () => YELLOW, 'glossy');
    cuff(c, sfx, 0.78, 0.92, 0.054, () => GLOVE, 'cloth');
    const E = rig.p(`forearm${sfx}`), Hn = rig.p(`hand${sfx}`);
    const fwd = Hn.clone().sub(E).normalize();
    const yaw = Math.atan2(fwd.x, fwd.z) * 0.6;
    const k = 1.12;
    const glove = paintUV(loft([
      { y: -0.05 * k, rx: 0.014 * k, rz: 0.016 * k },
      { y: -0.043 * k, rx: 0.036 * k, rz: 0.04 * k, e: 2.6 },
      { y: 0.0, rx: 0.042 * k, rz: 0.044 * k, e: 2.8 },
      { y: 0.043 * k, rx: 0.036 * k, rz: 0.04 * k, e: 2.6 },
      { y: 0.05 * k, rx: 0.014 * k, rz: 0.016 * k },
    ], 10, 5, (p) => { p.z -= 0.012 * k; }), (_u, _v, p, n) => mix(darken(GLOVE, 0.3), lighten(GLOVE, 0.15), 0.5 + 0.5 * n.y + (Math.abs(p.y) < 0.004 ? -0.4 : 0)));
    c.rigid(`hand${sfx}`, sg > 0 ? glove : mirrorX(glove), 'cloth', undefined, { p: v3(Hn), r: [-0.12, yaw, 0] });
    const knee = rig.p(`shin${sfx}`);
    const ankle = new THREE.Vector3(sg * rig.ankle[0], rig.ankle[1], rig.ankle[2]);
    const up = knee.clone().sub(ankle).normalize();
    c.rigid(`shin${sfx}`, sphere(0.062, 10, 7).scale(1, 1.05, 0.55), 'rubber', (_p, n) => mix(YELLOW_D, YELLOW, 0.4 + 0.5 * n.y), { p: v3(knee.clone().addScaledVector(up, -0.03).add(new THREE.Vector3(0, 0.035, 0.035))), r: aimZ([0, 0.75, 0.66]) });
  }
  // emblema do raio no ombro direito
  {
    const S = rig.p('armR'), E = rig.p('forearmR');
    const at = S.clone().lerp(E, 0.2).add(new THREE.Vector3(-0.062, 0.02, 0));
    boltEmblem(c, 'armR', 0.026, v3(at), aimZ([-1, 0.35, 0.1]));
  }

  /* ---------- bolsa na coxa esquerda ---------- */
  {
    const hip = rig.p('legL'), knee = rig.p('shinL');
    const mid = hip.clone().lerp(knee, 0.5);
    const dir = knee.clone().sub(hip).normalize();
    limbRing(c, 'legL', hip, knee, 0.62, 0.7, 0.078, () => STRAP, 'std');
    const r = aimZ(v3(dir));
    c.rigid('legL', box(0.03, 0.07, 0.1, 0.012, 1), 'cloth', (_p, n) => mix(PURPLE_D, PURPLE, 0.5 + 0.5 * n.y), { p: [mid.x + 0.085, mid.y + 0.012, mid.z], r });
    c.rigid('legL', box(0.034, 0.03, 0.104, 0.008, 1), 'cloth', YELLOW, { p: [mid.x + 0.087, mid.y + 0.035, mid.z], r });
    c.rigid('legL', box(0.008, 0.014, 0.018), METAL, BUCKLE, { p: [mid.x + 0.105, mid.y + 0.025, mid.z], r });
  }

  /* ---------- arnês ---------- */
  for (const sg of [1, -1]) {
    c.soft(ribbon([[sg * 0.088, 0.24, 0.15], [sg * 0.095, 0.38, 0.158], [sg * 0.1, 0.48, 0.13], [sg * 0.105, 0.55, 0.02], [sg * 0.1, 0.52, -0.12], [sg * 0.09, 0.44, -0.18]], 0.034, 0.012, () => STRAP, { ref: [1, 0, 0], nv: 12, nu: 4 }), 'std', rig.torsoW);
    c.soft(box(0.04, 0.03, 0.014), METAL, rig.torsoW, BUCKLE, { p: [sg * 0.094, 0.31, 0.17] });
  }
  const cz = ringAtY(T, 0.37);
  c.soft(box(0.2, 0.026, 0.012), 'std', rig.torsoW, STRAP, { p: [0, 0.37, cz.z + cz.rz + 0.04] });
  c.soft(box(0.046, 0.036, 0.016, 0.008, 1), METAL, rig.torsoW, BUCKLE, { p: [0, 0.37, cz.z + cz.rz + 0.048] });
  c.soft(box(0.022, 0.014, 0.006), 'glossy', rig.torsoW, YELLOW, { p: [0, 0.37, cz.z + cz.rz + 0.057] });

  /* ---------- cabeça ---------- */
  const H = humanHead(1.03, 1.0, 2.15);
  const head = buildHead(c, {
    rings: H, mat: 'skin', faceU: 0.17, faceV0: 0.2, faceV1: 0.64, nu: 28, nv: 20,
    color: (_u, _v, p) => mix(SKIN, darken(SKIN, 0.22), sstep(0.68, 0.62, p.y)),
  });
  const np = headPoint(head.fn, 0, vAtY(H, 0.765));
  c.rigid('head', sphere(0.016, 8, 6).scale(1, 0.8, 0.8), 'skin', mix(SKIN, '#e8987a', 0.45), { p: [0, np.y, np.z + 0.004] });
  for (const sg of [1, -1]) c.rigid('head', sphere(0.04, 8, 6).scale(0.4, 1, 0.7), 'skin', SKIN, { p: [sg * 0.218, 0.78, 0.0], r: [0, sg * -0.3, 0] });

  /* ---------- cabelo vermelho rebelde, mechas em todas as direções ---------- */
  const hair = cap(H, 0.7, 0.02, { skip: (u, y) => Math.abs(u - 0.5) < 0.2 && y < 0.93, nu: 22, nv: 8 });
  c.rigid('head', paintUV(hair.geo, (_u, _v, p, n) => mix(HAIR_D, HAIR, 0.5 + 0.5 * sstep(0.68, 0.86, p.y) * (0.7 + 0.3 * n.y))), 'fur');
  const rnd = rng(907);
  const cen = new THREE.Vector3(0, 0.82, 0.0);
  // mechas arrepiadas: pontas grossas saindo da calota em direções variadas, levemente puxadas para trás
  const spikes: [number, number, number][] = [
    [-25, 0.93, 0.11], [30, 0.93, 0.12], [-60, 0.86, 0.12], [60, 0.86, 0.12], [-95, 0.8, 0.11], [95, 0.8, 0.11], [0, 0.98, 0.1],
    [-130, 0.84, 0.12], [130, 0.84, 0.12], [180, 0.88, 0.12], [-160, 0.76, 0.1], [160, 0.76, 0.1], [-115, 0.72, 0.09], [115, 0.72, 0.09], [-150, 0.95, 0.11], [150, 0.95, 0.11],
  ];

  const back = new THREE.Vector3(0, 0.1, -1).normalize();
  spikes.forEach(([az, v, len], i) => {
    const b = headPoint(head.fn, az, v);
    const out = b.clone().sub(cen).normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(out).normalize();
    const d = out.clone().addScaledVector(back, 0.35).addScaledVector(side, (rnd() - 0.5) * 0.9).normalize();
    const p0 = b.clone().addScaledVector(out, -0.035);
    const p1 = b.clone().addScaledVector(d, len * 0.4).addScaledVector(out, 0.012);
    const p2 = b.clone().addScaledVector(d, len);
    c.rigid('head', tuft([v3(p0), v3(p1), v3(p2)], [0.04, 0.055], i % 3 === 1 ? HAIR_D : HAIR, HAIR_L, 6, 5, v3(out)), 'fur');
  });
  // franja curta em pontas
  ([[48, 0.1, 0.4], [24, 0.12, 0.2], [0, 0.11, -0.1], [-24, 0.12, -0.3], [-48, 0.1, -0.5]] as [number, number, number][]).forEach(([az, len, sw]) => {
    const b = headPoint(head.fn, az, vAtY(H, 0.96));
    const e = headPoint(head.fn, az + sw * 30, vAtY(H, 0.96 - len * 0.75));
    const o = b.clone().setY(0).normalize();
    c.rigid('head', tuft([v3(b.clone().addScaledVector(o, 0.008)), v3(b.clone().lerp(e, 0.5).addScaledVector(o, 0.032)), v3(e.clone().addScaledVector(o, 0.02))], [0.022, 0.055], HAIR, HAIR_L, 6, 5, [0, 0, 1]), 'fur');
  });
  for (const sg of [1, -1]) {
    c.rigid('head', tuft([[sg * 0.195, 0.9, 0.07], [sg * 0.224, 0.8, 0.075], [sg * 0.214, 0.71, 0.07]], [0.02, 0.038], HAIR, HAIR_D, 6, 4, [0, 0, 1]), 'fur');
  }
  // rabinho espetado na nuca (osso "hair"), preso por um elástico amarelo
  const tie: V3 = [0, 0.84, -0.245];
  c.chain('hair', 'head', [tie], { roll: 0.3, pitch: 0.25, lag: 0.07, sway: [0.06, 0.02, 0.06], wind: [0.25, 0, 0], flutter: [0.1, 0.04, 0.08], bounce: 2.8 });
  c.rigid('hair', torus(0.03, 0.012, 6, 12), 'glossy', YELLOW, { p: tie, r: [0.35, 0, 0] });
  ([[0, 0.05, 0.2], [0.07, -0.01, 0.17], [-0.07, -0.01, 0.17], [0.03, -0.08, 0.16], [-0.035, 0.09, 0.15], [0.0, -0.03, 0.19]] as [number, number, number][]).forEach(([dx, dy, len], i) => {
    const t0 = new THREE.Vector3(...tie);
    const d = new THREE.Vector3(dx * 4, dy * 4 - 0.35, -1).normalize();
    const p1 = t0.clone().addScaledVector(d, len * 0.5);
    const p2 = t0.clone().addScaledVector(d, len).add(new THREE.Vector3(0, i % 2 ? 0.01 : -0.01, 0));
    c.rigid('hair', tuft([v3(t0.clone().addScaledVector(d, -0.01)), v3(p1), v3(p2)], [0.03, 0.045], i % 2 ? HAIR_D : HAIR, HAIR_L, 6, 5, [0, 1, 0]), 'fur');
  });

  /* ---------- cachecol amarelo curto de duas pontas ---------- */
  const knot: V3 = [-0.03, 0.56, -0.11];
  c.soft(sphere(0.034, 8, 6).scale(1.2, 0.9, 0.8), 'cloth', rig.torsoW, (_p, n) => mix(YELLOW_D, YELLOW, 0.5 + 0.5 * n.y), { p: knot });
  const tails: { name: string; pts: V3[]; w: number; ph: number }[] = [
    { name: 'scarfA', pts: [[-0.04, 0.565, -0.13], [-0.09, 0.6, -0.23], [-0.135, 0.61, -0.32], [-0.165, 0.6, -0.4], [-0.18, 0.585, -0.45]], w: 0.065, ph: 0.2 },
    { name: 'scarfB', pts: [[-0.04, 0.545, -0.13], [-0.075, 0.565, -0.21], [-0.105, 0.565, -0.29], [-0.125, 0.55, -0.35], [-0.135, 0.535, -0.39]], w: 0.055, ph: 0.5 },
  ];
  // pontas curtas e erguidas, com o vento levantando e pouco balanço vertical (caídas, entravam no bagageiro/santantônio/encosto dos karts)
  for (const t of tails) {
    const bones = c.chain(t.name, 'chest', [t.pts[0]!, t.pts[1]!, t.pts[2]!], { roll: 0.3, pitch: 0.22, lag: 0.08, sway: [0.02, 0.09, 0.05], phase: t.ph, wind: [0.12, 0, 0], flutter: [0.14, 0.18, 0.1], bounce: 2.4 });
    const w = rig.chainW(bones, { parent: 'chest', blend: 0.05, tip: t.pts[4] });
    c.soft(ribbon(t.pts, (s) => t.w * 1.25 * (1 - 0.25 * s), 0.014, (s) => (s > 0.84 ? INK : YELLOW), { ref: [1, -0.35, 0], nv: 10, nu: 6 }), 'cloth', w);
  }

  /* ---------- mochila com duas antenas para-raios ---------- */
  const pz = -0.19;
  c.rigid('chest', box(0.2, 0.21, 0.08, 0.03, 1), 'cloth', (_p, n) => mix(darken(PURPLE_D, 0.3), PURPLE_D, 0.5 + 0.5 * n.y), { p: [0, 0.5, pz] });
  c.rigid('chest', box(0.205, 0.05, 0.086, 0.022, 1), 'cloth', (_p, n) => mix(INK, lighten(INK, 0.15), 0.5 + 0.5 * n.y), { p: [0, 0.59, pz] });
  for (const sg of [1, -1]) {
    const base = new THREE.Vector3(sg * 0.075, 0.615, pz - 0.01);
    c.rigid('chest', cyl(0.012, 0.014, 0.02, 8), 'rubber', INK, { p: v3(base) });
    c.rigid('chest', cyl(0.0045, 0.0045, 0.16, 6), METAL, '#c9ccd6', { p: v3(base.clone().add(new THREE.Vector3(sg * 0.012, 0.085, -0.004))), r: [-0.08, 0, -sg * 0.14] });
    c.rigid('chest', sphere(0.013, 8, 6), 'glossy', YELLOW, { p: v3(base.clone().add(new THREE.Vector3(sg * 0.024, 0.165, -0.01))) });
  }
  boltEmblem(c, 'chest', 0.024, [0.104, 0.5, pz], aimZ([1, 0, 0]));
  boltEmblem(c, 'chest', 0.024, [-0.104, 0.5, pz], aimZ([-1, 0, 0]));

  /* ---------- prancha roxa com raios amarelos (ponta alta no ombro esquerdo) ---------- */
  const bL = 0.44, bW = 0.15;
  // mais curta, mais alta e com a ponta de baixo para a frente (acompanha a inclinação dos encostos dos karts); a ponta de baixo atravessava o encosto
  const tilt = -0.15;
  const outline = smoothOutline([[-bW / 2, -bL / 2 + 0.05], [-bW / 2 + 0.012, 0], [-bW / 2, bL / 2 - 0.05], [-bW / 2 + 0.03, bL / 2 - 0.005], [0, bL / 2], [bW / 2 - 0.03, bL / 2 - 0.005], [bW / 2, bL / 2 - 0.05], [bW / 2 - 0.012, 0], [bW / 2, -bL / 2 + 0.05], [bW / 2 - 0.03, -bL / 2 + 0.005], [0, -bL / 2], [-bW / 2 + 0.03, -bL / 2 + 0.005]], 26);
  const ang = -0.5;
  const bc: V3 = [0.01, 0.64, -0.262];
  const boardRot = new THREE.Euler(tilt, 0, ang);
  const onBoard = (x: number, y: number, z: number): V3 => v3(new THREE.Vector3(x, y, z).applyEuler(boardRot).add(new THREE.Vector3(...bc)));
  c.rigid('chest', extrude(outline, 0.018, 0.004), 'glossy', (p, n) => {
    if (n.z > 0.5) return PURPLE_D;
    if (Math.abs(n.z) < 0.5) return INK;
    return mix(PURPLE_D, PURPLE, sstep(-0.25, 0.25, p.y));
  }, { p: bc, r: [tilt, 0, ang] });
  // raios amarelos como decalques (a tampa do extrude só tem vértices no contorno)
  const fq = new THREE.Quaternion().setFromEuler(boardRot).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
  const fe = new THREE.Euler().setFromQuaternion(fq, 'XYZ');
  const faceRot: V3 = [fe.x, fe.y, fe.z];
  for (const [x, y, s] of [[0.01, 0.02, 0.05], [-0.022, 0.165, 0.025], [0.027, -0.165, 0.025]] as [number, number, number][]) {
    c.rigid('chest', extrude(bolt(s), 0.004), 'glossy', YELLOW, { p: onBoard(x, y, -0.0135), r: faceRot });
  }
  for (const yb of [-0.11, 0.11]) {
    const local = new THREE.Vector3(0, yb, -0.02).applyEuler(boardRot).add(new THREE.Vector3(...bc));
    c.rigid('chest', box(0.13, 0.05, 0.02, 0.008, 1), 'std', STRAP, { p: v3(local), r: [tilt, 0, ang] });
    const strap = new THREE.Vector3(0, yb + 0.012, -0.034).applyEuler(boardRot).add(new THREE.Vector3(...bc));
    c.rigid('chest', box(0.11, 0.024, 0.014), 'cloth', YELLOW_D, { p: v3(strap), r: [tilt, 0, ang] });
  }
  c.rigid('chest', box(0.2, 0.022, 0.012), 'std', STRAP, { p: [0, 0.54, -0.264], r: [tilt, 0, 0] });
  c.rigid('chest', box(0.03, 0.03, 0.016), METAL, BUCKLE, { p: [0.08, 0.54, -0.272], r: [tilt, 0, 0] });

  return {
    bg: SKIN,
    eye: { x: 70, y: c.fy(0.795), rx: 37, ry: 42, iris: '#f2a227', irisDark: '#8a4a08', irisLight: '#ffe08a', tilt: 6, line: '#2a1612' },
    brow: { color: '#b8221f', w: 11, len: 48, gap: 6 },
    mouth: { y: c.fy(0.69), w: 50, line: '#6e2a1c' },
    blush: '#ff8a6a',
  };
}

export const ren: CharDef = { id: 'ren', build };
