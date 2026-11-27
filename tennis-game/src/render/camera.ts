import * as THREE from 'three';

export type Shot =
  | { kind: 'game'; end: 1 | -1 }
  | { kind: 'orbit'; center: THREE.Vector3; radius: number; height: number; speed: number; angle: number }
  | { kind: 'close'; target: () => THREE.Vector3; offset: THREE.Vector3 }
  | { kind: 'track'; from: THREE.Vector3; target: () => THREE.Vector3; fov?: number }
  | { kind: 'dolly'; from: THREE.Vector3; to: THREE.Vector3; look: THREE.Vector3; dur: number; t: number };

export class CameraDirector {
  shot: Shot = { kind: 'game', end: 1 };
  private pos = new THREE.Vector3(0, 8, 22);
  private look = new THREE.Vector3(0, 0, -2);
  private shake = 0;
  private cut = true;
  focusX = 0;

  constructor(public cam: THREE.PerspectiveCamera) {}

  set(s: Shot, cut = true) {
    this.shot = s;
    this.cut = cut;
  }

  addShake(a: number) { this.shake = Math.min(0.5, this.shake + a); }

  update(dt: number, ballPos: THREE.Vector3, humanPos: THREE.Vector3) {
    const s = this.shot;
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    let fov = this.cam.aspect < 1 ? 60 : this.cam.aspect < 1.4 ? 50 : 42;
    let lerp = 1 - Math.exp(-dt * 5);
    switch (s.kind) {
      case 'game': {
        // high camera behind the human player's baseline; drifts with play like classic arcade tennis
        this.focusX = THREE.MathUtils.lerp(this.focusX, humanPos.x * 0.35 + ballPos.x * 0.2, 1 - Math.exp(-dt * 2.5));
        const back = 21.0, height = 7.1;
        const depthShift = THREE.MathUtils.clamp((Math.abs(humanPos.z) - 11.9) * 0.4, -2, 2.5);
        wantPos.set(this.focusX, height, s.end * (back + depthShift));
        wantLook.set(this.focusX * 0.6, 0.0, s.end * -4.6);
        lerp = 1 - Math.exp(-dt * 6);
        break;
      }
      case 'orbit': {
        s.angle += s.speed * dt;
        wantPos.set(s.center.x + Math.sin(s.angle) * s.radius, s.height, s.center.z + Math.cos(s.angle) * s.radius);
        wantLook.copy(s.center);
        lerp = 1 - Math.exp(-dt * 3);
        break;
      }
      case 'close': {
        const t = s.target();
        wantPos.copy(t).add(s.offset);
        wantLook.copy(t).add(new THREE.Vector3(0, 1.45, 0));
        fov = 32;
        lerp = 1 - Math.exp(-dt * 4);
        break;
      }
      case 'track': {
        wantPos.copy(s.from);
        wantLook.copy(s.target());
        fov = s.fov ?? 30;
        lerp = 1 - Math.exp(-dt * 8);
        break;
      }
      case 'dolly': {
        s.t = Math.min(s.dur, s.t + dt);
        const k = THREE.MathUtils.smoothstep(s.t / s.dur, 0, 1);
        wantPos.lerpVectors(s.from, s.to, k);
        wantLook.copy(s.look);
        fov = 36;
        lerp = 1;
        break;
      }
    }
    if (this.cut) { this.pos.copy(wantPos); this.look.copy(wantLook); this.cut = false; }
    else { this.pos.lerp(wantPos, lerp); this.look.lerp(wantLook, lerp); }
    this.cam.position.copy(this.pos);
    if (this.shake > 0) {
      this.cam.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0));
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.cam.lookAt(this.look);
    if (Math.abs(this.cam.fov - fov) > 0.01) {
      this.cam.fov = THREE.MathUtils.lerp(this.cam.fov, fov, 1 - Math.exp(-dt * 6));
      this.cam.updateProjectionMatrix();
    }
  }
}
