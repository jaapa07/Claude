/**
 * Base comum parametrizada dos pilotos: contexto de construção (skin rígida/suave), tronco, braços,
 * pernas, mãos, botas e cabeça com a casca do rosto (malha `face`).
 */
import { Model, THREE, bindTo, bindWith, norm, paint, xf, type ColorFn, type ColorLike, type V3, type Xf } from '../lib/geo';
import type { Chain } from './anim';
import { boot, fist, mirrorX } from './parts';
import { Rig, type RigSpec, type WeightFn } from './rig';
import { darken, lighten, paintUV, ramp, ringFn, roundEnds, sstep, surf, sweepFn, type Ring, type UVColorFn } from './shapes';
import { mix } from '../lib/geo';

export type Geo = THREE.BufferGeometry;

export interface FacePatch { w: number; h: number; cx: number; cy: number }

export class Ctx {
  readonly rig: Rig;
  readonly body = new Model();
  readonly face = new Model();
  readonly chains: Chain[] = [];
  patch: FacePatch = { w: 0.3, h: 0.25, cx: 0, cy: 0.8 };
  headTop = 0;
  /** Converte altura do mundo (m) em mm relativos ao centro da casca do rosto (para FaceSpec). */
  fy = (yWorld: number): number => (yWorld - this.patch.cy) * 1000;

  constructor(readonly id: string, spec: RigSpec = {}) { this.rig = new Rig(spec); }

  private prep(geo: Geo, color?: ColorLike | ColorFn, x?: Xf): Geo {
    let g = color !== undefined || !geo.getAttribute('color') ? paint(geo, color ?? '#ffffff') : norm(geo);
    if (x) g = xf(g, x);
    return g;
  }
  /** Peça rígida presa a um osso. `color` omitido = geometria já pintada. */
  rigid(bone: string, geo: Geo | Geo[], mat: string, color?: ColorLike | ColorFn, x?: Xf): this {
    for (const g0 of Array.isArray(geo) ? geo : [geo]) {
      this.body.parts.push({ geo: bindTo(this.prep(g0, color, x), this.rig.i(bone)), mat });
    }
    return this;
  }
  /** Peça com skin suave (pesos calculados na posição final, em coordenadas do mundo). */
  soft(geo: Geo | Geo[], mat: string, w: WeightFn, color?: ColorLike | ColorFn, x?: Xf): this {
    for (const g0 of Array.isArray(geo) ? geo : [geo]) {
      this.body.parts.push({ geo: bindWith(this.prep(g0, color, x), w), mat });
    }
    return this;
  }
  /** Registra uma cadeia de ossos com movimento secundário. */
  chain(prefix: string, parent: string, pts: V3[], dyn: Omit<Chain, 'bones'>): string[] {
    const bones = this.rig.chain(prefix, parent, pts);
    this.chains.push({ bones, ...dyn });
    return bones;
  }
}

/* ------------------------------------------------------------------ corpo */
export interface LimbSpec { r: (t: number) => number | [number, number]; color: UVColorFn; mat?: string }
export interface BodySpec {
  torso: Ring[]; torsoColor: UVColorFn; torsoMat?: string;
  arm: LimbSpec; leg: LimbSpec;
  hand: { color: ColorLike; scale?: number; mat?: string; knuckle?: ColorLike };
  boot: { upper: ColorLike; sole: ColorLike; toe?: ColorLike; scale?: number; mat?: string; shaft?: ColorLike; shaftR?: number };
}

/** Tabela padrão do tronco (y absoluto), com escalas de largura/profundidade e barriga. */
export function torsoRings(sx = 1, sz = 1, belly = 0, neck = 0.058): Ring[] {
  return [
    { y: 0.0, rx: 0.08 * sx, rz: 0.07 * sz, e: 2.4 },
    { y: 0.03, rx: 0.15 * sx, rz: 0.125 * sz, e: 2.5 },
    { y: 0.11, rx: 0.168 * sx, rz: 0.138 * sz, e: 2.4 },
    { y: 0.23, rx: (0.146 + belly * 0.5) * sx, rz: (0.118 + belly) * sz, z: belly * 0.4, e: 2.3 },
    { y: 0.36, rx: 0.152 * sx, rz: (0.122 + belly * 0.4) * sz, z: 0.005, e: 2.3 },
    { y: 0.46, rx: 0.148 * sx, rz: 0.112 * sz, e: 2.3 },
    { y: 0.52, rx: 0.1 * sx, rz: 0.085 * sz, e: 2.1 },
    { y: 0.56, rx: neck, rz: neck, z: 0.005 },
    { y: 0.62, rx: neck * 0.95, rz: neck * 0.95, z: 0.01 },
    { y: 0.7, rx: neck * 0.9, rz: neck * 0.9, z: 0.01 },
  ];
}

const lerp3 = (a: THREE.Vector3, b: THREE.Vector3, t: number): V3 => a.clone().lerp(b, t).toArray() as V3;

export function buildBody(c: Ctx, b: BodySpec): void {
  const rig = c.rig;
  // tronco
  const torso = surf(ringFn(b.torso), 24, 20, { capStart: true });
  c.soft(paintUV(torso, b.torsoColor), b.torsoMat ?? 'cloth', rig.torsoW);

  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    // braço
    const S = rig.p(`arm${sfx}`), E = rig.p(`forearm${sfx}`), H = rig.p(`hand${sfx}`);
    const S0 = S.clone().add(new THREE.Vector3(-sg * 0.03, -0.005, -0.005));
    const W = E.clone().lerp(H, 0.86);
    const armPts: V3[] = [S0.toArray() as V3, S.toArray() as V3, lerp3(S, E, 0.5), E.toArray() as V3, lerp3(E, W, 0.5), W.toArray() as V3];
    const arm = surf(sweepFn(armPts, b.arm.r, { ref: [0, 1, 0] }), 10, 16, { capStart: true, capEnd: true });
    c.soft(paintUV(arm, b.arm.color), b.arm.mat ?? 'cloth', rig.armW(sfx));
    // mão
    const hs = b.hand.scale ?? 1;
    const fwd = H.clone().sub(E).normalize();
    const yaw = Math.atan2(fwd.x, fwd.z) * 0.6;
    for (const g0 of fist(b.hand.color, hs, b.hand.knuckle)) {
      const g = sg > 0 ? g0 : mirrorX(g0);
      c.rigid(`hand${sfx}`, g, b.hand.mat ?? 'cloth', undefined, { p: H.toArray() as V3, r: [-0.12, yaw, 0] });
    }
    // perna
    const hip = rig.p(`leg${sfx}`), knee = rig.p(`shin${sfx}`), ankle = new THREE.Vector3(sg * rig.ankle[0], rig.ankle[1], rig.ankle[2]);
    const hip0 = hip.clone().add(new THREE.Vector3(-sg * 0.01, 0, -0.05));
    const legPts: V3[] = [hip0.toArray() as V3, hip.toArray() as V3, lerp3(hip, knee, 0.55), knee.toArray() as V3, lerp3(knee, ankle, 0.5), ankle.toArray() as V3];
    const leg = surf(sweepFn(legPts, b.leg.r, { ref: [1, 0, 0] }), 12, 16, { capStart: true, capEnd: true });
    c.soft(paintUV(leg, b.leg.color), b.leg.mat ?? 'cloth', rig.legW(sfx));
    // bota (rígida na canela)
    const bs = b.boot.scale ?? 1;
    const { upper, sole } = boot(b.boot.upper, b.boot.sole, b.boot.toe, bs);
    const fx: Xf = { p: [ankle.x, ankle.y - 0.012, ankle.z + 0.012], r: [-1.02, sg * -0.1, 0] };
    c.rigid(`shin${sfx}`, upper, b.boot.mat ?? 'std', undefined, fx);
    c.rigid(`shin${sfx}`, sole, 'rubber', undefined, fx);
    // cano da bota
    const sr = b.boot.shaftR ?? 0.056;
    const up = knee.clone().sub(ankle).normalize();
    const shaftPts: V3[] = [ankle.clone().addScaledVector(up, -0.03).toArray() as V3, ankle.clone().addScaledVector(up, 0.03).toArray() as V3, ankle.clone().addScaledVector(up, 0.085).toArray() as V3];
    const shaft = surf(sweepFn(shaftPts, (t) => sr * bs * (0.92 + 0.12 * t) * roundEnds(t, 0.25, 0.1), { ref: [1, 0, 0] }), 12, 5, { capEnd: true });
    const sc = b.boot.shaft ?? b.boot.upper;
    c.rigid(`shin${sfx}`, paintUV(shaft, (_u, v) => mix(darken(sc, 0.25), lighten(sc, 0.1), sstep(0.3, 1, v))), b.boot.mat ?? 'std');
  }
}

/** Perfil de raio padrão de braço (manga → punho) e perna. */
export const armProfile = (shoulder = 0.058, elbow = 0.046, wrist = 0.04) => (t: number): number =>
  ramp(t, [[0, shoulder * 0.8], [0.12, shoulder], [0.5, elbow], [0.85, wrist], [1, wrist * 0.9]]) * roundEnds(t, 0.06, 0);
export const legProfile = (thigh = 0.078, knee = 0.062, ankle = 0.05) => (t: number): number =>
  ramp(t, [[0, thigh * 0.85], [0.15, thigh], [0.52, knee], [0.9, ankle], [1, ankle * 0.9]]) * roundEnds(t, 0.08, 0);

/* ------------------------------------------------------------------ cabeça */
export interface HeadSpec {
  rings: Ring[];
  mod?: (p: THREE.Vector3, th: number, v: number) => void;
  mat?: string;
  color: UVColorFn;
  /** Região do rosto: meia-largura em u (em torno de 0.5 = frente) e faixa em v. */
  faceU: number; faceV0: number; faceV1: number;
  nu?: number; nv?: number;
}

/**
 * Cabeça em loft com um recorte na frente preenchido pela malha `face` (mesmos vértices e normais da
 * cabeça, portanto sem degrau nem z-fighting). UV do rosto: projeção planar frontal na célula 0 do atlas
 * (u: 0..0.25 da direita do personagem (−X) para a esquerda (+X); v: 0 no topo .. 0.5 na base).
 */
export function buildHead(c: Ctx, h: HeadSpec): { fn: (u: number, v: number) => THREE.Vector3 } {
  const fn = ringFn(h.rings, h.mod);
  const nu = h.nu ?? 36, nv = h.nv ?? 26;
  const inFace = (u: number, v: number): boolean => Math.abs(u - 0.5) < h.faceU && v > h.faceV0 && v < h.faceV1;
  const head = surf(fn, nu, nv, { capStart: true, capEnd: true, skip: inFace });
  c.rigid('head', paintUV(head, h.color), h.mat ?? 'skin');
  const patch = surf(fn, nu, nv, { skip: (u, v) => !inFace(u, v) });
  const pos = patch.getAttribute('position');
  const bb = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
  const w = bb.max.x - bb.min.x, hh = bb.max.y - bb.min.y;
  const uv = patch.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, ((pos.getX(i) - bb.min.x) / w) * 0.25, ((bb.max.y - pos.getY(i)) / hh) * 0.5);
  }
  c.headTop = h.rings[h.rings.length - 1]!.y;
  c.patch = { w, h: hh, cx: (bb.max.x + bb.min.x) / 2, cy: (bb.max.y + bb.min.y) / 2 };
  c.face.parts.push({ geo: bindTo(paint(patch, '#ffffff'), c.rig.i('head')), mat: `face_${c.id}` });
  return { fn: (u, v) => fn(u, v).clone() };
}

/** Ponto na superfície da cabeça a partir de azimute (graus; 0 = frente, + = esquerda do personagem) e v. */
export function headPoint(fn: (u: number, v: number) => THREE.Vector3, azDeg: number, v: number): THREE.Vector3 {
  return fn(0.5 + azDeg / 360, v);
}

/** Punho/braçadeira rígida em volta do antebraço (t0..t1 entre cotovelo e mão). `ridges` = caneluras. */
export function cuff(c: Ctx, sfx: 'L' | 'R', t0: number, t1: number, r: number, color: UVColorFn, mat = 'cloth', ridges = 0, bone?: string): void {
  const E = c.rig.p(`forearm${sfx}`), H = c.rig.p(`hand${sfx}`);
  const pts: V3[] = [0, 0.5, 1].map((k) => lerp3(E, H, t0 + (t1 - t0) * k));
  const g = surf((u, v) => {
    const p = sweepFn(pts, 1, { ref: [0, 1, 0] })(u, v);
    const cen = new THREE.Vector3(...pts[0]!).lerp(new THREE.Vector3(...pts[2]!), v);
    const rr = r * (0.82 + 0.18 * Math.sin(Math.PI * v) ** 0.4) * (1 + (ridges ? 0.07 * Math.sin(u * Math.PI * 2 * ridges) : 0));
    return p.sub(cen).multiplyScalar(rr).add(cen);
  }, ridges ? Math.max(12, ridges * 2) : 12, 4, { capStart: true, capEnd: true });
  c.rigid(bone ?? `forearm${sfx}`, paintUV(g, color), mat);
}
/** Mesma ideia para a canela/coxa: t entre os dois pontos dados. */
export function limbRing(c: Ctx, bone: string, a: THREE.Vector3, b: THREE.Vector3, t0: number, t1: number, r: number, color: UVColorFn, mat = 'cloth'): void {
  const pts: V3[] = [0, 0.5, 1].map((k) => lerp3(a, b, t0 + (t1 - t0) * k));
  const g = surf(sweepFn(pts, (t) => r * (0.85 + 0.15 * Math.sin(Math.PI * t) ** 0.4), { ref: [1, 0, 0] }), 12, 4, { capStart: true, capEnd: true });
  c.rigid(bone, paintUV(g, color), mat);
}
