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
/** Fator de amortecimento exponencial independente da taxa de quadros. */
const damp = (k: number, dt: number): number => 1 - Math.exp(-k * dt);
const smoothstep = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
/** Ruído suave e barato (soma de senos incomensuráveis) em [-1, 1]. */
const wobble = (t: number, seed: number): number => (Math.sin(t * 1.0 + seed) * 0.5 + Math.sin(t * 2.31 + seed * 1.7) * 0.3 + Math.sin(t * 4.79 + seed * 2.9) * 0.2);
const INTRO_SHOT = 2.6;

/**
 * Câmera de corrida em terceira pessoa: segue com atraso suave, afasta e abre o campo de visão com a
 * velocidade e o turbo, inclina nas curvas, acompanha o drift e nunca atravessa o cenário
 * (raio contra os colisores estáticos). Também faz a apresentação da pista, a largada e a chegada.
 * Todas as suavizações são exponenciais em função de dt (mesmo movimento a 20 ou a 144 quadros/s).
 */
export class ChaseCamera {
  mode: CameraMode = 'intro';
  private yaw = 0;
  private dist = 7;
  private height = 3;
  private fov = 62;
  private roll = 0;
  /** "Trauma" do tremor (0..1): o deslocamento é proporcional ao quadrado, decai sozinho. */
  private trauma = 0;
  private shakeTime = 0;
  /** Chute de FOV (turbo) e mergulho vertical (aterrissagem), ambos com decaimento/mola. */
  private fovKick = 0;
  private dip = 0;
  private dipV = 0;
  private side = 0;
  private modeTime = 0;
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly want = new THREE.Vector3();
  private readonly ray: RAPIER.Ray;
  private initialized = false;
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly c = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera, R: Rapier, private readonly world: RAPIER.World,
    private readonly intro: { pos: [number, number, number]; target: [number, number, number] }[],
    /** Escala do tremor (perfil de qualidade; menor no celular). */
    private readonly shakeScale = 1) {
    this.ray = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  }

  setMode(mode: CameraMode): void {
    if (this.mode !== mode) { this.mode = mode; this.modeTime = 0; }
  }

  addShake(amount: number): void { this.trauma = Math.min(1, this.trauma + amount * 1.4); }
  /** Turbo/placa: abre o campo de visão num pulso curto. */
  kick(amount: number): void { this.fovKick = Math.min(9, this.fovKick + amount); }
  /** Aterrissagem: a câmera afunda um pouco e volta (mola). */
  landing(impact: number): void { this.dipV -= Math.min(3, impact * 0.14); }

  /** Duração total da apresentação da pista (s). */
  get introDuration(): number { return this.intro.length * INTRO_SHOT; }

  update(dt: number, t: CameraTarget): void {
    this.modeTime += dt;
    const cam = this.camera;
    if (this.mode === 'intro' && this.intro.length) {
      const seg = Math.min(this.intro.length - 1, Math.floor(this.modeTime / INTRO_SHOT));
      // travelling com entrada e saída suaves (cada plano é um corte; o movimento dentro dele não tem tranco)
      const f = smoothstep((this.modeTime - seg * INTRO_SHOT) / INTRO_SHOT) * 0.8 + Math.min(1, (this.modeTime - seg * INTRO_SHOT) / INTRO_SHOT) * 0.2;
      const k = this.intro[seg]!;
      this.a.set(k.pos[0], k.pos[1], k.pos[2]);
      this.b.set(k.target[0], k.target[1], k.target[2]);
      // travelling lento em direção ao alvo + leve órbita
      const dir = this.want.copy(this.b).sub(this.a);
      const side = this.c.set(-dir.z, 0, dir.x).normalize();
      cam.position.copy(this.a).addScaledVector(dir, f * 0.12).addScaledVector(side, (f - 0.5) * 9);
      cam.lookAt(this.b);
      if (cam.fov !== 52) { cam.fov = 52; cam.updateProjectionMatrix(); }
      this.pos.copy(cam.position); this.look.copy(this.b);
      this.fov = 52;
      this.initialized = false;
      return;
    }

    const fx = Math.sin(t.heading), fz = Math.cos(t.heading);
    const speedA = Math.abs(t.speed);
    let wantYaw = t.heading;
    let wantDist = 6.3 + Math.min(1.3, speedA / 26) * 1.6 + t.boost * 1.3;
    let wantHeight = 2.7 + Math.min(1, speedA / 28) * 0.4;
    let wantFov = 60 + Math.min(1.2, speedA / 28) * 9 + t.boost * 9;
    let follow = 5.5;
    let wantSide = 0;
    if (t.drifting) {
      wantYaw -= t.driftDir * 0.22;
      // no drift a câmera desliza para fora da curva e mostra a saída dela
      wantSide = t.driftDir * 0.5;
    }
    if (this.mode === 'countdown') {
      // começa pela frente do kart e gira até a posição de corrida
      const e = smoothstep(this.modeTime / 2.6);
      wantYaw = t.heading + (1 - e) * 2.7;
      wantDist = 5.2 + e * 1.4; wantHeight = 1.7 + e * 1.1; wantFov = 50 + e * 10; follow = 30;
    } else if (this.mode === 'finish') {
      // órbita lenta que acelera aos poucos (sem tranco ao trocar de modo)
      const e = smoothstep(this.modeTime / 1.5);
      wantYaw = t.heading + 2.5 * e + Math.max(0, this.modeTime - 0.75) * 0.22;
      wantDist = 6.5; wantHeight = 2.1; wantFov = 48; follow = 2.2 + e;
    }
    if (!this.initialized) { this.yaw = wantYaw; this.dist = wantDist; this.height = wantHeight; this.side = wantSide; }
    this.yaw = smoothAngle(this.yaw, wantYaw, damp(follow, dt));
    this.dist += (wantDist - this.dist) * damp(3.5, dt);
    this.height += (wantHeight - this.height) * damp(3.5, dt);
    this.side += (wantSide - this.side) * damp(2.5, dt);
    this.fovKick *= Math.exp(-3.2 * dt);
    this.fov += (wantFov + this.fovKick - this.fov) * damp(this.fovKick > 0.5 ? 9 : 4, dt);

    const bx = Math.sin(this.yaw), bz = Math.cos(this.yaw);
    // lado = esquerda do kart (x local); o deslocamento lateral é pequeno e limitado
    this.want.set(t.x - bx * this.dist + bz * this.side, t.y + this.height, t.z - bz * this.dist - bx * this.side);

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
    const kh = damp(14, dt), kv = damp(t.grounded ? 7 : 3.5, dt);
    this.pos.x += (this.want.x - this.pos.x) * kh;
    this.pos.z += (this.want.z - this.pos.z) * kh;
    this.pos.y += (this.want.y - this.pos.y) * kv;

    // mola do mergulho de aterrissagem (sub-passos fixos: igual em qualquer taxa de quadros)
    let left = dt;
    while (left > 1e-5) {
      const h = Math.min(1 / 60, left);
      left -= h;
      this.dipV += (-70 * this.dip - 11 * this.dipV) * h;
      this.dip += this.dipV * h;
    }

    const ahead = this.mode === 'chase' ? 4.5 : 0;
    this.want.set(t.x + fx * ahead, t.y + 0.9, t.z + fz * ahead);
    this.look.lerp(this.want, damp(12, dt));

    cam.position.copy(this.pos);
    cam.position.y += this.dip * 0.35;
    // tremor: ruído suave (não serrilhado), proporcional ao quadrado do trauma, escalado pela qualidade
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const shake = this.trauma * this.trauma * this.shakeScale;
    this.shakeTime += dt * 22;
    if (shake > 1e-4) {
      cam.position.x += wobble(this.shakeTime, 0.3) * shake * 0.16;
      cam.position.y += wobble(this.shakeTime, 2.1) * shake * 0.12;
      cam.position.z += wobble(this.shakeTime, 4.7) * shake * 0.08;
    }
    this.c.copy(this.look);
    this.c.y += this.dip * 0.15;
    cam.lookAt(this.c);
    const wantRoll = this.mode === 'chase' ? THREE.MathUtils.clamp(t.steer * 0.035 + (t.drifting ? t.driftDir * 0.035 : 0), -0.07, 0.07) * Math.min(1, speedA / 18) : 0;
    this.roll += (wantRoll - this.roll) * damp(4, dt);
    cam.rotateZ(this.roll + (shake > 1e-4 ? wobble(this.shakeTime, 6.1) * shake * 0.02 : 0));
    if (Math.abs(cam.fov - this.fov) > 0.05) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }
}
