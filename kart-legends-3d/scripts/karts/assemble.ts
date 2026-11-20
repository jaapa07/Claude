/** Montagem e exportação de um kart conforme o contrato de nós (docs/CONTRACTS.md, seção 3). */
import path from 'node:path';
import { GlbBuilder, type Quat } from '../lib/glb';
import { ASSETS_DIR } from '../lib/textures';
import type { Model, V3 } from '../lib/geo';

export interface Axle { x: number; z: number; r: number; w: number }
export interface KartParts {
  body: Model;
  wheelFront: Model;
  wheelRear: Model;
  steering: Model;
  seat: V3;
  front: Axle;
  rear: Axle;
  exhaustL: V3;
  exhaustR: V3;
}
export interface KartEntry {
  id: string; file: string; bytes: number; triangles: number;
  wheelRadiusFront: number; wheelRadiusRear: number;
  wheelWidthFront: number; wheelWidthRear: number;
  seat: V3; steering: V3; track: number; trackFront: number; trackRear: number; wheelbase: number;
  wheels: Record<'fl' | 'fr' | 'rl' | 'rr', V3>;
  exhaustL: V3; exhaustR: V3;
  size: V3; minBodyY: number;
}

export const STEER_OFFSET: V3 = [0, 0.5, 0.42];
export const STEER_TILT_DEG = 25;
export const steeringCenter = (seat: V3): V3 => [seat[0] + STEER_OFFSET[0], seat[1] + STEER_OFFSET[1], seat[2] + STEER_OFFSET[2]];
const r3 = (n: number): number => Math.round(n * 1000) / 1000;
const v3 = (v: V3): V3 => [r3(v[0]), r3(v[1]), r3(v[2])];

export async function exportKart(id: string, parts: KartParts): Promise<KartEntry> {
  const g = new GlbBuilder();
  // As malhas ficam em nós-filhos `*_mesh`: a quantização (meshopt) grava uma escala/translação no nó
  // que carrega a malha, e os nós do contrato precisam manter a transformação exata.
  const body = g.node('body');
  g.node('body_mesh', { parent: body, mesh: g.mesh('body', parts.body) });
  const mf = g.mesh('wheel_front', parts.wheelFront);
  const same = parts.wheelRear === parts.wheelFront;
  const mr = same ? mf : g.mesh('wheel_rear', parts.wheelRear);
  const flipY: Quat = [0, 1, 0, 0];
  const wheels: Record<'fl' | 'fr' | 'rl' | 'rr', V3> = {
    fl: [parts.front.x, parts.front.r, parts.front.z], fr: [-parts.front.x, parts.front.r, parts.front.z],
    rl: [parts.rear.x, parts.rear.r, parts.rear.z], rr: [-parts.rear.x, parts.rear.r, parts.rear.z],
  };
  for (const key of ['fl', 'fr', 'rl', 'rr'] as const) {
    const n = g.node(`wheel_${key}`, { t: wheels[key] });
    // lado esquerdo = +X (malha modelada com a face externa em +X); o direito é girado 180° em Y
    g.node(`wheel_${key}_mesh`, { parent: n, mesh: key[0] === 'f' ? mf : mr, r: key[1] === 'r' ? flipY : undefined });
  }
  const sc = steeringCenter(parts.seat);
  const half = (STEER_TILT_DEG * Math.PI) / 360;
  const pivot = g.node('steering_pivot', { t: sc, r: [Math.sin(half), 0, 0, Math.cos(half)] });
  const steering = g.node('steering', { parent: pivot });
  g.node('steering_mesh', { parent: steering, mesh: g.mesh('steering', parts.steering) });
  g.node('seat', { t: parts.seat });
  g.node('exhaust_l', { t: parts.exhaustL });
  g.node('exhaust_r', { t: parts.exhaustR });

  const file = path.join(ASSETS_DIR, 'karts', `${id}.glb`);
  const bytes = await g.save(file);
  const bb = parts.body.bounds();
  const minX = Math.min(bb.min.x, -parts.front.x - parts.front.w / 2, -parts.rear.x - parts.rear.w / 2);
  const maxZ = Math.max(bb.max.z, parts.front.z + parts.front.r), minZ = Math.min(bb.min.z, parts.rear.z - parts.rear.r);
  return {
    id, file: `karts/${id}.glb`, bytes,
    triangles: Math.round(parts.body.triangleCount() + parts.steering.triangleCount() + 2 * parts.wheelFront.triangleCount() + 2 * parts.wheelRear.triangleCount()),
    wheelRadiusFront: parts.front.r, wheelRadiusRear: parts.rear.r,
    wheelWidthFront: parts.front.w, wheelWidthRear: parts.rear.w,
    seat: v3(parts.seat), steering: v3(sc),
    track: r3(parts.front.x + parts.rear.x), trackFront: r3(parts.front.x * 2), trackRear: r3(parts.rear.x * 2),
    wheelbase: r3(parts.front.z - parts.rear.z),
    wheels: { fl: v3(wheels.fl), fr: v3(wheels.fr), rl: v3(wheels.rl), rr: v3(wheels.rr) },
    exhaustL: v3(parts.exhaustL), exhaustR: v3(parts.exhaustR),
    size: v3([-2 * minX, bb.max.y, maxZ - minZ]), minBodyY: r3(bb.min.y),
  };
}
