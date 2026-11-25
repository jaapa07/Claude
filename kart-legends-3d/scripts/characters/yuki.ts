/** Yuki — ninja da neve: cabelo dourado curto varrido pelo vento, óculos de neve na testa, jaqueta acolchoada turquesa e coral, cachecol de duas pontas e prancha de snowboard nas costas. */
import { THREE, box, cyl, extrude, mix, rng, smoothOutline, sphere, torus, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, cuff, headPoint, legProfile, limbRing, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { aimZ, mirrorX, ribbon, tuft } from './parts';
import { darken, lighten, loft, paintUV, sstep, sweep } from './shapes';
import { band, cap, humanHead, ringAtY, shell, v3, vAtY } from './wear';

const METAL = defineMaterial('chars_metal', { roughness: 0.38, metalness: 0.45 });
const SKIN = '#f7cda8', HAIR = '#ffd23f', HAIR_D = '#f2a91e', HAIR_L = '#fff0a6';
const TEAL = '#2ec4d6', TEAL_D = '#16879a', CORAL = '#ff6b5b', CORAL_D = '#d2453d', SNOW = '#f6fbff', SNOW_D = '#c6d6e2';
const PANTS = '#474552', GLOVE = '#34323d', STRAP = '#2f3440', BUCKLE = '#d9e3ea', LENS = '#ff8a2a';

/** Floco de neve de seis pontas (contorno para extrude). */
function snowflake(r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return pts;
}

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(1.04, 1.06, 0.01, 0.052);
  const puff = (y: number): number => Math.abs(Math.sin((y - 0.13) * 34)); // gomos do acolchoado
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y > 0.54) return mix(darken(SKIN, 0.2), SKIN, sstep(0.53, 0.62, p.y));
      if (p.y < 0.15) return mix(darken(PANTS, 0.3), PANTS, 0.55 + 0.45 * n.y);
      return mix(TEAL_D, TEAL, 0.6 + 0.4 * n.y);
    },
    arm: {
      r: (t) => (armProfile(0.066, 0.058, 0.05)(t) as number) * (1 + 0.06 * Math.abs(Math.sin(t * 13))),
      color: (_u, v, _p, n) => {
        const base = v < 0.2 ? CORAL : TEAL;
        return mix(darken(base, 0.3), darken(base, Math.abs(Math.sin(v * 13)) < 0.25 ? 0.22 : 0), 0.6 + 0.4 * n.y);
      },
    },
    leg: {
      r: legProfile(0.082, 0.068, 0.056),
      color: (_u, _v, _p, n) => mix(darken(PANTS, 0.35), PANTS, 0.55 + 0.45 * n.y),
    },
    hand: { color: SKIN, scale: 1.12, mat: 'skin', knuckle: lighten(SKIN, 0.15) },
    boot: { upper: CORAL, sole: '#2b2a33', toe: SNOW, scale: 1.3, shaft: SNOW, shaftR: 0.07, mat: 'cloth' },
  });

  /* ---------- jaqueta acolchoada (casca com gomos) ---------- */
  const jacket = shell(T, 0.13, 0.52, (t) => 0.02 + 0.006 * Math.sin(Math.PI * t), {
    nu: 24, nv: 12,
    mod: (p) => { const k = 1 + 0.045 * puff(p.y) ** 0.6; p.x *= k; p.z = p.z * k; },
  });
  c.soft(paintUV(jacket.geo, (_u, v, p, n) => {
    const side = Math.abs(p.x) > 0.13 && p.z < 0.06;         // painéis laterais coral
    const yoke = v > 0.8;                                      // ombros coral
    const seam = puff(p.y) < 0.14;
    const base = side || yoke ? CORAL : TEAL;
    const k = seam ? 0.25 : 0;
    return mix(darken(base, 0.28 + k), darken(base, k), sstep(0.13, 0.4, p.y) * (0.65 + 0.35 * n.y));
  }), 'cloth', rig.torsoW);
  // zíper branco na frente
  const zipPts: V3[] = [0.17, 0.26, 0.35, 0.44, 0.5].map((y) => { const r = ringAtY(T, y); return [0, y, r.z + r.rz + 0.026 + 0.012 * puff(y) ** 0.6]; });
  c.soft(sweep(zipPts, () => [0.009, 0.004], 4, 8, { ref: [0, 0, 1] }), 'glossy', rig.torsoW, SNOW);
  // barra da jaqueta
  c.soft(paintUV(band(T, 0.12, 0.165, 0.032, 20), (_u, _v, _p, n) => mix(darken(TEAL_D, 0.2), TEAL_D, 0.5 + 0.5 * n.y)), 'cloth', rig.torsoW);
  // gola de pelo branca
  const fluffy = (colr: string) => (u: number, v: number): THREE.Color => mix(darken(colr, 0.16), colr, 0.5 + 0.5 * Math.sin(u * 60 + v * 9));
  c.soft(paintUV(band(T, 0.49, 0.585, 0.05, 22, { mod: (p, th) => { const k = 1 + 0.05 * Math.sin(th * 15); p.x *= k; p.z *= k; } }), fluffy(SNOW)), 'fur', rig.torsoW);

  /* ---------- braços: punhos coral e luvas sem dedos ---------- */
  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    cuff(c, sfx, 0.6, 0.8, 0.064, (_u, v) => mix(CORAL_D, CORAL, v), 'cloth');
    cuff(c, sfx, 0.78, 0.92, 0.054, () => GLOVE, 'cloth');
    // luva: cobre a palma e o dorso, deixa os dedos de fora
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
    ], 10, 5, (p) => { p.z -= 0.012 * k; }), (_u, _v, p, n) => mix(darken(GLOVE, 0.3), lighten(GLOVE, 0.12), 0.5 + 0.5 * n.y + (Math.abs(p.y) < 0.004 ? -0.4 : 0)));
    c.rigid(`hand${sfx}`, sg > 0 ? glove : mirrorX(glove), 'cloth', undefined, { p: v3(Hn), r: [-0.12, yaw, 0] });
    // joelheira coral
    const knee = rig.p(`shin${sfx}`);
    const ankle = new THREE.Vector3(sg * rig.ankle[0], rig.ankle[1], rig.ankle[2]);
    const up = knee.clone().sub(ankle).normalize();
    c.rigid(`shin${sfx}`, sphere(0.062, 10, 7).scale(1, 1.05, 0.55), 'rubber', (_p, n) => mix(CORAL_D, CORAL, 0.5 + 0.5 * n.y), { p: v3(knee.clone().addScaledVector(up, -0.03).add(new THREE.Vector3(0, 0.035, 0.035))), r: aimZ([0, 0.75, 0.66]) });
  }

  /* ---------- bolsa na coxa esquerda ---------- */
  {
    const hip = rig.p('legL'), knee = rig.p('shinL');
    const mid = hip.clone().lerp(knee, 0.5);
    const dir = knee.clone().sub(hip).normalize();
    limbRing(c, 'legL', hip, knee, 0.62, 0.7, 0.078, () => STRAP, 'std');
    const r = aimZ(v3(dir));
    c.rigid('legL', box(0.03, 0.07, 0.1, 0.012, 1), 'cloth', (_p, n) => mix(darken(TEAL_D, 0.2), TEAL, 0.5 + 0.5 * n.y), { p: [mid.x + 0.085, mid.y + 0.012, mid.z], r });
    c.rigid('legL', box(0.034, 0.03, 0.104, 0.008, 1), 'cloth', CORAL, { p: [mid.x + 0.087, mid.y + 0.035, mid.z], r });
    c.rigid('legL', box(0.008, 0.014, 0.018), METAL, BUCKLE, { p: [mid.x + 0.105, mid.y + 0.025, mid.z], r });
  }

  /* ---------- arnês no peito com fivelas ---------- */
  for (const sg of [1, -1]) {
    c.soft(ribbon([[sg * 0.088, 0.24, 0.15], [sg * 0.095, 0.38, 0.158], [sg * 0.1, 0.48, 0.13], [sg * 0.105, 0.55, 0.02], [sg * 0.1, 0.52, -0.12], [sg * 0.09, 0.44, -0.18]], 0.034, 0.012, () => STRAP, { ref: [1, 0, 0], nv: 12, nu: 4 }), 'std', rig.torsoW);
    c.soft(box(0.04, 0.03, 0.014), METAL, rig.torsoW, BUCKLE, { p: [sg * 0.094, 0.31, 0.17] });
  }
  const cz = ringAtY(T, 0.38);
  c.soft(box(0.2, 0.026, 0.012), 'std', rig.torsoW, STRAP, { p: [0, 0.38, cz.z + cz.rz + 0.04] });
  c.soft(box(0.046, 0.036, 0.016, 0.008, 1), METAL, rig.torsoW, BUCKLE, { p: [0, 0.38, cz.z + cz.rz + 0.048] });
  c.soft(box(0.022, 0.014, 0.006), 'glossy', rig.torsoW, CORAL, { p: [0, 0.38, cz.z + cz.rz + 0.057] });

  /* ---------- cabeça ---------- */
  const H = humanHead(1.03, 1.0, 2.15);
  const head = buildHead(c, {
    rings: H, mat: 'skin', faceU: 0.17, faceV0: 0.2, faceV1: 0.64, nu: 28, nv: 20,
    color: (_u, _v, p) => mix(SKIN, darken(SKIN, 0.22), sstep(0.68, 0.62, p.y)),
  });
  const np = headPoint(head.fn, 0, vAtY(H, 0.765));
  c.rigid('head', sphere(0.016, 8, 6).scale(1, 0.8, 0.8), 'skin', mix(SKIN, '#e8987a', 0.45), { p: [0, np.y, np.z + 0.004] });
  for (const sg of [1, -1]) c.rigid('head', sphere(0.04, 8, 6).scale(0.4, 1, 0.7), 'skin', SKIN, { p: [sg * 0.218, 0.78, 0.0], r: [0, sg * -0.3, 0] });

  /* ---------- cabelo dourado curto, varrido pelo vento para trás e para a direita ---------- */
  const hairPaint = (_u: number, _v: number, p: THREE.Vector3, n: THREE.Vector3): THREE.Color => mix(HAIR_D, HAIR, 0.55 + 0.45 * sstep(0.68, 0.84, p.y) * (0.7 + 0.3 * n.y));
  const hair = cap(H, 0.7, 0.018, { skip: (u, y) => Math.abs(u - 0.5) < 0.2 && y < 0.93, nu: 22, nv: 8 });
  c.rigid('head', paintUV(hair.geo, hairPaint), 'fur');
  c.chain('hair', 'head', [[0, 1.0, -0.05]], { roll: 0.25, pitch: 0.15, lag: 0.06, sway: [0.04, 0, 0.05], wind: [-0.25, 0, 0], flutter: [0.07, 0, 0.05], bounce: 2.5 });
  const rnd = rng(311);
  const cen = new THREE.Vector3(0, 0.82, 0.02);
  const sweepDir = new THREE.Vector3(-0.4, -0.05, -1).normalize(); // o vento leva as mechas para trás e para a direita
  // mechas deitadas: [azimute, v, comprimento, quanto seguem o vento, quanto descem colando na cabeça, largura]
  const locks: [number, number, number, number, number, number][] = [
    [-62, 0.93, 0.2, 0.9, 0, 0.1], [-22, 0.95, 0.22, 0.92, 0, 0.11], [18, 0.95, 0.22, 0.92, 0, 0.11], [58, 0.93, 0.19, 0.9, 0, 0.1], // coroa
    [-100, 0.8, 0.13, 0.8, 0.45, 0.09], [100, 0.8, 0.14, 0.8, 0.45, 0.09], // lados
    [130, 0.8, 0.15, 0.6, 0.6, 0.1], [165, 0.82, 0.16, 0.6, 0.65, 0.11], [200, 0.82, 0.16, 0.6, 0.65, 0.11], [235, 0.8, 0.15, 0.6, 0.6, 0.1], // nuca
  ];
  const down = new THREE.Vector3(0, -1, -0.25).normalize();
  locks.forEach(([az, v, len, follow, dn, wd], i) => {
    const b = headPoint(head.fn, az, v);
    const out = b.clone().sub(cen).normalize();
    const d = out.clone().multiplyScalar(1 - follow).addScaledVector(sweepDir, follow).normalize();
    d.y = Math.min(d.y, 0.04); d.normalize();
    d.multiplyScalar(1 - dn).addScaledVector(down, dn).normalize();
    const p0 = b.clone().addScaledVector(out, -0.03);
    const p1 = b.clone().addScaledVector(d, len * 0.45).addScaledVector(out, 0.022);
    const p2 = b.clone().addScaledVector(d, len).addScaledVector(out, 0.02 - dn * 0.01).add(new THREE.Vector3((rnd() - 0.5) * 0.03, -0.012, 0));
    const crown = v > 0.9;
    c.rigid(crown ? 'hair' : 'head', tuft([v3(p0), v3(p1), v3(p2)], [0.034, wd], HAIR, i % 3 === 1 ? HAIR_D : HAIR, 6, 5, v3(out)), 'fur');
  });
  // franja assimétrica caindo por baixo dos óculos, varrida para a direita da personagem
  ([[38, 0.13, -1.0], [16, 0.15, -1.1], [-8, 0.13, -1.0], [-30, 0.11, -0.8], [-52, 0.13, -0.3], [58, 0.1, -0.5]] as [number, number, number][]).forEach(([az, len, sw]) => {
    const b = headPoint(head.fn, az, vAtY(H, 0.93));
    const e = headPoint(head.fn, az + sw * 26, vAtY(H, 0.93 - len * 0.72));
    const o = b.clone().setY(0).normalize();
    c.rigid('head', tuft([v3(b.clone().addScaledVector(o, 0.008)), v3(b.clone().lerp(e, 0.5).addScaledVector(o, 0.03)), v3(e.clone().addScaledVector(o, 0.016))], [0.022, 0.05], HAIR, HAIR_L, 6, 5, [0, 0, 1]), 'fur');
  });
  // mechas na frente das orelhas
  for (const sg of [1, -1]) {
    c.rigid('head', tuft([[sg * 0.195, 0.88, 0.075], [sg * 0.222, 0.78, 0.075], [sg * 0.21, 0.69, 0.07]], [0.02, 0.036], HAIR, HAIR_D, 6, 4, [0, 0, 1]), 'fur');
  }

  /* ---------- óculos de neve na testa (lentes laranja) ---------- */
  const gy0 = 0.94, gy1 = 1.0;
  c.rigid('head', paintUV(band(H, gy0 + 0.012, gy1 - 0.012, 0.03, 30, { skip: (u) => Math.abs(u - 0.5) < 0.13 }), (_u, _v, p) => (Math.abs(p.y - (gy0 + gy1) / 2) < 0.005 ? TEAL : STRAP)), 'cloth');
  const frame = paintUV(band(H, gy0, gy1, 0.045, 32, { skip: (u) => Math.abs(u - 0.5) > 0.155 }), (_u, _v, _p, n) => mix(darken(SNOW, 0.25), SNOW, 0.5 + 0.5 * n.y));
  c.rigid('head', frame, 'glossy');
  for (const sg of [1, -1]) {
    const hp = headPoint(head.fn, sg * 21, vAtY(H, (gy0 + gy1) / 2));
    const nrm = hp.clone().sub(new THREE.Vector3(0, 0.8, 0.0)).normalize();
    const r = aimZ(v3(nrm));
    c.rigid('head', sphere(0.05, 12, 8).scale(1.18, 0.72, 0.36), 'glass', (p) => mix(LENS, lighten(LENS, 0.45), sstep(0, 0.035, p.y + p.x * sg * 0.3)), { p: v3(hp.clone().addScaledVector(nrm, 0.044)), r });
    c.rigid('head', torus(0.05, 0.008, 4, 14).scale(1.2, 0.74, 1), 'glossy', TEAL_D, { p: v3(hp.clone().addScaledVector(nrm, 0.044)), r });
    // emblema original na tira: floco de neve de seis pontas
    const ep = headPoint(head.fn, sg * 88, vAtY(H, (gy0 + gy1) / 2));
    const en = ep.clone().sub(new THREE.Vector3(0, ep.y, 0)).normalize();
    const er = aimZ(v3(en));
    c.rigid('head', cyl(0.03, 0.03, 0.008, 16).rotateX(Math.PI / 2), 'glossy', TEAL, { p: v3(ep.clone().addScaledVector(en, 0.02)), r: er });
    c.rigid('head', extrude(snowflake(0.024), 0.006), 'glossy', SNOW, { p: v3(ep.clone().addScaledVector(en, 0.026)), r: er });
  }
  c.rigid('head', box(0.03, 0.022, 0.03), 'glossy', TEAL_D, { p: v3(headPoint(head.fn, 0, vAtY(H, (gy0 + gy1) / 2)).add(new THREE.Vector3(0, 0, 0.034))), r: [-0.5, 0, 0] });

  /* ---------- cachecol coral de duas pontas (ossos scarfA1..3 e scarfB1..3) ---------- */
  const knot: V3 = [-0.03, 0.555, -0.1];
  c.soft(sphere(0.035, 8, 6).scale(1.2, 0.9, 0.8), 'cloth', rig.torsoW, (_p, n) => mix(CORAL_D, CORAL, 0.5 + 0.5 * n.y), { p: knot });
  const tails: { name: string; pts: V3[]; w: number; ph: number }[] = [
    { name: 'scarfA', pts: [[-0.04, 0.56, -0.12], [-0.1, 0.605, -0.24], [-0.16, 0.625, -0.36], [-0.2, 0.62, -0.47], [-0.225, 0.605, -0.55]], w: 0.07, ph: 0.15 },
    { name: 'scarfB', pts: [[-0.04, 0.54, -0.12], [-0.085, 0.57, -0.23], [-0.125, 0.575, -0.33], [-0.15, 0.56, -0.41], [-0.165, 0.545, -0.46]], w: 0.06, ph: 0.45 },
  ];
  // pontas curtas e erguidas, com o vento levantando (caídas, entravam no bagageiro/santantônio/encosto dos karts)
  for (const t of tails) {
    const bones = c.chain(t.name, 'chest', [t.pts[0]!, t.pts[1]!, t.pts[2]!], { roll: 0.3, pitch: 0.22, lag: 0.08, sway: [0.05, 0.09, 0.05], phase: t.ph, wind: [0.12, 0, 0], flutter: [0.12, 0.16, 0.08], bounce: 2.2 });
    const w = rig.chainW(bones, { parent: 'chest', blend: 0.05, tip: t.pts[4] });
    c.soft(ribbon(t.pts, (s) => t.w * 1.25 * (1 - 0.25 * s), 0.014, (s) => (s > 0.84 ? SNOW : s > 0.78 ? CORAL_D : CORAL), { ref: [1, -0.35, 0], nv: 12, nu: 6 }), 'cloth', w);
  }

  /* ---------- mochila pequena, cantil e rolo ---------- */
  const pz = -0.19;
  c.rigid('chest', box(0.2, 0.2, 0.08, 0.03, 1), 'cloth', (_p, n) => mix(darken(TEAL_D, 0.3), TEAL_D, 0.5 + 0.5 * n.y), { p: [0, 0.5, pz] });
  c.rigid('chest', box(0.205, 0.06, 0.086, 0.025, 1), 'cloth', (_p, n) => mix(CORAL_D, CORAL, 0.5 + 0.5 * n.y), { p: [0, 0.58, pz] });
  // cantil no lado direito
  c.rigid('chest', cyl(0.036, 0.036, 0.1, 14), METAL, (p, n) => mix('#8fa3b3', '#e8f1f7', 0.5 + 0.5 * n.x * -1 + sstep(-0.05, 0.05, p.y) * 0.1), { p: [-0.13, 0.48, pz + 0.01] });
  c.rigid('chest', cyl(0.016, 0.02, 0.022, 10), 'rubber', CORAL_D, { p: [-0.13, 0.54, pz + 0.01] });
  // rolo preso embaixo da mochila
  c.rigid('chest', cyl(0.034, 0.034, 0.2, 12).rotateZ(Math.PI / 2), 'cloth', (_p, n) => mix(darken(SNOW_D, 0.2), SNOW_D, 0.5 + 0.5 * n.y), { p: [0, 0.39, pz + 0.005] });
  for (const dx of [-0.06, 0.06]) c.rigid('chest', torus(0.036, 0.006, 4, 12).rotateY(Math.PI / 2), 'std', CORAL_D, { p: [dx, 0.39, pz + 0.005] });

  /* ---------- prancha de snowboard na diagonal (ponta alta no ombro esquerdo) ---------- */
  const bL = 0.44, bW = 0.15;
  // mais curta, mais alta e com a ponta de baixo para a frente (acompanha a inclinação dos encostos dos karts); a ponta de baixo atravessava o encosto
  const tilt = -0.15;
  const outline = smoothOutline([[-bW / 2, -bL / 2 + 0.05], [-bW / 2 + 0.012, 0], [-bW / 2, bL / 2 - 0.05], [-bW / 2 + 0.03, bL / 2 - 0.005], [0, bL / 2], [bW / 2 - 0.03, bL / 2 - 0.005], [bW / 2, bL / 2 - 0.05], [bW / 2 - 0.012, 0], [bW / 2, -bL / 2 + 0.05], [bW / 2 - 0.03, -bL / 2 + 0.005], [0, -bL / 2], [-bW / 2 + 0.03, -bL / 2 + 0.005]], 26);
  const ang = -0.5; // inclinação: topo para a esquerda (+X)
  const bc: V3 = [0.01, 0.64, -0.262];
  const boardX = { p: bc, r: [tilt, 0, ang] as V3 };
  const mountain = (x: number): number => 0.045 * (1 - Math.abs(((x / 0.05) % 2 + 2) % 2 - 1) * 2); // ziguezague
  c.rigid('chest', extrude(outline, 0.018, 0.004), 'glossy', (p, n) => {
    if (n.z > 0.5) return mix(darken(TEAL_D, 0.2), TEAL_D, 0.5); // base (encostada na mochila)
    if (Math.abs(n.z) < 0.5) return SNOW; // borda
    const y = p.y;
    if (Math.abs(y) > bL / 2 - 0.06) return SNOW;
    const m1 = Math.abs(y - (0.06 + mountain(p.x))) < 0.014;
    const m2 = Math.abs(y - (-0.1 + mountain(p.x + 0.025))) < 0.01;
    if (m1 || m2) return CORAL;
    return mix(TEAL, lighten(TEAL, 0.25), sstep(-0.2, 0.2, y));
  }, boardX);
  // duas fixações
  for (const yb of [-0.11, 0.11]) {
    const local = new THREE.Vector3(0, yb, -0.02).applyEuler(new THREE.Euler(tilt, 0, ang)).add(new THREE.Vector3(...bc));
    c.rigid('chest', box(0.13, 0.05, 0.02, 0.008, 1), 'std', STRAP, { p: v3(local), r: [tilt, 0, ang] });
    const strap = new THREE.Vector3(0, yb + 0.012, -0.034).applyEuler(new THREE.Euler(tilt, 0, ang)).add(new THREE.Vector3(...bc));
    c.rigid('chest', box(0.11, 0.024, 0.014), 'cloth', CORAL, { p: v3(strap), r: [tilt, 0, ang] });
  }
  // tiras que prendem a prancha à mochila
  c.rigid('chest', box(0.2, 0.022, 0.012), 'std', STRAP, { p: [0, 0.54, -0.264], r: [tilt, 0, 0] });
  c.rigid('chest', box(0.03, 0.03, 0.016), METAL, BUCKLE, { p: [0.08, 0.54, -0.272], r: [tilt, 0, 0] });

  const my = -c.fy(0.69);
  return {
    bg: SKIN,
    eye: { x: 70, y: c.fy(0.795), rx: 37, ry: 45, iris: '#7a5cf0', irisDark: '#2f2280', irisLight: '#c9bcff', lash: true, tilt: 7, line: '#2a1a22' },
    brow: { color: '#c98a1c', w: 9, len: 46, gap: 8 },
    mouth: { y: c.fy(0.69), w: 48, line: '#7a3324' },
    blush: '#ff8a7a',
    // presa de sorriso confiante no canto da boca (neutro e piscando)
    over: (e) => (e === 'neutral' || e === 'blink' ? `<path d="M 10 ${my + 8} l 5 9 l 5 -8 z" fill="#fffaf0" stroke="#7a3324" stroke-width="1.8" stroke-linejoin="round"/>` : ''),
  };
}

export const yuki: CharDef = { id: 'yuki', build };
