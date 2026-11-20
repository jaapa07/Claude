import type RAPIER from '@dimforge/rapier3d-compat';
import { GROUP_KART, GROUP_OBSTACLE, groups, type Rapier } from '@/game/physics/trackColliders';
import type { ObstacleData } from '@/game/tracks/trackTypes';

export interface ObstacleState {
  data: ObstacleData;
  body: RAPIER.RigidBody;
  x: number; y: number; z: number;
  px: number; py: number; pz: number;
  /** 0..1 ao longo do movimento (para animação). */
  t: number;
}

export function createObstacles(R: Rapier, world: RAPIER.World, list: ObstacleData[]): ObstacleState[] {
  return list.map((data) => {
    const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(data.a[0], data.a[1] + data.radius, data.a[2]));
    world.createCollider(R.ColliderDesc.ball(data.radius).setCollisionGroups(groups(GROUP_OBSTACLE, GROUP_KART)).setRestitution(0.6), body);
    return { data, body, x: data.a[0], y: data.a[1], z: data.a[2], px: data.a[0], py: data.a[1], pz: data.a[2], t: 0 };
  });
}

/** Posição do obstáculo no tempo `time` (vai e volta suave entre A e B). */
export function obstaclePhase(data: ObstacleData, time: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * 2 * (time / data.period + data.phase));
}

export function stepObstacles(obstacles: ObstacleState[], time: number): void {
  for (const o of obstacles) {
    const d = o.data;
    o.px = o.x; o.py = o.y; o.pz = o.z;
    o.t = obstaclePhase(d, time);
    o.x = d.a[0] + (d.b[0] - d.a[0]) * o.t;
    o.y = d.a[1] + (d.b[1] - d.a[1]) * o.t;
    o.z = d.a[2] + (d.b[2] - d.a[2]) * o.t;
    o.body.setNextKinematicTranslation({ x: o.x, y: o.y + (d.kind === 'slider' ? d.radius : 0), z: o.z });
  }
}
