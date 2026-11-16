import type RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { RAY_GROUPS, type Rapier } from '@/game/physics/trackColliders';

export interface CameraTarget {
  x: number; y: number; z: number;
  heading: number;
  speed: number;
  steer: number;
  drifting: boolean;
  driftDir: number;
  /** 0..1 */
  boost: number;
  grounded: boolean;
}

export type CameraMode = 'intro' | 'countdown' | 'chase' | 'finish';

const smoothAngle = (from: number, to: number, k: number): number => {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d * k;
};

/**
 * Câmera de corrida em terceira pessoa: segue com atraso suave, afasta e abre o campo de visão com a
 * velocidade e o turbo, inclina nas curvas, acompanha o drift e nunca atravessa o cenário
 * (raio contra os colisores estáticos). Também faz a apresentação da pista, a largada e a chegada.
 */
export class ChaseCamera {
  mode: CameraMode = 'intro';
  private yaw = 0;
  private dist = 7;
  private height = 3;
  private fov = 62;
  private roll = 0;
  private shake = 0;
  private modeTime = 0;
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly want = new THREE.Vector3();
  private readonly ray: RAPIER.Ray;
  private initialized = false;
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera, R: Rapier, private readonly world: RAPIER.World,
    private readonly intro: { pos: [number, number, number]; target: [number, number, number] }[]) {
    this.ray = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  }

  setMode(mode: CameraMode): void {
    if (this.mode !== mode) { this.mode = mode; this.modeTime = 0; }
  }

  addShake(amount: number): void { this.shake = Math.min(0.6, this.shake + amount); }

  /** Duração total da apresentação da pista (s). */
  get introDuration(): number { return this.intro.length * 2.6; }

  update(dt: number, t: CameraTarget, time: number): void {
    this.modeTime += dt;
    const cam = this.camera;
    if (this.mode === 'intro' && this.intro.length) {
      const seg = Math.min(this.intro.length - 1, Math.floor(this.modeTime / 2.6));
      const f = Math.min(1, (this.modeTime - seg * 2.6) / 2.6);
      const k = this.intro[seg]!;
      this.a.set(k.pos[0], k.pos[1], k.pos[2]);
      this.b.set(k.target[0], k.target[1], k.target[2]);
      // travelling lento em direção ao alvo + leve órbita
      const dir = this.want.copy(this.b).sub(this.a);
      const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      cam.position.copy(this.a).addScaledVector(dir, f * 0.12).addScaledVector(side, (f - 0.5) * 9);
      cam.lookAt(this.b);
      cam.fov = 52; cam.updateProjectionMatrix();
      this.pos.copy(cam.position); this.look.copy(this.b);
      this.initialized = false;
      return;
    }

    const fx = Math.sin(t.heading), fz = Math.cos(t.heading);
    let wantYaw = t.heading;
    let wantDist = 6.3 + Math.min(1.3, Math.abs(t.speed) / 26) * 1.6 + t.boost * 1.3;
    let wantHeight = 2.7 + Math.min(1, Math.abs(t.speed) / 28) * 0.4;
    let wantFov = 60 + Math.min(1.2, Math.abs(t.speed) / 28) * 9 + t.boost * 11;
    let follow = 5.5;
    if (t.drifting) wantYaw -= t.driftDir * 0.22;
    if (this.mode === 'countdown') {
      // começa pela frente do kart e gira até a posição de corrida
      const k = Math.min(1, this.modeTime / 2.6);
      const e = k * k * (3 - 2 * k);
      wantYaw = t.heading + (1 - e) * 2.7;
      wantDist = 5.2 + e * 1.4; wantHeight = 1.7 + e * 1.1; wantFov = 50 + e * 10; follow = 30;
    } else if (this.mode === 'finish') {
      wantYaw = t.heading + 2.5 + this.modeTime * 0.25;
      wantDist = 6.5; wantHeight = 2.1; wantFov = 48; follow = 3;
    }
    if (!this.initialized) { this.yaw = wantYaw; this.dist = wantDist; this.height = wantHeight; }
    this.yaw = smoothAngle(this.yaw, wantYaw, Math.min(1, dt * follow));
    this.dist += (wantDist - this.dist) * Math.min(1, dt * 3.5);
    this.height += (wantHeight - this.height) * Math.min(1, dt * 3.5);
    this.fov += (wantFov - this.fov) * Math.min(1, dt * 4);

    const bx = Math.sin(this.yaw), bz = Math.cos(this.yaw);
    this.want.set(t.x - bx * this.dist, t.y + this.height, t.z - bz * this.dist);

    // proteção contra atravessar o cenário: raio do kart até a câmera
    const ox = t.x, oy = t.y + 1.1, oz = t.z;
    const dx = this.want.x - ox, dy = this.want.y - oy, dz = this.want.z - oz;
    const len = Math.hypot(dx, dy, dz) || 1;
    this.ray.origin.x = ox; this.ray.origin.y = oy; this.ray.origin.z = oz;
    this.ray.dir.x = dx / len; this.ray.dir.y = dy / len; this.ray.dir.z = dz / len;
    const hit = this.world.castRay(this.ray, len + 0.5, true, undefined, RAY_GROUPS);
    if (hit && hit.timeOfImpact < len + 0.4) {
      const k = Math.max(0.25, (hit.timeOfImpact - 0.4) / len);
      this.want.set(ox + dx * k, oy + dy * k + (1 - k) * 0.6, oz + dz * k);
    }
    // nunca abaixo do chão
    this.ray.origin.x = this.want.x; this.ray.origin.y = this.want.y + 3; this.ray.origin.z = this.want.z;
    this.ray.dir.x = 0; this.ray.dir.y = -1; this.ray.dir.z = 0;
    const g = this.world.castRay(this.ray, 4, true, undefined, RAY_GROUPS);
    if (g) this.want.y = Math.max(this.want.y, this.want.y + 3 - g.timeOfImpact + 0.9);

    if (!this.initialized) { this.pos.copy(this.want); this.initialized = true; }
    // suaviza mais na vertical (reduz vibração em pisos irregulares e saltos)
    const kh = Math.min(1, dt * 14), kv = Math.min(1, dt * (t.grounded ? 7 : 3.5));
    this.pos.x += (this.want.x - this.pos.x) * kh;
    this.pos.z += (this.want.z - this.pos.z) * kh;
    this.pos.y += (this.want.y - this.pos.y) * kv;

    const ahead = this.mode === 'chase' ? 4.5 : 0;
    this.want.set(t.x + fx * ahead, t.y + 0.9, t.z + fz * ahead);
    this.look.lerp(this.want, Math.min(1, dt * 12));

    cam.position.copy(this.pos);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    if (this.shake > 0) {
      cam.position.x += Math.sin(time * 71) * this.shake * 0.12;
      cam.position.y += Math.sin(time * 93) * this.shake * 0.1;
    }
    cam.lookAt(this.look);
    const wantRoll = this.mode === 'chase' ? THREE.MathUtils.clamp(t.steer * 0.035 + (t.drifting ? t.driftDir * 0.035 : 0), -0.07, 0.07) * Math.min(1, Math.abs(t.speed) / 18) : 0;
    this.roll += (wantRoll - this.roll) * Math.min(1, dt * 4);
    cam.rotateZ(this.roll);
    if (Math.abs(cam.fov - this.fov) > 0.05) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }
}
