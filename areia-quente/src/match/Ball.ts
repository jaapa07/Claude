import * as THREE from 'three';
import { assets } from '../core/Assets';
import { Trail } from '../vfx/Effects';
import type { Player } from './Player';

export const FIELD = { HL: 18, HW: 13.5, GOAL_W: 5.5, GOAL_H: 2.2, GOAL_D: 1.6, PEN: 9 };
export const BALL_R = 0.12;
const G = 9.81;

export type BallEvent = 'bounce' | 'post' | 'net' | 'goal' | 'out_side' | 'out_end' | 'board';

/** Bola de futebol de praia: quica pouco e "morre" na areia; colide com traves, rede e placas. */
export class Ball {
  pos = new THREE.Vector3(0, BALL_R, 0);
  vel = new THREE.Vector3();
  spin = new THREE.Vector3(); // efeito (curva lateral)
  owner: Player | null = null;
  held = false; // nas mãos do goleiro/lateral
  lastTouch: Player | null = null;
  mesh: THREE.Object3D;
  shadow: THREE.Mesh;
  trail = new Trail();
  fire = false;
  inGoal = 0; // lado do gol em que entrou (+1/-1)
  events: { type: BallEvent; p: THREE.Vector3; speed: number }[] = [];
  private rot = new THREE.Quaternion();
  frozen = false;

  constructor() {
    const g = assets.gltf('models/props/ball.glb');
    this.mesh = g.scene.clone(true);
    this.mesh.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).castShadow = true; } });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: assets.tex('vfx/blob_shadow.png'), transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
  }

  get airborne() { return this.pos.y > BALL_R + 0.25; }
  get speed() { return this.vel.length(); }

  place(x: number, z: number, y = BALL_R) {
    this.pos.set(x, y, z); this.vel.set(0, 0, 0); this.spin.set(0, 0, 0); this.inGoal = 0; this.fire = false; this.trail.reset();
  }

  kick(v: THREE.Vector3, by: Player | null, spin = 0, fire = false) {
    this.owner = null; this.held = false;
    this.vel.copy(v);
    this.spin.set(0, spin, 0);
    this.lastTouch = by;
    this.fire = fire;
  }

  update(dt: number) {
    this.events.length = 0;
    if (this.frozen) { this.sync(dt, 0); return; }
    if (this.owner || this.held) { this.sync(dt, this.vel.length()); return; }
    const p = this.pos, v = this.vel;
    const sub = 3;
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      // efeito: força perpendicular à velocidade horizontal
      if (Math.abs(this.spin.y) > 0.01 && this.airborne) {
        const side = new THREE.Vector3(-v.z, 0, v.x).normalize().multiplyScalar(this.spin.y * h);
        v.add(side);
        this.spin.y *= Math.exp(-0.6 * h);
      }
      v.y -= G * h;
      v.multiplyScalar(Math.exp(-0.06 * h)); // arrasto do ar
      p.addScaledVector(v, h);
      // chão de areia
      if (p.y < BALL_R) {
        p.y = BALL_R;
        if (v.y < -1.2) {
          this.events.push({ type: 'bounce', p: p.clone(), speed: -v.y });
          v.y = -v.y * 0.32; // areia absorve
          v.x *= 0.72; v.z *= 0.72;
          this.fire = false;
        } else {
          v.y = 0;
          // rolar na areia: atrito alto
          const hs = Math.hypot(v.x, v.z);
          if (hs > 0) {
            const dec = Math.min(hs, (3.2 + hs * 0.35) * h);
            v.x -= (v.x / hs) * dec; v.z -= (v.z / hs) * dec;
          }
        }
      }
      this.collideGoal(h);
      this.collideBoards();
    }
    this.sync(dt, v.length());
  }

  private collideGoal(h: number) {
    const p = this.pos, v = this.vel;
    const { HL, GOAL_W, GOAL_H, GOAL_D } = FIELD;
    for (const s of [-1, 1]) {
      const gx = s * HL;
      // traves e travessão
      for (const pz of [-GOAL_W / 2, GOAL_W / 2]) {
        const dx = p.x - gx, dz = p.z - pz;
        const d = Math.hypot(dx, dz);
        if (d < BALL_R + 0.07 && p.y < GOAL_H + 0.07) {
          const n = new THREE.Vector3(dx, 0, dz).normalize();
          const vn = v.dot(n);
          if (vn < 0) { v.addScaledVector(n, -1.6 * vn); v.multiplyScalar(0.8); this.events.push({ type: 'post', p: p.clone(), speed: -vn }); }
          p.x = gx + n.x * (BALL_R + 0.071); p.z = pz + n.z * (BALL_R + 0.071);
        }
      }
      if (Math.abs(p.z) < GOAL_W / 2) {
        const dx = p.x - gx, dy = p.y - GOAL_H;
        const d = Math.hypot(dx, dy);
        if (d < BALL_R + 0.07) {
          const n = new THREE.Vector3(dx, dy, 0).normalize();
          const vn = v.dot(n);
          if (vn < 0) { v.addScaledVector(n, -1.6 * vn); v.multiplyScalar(0.8); this.events.push({ type: 'post', p: p.clone(), speed: -vn }); }
          p.x = gx + n.x * (BALL_R + 0.071); p.y = GOAL_H + n.y * (BALL_R + 0.071);
        }
      }
      // gol: cruzou a linha entre as traves e abaixo do travessão
      const inside = s * p.x > HL && s * p.x < HL + GOAL_D && Math.abs(p.z) < GOAL_W / 2 && p.y < GOAL_H;
      if (inside) {
        if (!this.inGoal) { this.inGoal = s; this.events.push({ type: 'goal', p: p.clone(), speed: v.length() }); }
        // rede: fundo, teto e laterais
        if (s * p.x > HL + GOAL_D - BALL_R) { this.events.push({ type: 'net', p: p.clone(), speed: v.length() }); p.x = s * (HL + GOAL_D - BALL_R); v.x *= -0.15; v.multiplyScalar(0.4); }
        if (Math.abs(p.z) > GOAL_W / 2 - BALL_R) { p.z = Math.sign(p.z) * (GOAL_W / 2 - BALL_R); v.z *= -0.2; }
        if (p.y > GOAL_H - BALL_R) { p.y = GOAL_H - BALL_R; v.y *= -0.2; }
      } else if (s * p.x > HL && s * p.x < HL + GOAL_D + 0.2 && Math.abs(p.z) < GOAL_W / 2 + 0.2 && p.y < GOAL_H + 0.1 && !this.inGoal) {
        // por fora da rede: lateral externa
        if (Math.abs(p.z) > GOAL_W / 2 - 0.05) { v.z *= -0.3; p.z = Math.sign(p.z) * (GOAL_W / 2 + 0.2); }
      }
    }
  }

  private collideBoards() {
    const p = this.pos, v = this.vel;
    const bz = FIELD.HW + 3.0, bx = FIELD.HL + 3.2;
    if (Math.abs(p.z) > bz && p.y < 1.0) { p.z = Math.sign(p.z) * bz; v.z *= -0.4; this.events.push({ type: 'board', p: p.clone(), speed: v.length() }); }
    if (Math.abs(p.x) > bx && p.y < 1.0) { p.x = Math.sign(p.x) * bx; v.x *= -0.4; this.events.push({ type: 'board', p: p.clone(), speed: v.length() }); }
  }

  private sync(dt: number, speed: number) {
    this.mesh.position.copy(this.pos);
    // rotação de rolagem
    const hv = new THREE.Vector3(this.vel.x, 0, this.vel.z);
    const hs = hv.length();
    if (hs > 0.01) {
      const axis = new THREE.Vector3(hv.z, 0, -hv.x).normalize();
      this.rot.setFromAxisAngle(axis, (hs / BALL_R) * dt);
      this.mesh.quaternion.premultiply(this.rot);
    }
    this.shadow.position.set(this.pos.x, 0.013, this.pos.z);
    const s = Math.max(0.3, 1 - this.pos.y * 0.12);
    this.shadow.scale.setScalar(s);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.7 * s;
  }

  /** Previsão simples da posição em t segundos (sem colisões), usada pela IA e pelo goleiro. */
  predict(t: number, out = new THREE.Vector3()) {
    out.copy(this.pos).addScaledVector(this.vel, t);
    out.y = this.pos.y + this.vel.y * t - 0.5 * G * t * t;
    if (out.y < BALL_R) out.y = BALL_R;
    if (!this.airborne) {
      // rolando: desacelera
      const hs = Math.hypot(this.vel.x, this.vel.z);
      const tt = Math.min(t, hs / 4.5);
      const d = hs * tt - 0.5 * 4.5 * tt * tt;
      if (hs > 0) { out.x = this.pos.x + (this.vel.x / hs) * d; out.z = this.pos.z + (this.vel.z / hs) * d; }
    }
    return out;
  }

  /** Tempo até a bola atingir a altura y descendo (ou -1). */
  timeToHeight(y: number) {
    const a = -0.5 * G, b = this.vel.y, c = this.pos.y - y;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t > 0 ? t : -1;
  }
}

/** Velocidade para lançar de p0 a p1 com tempo de voo t (balística). */
export function ballistic(p0: THREE.Vector3, p1: THREE.Vector3, t: number) {
  return new THREE.Vector3((p1.x - p0.x) / t, (p1.y - p0.y + 0.5 * G * t * t) / t, (p1.z - p0.z) / t);
}
