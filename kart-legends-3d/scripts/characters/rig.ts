/**
 * Esqueleto dos pilotos (contrato em docs/CONTRACTS.md §3), solucionador de poses (FK + IK de dois ossos
 * para os braços) e funções de peso para skin suave.
 *
 * Convenção: TODOS os ossos têm rotação de repouso identidade (eixos = eixos do mundo); a pose de bind é a
 * pose de direção sentada. Assim a matriz inversa de bind é só uma translação e as rotações locais dos clipes
 * são deltas em relação à pose de direção.
 */
import { THREE, type V3 } from '../lib/geo';

export const WHEEL_CENTER = new THREE.Vector3(0, 0.5, 0.42);
const TILT = THREE.MathUtils.degToRad(25);
/** Eixo do volante apontando para o piloto. Rotação positiva em torno dele = virar à ESQUERDA (mão esquerda desce). */
export const WHEEL_AXIS = new THREE.Vector3(0, Math.sin(TILT), -Math.cos(TILT));
export const HAND_TARGET: V3 = [0.14, 0.52, 0.38];

export const REQUIRED_BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'armL', 'forearmL', 'handL', 'armR', 'forearmR', 'handR', 'legL', 'shinL', 'legR', 'shinR'] as const;

export interface Bone { name: string; parent: number; pos: THREE.Vector3 }
export type Weights = [number, number][];
export type WeightFn = (p: THREE.Vector3) => Weights;

const ss = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface RigSpec {
  shoulder?: V3; upperArm?: number; foreArm?: number;
  hip?: V3; knee?: V3; ankle?: V3;
  headY?: number;
}

/** Resolve IK de dois ossos; devolve cotovelo e mão (alcance limitado). */
export function twoBone(S: THREE.Vector3, T: THREE.Vector3, pole: THREE.Vector3, l1: number, l2: number): { E: THREE.Vector3; H: THREE.Vector3 } {
  const dir = T.clone().sub(S);
  let d = dir.length();
  dir.normalize();
  d = Math.min((l1 + l2) * 0.992, Math.max(Math.abs(l1 - l2) + 0.02, d));
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(1e-8, l1 * l1 - a * a));
  const pp = pole.clone().addScaledVector(dir, -dir.dot(pole));
  if (pp.lengthSq() < 1e-8) pp.set(0, -1, 0).addScaledVector(dir, dir.y);
  pp.normalize();
  return { E: S.clone().addScaledVector(dir, a).addScaledVector(pp, h), H: S.clone().addScaledVector(dir, d) };
}

function basis(a: THREE.Vector3, n: THREE.Vector3): THREE.Matrix4 {
  const c = new THREE.Vector3().crossVectors(a, n).normalize();
  const n2 = new THREE.Vector3().crossVectors(c, a).normalize();
  return new THREE.Matrix4().makeBasis(a.clone().normalize(), n2, c);
}

export class Rig {
  bones: Bone[] = [];
  private map = new Map<string, number>();
  readonly l1: number; readonly l2: number;

  constructor(spec: RigSpec = {}) {
    const sh = spec.shoulder ?? [0.155, 0.485, 0.0];
    this.l1 = spec.upperArm ?? 0.2; this.l2 = spec.foreArm ?? 0.2;
    const hip = spec.hip ?? [0.085, 0.1, 0.03], knee = spec.knee ?? [0.15, 0.215, 0.33], ankle = spec.ankle ?? [0.15, 0.085, 0.58];
    this.add('root', null, [0, 0, 0]);
    this.add('hips', 'root', [0, 0.12, 0]);
    this.add('spine', 'hips', [0, 0.24, 0]);
    this.add('chest', 'spine', [0, 0.38, 0]);
    this.add('neck', 'chest', [0, 0.55, 0.005]);
    this.add('head', 'neck', [0, spec.headY ?? 0.63, 0.01]);
    for (const [sfx, sg] of [['L', 1], ['R', -1]] as [string, number][]) {
      const S = new THREE.Vector3(sg * sh[0], sh[1], sh[2]);
      const T = new THREE.Vector3(sg * HAND_TARGET[0], HAND_TARGET[1], HAND_TARGET[2]);
      const { E, H } = twoBone(S, T, wheelPole(sg), this.l1, this.l2);
      this.add(`arm${sfx}`, 'chest', S.toArray());
      this.add(`forearm${sfx}`, `arm${sfx}`, E.toArray());
      this.add(`hand${sfx}`, `forearm${sfx}`, H.toArray());
    }
    for (const [sfx, sg] of [['L', 1], ['R', -1]] as [string, number][]) {
      this.add(`leg${sfx}`, 'hips', [sg * hip[0], hip[1], hip[2]]);
      this.add(`shin${sfx}`, `leg${sfx}`, [sg * knee[0], knee[1], knee[2]]);
    }
    this.ankle = ankle;
  }
  readonly ankle: V3;

  add(name: string, parent: string | null, pos: V3): number {
    if (this.map.has(name)) throw new Error(`osso duplicado: ${name}`);
    this.bones.push({ name, parent: parent === null ? -1 : this.i(parent), pos: new THREE.Vector3(...pos) });
    this.map.set(name, this.bones.length - 1);
    return this.bones.length - 1;
  }
  has(name: string): boolean { return this.map.has(name); }
  i(name: string): number {
    const k = this.map.get(name);
    if (k === undefined) throw new Error(`osso inexistente: ${name}`);
    return k;
  }
  p(name: string): THREE.Vector3 { return this.bones[this.i(name)]!.pos.clone(); }
  /** Adiciona uma cadeia de ossos (cauda, cachecol...) a partir de pontos; devolve os nomes. */
  chain(prefix: string, parent: string, pts: V3[]): string[] {
    const names: string[] = [];
    pts.forEach((p, k) => {
      const name = pts.length === 1 ? prefix : `${prefix}${k + 1}`;
      this.add(name, k === 0 ? parent : names[k - 1]!, p);
      names.push(name);
    });
    return names;
  }

  /* ---------- pesos ---------- */
  /** Tronco: mistura por altura entre hips/spine/chest/neck/head. */
  torsoW: WeightFn = (p) => {
    const t1 = ss(0.15, 0.3, p.y), t2 = ss(0.29, 0.45, p.y), t3 = ss(0.5, 0.6, p.y), t4 = ss(0.6, 0.68, p.y);
    return [
      [this.i('hips'), 1 - t1], [this.i('spine'), t1 * (1 - t2)], [this.i('chest'), t2 * (1 - t3)],
      [this.i('neck'), t3 * (1 - t4)], [this.i('head'), t3 * t4],
    ];
  };

  /**
   * Pesos ao longo de uma cadeia de ossos: cada osso controla o segmento até o próximo; perto das
   * articulações mistura meio a meio numa faixa `blend`. `parent` recebe o começo do primeiro segmento.
   */
  chainW(names: string[], o: { parent?: string; blend?: number; tip?: V3; parentBlend?: number } = {}): WeightFn {
    const J = names.map((n) => this.p(n));
    const idx = names.map((n) => this.i(n));
    const last = J.length - 1;
    const tip = o.tip ? new THREE.Vector3(...o.tip) : last > 0 ? J[last]!.clone().multiplyScalar(2).sub(J[last - 1]!) : J[0]!.clone().add(new THREE.Vector3(0, 0, 0.1));
    const ends = [...J.slice(1), tip];
    const blend = o.blend ?? 0.05;
    const par = o.parent !== undefined ? this.i(o.parent) : -1;
    const d = new THREE.Vector3(), q = new THREE.Vector3();
    return (p) => {
      let best = 0, bestD = Infinity, bestS = 0, bestL = 1;
      for (let k = 0; k <= last; k++) {
        d.copy(ends[k]!).sub(J[k]!);
        const L = d.length();
        d.multiplyScalar(1 / L);
        let s = q.copy(p).sub(J[k]!).dot(d);
        const sc = Math.min(L, Math.max(0, s));
        const dist = q.copy(J[k]!).addScaledVector(d, sc).distanceToSquared(p);
        if (k === 0 && s < 0) s = Math.max(s, -blend); else if (k === last && s > L) s = L; else s = sc;
        if (dist < bestD - 1e-10) { bestD = dist; best = k; bestS = s; bestL = L; }
      }
      const w: Weights = [];
      let self = 1;
      const b0 = best === 0 ? (o.parentBlend ?? blend) : blend;
      if (bestS < b0) {
        const prev = best > 0 ? idx[best - 1]! : par;
        if (prev >= 0) { const f = Math.min(1, 0.5 * (1 - bestS / b0)); const fs = f * f * (3 - 2 * f); w.push([prev, fs]); self -= fs; }
      }
      if (best < last && bestL - bestS < blend) {
        const f = 0.5 * (1 - (bestL - bestS) / blend); const fs = f * f * (3 - 2 * f) * (f < 0.5 ? 1 : 1);
        w.push([idx[best + 1]!, fs]); self -= fs;
      }
      w.push([idx[best]!, Math.max(0, self)]);
      return w;
    };
  }

  armW(sfx: 'L' | 'R'): WeightFn { return this.chainW([`arm${sfx}`, `forearm${sfx}`, `hand${sfx}`], { parent: 'chest', blend: 0.055, parentBlend: 0.05 }); }
  legW(sfx: 'L' | 'R'): WeightFn {
    const sg = sfx === 'L' ? 1 : -1;
    return this.chainW([`leg${sfx}`, `shin${sfx}`], { parent: 'hips', blend: 0.07, tip: [sg * this.ankle[0], this.ankle[1], this.ankle[2]] });
  }
}

export function wheelPole(sg: number): THREE.Vector3 { return new THREE.Vector3(sg * 0.75, -1, -0.15); }

/* ---------- poses ---------- */
export interface HandSpec {
  /** 0 = mão no volante; 1 = mão no alvo `rel` (relativo ao osso chest, no referencial do peito). */
  mix?: number; rel?: V3; pole?: V3;
  /** Rotação extra da mão (euler) quando solta. */
  rot?: V3;
}
export interface Pose {
  rot: Record<string, V3>;
  /** Deslocamento do quadril (pulo no assento). */
  hips?: V3;
  /** Ângulo do volante (rad). Positivo = esquerda. */
  steer?: number;
  handL?: HandSpec; handR?: HandSpec;
}

const mirrorName = (n: string): string => (/L\d*$/.test(n) ? n.replace(/L(\d*)$/, 'R$1') : /R\d*$/.test(n) ? n.replace(/R(\d*)$/, 'L$1') : n);
const mh = (h?: HandSpec): HandSpec | undefined => h && {
  mix: h.mix, rel: h.rel && [-h.rel[0], h.rel[1], h.rel[2]], pole: h.pole && [-h.pole[0], h.pole[1], h.pole[2]],
  rot: h.rot && [h.rot[0], -h.rot[1], -h.rot[2]],
};
/** Espelha uma pose no plano YZ (esquerda ↔ direita). */
export function mirrorPose(p: Pose): Pose {
  const rot: Record<string, V3> = {};
  for (const [k, e] of Object.entries(p.rot)) rot[mirrorName(k)] = [e[0], -e[1], -e[2]];
  return { rot, hips: p.hips && [-p.hips[0], p.hips[1], p.hips[2]], steer: -(p.steer ?? 0), handL: mh(p.handR), handR: mh(p.handL) };
}

const E = new THREE.Euler();
const quatOf = (e: V3): THREE.Quaternion => new THREE.Quaternion().setFromEuler(E.set(e[0], e[1], e[2], 'XYZ'));

export interface Solved { q: THREE.Quaternion[]; hips: THREE.Vector3; wpos: THREE.Vector3[]; wq: THREE.Quaternion[] }

/** Converte uma pose em rotações locais por osso. `extra` = rotações adicionais (cadeias secundárias). */
export function solvePose(rig: Rig, pose: Pose, extra?: Map<number, THREE.Quaternion>): Solved {
  const n = rig.bones.length;
  const q: THREE.Quaternion[] = rig.bones.map((b, k) => {
    const e = pose.rot[b.name];
    const base = e ? quatOf(e) : new THREE.Quaternion();
    const x = extra?.get(k);
    return x ? base.multiply(x) : base;
  });
  const wpos: THREE.Vector3[] = new Array(n), wq: THREE.Quaternion[] = new Array(n);
  const hipsOff = new THREE.Vector3(...(pose.hips ?? [0, 0, 0]));
  const fk = (k: number): void => {
    const b = rig.bones[k]!;
    if (b.parent < 0) { wpos[k] = b.pos.clone(); wq[k] = q[k]!.clone(); return; }
    const par = rig.bones[b.parent]!;
    const lt = b.pos.clone().sub(par.pos);
    if (b.name === 'hips') lt.add(hipsOff);
    wpos[k] = lt.applyQuaternion(wq[b.parent]!).add(wpos[b.parent]!);
    wq[k] = wq[b.parent]!.clone().multiply(q[k]!);
  };
  const chest = rig.i('chest');
  for (let k = 0; k <= chest; k++) fk(k);
  for (const [sfx, sg] of [['L', 1], ['R', -1]] as ['L' | 'R', number][]) {
    const ia = rig.i(`arm${sfx}`), ifa = rig.i(`forearm${sfx}`), ih = rig.i(`hand${sfx}`);
    const spec = (sfx === 'L' ? pose.handL : pose.handR) ?? {};
    const mixv = spec.mix ?? 0;
    const steer = pose.steer ?? 0;
    const wheelQ = new THREE.Quaternion().setFromAxisAngle(WHEEL_AXIS, steer);
    const grip = new THREE.Vector3(sg * HAND_TARGET[0], HAND_TARGET[1], HAND_TARGET[2]).sub(WHEEL_CENTER).applyQuaternion(wheelQ).add(WHEEL_CENTER);
    const pole = wheelPole(sg);
    const T = grip.clone();
    if (mixv > 0) {
      const rel = new THREE.Vector3(...(spec.rel ?? [sg * 0.2, 0.1, 0.3])).applyQuaternion(wq[chest]!).add(wpos[chest]!);
      T.lerp(rel, mixv);
      const p2 = new THREE.Vector3(...(spec.pole ?? [sg, -0.5, -0.3])).applyQuaternion(wq[chest]!);
      pole.lerp(p2, mixv);
    }
    const S = rig.bones[ia]!.pos.clone().sub(rig.bones[chest]!.pos).applyQuaternion(wq[chest]!).add(wpos[chest]!);
    const { E: El, H } = twoBone(S, T, pole, rig.l1, rig.l2);
    // repouso
    const S0 = rig.bones[ia]!.pos, E0 = rig.bones[ifa]!.pos, H0 = rig.bones[ih]!.pos;
    const u0 = E0.clone().sub(S0).normalize(), f0 = H0.clone().sub(E0).normalize();
    const n0 = new THREE.Vector3().crossVectors(u0, f0).normalize();
    const u1 = El.clone().sub(S).normalize(), f1 = H.clone().sub(El).normalize();
    const n1 = new THREE.Vector3().crossVectors(u1, f1).normalize();
    const Ra = new THREE.Quaternion().setFromRotationMatrix(basis(u1, n1).multiply(basis(u0, n0).transpose()));
    const Rf = new THREE.Quaternion().setFromRotationMatrix(basis(f1, n1).multiply(basis(f0, n0).transpose()));
    q[ia] = wq[chest]!.clone().invert().multiply(Ra);
    q[ifa] = Ra.clone().invert().multiply(Rf);
    // mão: orientação do volante (mundo) ↔ acompanha o antebraço
    const follow = Rf.clone().multiply(quatOf(spec.rot ?? [0, 0, 0]));
    const hw = wheelQ.clone().slerp(follow, mixv);
    q[ih] = Rf.clone().invert().multiply(hw);
  }
  for (let k = chest + 1; k < n; k++) fk(k);
  for (const x of q) x.normalize();
  return { q, hips: hipsOff, wpos, wq };
}
