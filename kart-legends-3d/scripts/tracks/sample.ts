/** Amostragem do traçado autorado: spline → amostras equidistantes com atributos, linha de corrida e velocidades. */
import * as THREE from 'three';
import { SURFACES, type PathSamples, type SurfaceType } from '../../src/game/tracks/trackTypes';
import type { At, CP } from './types';

export const SPACING = 2;

export interface Sampled {
  n: number;
  closed: boolean;
  length: number;
  pos: THREE.Vector3[];
  tan: THREE.Vector3[];
  side: THREE.Vector3[];
  up: THREE.Vector3[];
  halfWidth: number[];
  surface: SurfaceType[];
  gap: boolean[];
  wall: number[];
  bridge: boolean[];
  style: string[];
  /** Faixa plana de terreno (NaN = padrão da pista). */
  flat: number[];
  heading: number[];
  /** Curvatura horizontal com sinal (+ = curva à esquerda), suavizada. */
  curvature: number[];
  tags: Map<string, number>;
}

interface Resolved { w: number; surface: SurfaceType; bank: number; wall: number; bridge: boolean; gap: boolean; style: string; flat: number }

const WALL_BITS = { none: 0, left: 1, right: 2, both: 3 } as const;

function resolve(points: CP[], closed: boolean): Resolved[] {
  let cur: Resolved = { w: 8, surface: 'asphalt', bank: 0, wall: 0, bridge: false, gap: false, style: '', flat: NaN };
  const passes = closed ? 2 : 1; // segunda passada: o início herda o estado do fim do circuito
  let out: Resolved[] = [];
  for (let pass = 0; pass < passes; pass++) {
    out = points.map((p) => {
      cur = {
        w: p.w ?? cur.w,
        surface: p.surface ?? cur.surface,
        bank: p.bank ?? cur.bank,
        wall: p.wall ? WALL_BITS[p.wall] : cur.wall,
        bridge: p.bridge ?? cur.bridge,
        gap: p.gap ?? false,
        style: p.style ?? cur.style,
        flat: p.flat ?? cur.flat,
      };
      return cur;
    });
  }
  return out;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

export function samplePath(points: CP[], closed: boolean): Sampled {
  const res = resolve(points, closed);
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y ?? 0, p.z)), closed, 'centripetal');
  curve.arcLengthDivisions = points.length * 60;
  const length = curve.getLength();
  const n = closed ? Math.round(length / SPACING) : Math.round(length / SPACING) + 1;
  const P = closed ? points.length : points.length - 1;
  const s: Sampled = {
    n, closed, length, pos: [], tan: [], side: [], up: [], halfWidth: [], surface: [], gap: [], wall: [], bridge: [], style: [], flat: [],
    heading: [], curvature: [], tags: new Map(),
  };
  const worldUp = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const u = closed ? i / n : i / (n - 1);
    const t = curve.getUtoTmapping(u, 0);
    const seg = Math.min(t * P, P - 1e-6);
    const k = Math.floor(seg);
    const f = smooth(seg - k);
    const a = res[k]!;
    const b = res[(k + 1) % res.length]!;
    const pos = curve.getPoint(t);
    const tan = curve.getTangent(t).normalize();
    const flatTan = new THREE.Vector3(tan.x, 0, tan.z).normalize();
    const left = new THREE.Vector3().crossVectors(worldUp, flatTan).normalize();
    const bank = THREE.MathUtils.degToRad(a.bank + (b.bank - a.bank) * f);
    const side = left.clone().multiplyScalar(Math.cos(bank)).addScaledVector(worldUp, Math.sin(bank)).normalize();
    const up = new THREE.Vector3().crossVectors(tan, side).normalize();
    s.pos.push(pos); s.tan.push(tan); s.side.push(side); s.up.push(up);
    s.halfWidth.push(a.w + (b.w - a.w) * f);
    s.surface.push(a.surface); s.gap.push(a.gap); s.wall.push(a.wall); s.bridge.push(a.bridge); s.style.push(a.style); s.flat.push(a.flat);
    s.heading.push(Math.atan2(flatTan.x, flatTan.z));
  }
  // curvatura com sinal, suavizada
  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = s.heading[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]!;
    const b = s.heading[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]!;
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    raw.push(d / (2 * SPACING));
  }
  s.curvature = blur(raw, 5, closed);
  points.forEach((p, k) => {
    if (!p.tag) return;
    const v = new THREE.Vector3(p.x, p.y ?? 0, p.z);
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const d = s.pos[i]!.distanceToSquared(v); if (d < bd) { bd = d; best = i; } }
    if (s.tags.has(p.tag)) throw new Error(`tag duplicada: ${p.tag}`);
    s.tags.set(p.tag, best);
    void k;
  });
  return s;
}

export function blur(arr: number[], radius: number, closed: boolean): number[] {
  const n = arr.length;
  return arr.map((_, i) => {
    let sum = 0, wsum = 0;
    for (let d = -radius; d <= radius; d++) {
      let j = i + d;
      if (closed) j = (j + n) % n; else if (j < 0 || j >= n) continue;
      const w = radius + 1 - Math.abs(d);
      sum += arr[j]! * w; wsum += w;
    }
    return sum / wsum;
  });
}

/** Resolve "tag", "tag+30" ou "tag-12" (metros) para um índice de amostra. */
export function at(s: Sampled, ref: At): number {
  const m = /^([a-zA-Z0-9_]+)([+-]\d+(?:\.\d+)?)?$/.exec(ref);
  if (!m) throw new Error(`referência de posição inválida: ${ref}`);
  const base = s.tags.get(m[1]!);
  if (base === undefined) throw new Error(`tag desconhecida: ${m[1]} (existem: ${[...s.tags.keys()].join(', ')})`);
  const off = m[2] ? Math.round(Number(m[2]) / SPACING) : 0;
  return (((base + off) % s.n) + s.n) % s.n;
}

/** Linha de corrida (deslocamento lateral) e fator de velocidade por amostra, derivados da curvatura. */
export function racingLine(s: Sampled): { line: number[]; speed: number[] } {
  const n = s.n;
  const wide = blur(s.curvature, 12, s.closed);
  let line = wide.map((k, i) => {
    const room = Math.max(0, s.halfWidth[i]! - 2.4);
    return Math.max(-room, Math.min(room, k * 230));
  });
  line = blur(blur(line, 8, s.closed), 8, s.closed);
  const VMAX = 31;
  const v = s.curvature.map((k, i) => {
    const lateral = s.surface[i] === 'ice' ? 13 : 24;
    const eff = Math.abs(k) * 0.8;
    return Math.min(VMAX, eff < 1e-4 ? VMAX : Math.sqrt(lateral / eff));
  });
  for (let pass = 0; pass < 2; pass++) {
    for (let i = n - 1; i >= 0; i--) {
      const next = v[(i + 1) % n]!;
      v[i] = Math.min(v[i]!, Math.sqrt(next * next + 2 * 15 * SPACING));
    }
  }
  return { line, speed: v.map((x) => Math.max(0.36, Math.min(1, x / VMAX))) };
}

export function toPathSamples(s: Sampled): PathSamples {
  const r = (x: number): number => Math.round(x * 1000) / 1000;
  const out: PathSamples = { pos: [], side: [], up: [], halfWidth: [], surface: [], gap: [] };
  for (let i = 0; i < s.n; i++) {
    out.pos.push(r(s.pos[i]!.x), r(s.pos[i]!.y), r(s.pos[i]!.z));
    out.side.push(r(s.side[i]!.x), r(s.side[i]!.y), r(s.side[i]!.z));
    out.up.push(r(s.up[i]!.x), r(s.up[i]!.y), r(s.up[i]!.z));
    out.halfWidth.push(r(s.halfWidth[i]!));
    out.surface.push(SURFACES.indexOf(s.surface[i]!));
    out.gap.push(s.gap[i] ? 1 : 0);
  }
  return out;
}
