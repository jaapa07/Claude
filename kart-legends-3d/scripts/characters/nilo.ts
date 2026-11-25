/** Nilo — raposa exploradora: focinho pontudo, orelhas grandes, cauda volumosa, colete, bandana e óculos de aviador. */
import { THREE, box, cyl, mix, sphere, torus, type V3 } from '../lib/geo';
import { armProfile, buildBody, buildHead, headPoint, legProfile, torsoRings, type Ctx } from './base';
import type { CharDef } from './export';
import type { FaceSpec } from './face';
import { defineMaterial } from '../lib/materials';
import { aimZ, plume, pointedEar, ribbon, tuft } from './parts';
import { darken, lighten, paintUV, ramp, roundEnds, scaleRings, sstep, surf, sweep, type Ring } from './shapes';
import { band, clothPaint, ringAtY, shell, v3 } from './wear';

const METAL = defineMaterial('chars_metal', { roughness: 0.38, metalness: 0.45 });
const FUR = '#f2762e', FUR_D = '#c9521c', CREAM = '#fff1d6', PAW = '#4a2a1e', KHAKI = '#b98f4e', KHAKI_D = '#8a6630';
const TEAL = '#2a9db0', BRASS = '#d1a04a', LEATHER = '#6b4226', SHORTS = '#5d6b3a';

function build(c: Ctx): FaceSpec {
  const rig = c.rig;
  const T = torsoRings(0.95, 0.95);
  buildBody(c, {
    torso: T,
    torsoColor: (_u, _v, p, n) => {
      if (p.y < 0.2) return mix(darken(SHORTS, 0.3), SHORTS, sstep(0, 0.16, p.y) * (0.7 + 0.3 * n.y));
      const bib = p.z > 0 ? sstep(0.115, 0.05, Math.abs(p.x)) * sstep(0.56, 0.5, p.y) : 0;
      const base = mix(FUR, CREAM, bib);
      return mix(darken(base, 0.22), base, sstep(0.15, 0.5, p.y));
    },
    torsoMat: 'fur',
    arm: {
      r: armProfile(0.056, 0.046, 0.042), mat: 'fur',
      color: (u, v, _p, n) => {
        const edge = 0.6 + 0.025 * Math.sin(u * Math.PI * 12);
        const base = v > edge ? PAW : mix(FUR_D, FUR, 0.55 + 0.45 * n.y);
        return v > edge ? mix(darken(PAW, 0.2), PAW, 0.5 + 0.5 * n.y) : base;
      },
    },
    leg: {
      r: (t) => (t < 0.56 ? 0.084 * (0.9 + 0.1 * sstep(0, 0.15, t)) * roundEnds(t, 0.08, 0) : legProfile(0.078, 0.064, 0.05)(t)),
      mat: 'fur',
      color: (u, v, _p, n) => {
        if (v < 0.56) return mix(darken(SHORTS, 0.3), SHORTS, (0.6 + 0.4 * n.y) * (v > 0.52 ? 0.7 : 1));
        const edge = 0.72 + 0.02 * Math.sin(u * Math.PI * 12);
        return v > edge ? PAW : mix(FUR_D, FUR, 0.55 + 0.45 * n.y);
      },
    },
    hand: { color: PAW, scale: 1.08, mat: 'fur', knuckle: '#6a4030' },
    boot: { upper: LEATHER, sole: '#2b1d16', toe: '#8a5a34', scale: 1.08, shaft: '#7d4f2e' },
  });

  /* ---------- cabeça ---------- */
  const Y = (y: number): number => 0.612 + (y - 0.612) * 1.13;
  const HX = 1.1;
  const H: Ring[] = scaleRings([
    { y: 0.612, rx: 0.02, rz: 0.02, z: 0.015 },
    { y: 0.632, rx: 0.115, rz: 0.105, z: 0.015 },
    { y: 0.7, rx: 0.192, rz: 0.165, z: 0.02 },
    { y: 0.775, rx: 0.218, rz: 0.184, z: 0.022 },
    { y: 0.86, rx: 0.205, rz: 0.19, z: 0.02 },
    { y: 0.94, rx: 0.165, rz: 0.165, z: 0.015 },
    { y: 0.995, rx: 0.09, rz: 0.095, z: 0.012 },
    { y: 1.016, rx: 0.01, rz: 0.01, z: 0.01 },
  ], 0.612, 1.13, HX);
  const snout = (p: THREE.Vector3): void => {
    if (p.z <= 0) return;
    const dy = p.y - Y(0.738);
    const w = Math.exp(-((p.x / 0.074) ** 2)) * Math.exp(-((dy / (dy > 0 ? 0.058 : 0.075)) ** 2));
    p.z += 0.118 * w;
    p.y -= 0.008 * w;
  };
  const head = buildHead(c, {
    rings: H, mod: snout, mat: 'fur', faceU: 0.172, faceV0: 0.2, faceV1: 0.63,
    color: (u, _v, p, n) => {
      const back = sstep(0.05, -0.16, p.z) * 0.22 + sstep(Y(0.93), Y(1.02), p.y) * 0.12;
      const chin = sstep(Y(0.67), Y(0.63), p.y) * (Math.abs(u - 0.5) < 0.2 ? 1 : 0);
      return mix(mix(FUR, FUR_D, back), CREAM, chin * 0.9 * (n.y < 0 ? 1 : 0.5));
    },
  });
  const tip = headPoint(head.fn, 0, 0.415);
  c.rigid('head', box(0.054, 0.036, 0.036, 0.016, 2), 'glossy', (p) => mix('#1d1414', '#4a3a3a', sstep(0, 0.017, p.y)), { p: [0, tip.y + 0.012, tip.z - 0.006] });

  // orelhas (um osso cada)
  for (const sg of [1, -1]) {
    const base: V3 = [sg * 0.13, Y(0.945), 0.0];
    const name = sg > 0 ? 'earL' : 'earR';
    c.chain(name, 'head', [base], { roll: 0.2, pitch: 0.12, lag: 0.06, sway: [0.03, 0, 0.04], wind: [-0.3, 0, sg * -0.06], flutter: [0.05, 0, 0.03], bounce: 1.5 });
    c.rigid(name, pointedEar(0.26, 0.19, 0.05, FUR, '#ffe2c2', '#3a2018', sg * 0.12), 'fur', undefined, { p: [base[0], base[1] - 0.03, base[2]], r: [-0.12, sg * -0.25, sg * -0.34] });
  }
  // tufos da bochecha e topete
  for (const sg of [1, -1]) {
    [[0.77, 0.01, 0.03], [0.735, -0.04, 0.036], [0.7, -0.085, 0.028]].forEach(([y, dy, r], i) => {
      c.rigid('head', tuft([[sg * 0.2, Y(y!), 0.05], [sg * (0.262 + i * 0.004), Y(y! + dy! * 0.5), 0.04], [sg * (0.325 - i * 0.022), Y(y! + dy! - 0.012), 0.02]], [0.016, r!], mix(FUR, CREAM, 0.6), CREAM, 8, 6, [0, 0, 1]), 'fur');
    });
  }
  [[-0.04, 0.07], [0.0, 0.11], [0.045, 0.075]].forEach(([x, len]) => {
    c.rigid('head', tuft([[x!, Y(0.985), 0.05], [x! * 1.3, Y(1.03), 0.085], [x! * 1.7, Y(1.035) + len! * 0.25, 0.09 + len! * 0.6], [x! * 1.9, Y(1.02) + len! * 0.2, 0.1 + len!]], [0.03, 0.022], FUR, FUR_D, 7, 7), 'fur');
  });

  // óculos de aviador na testa
  c.rigid('head', paintUV(band(H, Y(0.9), Y(0.945), 0.007, 32), () => '#3b2418'), 'std');
  for (const sg of [1, -1]) {
    const hp = headPoint(head.fn, sg * 25, 0.74);
    const dir: V3 = [Math.sin(sg * 0.42) * 0.9, 0.42, Math.cos(0.42) * 0.9];
    const r = aimZ(dir);
    const o = new THREE.Vector3(...dir).normalize();
    const at = (d: number): V3 => v3(hp.clone().addScaledVector(o, d));
    c.rigid('head', cyl(0.05, 0.054, 0.03, 12).rotateX(Math.PI / 2), 'std', '#4a2d1c', { p: at(0.006), r });
    c.rigid('head', torus(0.046, 0.011, 6, 16), METAL, (p) => mix(darken(BRASS, 0.25), lighten(BRASS, 0.2), sstep(-0.05, 0.05, p.y)), { p: at(0.024), r });
    c.rigid('head', sphere(0.043, 12, 6).scale(1, 1, 0.3), 'glossy', (p) => mix('#1c5d70', '#aef0f5', sstep(-0.02, 0.05, p.y + p.x * 0.6)), { p: at(0.022), r });
  }
  const br = headPoint(head.fn, 0, 0.74);
  c.rigid('head', box(0.05, 0.016, 0.014, 0.005, 1), METAL, BRASS, { p: [0, br.y + 0.012, br.z + 0.016], r: [-0.42, 0, 0] });

  /* ---------- roupa ---------- */
  // colete aberto
  const open = (u: number, v: number): boolean => Math.abs(u - 0.5) < 0.022 + 0.05 * v;
  const vest = shell(T, 0.215, 0.505, (t) => 0.013 + 0.004 * Math.sin(Math.PI * t), { skip: open, nv: 10 });
  c.soft(paintUV(vest.geo, (u, v, p, n) => {
    const trim = Math.abs(u - 0.5) < 0.04 + 0.05 * v || v < 0.1 || v > 0.93;
    return trim ? mix(darken(KHAKI_D, 0.2), KHAKI_D, 0.5 + 0.5 * n.y) : clothPaint(KHAKI, 0.2, 0.5)(u, v, p, n);
  }), 'cloth', rig.torsoW);
  for (const sg of [1, -1]) {
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) { const v = i / 8; pts.push(v3(vest.fn(0.5 + sg * (0.022 + 0.05 * v), v))); }
    c.soft(sweep(pts, 0.009, 6, 12), 'cloth', rig.torsoW, KHAKI_D);
    // bolso com aba e botão
    const pp = vest.fn(0.5 + sg * 0.1, 0.24).clone();
    const yaw = sg * 0.62;
    c.soft(box(0.066, 0.06, 0.022, 0.008, 1), 'cloth', rig.torsoW, (p) => mix(darken(KHAKI, 0.25), KHAKI, sstep(-0.03, 0.03, p.y)), { p: [pp.x, pp.y, pp.z + 0.004], r: [0, yaw, 0] });
    c.soft(box(0.072, 0.024, 0.026, 0.008, 1), 'cloth', rig.torsoW, KHAKI_D, { p: [pp.x, pp.y + 0.026, pp.z + 0.005], r: [0, yaw, 0] });
    c.soft(sphere(0.008, 8, 6), METAL, rig.torsoW, BRASS, { p: [pp.x + Math.sin(yaw) * 0.014, pp.y + 0.02, pp.z + 0.005 + Math.cos(yaw) * 0.014] });
  }
  c.soft(paintUV(band(T, 0.2, 0.235, 0.012), () => '#3b2418'), 'std', rig.torsoW);
  const bz = ringAtY(T, 0.218);
  c.soft(box(0.05, 0.04, 0.014, 0.006, 1), METAL, rig.torsoW, BRASS, { p: [0, 0.218, bz.z + bz.rz + 0.012] });

  // bolsa de explorador com mapa enrolado (quadril direito) e alça cruzada
  c.rigid('hips', box(0.035, 0.1, 0.11, 0.012, 1), 'std', (p) => mix(darken(LEATHER, 0.3), LEATHER, sstep(-0.05, 0.05, p.y)), { p: [-(bz.rx + 0.03), 0.15, 0.0] });
  c.rigid('hips', box(0.04, 0.045, 0.118, 0.01, 1), 'std', '#7d4f2e', { p: [-(bz.rx + 0.032), 0.185, 0.0] });
  c.rigid('hips', sphere(0.009, 6, 4), METAL, BRASS, { p: [-(bz.rx + 0.054), 0.17, 0.0] });
  c.rigid('hips', cyl(0.018, 0.018, 0.15, 8), 'std', (p) => mix('#d9c69a', '#fff4d6', sstep(-0.07, 0.07, p.y)), { p: [-(bz.rx + 0.03), 0.235, -0.03], r: [-0.5, 0, 0.1] });
  c.rigid('hips', cyl(0.0195, 0.0195, 0.02, 8), 'cloth', '#c0392b', { p: [-(bz.rx + 0.03), 0.235, -0.03], r: [-0.5, 0, 0.1] });
  c.soft(ribbon([[-(bz.rx + 0.02), 0.19, 0.03], [-0.1, 0.33, 0.125], [0.03, 0.45, 0.13], [0.12, 0.525, 0.03], [0.1, 0.48, -0.1], [-0.05, 0.3, -0.14], [-(bz.rx + 0.02), 0.19, -0.04]], 0.026, 0.008, () => LEATHER, { ref: [0, 0, 1], nv: 20, nu: 6 }), 'std', rig.torsoW);

  // bandana: gola + triângulo no peito + pontas atrás (osso próprio)
  c.soft(paintUV(band(T, 0.525, 0.6, 0.024, 24), (_u, _v, p) => mix(darken(TEAL, 0.25), TEAL, sstep(0.52, 0.6, p.y))), 'cloth', rig.torsoW);
  const tri = surf((u, v) => {
    const y = 0.565 - 0.16 * v, r = ringAtY(T, Math.min(0.56, y));
    const az = (u - 0.5) * 2 * 1.25 * (1 - v);
    const g = 0.022 - 0.008 * v;
    return new THREE.Vector3(r.x + (r.rx + g) * Math.sin(az), y, r.z + (r.rz + g) * Math.cos(az) + 0.012 * Math.sin(Math.PI * v));
  }, 14, 8, { flip: true });
  c.soft(paintUV(tri, (_u, v) => mix(TEAL, lighten(TEAL, 0.35), sstep(0.72, 0.8, v) * (1 - sstep(0.86, 0.92, v)))), 'cloth', rig.torsoW);
  const knot: V3 = [0.02, 0.575, -0.085];
  c.chain('scarf', 'chest', [knot], { roll: 0.3, pitch: 0.2, lag: 0.08, sway: [0.05, 0.08, 0.05], wind: [0.5, 0, 0], flutter: [0.16, 0.2, 0.1], bounce: 2 });
  c.rigid('scarf', sphere(0.022, 10, 8).scale(1.2, 0.9, 0.9), 'cloth', darken(TEAL, 0.1), { p: knot });
  for (const sg of [1, -1]) {
    c.rigid('scarf', ribbon([knot, [knot[0] + sg * 0.04, 0.545, -0.125], [knot[0] + sg * 0.075, 0.49, -0.16], [knot[0] + sg * 0.085, 0.44, -0.185]], (t) => 0.035 + 0.035 * t, 0.008, (t) => mix(TEAL, lighten(TEAL, 0.3), sstep(0.7, 0.78, t) * (1 - sstep(0.86, 0.92, t))), { ref: [1, 0, 0.3], nv: 8 }), 'cloth');
  }

  /* ---------- cauda ---------- */
  // sobe logo depois do quadril para passar por cima da borda lateral e das rodas traseiras dos karts
  const tailPts: V3[] = [[0.05, 0.14, -0.09], [0.2, 0.22, -0.14], [0.31, 0.37, -0.25], [0.37, 0.55, -0.39], [0.33, 0.73, -0.46], [0.25, 0.86, -0.45]];
  const tb = c.chain('tail', 'hips', [tailPts[0]!, [0.27, 0.31, -0.2], [0.37, 0.52, -0.37]], { roll: 0.3, pitch: 0.18, lag: 0.09, sway: [0.04, 0.1, 0.05], phase: 0.18, wind: [-0.1, 0.03, 0], flutter: [0.04, 0.07, 0.03], bounce: 2.5 });
  c.soft(plume(tailPts, (t) => ramp(t, [[0, 0.04], [0.25, 0.07], [0.6, 0.108], [0.82, 0.085], [1, 0.0]]) + 0.004, (t, u, n) => {
    const edge = 0.7 + 0.035 * Math.sin(u * Math.PI * 14);
    return t > edge ? mix(CREAM, '#ffffff', sstep(edge, 1, t)) : mix(FUR_D, FUR, 0.5 + 0.5 * n.y);
  }, 14, 20), 'fur', rig.chainW(tb, { parent: 'hips', blend: 0.07, tip: tailPts[5] }));

  return {
    bg: FUR,
    eye: { x: 84, y: c.fy(Y(0.822)), rx: 45, ry: 57, iris: '#49b06a', irisDark: '#1f6a3c', irisLight: '#9be27f', tilt: 7 },
    brow: { color: '#5a2c14', w: 11, len: 62, gap: 8 },
    mouth: { y: c.fy(Y(0.706)), w: 42, line: '#3a2018', cat: true },
    blush: '#ff9a6e',
    under: () => `<ellipse cx="0" cy="${-c.fy(Y(0.712))}" rx="88" ry="50" fill="${CREAM}"/><ellipse cx="0" cy="${-c.fy(Y(0.74))}" rx="44" ry="36" fill="${CREAM}"/>`
      + [-1, 1].map((s) => `<ellipse cx="${s * 70}" cy="${-c.fy(Y(0.9))}" rx="13" ry="8" fill="#ffd9a6" transform="rotate(${s * -14} ${s * 70} ${-c.fy(Y(0.9))})"/>`).join(''),
  };
}

export const nilo: CharDef = { id: 'nilo', build };
