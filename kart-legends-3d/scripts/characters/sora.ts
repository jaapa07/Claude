/** Sora — ninja do vento: cabelo verde-azulado escuro numa trança grossa que balança, jaqueta acolchoada branca e menta com painéis azul-céu, gola de pelo branca, cachecol cinza-claro e uma pipa-planador dobrada nas costas. */
import { THREE, box, cyl, extrude, mix, sphere, torus, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, cuff, headPoint, legProfile, limbRing, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { aimZ, mirrorX, ribbon, tuft } from './parts';
import { darken, lighten, loft, paintUV, sstep, surf, sweep } from './shapes';
import { band, cap, humanHead, ringAtY, shell, v3, vAtY } from './wear';

const METAL = defineMaterial('chars_metal', { roughness: 0.38, metalness: 0.45 });
const SKIN = '#f8d2b2', HAIR = '#1f6b68', HAIR_D = '#113e3d', HAIR_L = '#3d9a92';
const WHITE = '#f4fafa', WHITE_D = '#c8dada', MINT = '#7fe6cc', MINT_D = '#3cbfa2', SKY = '#5ab6ff', SKY_D = '#2f84d2';
const SCARF = '#c7ccd4', PANTS = '#3a4652', GLOVE = '#2e3a44', STRAP = '#34404b', BUCKLE = '#e4eef2';

/** Nuvem estilizada (contorno para extrude): três bolhas sobre uma base reta, centro na origem, largura ~2r. */
function cloud(r: number): [number, number][] {
  const circles: [number, number, number][] = [[-0.55, -0.08, 0.36], [0.05, 0.12, 0.5], [0.6, -0.06, 0.36]];
  const yb = -0.36;
  const pts: [number, number][] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    let far = 0;
    for (const [cx, cy, cr] of circles) {
      const b = dx * cx + dy * cy, cc = cx * cx + cy * cy - cr * cr, disc = b * b - cc;
      if (disc >= 0) far = Math.max(far, b + Math.sqrt(disc));
    }
    if (dy < 0) far = Math.min(far, yb / dy);
    pts.push([dx * far * r, dy * far * r]);
  }
  return pts;
}

/** Emblema original: nuvem branca com três linhas de vento retas, sobre disco azul-céu. Origem no centro, frente em +Z. */
function cloudEmblem(c: Ctx, bone: string, r: number, at: V3, rot: V3): void {
  const o = new THREE.Vector3(...at);
  const e = new THREE.Euler(...rot);
  const loc = (x: number, y: number, z: number): V3 => v3(new THREE.Vector3(x, y, z).applyEuler(e).add(o));
  c.rigid(bone, cyl(r * 1.3, r * 1.3, 0.006, 18).rotateX(Math.PI / 2), 'glossy', SKY_D, { p: at, r: rot });
  c.rigid(bone, extrude(cloud(r * 0.72), 0.005), 'glossy', WHITE, { p: loc(0, r * 0.18, 0.005), r: rot });
  // três linhas de vento retas (sem espiral), de comprimentos diferentes
  ([[-0.15, -0.42, 1.1], [0.1, -0.64, 0.8], [-0.05, -0.86, 0.55]] as [number, number, number][]).forEach(([x, y, len]) => {
    c.rigid(bone, box(len * r, 0.09 * r + 0.002, 0.004, 0.0015, 1), 'glossy', WHITE, { p: loc(x * r, y * r + r * 0.18, 0.005), r: rot });
  });
}

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(1.0, 1.04, 0.01, 0.05);
  const puff = (y: number): number => Math.abs(Math.sin((y - 0.13) * 34)); // gomos do acolchoado
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y > 0.54) return mix(darken(SKIN, 0.2), SKIN, sstep(0.53, 0.62, p.y));
      if (p.y < 0.15) return mix(darken(PANTS, 0.3), PANTS, 0.55 + 0.45 * n.y);
      return mix(WHITE_D, WHITE, 0.6 + 0.4 * n.y);
    },
    arm: {
      r: (t) => (armProfile(0.064, 0.056, 0.048)(t) as number) * (1 + 0.06 * Math.abs(Math.sin(t * 13))),
      color: (_u, v, _p, n) => {
        const base = v < 0.2 ? MINT : WHITE;
        return mix(darken(base, 0.22), darken(base, Math.abs(Math.sin(v * 13)) < 0.25 ? 0.14 : 0), 0.6 + 0.4 * n.y);
      },
    },
    leg: {
      r: legProfile(0.08, 0.066, 0.054),
      color: (_u, _v, _p, n) => mix(darken(PANTS, 0.35), PANTS, 0.55 + 0.45 * n.y),
    },
    hand: { color: SKIN, scale: 1.08, mat: 'skin', knuckle: lighten(SKIN, 0.15) },
    boot: { upper: MINT_D, sole: '#2a3138', toe: WHITE, scale: 1.25, shaft: WHITE, shaftR: 0.068, mat: 'cloth' },
  });

  /* ---------- jaqueta branca e menta com painéis laterais azul-céu ---------- */
  const jacket = shell(T, 0.13, 0.52, (t) => 0.02 + 0.006 * Math.sin(Math.PI * t), {
    nu: 24, nv: 12,
    mod: (p) => { const k = 1 + 0.045 * puff(p.y) ** 0.6; p.x *= k; p.z *= k; },
  });
  c.soft(paintUV(jacket.geo, (_u, v, p, n) => {
    const side = Math.abs(p.x) > 0.13 && p.z < 0.06;
    const yoke = v > 0.8;
    const seam = puff(p.y) < 0.14;
    const base = side ? SKY : yoke ? MINT : WHITE;
    const k = seam ? 0.16 : 0;
    return mix(darken(base, 0.22 + k), darken(base, k), sstep(0.13, 0.4, p.y) * (0.65 + 0.35 * n.y));
  }), 'cloth', rig.torsoW);
  const zipPts: V3[] = [0.17, 0.26, 0.35, 0.44, 0.5].map((y) => { const r = ringAtY(T, y); return [0, y, r.z + r.rz + 0.026 + 0.012 * puff(y) ** 0.6]; });
  c.soft(sweep(zipPts, () => [0.009, 0.004], 4, 8, { ref: [0, 0, 1] }), 'glossy', rig.torsoW, MINT_D);
  c.soft(paintUV(band(T, 0.12, 0.165, 0.032, 20), (_u, _v, _p, n) => mix(MINT_D, MINT, 0.5 + 0.5 * n.y)), 'cloth', rig.torsoW);
  const fluffy = (colr: string) => (u: number, v: number): THREE.Color => mix(darken(colr, 0.14), colr, 0.5 + 0.5 * Math.sin(u * 60 + v * 9));
  c.soft(paintUV(band(T, 0.49, 0.585, 0.05, 22, { mod: (p, th) => { const k = 1 + 0.05 * Math.sin(th * 15); p.x *= k; p.z *= k; } }), fluffy(WHITE)), 'fur', rig.torsoW);

  /* ---------- braços: punhos menta, luvas sem dedos, joelheiras azul-céu ---------- */
  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    cuff(c, sfx, 0.6, 0.8, 0.062, (_u, v) => mix(MINT_D, MINT, v), 'cloth');
    cuff(c, sfx, 0.78, 0.92, 0.052, () => GLOVE, 'cloth');
    const E = rig.p(`forearm${sfx}`), Hn = rig.p(`hand${sfx}`);
    const fwd = Hn.clone().sub(E).normalize();
    const yaw = Math.atan2(fwd.x, fwd.z) * 0.6;
    const k = 1.08;
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
    c.rigid(`shin${sfx}`, sphere(0.058, 10, 7).scale(1, 1.05, 0.55), 'rubber', (_p, n) => mix(SKY_D, SKY, 0.4 + 0.5 * n.y), { p: v3(knee.clone().addScaledVector(up, -0.03).add(new THREE.Vector3(0, 0.035, 0.035))), r: aimZ([0, 0.75, 0.66]) });
  }
  // emblema da nuvem no ombro esquerdo
  {
    const S = rig.p('armL'), E = rig.p('forearmL');
    const at = S.clone().lerp(E, 0.2).add(new THREE.Vector3(0.06, 0.02, 0));
    cloudEmblem(c, 'armL', 0.025, v3(at), aimZ([1, 0.35, 0.1]));
  }

  /* ---------- bolsa na coxa direita ---------- */
  {
    const hip = rig.p('legR'), knee = rig.p('shinR');
    const mid = hip.clone().lerp(knee, 0.5);
    const dir = knee.clone().sub(hip).normalize();
    limbRing(c, 'legR', hip, knee, 0.62, 0.7, 0.076, () => STRAP, 'std');
    const r = aimZ(v3(dir));
    c.rigid('legR', box(0.03, 0.07, 0.1, 0.012, 1), 'cloth', (_p, n) => mix(WHITE_D, WHITE, 0.5 + 0.5 * n.y), { p: [mid.x - 0.083, mid.y + 0.012, mid.z], r });
    c.rigid('legR', box(0.034, 0.03, 0.104, 0.008, 1), 'cloth', SKY, { p: [mid.x - 0.085, mid.y + 0.035, mid.z], r });
    c.rigid('legR', box(0.008, 0.014, 0.018), METAL, BUCKLE, { p: [mid.x - 0.103, mid.y + 0.025, mid.z], r });
  }

  /* ---------- arnês ---------- */
  for (const sg of [1, -1]) {
    c.soft(ribbon([[sg * 0.086, 0.24, 0.148], [sg * 0.093, 0.38, 0.156], [sg * 0.098, 0.48, 0.128], [sg * 0.103, 0.55, 0.02], [sg * 0.098, 0.52, -0.12], [sg * 0.088, 0.44, -0.18]], 0.032, 0.012, () => STRAP, { ref: [1, 0, 0], nv: 12, nu: 4 }), 'std', rig.torsoW);
    c.soft(box(0.038, 0.028, 0.014), METAL, rig.torsoW, BUCKLE, { p: [sg * 0.092, 0.31, 0.168] });
  }
  const cz = ringAtY(T, 0.37);
  c.soft(box(0.19, 0.024, 0.012), 'std', rig.torsoW, STRAP, { p: [0, 0.37, cz.z + cz.rz + 0.04] });
  c.soft(box(0.044, 0.034, 0.016, 0.008, 1), METAL, rig.torsoW, BUCKLE, { p: [0, 0.37, cz.z + cz.rz + 0.048] });
  c.soft(box(0.02, 0.013, 0.006), 'glossy', rig.torsoW, MINT, { p: [0, 0.37, cz.z + cz.rz + 0.057] });

  /* ---------- cabeça ---------- */
  const H = humanHead(1.03, 1.0, 2.15);
  const head = buildHead(c, {
    rings: H, mat: 'skin', faceU: 0.17, faceV0: 0.2, faceV1: 0.64, nu: 28, nv: 20,
    color: (_u, _v, p) => mix(SKIN, darken(SKIN, 0.2), sstep(0.68, 0.62, p.y)),
  });
  const np = headPoint(head.fn, 0, vAtY(H, 0.765));
  c.rigid('head', sphere(0.014, 8, 6).scale(1, 0.8, 0.8), 'skin', mix(SKIN, '#e8987a', 0.4), { p: [0, np.y, np.z + 0.004] });
  for (const sg of [1, -1]) c.rigid('head', sphere(0.038, 8, 6).scale(0.4, 1, 0.7), 'skin', SKIN, { p: [sg * 0.218, 0.78, 0.0], r: [0, sg * -0.3, 0] });

  /* ---------- cabelo verde-azulado escuro: penteado para trás até a trança, franja leve de lado ---------- */
  const hair = cap(H, 0.68, 0.02, { skip: (u, y) => Math.abs(u - 0.5) < 0.2 && y < 0.93, nu: 24, nv: 9 });
  c.rigid('head', paintUV(hair.geo, (u, _v, p, n) => {
    const comb = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 15);
    return mix(mix(HAIR_D, HAIR, 0.5 + 0.5 * sstep(0.68, 0.88, p.y) * (0.7 + 0.3 * n.y)), HAIR_L, 0.18 * comb * sstep(0.8, 0.95, p.y));
  }), 'fur');
  // franja de lado (risca à direita da personagem, caindo para a esquerda)
  ([[-50, 0.11, 0.7], [-26, 0.13, 0.75], [-2, 0.13, 0.7], [22, 0.12, 0.6], [46, 0.1, 0.45]] as [number, number, number][]).forEach(([az, len, sw], i) => {
    const b = headPoint(head.fn, az, vAtY(H, 0.95));
    const e = headPoint(head.fn, az + sw * 34, vAtY(H, 0.95 - len * 0.78));
    const o = b.clone().setY(0).normalize();
    c.rigid('head', tuft([v3(b.clone().addScaledVector(o, 0.006)), v3(b.clone().lerp(e, 0.5).addScaledVector(o, 0.028)), v3(e.clone().addScaledVector(o, 0.016))], [0.02, 0.058], i % 2 ? HAIR : HAIR_L, HAIR, 7, 5, [0, 0, 1]), 'fur');
  });
  // mechas longas emoldurando o rosto, até o queixo
  for (const sg of [1, -1]) {
    c.rigid('head', tuft([[sg * 0.19, 0.9, 0.09], [sg * 0.222, 0.78, 0.095], [sg * 0.215, 0.66, 0.095], [sg * 0.19, 0.58, 0.09]], [0.022, 0.045], HAIR, HAIR_D, 8, 6, [0, 0, 1]), 'fur');
  }
  // trança grossa (ossos braid1..4) que balança nas costas, por cima da pipa
  // termina acima do encosto dos karts (mais baixa, a ponta entrava no encosto/caldeira/bagageiro ao balançar)
  const bp: V3[] = [[0, 0.74, -0.2], [0.004, 0.64, -0.295], [0.012, 0.55, -0.338], [0.02, 0.46, -0.352], [0.026, 0.38, -0.352], [0.028, 0.33, -0.349]];
  const bb = c.chain('braid', 'head', [bp[0]!, bp[1]!, bp[2]!, bp[3]!], { roll: 0.24, pitch: 0.2, lag: 0.09, sway: [0.05, 0.03, 0.07], phase: 0.25, wind: [0.13, 0, 0], flutter: [0.09, 0.05, 0.11], bounce: 2.6 });
  const bw = rig.chainW(bb, { parent: 'head', blend: 0.04, tip: bp[5] });
  const curve = new THREE.CatmullRomCurve3(bp.map((p) => new THREE.Vector3(...p)));
  const braid = surf((u, v) => {
    const cen = curve.getPoint(Math.min(1, v));
    const r = 0.046 * (1 - 0.3 * v) * (1 + 0.24 * Math.abs(Math.sin(v * Math.PI * 7))) * Math.min(1, Math.sqrt(Math.max(0, (1 - v) / 0.05)));
    const a = u * Math.PI * 2;
    const lobe = 1 + 0.16 * Math.cos(2 * a + (Math.floor(v * 7) % 2 ? Math.PI / 2 : 0));
    return new THREE.Vector3(cen.x + Math.cos(a) * r * lobe, cen.y, cen.z - Math.sin(a) * r * 0.85 * lobe);
  }, 10, 30, { capStart: true, flip: true });
  c.soft(paintUV(braid, (_u, v, _p, n) => mix(HAIR_D, HAIR, (0.35 + 0.65 * Math.abs(Math.sin(v * Math.PI * 7))) * (0.75 + 0.25 * n.y))), 'fur', bw);
  c.rigid('head', torus(0.04, 0.011, 6, 14).rotateX(Math.PI / 2), 'glossy', MINT, { p: [0, 0.725, -0.21], r: [0.75, 0, 0] });
  c.rigid(bb[3]!, cyl(0.03, 0.03, 0.022, 10), 'cloth', MINT, { p: [0.026, 0.38, -0.352] });
  c.rigid(bb[3]!, tuft([[0.026, 0.375, -0.352], [0.03, 0.33, -0.357], [0.034, 0.28, -0.362]], 0.036, HAIR, HAIR_L, 8, 5), 'fur');

  /* ---------- cachecol cinza-claro de duas pontas ---------- */
  const knot: V3 = [0.03, 0.555, -0.1];
  c.soft(sphere(0.033, 8, 6).scale(1.2, 0.9, 0.8), 'cloth', rig.torsoW, (_p, n) => mix(darken(SCARF, 0.25), SCARF, 0.5 + 0.5 * n.y), { p: knot });
  const tails: { name: string; pts: V3[]; w: number; ph: number }[] = [
    { name: 'scarfA', pts: [[0.05, 0.56, -0.12], [0.11, 0.605, -0.23], [0.17, 0.625, -0.35], [0.21, 0.62, -0.46], [0.235, 0.605, -0.54]], w: 0.065, ph: 0.35 },
    { name: 'scarfB', pts: [[0.05, 0.54, -0.12], [0.1, 0.57, -0.22], [0.14, 0.575, -0.32], [0.165, 0.56, -0.4], [0.18, 0.545, -0.45]], w: 0.055, ph: 0.65 },
  ];
  // pontas curtas e erguidas, com o vento levantando (caídas, entravam no bagageiro/santantônio/encosto dos karts)
  for (const t of tails) {
    const bones = c.chain(t.name, 'chest', [t.pts[0]!, t.pts[1]!, t.pts[2]!], { roll: 0.3, pitch: 0.22, lag: 0.08, sway: [0.05, 0.09, 0.05], phase: t.ph, wind: [0.12, 0, 0], flutter: [0.13, 0.17, 0.09], bounce: 2.2 });
    const w = rig.chainW(bones, { parent: 'chest', blend: 0.05, tip: t.pts[4] });
    c.soft(ribbon(t.pts, (s) => t.w * 1.25 * (1 - 0.25 * s), 0.014, (s) => (s > 0.86 ? MINT : SCARF), { ref: [1, 0.35, 0], nv: 12, nu: 6 }), 'cloth', w);
  }

  /* ---------- mochila fina ---------- */
  const pz = -0.185;
  c.rigid('chest', box(0.19, 0.2, 0.065, 0.025, 1), 'cloth', (_p, n) => mix(WHITE_D, WHITE, 0.5 + 0.5 * n.y), { p: [0, 0.49, pz] });
  c.rigid('chest', box(0.195, 0.045, 0.07, 0.02, 1), 'cloth', (_p, n) => mix(MINT_D, MINT, 0.4 + 0.5 * n.y), { p: [0, 0.575, pz] });
  cloudEmblem(c, 'chest', 0.022, [0.097, 0.49, pz], aimZ([1, 0, 0]));
  cloudEmblem(c, 'chest', 0.022, [-0.097, 0.49, pz], aimZ([-1, 0, 0]));

  /* ---------- pipa-planador dobrada (losango menta e branco) presa nas costas, inclinada como as pranchas ---------- */
  // alta e com o topo para trás, acompanhando a inclinação dos encostos dos karts (mais baixa, entrava no encosto)
  const kc: V3 = [-0.01, 0.575, -0.248];
  const kRot: V3 = [-0.12, 0, -0.38];
  const kTop = 0.23, kBot = 0.19, kW = 0.17, kMid = 0.035;
  const kx = { p: kc, r: kRot };
  const fold = (g: THREE.BufferGeometry, sg: number): THREE.BufferGeometry => g.applyMatrix4(new THREE.Matrix4().makeRotationY(sg * 0.15));
  for (const sg of [1, -1]) {
    // cada metade é um triângulo dobrado para trás ao longo da vareta central; borda azul-céu em volta
    const tri: [number, number][] = sg > 0 ? [[0, kTop], [kW, kMid], [0, -kBot]] : [[0, kTop], [0, -kBot], [-kW, kMid]];
    c.rigid('chest', fold(extrude(tri, 0.006), sg), 'cloth', (_p, n) => (Math.abs(n.z) < 0.5 ? SKY_D : sg > 0 ? MINT : WHITE), kx);
    for (const [a, b] of [[[0, kTop], [sg * kW, kMid]], [[sg * kW, kMid], [0, -kBot]]] as [[number, number], [number, number]][]) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const g = box(len, 0.014, 0.004).rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0])).translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, -0.005);
      c.rigid('chest', fold(g, sg), 'glossy', SKY_D, kx);
    }
  }
  // varetas e o emblema da nuvem na frente da pipa
  c.rigid('chest', cyl(0.0045, 0.0045, kTop + kBot, 6).translate(0, (kTop - kBot) / 2, -0.007), 'std', '#3a4652', kx);
  c.rigid('chest', cyl(0.0035, 0.0035, kW * 1.9, 6).rotateZ(Math.PI / 2).translate(0, kMid, -0.02), 'std', '#3a4652', kx);
  {
    const e = new THREE.Euler(...kRot);
    const at = new THREE.Vector3(0.0, -0.065, -0.016).applyEuler(e).add(new THREE.Vector3(...kc));
    const q = new THREE.Quaternion().setFromEuler(e).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    const er = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    cloudEmblem(c, 'chest', 0.03, v3(at), [er.x, er.y, er.z]);
  }
  // tiras que prendem a pipa à mochila
  c.rigid('chest', box(0.19, 0.02, 0.01), 'std', STRAP, { p: [0, 0.585, -0.26], r: [-0.12, 0, 0] });
  c.rigid('chest', box(0.19, 0.02, 0.01), 'std', STRAP, { p: [0, 0.475, -0.247], r: [-0.12, 0, 0] });
  c.rigid('chest', box(0.026, 0.026, 0.014), METAL, BUCKLE, { p: [0.07, 0.585, -0.266], r: [-0.12, 0, 0] });

  return {
    bg: SKIN,
    eye: { x: 70, y: c.fy(0.795), rx: 37, ry: 44, iris: '#3fbf86', irisDark: '#1a6648', irisLight: '#b8f2d6', lash: true, tilt: 4, line: '#1c2a2a' },
    brow: { color: '#1f5a57', w: 8, len: 44, gap: 9 },
    mouth: { y: c.fy(0.69), w: 38, line: '#7a3a34' },
    blush: '#ff9c8e',
  };
}

export const sora: CharDef = { id: 'sora', build };
