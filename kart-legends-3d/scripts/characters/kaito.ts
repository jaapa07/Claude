/** Kaito — ninja da lua: cabelo preto liso com franja longa caída sobre um olho, jaqueta acolchoada grafite e violeta, gola alta de pelo escuro, cachecol cinza de duas pontas e prancha escura nas costas. */
import { THREE, box, cyl, extrude, mix, rng, smoothOutline, sphere, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, cuff, headPoint, legProfile, limbRing, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { aimZ, mirrorX, ribbon, tuft } from './parts';
import { darken, lighten, loft, paintUV, sstep, starOutline, sweep } from './shapes';
import { band, cap, humanHead, ringAtY, shell, v3, vAtY } from './wear';

const METAL = defineMaterial('chars_metal', { roughness: 0.38, metalness: 0.45 });
const SKIN = '#f3c9a6', HAIR = '#1b1d29', HAIR_M = '#262c45', HAIR_S = '#4a5a9a', HAIR_D = '#0f1017';
const GRAPH = '#3d404c', GRAPH_D = '#262831', VIOLET = '#6b5cff', VIOLET_D = '#5340c4', SILVER = '#c9d2e6', SILVER_D = '#8e98b0';
const PANTS = '#2c2f3b', GLOVE = '#24252d', STRAP = '#1f2129', FUR_D = '#3e3946', SCARF = '#575b68';

/** Lua crescente (contorno para extrude): arco externo de raio r menos um círculo deslocado para a direita. */
function crescent(r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 14; i++) { const a = ((50 + (260 * i) / 14) * Math.PI) / 180; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  for (let i = 1; i < 14; i++) { const a = ((286 - (212 * i) / 14) * Math.PI) / 180; pts.push([0.42 * r + 0.8 * r * Math.cos(a), 0.8 * r * Math.sin(a)]); }
  return pts;
}

/** Emblema original: lua crescente prateada com estrelinha, sobre um disco violeta. Origem no centro, frente em +Z. */
function moonEmblem(c: Ctx, bone: string, r: number, at: V3, rot: V3): void {
  const o = new THREE.Vector3(...at);
  const fwd = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(...rot));
  c.rigid(bone, cyl(r * 1.25, r * 1.25, 0.006, 16).rotateX(Math.PI / 2), 'glossy', VIOLET_D, { p: at, r: rot });
  c.rigid(bone, extrude(crescent(r), 0.005), 'glossy', SILVER, { p: v3(o.clone().addScaledVector(fwd, 0.005)), r: rot });
  const star = new THREE.Vector3(r * 0.5, r * 0.12, 0).applyEuler(new THREE.Euler(...rot)).add(o).addScaledVector(fwd, 0.005);
  c.rigid(bone, extrude(starOutline(r * 0.32, r * 0.14, 5), 0.005), 'glossy', SILVER, { p: v3(star), r: rot });
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
      return mix(GRAPH_D, GRAPH, 0.6 + 0.4 * n.y);
    },
    arm: {
      r: (t) => (armProfile(0.066, 0.058, 0.05)(t) as number) * (1 + 0.06 * Math.abs(Math.sin(t * 13))),
      color: (_u, v, _p, n) => {
        const base = v < 0.2 ? VIOLET : GRAPH;
        return mix(darken(base, 0.3), darken(base, Math.abs(Math.sin(v * 13)) < 0.25 ? 0.25 : 0), 0.6 + 0.4 * n.y);
      },
    },
    leg: {
      r: legProfile(0.082, 0.068, 0.056),
      color: (_u, _v, _p, n) => mix(darken(PANTS, 0.35), PANTS, 0.55 + 0.45 * n.y),
    },
    hand: { color: SKIN, scale: 1.12, mat: 'skin', knuckle: lighten(SKIN, 0.15) },
    boot: { upper: GRAPH, sole: '#16171d', toe: SILVER_D, scale: 1.3, shaft: FUR_D, shaftR: 0.07, mat: 'cloth' },
  });

  /* ---------- jaqueta acolchoada grafite com painéis violeta ---------- */
  const jacket = shell(T, 0.13, 0.52, (t) => 0.02 + 0.006 * Math.sin(Math.PI * t), {
    nu: 24, nv: 12,
    mod: (p) => { const k = 1 + 0.045 * puff(p.y) ** 0.6; p.x *= k; p.z *= k; },
  });
  c.soft(paintUV(jacket.geo, (_u, v, p, n) => {
    const side = Math.abs(p.x) > 0.13 && p.z < 0.06;   // painéis laterais violeta
    const yoke = v > 0.8;                                // ombros violeta
    const seam = puff(p.y) < 0.14;
    const base = side || yoke ? VIOLET_D : GRAPH;
    const k = seam ? 0.3 : 0;
    return mix(darken(base, 0.3 + k), darken(base, k), sstep(0.13, 0.4, p.y) * (0.65 + 0.35 * n.y));
  }), 'cloth', rig.torsoW);
  // zíper e frisos prateados
  const zipPts: V3[] = [0.17, 0.26, 0.35, 0.44, 0.5].map((y) => { const r = ringAtY(T, y); return [0, y, r.z + r.rz + 0.026 + 0.012 * puff(y) ** 0.6]; });
  c.soft(sweep(zipPts, () => [0.009, 0.004], 4, 8, { ref: [0, 0, 1] }), METAL, rig.torsoW, SILVER);
  c.soft(paintUV(band(T, 0.12, 0.165, 0.032, 20), (_u, _v, _p, n) => mix(SILVER_D, SILVER, 0.5 + 0.5 * n.y)), METAL, rig.torsoW);
  // gola alta de pelo escuro
  const fluffy = (colr: string) => (u: number, v: number): THREE.Color => mix(darken(colr, 0.25), lighten(colr, 0.08), 0.5 + 0.5 * Math.sin(u * 60 + v * 9));
  c.soft(paintUV(band(T, 0.48, 0.63, 0.055, 22, { mod: (p, th) => { const k = 1 + 0.05 * Math.sin(th * 15); p.x *= k; p.z *= k; } }), fluffy(FUR_D)), 'fur', rig.torsoW);

  /* ---------- braços: punhos com friso prateado e luvas sem dedos ---------- */
  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    cuff(c, sfx, 0.6, 0.8, 0.064, (_u, v) => mix(VIOLET_D, VIOLET, v * 0.6), 'cloth');
    cuff(c, sfx, 0.76, 0.8, 0.066, () => SILVER, METAL);
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
    // joelheira violeta
    const knee = rig.p(`shin${sfx}`);
    const ankle = new THREE.Vector3(sg * rig.ankle[0], rig.ankle[1], rig.ankle[2]);
    const up = knee.clone().sub(ankle).normalize();
    c.rigid(`shin${sfx}`, sphere(0.062, 10, 7).scale(1, 1.05, 0.55), 'rubber', (_p, n) => mix(VIOLET_D, VIOLET, 0.35 + 0.5 * n.y), { p: v3(knee.clone().addScaledVector(up, -0.03).add(new THREE.Vector3(0, 0.035, 0.035))), r: aimZ([0, 0.75, 0.66]) });
  }
  // emblema da lua no ombro esquerdo
  {
    const S = rig.p('armL'), E = rig.p('forearmL');
    const at = S.clone().lerp(E, 0.2).add(new THREE.Vector3(0.062, 0.02, 0));
    moonEmblem(c, 'armL', 0.026, v3(at), aimZ([1, 0.35, 0.1]));
  }

  /* ---------- bolsa na coxa direita ---------- */
  {
    const hip = rig.p('legR'), knee = rig.p('shinR');
    const mid = hip.clone().lerp(knee, 0.5);
    const dir = knee.clone().sub(hip).normalize();
    limbRing(c, 'legR', hip, knee, 0.62, 0.7, 0.078, () => STRAP, 'std');
    const r = aimZ(v3(dir));
    c.rigid('legR', box(0.03, 0.07, 0.1, 0.012, 1), 'cloth', (_p, n) => mix(GRAPH_D, GRAPH, 0.5 + 0.5 * n.y), { p: [mid.x - 0.085, mid.y + 0.012, mid.z], r });
    c.rigid('legR', box(0.034, 0.03, 0.104, 0.008, 1), 'cloth', VIOLET_D, { p: [mid.x - 0.087, mid.y + 0.035, mid.z], r });
    c.rigid('legR', box(0.008, 0.014, 0.018), METAL, SILVER, { p: [mid.x - 0.105, mid.y + 0.025, mid.z], r });
  }

  /* ---------- arnês com fivelas prateadas ---------- */
  for (const sg of [1, -1]) {
    c.soft(ribbon([[sg * 0.088, 0.24, 0.15], [sg * 0.095, 0.38, 0.158], [sg * 0.1, 0.48, 0.13], [sg * 0.105, 0.55, 0.02], [sg * 0.1, 0.52, -0.12], [sg * 0.09, 0.44, -0.18]], 0.034, 0.012, () => STRAP, { ref: [1, 0, 0], nv: 12, nu: 4 }), 'std', rig.torsoW);
    c.soft(box(0.04, 0.03, 0.014), METAL, rig.torsoW, SILVER, { p: [sg * 0.094, 0.31, 0.17] });
  }
  const cz = ringAtY(T, 0.36);
  c.soft(box(0.2, 0.026, 0.012), 'std', rig.torsoW, STRAP, { p: [0, 0.36, cz.z + cz.rz + 0.04] });
  c.soft(box(0.046, 0.036, 0.016, 0.008, 1), METAL, rig.torsoW, SILVER, { p: [0, 0.36, cz.z + cz.rz + 0.048] });
  c.soft(box(0.022, 0.014, 0.006), 'glossy', rig.torsoW, VIOLET, { p: [0, 0.36, cz.z + cz.rz + 0.057] });

  /* ---------- cabeça ---------- */
  const H = humanHead(1.03, 1.0, 2.15);
  const head = buildHead(c, {
    rings: H, mat: 'skin', faceU: 0.17, faceV0: 0.2, faceV1: 0.64, nu: 28, nv: 20,
    color: (_u, _v, p) => mix(SKIN, darken(SKIN, 0.22), sstep(0.68, 0.62, p.y)),
  });
  const np = headPoint(head.fn, 0, vAtY(H, 0.765));
  c.rigid('head', sphere(0.016, 8, 6).scale(1, 0.8, 0.8), 'skin', mix(SKIN, '#e8987a', 0.4), { p: [0, np.y, np.z + 0.004] });
  for (const sg of [1, -1]) c.rigid('head', sphere(0.04, 8, 6).scale(0.4, 1, 0.7), 'skin', SKIN, { p: [sg * 0.218, 0.78, 0.0], r: [0, sg * -0.3, 0] });

  /* ---------- cabelo preto liso: risca à esquerda, franja longa caindo sobre o olho direito, nuca curta ---------- */
  // calota penteada: fios finos (listras em u) e um anel de brilho azul-escuro no alto, sem virar capacete
  const strands = (u: number): number => 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 17);
  const ringHi = (y: number, ny: number): number => Math.exp(-(((y - 0.955) / 0.03) ** 2)) * sstep(0.1, 0.6, ny + 0.4);
  const hair = cap(H, 0.7, 0.02, { skip: (u, y) => Math.abs(u - 0.5) < 0.2 && y < 0.93, nu: 26, nv: 9 });
  c.rigid('head', paintUV(hair.geo, (u, _v, p, n) => {
    const base = mix(HAIR_D, HAIR, 0.55 + 0.45 * sstep(0.7, 0.86, p.y));
    return mix(mix(base, HAIR_M, 0.35 * strands(u)), HAIR_S, 0.75 * ringHi(p.y, n.y));
  }), 'fur');
  c.chain('hair', 'head', [[0, 1.0, 0.04]], { roll: 0.2, pitch: 0.15, lag: 0.06, sway: [0.04, 0, 0.04], wind: [-0.2, 0, 0], flutter: [0.06, 0, 0.04], bounce: 2.2 });
  const rnd = rng(733);
  const cen = new THREE.Vector3(0, 0.82, 0.0);
  // mechas lisas coladas à cabeça, todas penteadas para o lado direito: [azimute, v, comprimento, descida, largura]
  const locks: [number, number, number, number, number][] = [
    [70, 0.93, 0.15, 0.55, 0.11], [100, 0.9, 0.14, 0.75, 0.1], [-100, 0.88, 0.15, 0.8, 0.1], // laterais
    [130, 0.86, 0.11, 0.9, 0.1], [155, 0.86, 0.1, 0.92, 0.11], [180, 0.86, 0.1, 0.92, 0.11], [205, 0.86, 0.1, 0.92, 0.11], [230, 0.86, 0.11, 0.9, 0.1], // nuca curta, rente
  ];
  locks.forEach(([az, v, len, dn, wd], i) => {
    const b = headPoint(head.fn, az, v);
    const out = b.clone().sub(cen).normalize();
    const tang = new THREE.Vector3(0, 1, 0).cross(out).normalize(); // contorna a cabeça
    const backish = new THREE.Vector3(-Math.sin((az * Math.PI) / 180), 0, -Math.cos((az * Math.PI) / 180)).normalize();
    const d = backish.clone().addScaledVector(tang, -0.3).multiplyScalar(1 - dn).add(new THREE.Vector3(0, -dn, 0)).normalize();
    const p0 = b.clone().addScaledVector(out, -0.03);
    const p1 = b.clone().addScaledVector(d, len * 0.5).addScaledVector(out, 0.016);
    const p2 = b.clone().addScaledVector(d, len).addScaledVector(out, 0.004).add(new THREE.Vector3((rnd() - 0.5) * 0.015, 0, 0));
    c.rigid(v > 0.95 ? 'hair' : 'head', tuft([v3(p0), v3(p1), v3(p2)], [0.022, wd], i % 2 ? HAIR : HAIR_M, HAIR_D, 6, 5, v3(out)), 'fur');
  });
  // franja longa e lisa: nasce na risca (lado esquerdo), atravessa a testa e cai sobre o olho direito até a bochecha
  ([
    [48, -18, 0.86, 0.075, 0.02], [36, -34, 0.8, 0.085, 0.026], [24, -48, 0.76, 0.08, 0.03],
    [12, -62, 0.73, 0.07, 0.03], [0, -78, 0.74, 0.06, 0.026], [58, 6, 0.9, 0.065, 0.016],
  ] as [number, number, number, number, number][]).forEach(([az0, az1, y1, wd, lift], i) => {
    const b = headPoint(head.fn, az0, vAtY(H, 0.975));
    const e = headPoint(head.fn, az1, vAtY(H, y1));
    const m = headPoint(head.fn, az0 * 0.35 + az1 * 0.65, vAtY(H, (0.975 + y1) / 2 + 0.04));
    const o = (q: THREE.Vector3, k: number): THREE.Vector3 => q.clone().add(q.clone().sub(cen).normalize().multiplyScalar(k));
    c.rigid('hair', tuft([v3(o(b, 0.0)), v3(o(m, 0.02 + lift)), v3(o(e, 0.014 + lift * 0.4))], [0.018, wd], i % 2 ? HAIR : HAIR_M, i === 2 ? HAIR_S : HAIR_D, 7, 6, [0, 0, 1]), 'fur');
  });
  // costeletas lisas na frente das orelhas
  for (const sg of [1, -1]) {
    c.rigid('head', tuft([[sg * 0.195, 0.9, 0.07], [sg * 0.222, 0.8, 0.075], [sg * 0.212, 0.7, 0.07]], [0.02, 0.04], HAIR, HAIR_D, 6, 4, [0, 0, 1]), 'fur');
  }

  /* ---------- cachecol cinza de duas pontas (ossos scarfA1..3 e scarfB1..3), saindo para a esquerda ---------- */
  const knot: V3 = [0.03, 0.57, -0.11];
  c.soft(sphere(0.035, 8, 6).scale(1.2, 0.9, 0.8), 'cloth', rig.torsoW, (_p, n) => mix(darken(SCARF, 0.3), SCARF, 0.5 + 0.5 * n.y), { p: knot });
  const tails: { name: string; pts: V3[]; w: number; ph: number }[] = [
    { name: 'scarfA', pts: [[0.04, 0.575, -0.13], [0.1, 0.615, -0.25], [0.16, 0.635, -0.37], [0.2, 0.63, -0.48], [0.225, 0.615, -0.56]], w: 0.07, ph: 0.3 },
    { name: 'scarfB', pts: [[0.04, 0.555, -0.13], [0.085, 0.585, -0.24], [0.125, 0.59, -0.34], [0.145, 0.595, -0.4], [0.16, 0.59, -0.44]], w: 0.06, ph: 0.6 },
  ];
  // pontas curtas e erguidas, com o vento levantando e pouco balanço vertical (caídas, entravam no bagageiro/santantônio/encosto dos karts)
  for (const t of tails) {
    const bones = c.chain(t.name, 'chest', [t.pts[0]!, t.pts[1]!, t.pts[2]!], { roll: 0.3, pitch: 0.22, lag: 0.08, sway: [0.02, 0.09, 0.05], phase: t.ph, wind: [0.12, 0, 0], flutter: [0.12, 0.16, 0.08], bounce: 2.2 });
    const w = rig.chainW(bones, { parent: 'chest', blend: 0.05, tip: t.pts[4] });
    c.soft(ribbon(t.pts, (s) => t.w * 1.25 * (1 - 0.25 * s), 0.014, (s) => (s > 0.84 ? SILVER : s > 0.79 ? VIOLET_D : SCARF), { ref: [1, 0.35, 0], nv: 12, nu: 6 }), 'cloth', w);
  }

  /* ---------- mochila fina com a lua na lateral ---------- */
  const pz = -0.185;
  c.rigid('chest', box(0.2, 0.22, 0.07, 0.025, 1), 'cloth', (_p, n) => mix(darken(GRAPH_D, 0.3), GRAPH_D, 0.5 + 0.5 * n.y), { p: [0, 0.5, pz] });
  c.rigid('chest', box(0.205, 0.05, 0.076, 0.02, 1), 'cloth', (_p, n) => mix(VIOLET_D, VIOLET, 0.3 + 0.5 * n.y), { p: [0, 0.59, pz] });
  moonEmblem(c, 'chest', 0.024, [0.104, 0.5, pz], aimZ([1, 0, 0]));
  moonEmblem(c, 'chest', 0.024, [-0.104, 0.5, pz], aimZ([-1, 0, 0]));

  /* ---------- prancha escura na diagonal (ponta alta no ombro direito, espelho da Yuki) ---------- */
  const bL = 0.44, bW = 0.15;
  // mais curta, mais alta e com a ponta de baixo para a frente (acompanha a inclinação dos encostos dos karts); a ponta de baixo atravessava o encosto
  const tilt = -0.15;
  const outline = smoothOutline([[-bW / 2, -bL / 2 + 0.05], [-bW / 2 + 0.012, 0], [-bW / 2, bL / 2 - 0.05], [-bW / 2 + 0.03, bL / 2 - 0.005], [0, bL / 2], [bW / 2 - 0.03, bL / 2 - 0.005], [bW / 2, bL / 2 - 0.05], [bW / 2 - 0.012, 0], [bW / 2, -bL / 2 + 0.05], [bW / 2 - 0.03, -bL / 2 + 0.005], [0, -bL / 2], [-bW / 2 + 0.03, -bL / 2 + 0.005]], 26);
  const ang = 0.5;
  const bc: V3 = [-0.01, 0.64, -0.255];
  const boardRot = new THREE.Euler(tilt, 0, ang);
  const onBoard = (x: number, y: number, z: number): V3 => v3(new THREE.Vector3(x, y, z).applyEuler(boardRot).add(new THREE.Vector3(...bc)));
  c.rigid('chest', extrude(outline, 0.018, 0.004), 'glossy', (p, n) => {
    if (n.z > 0.5) return GRAPH_D;                // base (encostada na mochila)
    if (Math.abs(n.z) < 0.5) return SILVER_D;     // borda
    return mix(GRAPH_D, GRAPH, sstep(-0.25, 0.25, p.y));
  }, { p: bc, r: [tilt, 0, ang] });
  // decalques em peças próprias (a tampa do extrude só tem vértices no contorno): faixa violeta, pontas e a lua
  const faceDir = v3(new THREE.Vector3(0, 0, -1).applyEuler(boardRot));
  c.rigid('chest', box(0.13, 0.016, 0.004), 'glossy', VIOLET, { p: onBoard(0, -0.045, -0.0135), r: [tilt, 0, ang] });
  for (const sy of [1, -1]) c.rigid('chest', box(0.1, 0.022, 0.004), 'glossy', VIOLET_D, { p: onBoard(0, sy * 0.178, -0.0135), r: [tilt, 0, ang] });
  moonEmblem(c, 'chest', 0.03, onBoard(0, 0.03, -0.016), aimZ(faceDir));
  for (const yb of [-0.11, 0.11]) {
    const local = new THREE.Vector3(0, yb, -0.02).applyEuler(new THREE.Euler(tilt, 0, ang)).add(new THREE.Vector3(...bc));
    c.rigid('chest', box(0.13, 0.05, 0.02, 0.008, 1), 'std', STRAP, { p: v3(local), r: [tilt, 0, ang] });
    const strap = new THREE.Vector3(0, yb + 0.012, -0.034).applyEuler(new THREE.Euler(tilt, 0, ang)).add(new THREE.Vector3(...bc));
    c.rigid('chest', box(0.11, 0.024, 0.014), 'cloth', SILVER_D, { p: v3(strap), r: [tilt, 0, ang] });
  }
  c.rigid('chest', box(0.2, 0.022, 0.012), 'std', STRAP, { p: [0, 0.54, -0.257], r: [tilt, 0, 0] });
  c.rigid('chest', box(0.03, 0.03, 0.016), METAL, SILVER, { p: [-0.08, 0.54, -0.265], r: [tilt, 0, 0] });
  

  const my = -c.fy(0.69);
  // meio sorriso de canto: cobre o sorriso simétrico com a cor da pele e desenha o canto levantado
  const smirk = `<ellipse cx="0" cy="${my + 6}" rx="30" ry="14" fill="${SKIN}"/>`
    + `<path d="M -16 ${my + 3} Q 4 ${my + 7} 19 ${my - 5}" fill="none" stroke="#5a2a2a" stroke-width="5" stroke-linecap="round"/>`;
  return {
    bg: SKIN,
    eye: { x: 70, y: c.fy(0.795), rx: 38, ry: 40, iris: '#8d86b8', irisDark: '#3a3266', irisLight: '#d6d1f2', tilt: 10, line: '#1a1622' },
    brow: { color: '#1d2030', w: 10, len: 50, gap: 7 },
    mouth: { y: c.fy(0.69), w: 40, line: '#5a2a2a' },
    blush: '#f09a8a',
    over: (e) => (e === 'neutral' || e === 'blink' ? smirk : ''),
  };
}

export const kaito: CharDef = { id: 'kaito', build };
