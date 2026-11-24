/** Capi — capivara tranquila: cabeçorra quadrada de focinho largo, camisa florida, bermuda, chinelos e uma tangerina equilibrada na cabeça. */
import { THREE, box, cyl, extrude, mix, paint, smoothOutline, sphere, warp, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, headPoint, legProfile, limbRing, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { leafBlade, ribbon, tuft } from './parts';
import { darken, lighten, paintUV, sstep, type Ring } from './shapes';
import { band, ringAtY, vAtY } from './wear';

const FUR = '#9b6a43', FUR_D = '#6b4529', FUR_L = '#c79a6e', PAD = '#3b261b';
const SHIRT = '#ff5fa2', SHIRT_D = '#c23a78', PETAL = '#fff3b0', PETAL_B = '#ffffff', CORE = '#ff9a1f';
const SHORTS = '#25b8b0', SHORTS_D = '#167a76', ORANGE = '#ff8f1f', LEAF = '#4caf3a', FLOP = '#3fb950', FLOP_S = '#ffd23f';

/** Contorno de flor de hibisco (5 pétalas arredondadas). */
function flowerOutline(r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const k = 0.55 + 0.45 * Math.abs(Math.cos((a * 5) / 2));
    pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k]);
  }
  return smoothOutline(pts, 20);
}

function roundEar(r: number, outer: string, inner: string): THREE.BufferGeometry {
  const g = warp(sphere(r, 12, 8).scale(1, 0.9, 0.42), (p) => { if (p.z > 0) p.z *= 0.3 - 0.8 * Math.max(0, 1 - Math.hypot(p.x, p.y) / (r * 0.8)); });
  return paint(g, (p, n) => (n.z > 0 && Math.hypot(p.x, p.y) < r * 0.68 ? mix(inner, darken(inner, 0.35), 1 - Math.hypot(p.x, p.y) / (r * 0.68)) : mix(darken(outer, 0.22), outer, 0.5 + 0.5 * n.y)));
}

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(1.15, 1.17, 0.034, 0.072);
  const furPaint = (p: THREE.Vector3, n: THREE.Vector3): THREE.Color => mix(darken(FUR, 0.25), FUR, 0.55 + 0.45 * n.y + 0.06 * Math.sin(p.y * 90 + p.x * 40));
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y > 0.53) return mix(FUR_D, FUR, sstep(0.53, 0.62, p.y));
      if (p.y < 0.12) return mix(darken(SHORTS, 0.3), SHORTS, 0.5 + 0.5 * n.y);
      const placket = p.z > 0 && Math.abs(p.x) < 0.014 && p.y > 0.16;
      const base = placket ? SHIRT_D : SHIRT;
      return mix(darken(base, 0.28), base, sstep(0.1, 0.45, p.y) * (0.75 + 0.25 * n.y));
    },
    torsoMat: 'cloth',
    arm: {
      r: armProfile(0.066, 0.056, 0.05), mat: 'fur',
      color: (_u, v, p, n) => (v < 0.3 ? mix(darken(SHIRT, 0.28), SHIRT, 0.6 + 0.4 * n.y) : furPaint(p, n)),
    },
    leg: {
      r: (t) => (t < 0.5 ? 0.096 * (0.9 + 0.1 * sstep(0, 0.15, t)) : (legProfile(0.088, 0.072, 0.06)(t) as number)),
      mat: 'fur',
      color: (_u, v, p, n) => (v < 0.5 ? mix(darken(SHORTS, 0.3), v > 0.46 ? SHORTS_D : SHORTS, 0.55 + 0.45 * n.y) : furPaint(p, n)),
    },
    hand: { color: FUR_D, scale: 1.22, mat: 'fur', knuckle: FUR },
    boot: { upper: FUR_D, sole: FLOP, toe: darken(FUR_D, 0.15), scale: 1.2, shaft: FUR, shaftR: 0.062, mat: 'fur' },
  });

  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    // barra da manga e da bermuda
    limbRing(c, `arm${sfx}`, rig.p(`arm${sfx}`), rig.p(`forearm${sfx}`), 0.5, 0.64, 0.068, () => SHIRT_D, 'cloth');
    const hip = rig.p(`leg${sfx}`), knee = rig.p(`shin${sfx}`);
    limbRing(c, `leg${sfx}`, hip, knee, 0.78, 0.92, 0.088, (_u, v) => mix(SHORTS_D, SHORTS, v), 'cloth');
    // chinelo: sola grossa e tira em V (rígidos na canela, mesma transformação do pé)
    const ankle = new THREE.Vector3(sg * rig.ankle[0], rig.ankle[1], rig.ankle[2]);
    const fx = { p: [ankle.x, ankle.y - 0.012, ankle.z + 0.012] as V3, r: [-1.02, sg * -0.1, 0] as V3 };
    c.rigid(`shin${sfx}`, box(0.11, 0.012, 0.21, 0.005, 1).translate(0, -0.056, 0.05), 'rubber', (p) => mix(darken(FLOP, 0.3), FLOP, sstep(-0.062, -0.05, p.y)), fx);
    c.rigid(`shin${sfx}`, box(0.112, 0.005, 0.212, 0.002, 1).translate(0, -0.049, 0.05), 'rubber', FLOP_S, fx);
    for (const s2 of [1, -1]) {
      c.rigid(`shin${sfx}`, ribbon([[0, -0.03, 0.125], [s2 * 0.028, 0.035, 0.085], [s2 * 0.06, 0.03, 0.035], [s2 * 0.066, -0.035, 0.02]], 0.02, 0.01, () => FLOP_S, { ref: [0, 0, 1], nv: 8, nu: 6 }), 'rubber', undefined, fx);
    }
  }

  // camisa florida: flores aplicadas, gola aberta e botões
  const flowers: [number, number][] = [[0.42, 30], [0.3, -25], [0.2, 40], [0.36, 95], [0.23, -95], [0.44, -60], [0.3, 160], [0.4, -150], [0.19, -170], [0.27, 120], [0.42, 60]];
  flowers.forEach(([y, az], i) => {
    const r = ringAtY(T, y);
    const a = (az * Math.PI) / 180;
    const pos: V3 = [r.x + (r.rx + 0.004) * Math.sin(a), y, r.z + ((Math.cos(a) >= 0 ? r.rz : r.rb) + 0.004) * Math.cos(a)];
    const size = 0.034 + 0.01 * ((i * 7) % 3) / 2;
    c.soft(extrude(flowerOutline(size), 0.006), 'cloth', rig.torsoW, i % 3 === 0 ? PETAL_B : PETAL, { p: pos, r: [0, a, i * 0.7] });
    c.soft(sphere(size * 0.28, 8, 6).scale(1, 1, 0.5), 'cloth', rig.torsoW, CORE, { p: [pos[0] + Math.sin(a) * 0.004, pos[1], pos[2] + Math.cos(a) * 0.004] });
  });
  const cz = ringAtY(T, 0.3);
  for (const y of [0.42, 0.32, 0.22]) {
    const r = ringAtY(T, y);
    c.soft(cyl(0.01, 0.01, 0.006, 10).rotateX(Math.PI / 2), 'glossy', rig.torsoW, '#fff6e8', { p: [0, y, r.z + r.rz + 0.004] });
  }
  void cz;
  for (const sg of [1, -1]) {
    // lapela da gola caída sobre o peito
    c.soft(ribbon([[sg * 0.03, 0.545, 0.105], [sg * 0.07, 0.5, 0.142], [sg * 0.095, 0.455, 0.155]], (t) => 0.06 - 0.03 * t, 0.012, () => SHIRT_D, { ref: [0, 0, 1], nv: 6, nu: 6 }), 'cloth', rig.torsoW);
  }
  // cós da bermuda com cordão
  c.soft(paintUV(band(T, 0.1, 0.14, 0.012, 24), () => SHORTS_D), 'cloth', rig.torsoW);
  const bz = ringAtY(T, 0.12);
  for (const sg of [1, -1]) c.soft(ribbon([[sg * 0.012, 0.12, bz.z + bz.rz + 0.012], [sg * 0.02, 0.09, bz.z + bz.rz + 0.02], [sg * 0.016, 0.06, bz.z + bz.rz + 0.022]], 0.008, 0.006, () => '#fff6e8', { nv: 5, nu: 5 }), 'cloth', rig.torsoW);

  /* ---------- cabeça: caixa larga de focinho alto ---------- */
  const H: Ring[] = [
    { y: 0.612, rx: 0.02, rz: 0.02, z: 0.03 },
    { y: 0.632, rx: 0.13, rz: 0.17, rb: 0.12, z: 0.03, e: 2.4 },
    { y: 0.69, rx: 0.188, rz: 0.29, rb: 0.185, z: 0.02, e: 2.9 },
    { y: 0.77, rx: 0.205, rz: 0.32, rb: 0.205, z: 0.02, e: 3.3 },
    { y: 0.85, rx: 0.202, rz: 0.29, rb: 0.205, z: 0.015, e: 3.4 },
    { y: 0.925, rx: 0.19, rz: 0.21, rb: 0.185, z: 0.01, e: 3.2 },
    { y: 0.976, rx: 0.145, rz: 0.14, z: 0.01, e: 2.8 },
    { y: 0.996, rx: 0.01, rz: 0.01, z: 0.01 },
  ];
  // focinho largo e rombudo: estreita um pouco na frente e arredonda a ponta
  const muzzle = (p: THREE.Vector3): void => {
    if (p.z <= 0) return;
    const k = sstep(0.12, 0.33, p.z);
    p.x *= 1 - 0.2 * k;
  };
  const head = buildHead(c, {
    rings: H, mod: muzzle, mat: 'fur', faceU: 0.18, faceV0: 0.18, faceV1: 0.78, nu: 32, nv: 26,
    color: (_u, _v, p, n) => mix(FUR, FUR_D, sstep(0.0, -0.18, p.z) * 0.12 + sstep(0.67, 0.62, p.y) * 0.35 + (n.y < -0.3 ? 0.15 : 0)),
  });
  // nariz: almofada escura no alto do focinho com narinas
  const np = headPoint(head.fn, 0, vAtY(H, 0.815));
  c.rigid('head', box(0.14, 0.07, 0.05, 0.024, 2), 'skin', (p) => mix(PAD, '#5c3b2a', sstep(-0.03, 0.035, p.y)), { p: [0, np.y + 0.004, np.z - 0.016], r: [-0.55, 0, 0] });
  for (const sg of [1, -1]) {
    c.rigid('head', sphere(0.014, 8, 6).scale(1.5, 0.6, 1), 'matte', '#140c08', { p: [sg * 0.034, np.y + 0.026, np.z - 0.0], r: [-0.6, 0, sg * 0.35] });
  }
  // orelhinhas redondas no alto
  for (const sg of [1, -1]) {
    const name = sg > 0 ? 'earL' : 'earR';
    const base: V3 = [sg * 0.15, 0.95, -0.13];
    c.chain(name, 'head', [base], { roll: 0.15, pitch: 0.1, lag: 0.05, sway: [0.02, 0.04, 0.03], wind: [-0.2, 0, 0], flutter: [0.04, 0.03, 0.02], bounce: 1.2 });
    c.rigid(name, roundEar(0.038, FUR, '#5a3826'), 'fur', undefined, { p: [sg * 0.165, 0.968, -0.13], r: [-0.3, sg * 0.75, sg * -0.25] });
  }
  // pelo áspero no topo
  for (const [x, z, len] of [[-0.05, 0.04, 0.05], [0.0, 0.06, 0.07], [0.05, 0.035, 0.05], [0.0, -0.04, 0.05]] as [number, number, number][]) {
    c.rigid('head', tuft([[x, 0.985, z], [x * 1.2, 1.01, z + 0.01], [x * 1.4, 1.0 + len * 0.3, z + len * 0.5]], [0.024, 0.016], FUR_D, FUR, 6, 4), 'fur');
  }

  /* ---------- tangerina equilibrada na cabeça (osso próprio, balança) ---------- */
  const fb: V3 = [0, 0.995, -0.01];
  c.chain('fruit', 'head', [fb], { roll: 0.18, pitch: 0.14, lag: 0.07, sway: [0.04, 0.03, 0.05], wind: [-0.08, 0, 0], flutter: [0.03, 0.02, 0.03], bounce: 2.2 });
  const fr = 0.07;
  c.rigid('fruit', warp(sphere(fr, 16, 12).scale(1, 0.86, 1), (p) => { const k = 1 + 0.03 * Math.sin(Math.atan2(p.z, p.x) * 8); p.x *= k; p.z *= k; }), 'glossy',
    (p, n) => mix(darken(ORANGE, 0.25), lighten(ORANGE, 0.15), 0.5 + 0.5 * n.y + 0.08 * Math.sin(p.x * 300) * Math.sin(p.z * 300)), { p: [fb[0], fb[1] + fr * 0.8, fb[2]] });
  c.rigid('fruit', cyl(0.007, 0.009, 0.022, 6), 'std', '#5a3a20', { p: [0, fb[1] + fr * 1.6 + 0.008, fb[2]] });
  c.rigid('fruit', leafBlade([[0, fb[1] + fr * 1.6 + 0.012, fb[2]], [0.035, fb[1] + fr * 1.6 + 0.03, fb[2] + 0.01], [0.075, fb[1] + fr * 1.6 + 0.032, fb[2] + 0.02]], 0.045, LEAF, lighten(LEAF, 0.25), [0, 0, 1]), 'leaf');

  /* ---------- toalha de praia no pescoço ---------- */
  c.soft(paintUV(band(T, 0.53, 0.6, 0.03, 24), (u, _v, p) => {
    const st = Math.floor((u * 10 + 0.25) % 2) === 0 ? FLOP_S : '#2f9ee0';
    return mix(darken(st, 0.2), st, sstep(0.53, 0.6, p.y));
  }), 'cloth', rig.torsoW);

  const ey = -c.fy(0.878), my = -c.fy(0.69);
  return {
    bg: FUR,
    eye: { x: 112, y: c.fy(0.878), rx: 30, ry: 32, iris: '#5a3622', irisDark: '#2a170c', irisLight: '#8a5a34', sclera: '#f6ead8', tilt: -5 },
    brow: { color: '#4a2c1a', w: 10, len: 44, gap: 7 },
    mouth: { y: c.fy(0.69), w: 48, line: '#3b241a', cat: true },
    blush: '#e9806a',
    under: () => `<ellipse cx="0" cy="${my - 18}" rx="128" ry="74" fill="${FUR_L}" opacity="0.55"/><ellipse cx="0" cy="${my + 10}" rx="84" ry="40" fill="${FUR_L}"/>`
      + [-1, 1].map((s) => `<ellipse cx="${s * 112}" cy="${ey + 6}" rx="44" ry="40" fill="${FUR_D}" opacity="0.22"/>`).join(''),
    over: () => [-1, 1].map((s) => [[44, -4], [58, 6], [70, -6]].map(([x, y]) => `<circle cx="${s * x!}" cy="${my - 30 + y!}" r="3.2" fill="#4a2c1a" opacity="0.7"/>`).join('')).join(''),
  };
}

export const capi: CharDef = { id: 'capi', build };
