import * as THREE from 'three';
import { Assets } from '../core/assets';
import { stepBall, type BallState, type SurfaceParams, type StepEvent } from './physics';

export class Ball {
  mesh: THREE.Object3D;
  state: BallState = { p: { x: 0, y: 1, z: 0 }, v: { x: 0, y: 0, z: 0 }, spin: 0 };
  active = false; // simulated
  visible = false;
  held: THREE.Object3D | null = null; // attached to a hand during service toss setup
  private spinAngle = 0;
  squash = 0;

  constructor(scene: THREE.Object3D) {
    this.mesh = Assets.g('models/props/ball.glb').scene.clone(true);
    this.mesh.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
    this.mesh.scale.setScalar(1.6); // slightly oversized for readability, like arcade tennis games
    scene.add(this.mesh);
  }

  get pos() { return this.state.p; }
  get vel() { return this.state.v; }
  speedKmh() { const v = this.state.v; return Math.hypot(v.x, v.y, v.z) * 3.6; }

  set(p: { x: number; y: number; z: number }, v: { x: number; y: number; z: number }, spin: number) {
    this.state.p = { ...p };
    this.state.v = { ...v };
    this.state.spin = spin;
    this.active = true;
    this.visible = true;
    this.held = null;
  }

  step(dt: number, surf: SurfaceParams): StepEvent {
    if (!this.active) return null;
    return stepBall(this.state, dt, surf);
  }

  sync(dt: number) {
    this.mesh.visible = this.visible;
    if (this.held) {
      this.held.getWorldPosition(this.mesh.position);
      const p = this.mesh.position;
      this.state.p = { x: p.x, y: p.y, z: p.z };
      return;
    }
    const p = this.state.p;
    this.mesh.position.set(p.x, p.y, p.z);
    // squash & stretch: flatten on impact, stretch along fast flight
    this.squash = Math.max(0, this.squash - dt * 9);
    const sq = this.squash, st = Math.min(0.25, this.speedKmh() / 900);
    this.mesh.scale.set(1.6 * (1 + sq * 0.25), 1.6 * (1 - sq * 0.4), 1.6 * (1 + st));
    const v = this.state.v;
    const sp = Math.hypot(v.x, v.z);
    this.spinAngle += (sp * 0.6 + Math.abs(this.state.spin) * 40) * dt;
    this.mesh.rotation.set(this.spinAngle, Math.atan2(v.x, v.z), 0);
  }
}
