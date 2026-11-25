import * as THREE from 'three';

export type CamMode = 'broadcast' | 'orbit' | 'path' | 'behind' | 'fixed' | 'follow';

/** Diretor de câmera: transmissão lateral (TV), órbita cinematográfica, trajetos e câmera atrás do batedor. */
export class CameraDirector {
  cam: THREE.PerspectiveCamera;
  mode: CamMode = 'broadcast';
  look = new THREE.Vector3();
  pos = new THREE.Vector3(0, 14, 32);
  shakeT = 0;
  shakeA = 0;
  zoom = 1;
  // órbita
  orbitTarget = new THREE.Vector3();
  orbitAng = 0;
  orbitR = 5;
  orbitH = 1.6;
  orbitSpeed = 0.35;
  // trajeto
  path: { p: THREE.Vector3; l: THREE.Vector3; t: number }[] = [];
  pathT = 0;
  fov = 36;
  private tmp = new THREE.Vector3();

  constructor(cam: THREE.PerspectiveCamera) { this.cam = cam; }

  shake(a: number, t = 0.35) { this.shakeA = Math.max(this.shakeA, a); this.shakeT = Math.max(this.shakeT, t); }

  broadcast(snap = false) { this.mode = 'broadcast'; if (snap) this.snap = true; }
  private snap = false;
  orbit(target: THREE.Vector3, r = 4.5, h = 1.5, startAng = 0, speed = 0.35) {
    this.mode = 'orbit'; this.orbitTarget.copy(target); this.orbitR = r; this.orbitH = h; this.orbitAng = startAng; this.orbitSpeed = speed;
  }
  playPath(keys: { p: THREE.Vector3; l: THREE.Vector3; t: number }[]) { this.mode = 'path'; this.path = keys; this.pathT = 0; }
  fixed(p: THREE.Vector3, l: THREE.Vector3, fov = 36) { this.mode = 'fixed'; this.pos.copy(p); this.look.copy(l); this.fov = fov; this.snap = true; }

  update(dt: number, ball: THREE.Vector3, attackDir: number, focus?: THREE.Vector3) {
    let wantPos = this.tmp, wantLook = new THREE.Vector3(), fov = 36;
    let k = 1 - Math.exp(-dt * 3.2);
    if (this.mode === 'broadcast') {
      const fx = THREE.MathUtils.clamp(ball.x + attackDir * 2.5, -13.5, 13.5);
      const fz = THREE.MathUtils.clamp(ball.z, -9, 9);
      wantLook.set(fx, 0.6, fz * 0.75 - 0.5);
      wantPos.set(fx * 0.92, 10.2 * this.zoom, 21.5 * this.zoom + fz * 0.3);
      fov = 34;
    } else if (this.mode === 'orbit') {
      this.orbitAng += dt * this.orbitSpeed;
      wantPos.set(this.orbitTarget.x + Math.sin(this.orbitAng) * this.orbitR, this.orbitH, this.orbitTarget.z + Math.cos(this.orbitAng) * this.orbitR);
      wantLook.copy(this.orbitTarget).setY(this.orbitTarget.y + 1.1);
      fov = 40; k = 1 - Math.exp(-dt * 6);
    } else if (this.mode === 'path') {
      this.pathT += dt;
      const keys = this.path;
      let i = 0;
      while (i < keys.length - 2 && this.pathT > keys[i + 1].t) i++;
      const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
      const f = b.t > a.t ? THREE.MathUtils.smootherstep(this.pathT, a.t, b.t) : 1;
      wantPos.lerpVectors(a.p, b.p, f); wantLook.lerpVectors(a.l, b.l, f);
      k = 1; fov = 42;
    } else if (this.mode === 'behind' || this.mode === 'follow') {
      const f = focus ?? ball;
      wantPos.set(f.x - attackDir * 6, 2.6, f.z + 0.8);
      wantLook.set(attackDir * 18, 1.0, 0);
      fov = 44;
    } else {
      wantPos.copy(this.pos); wantLook.copy(this.look); fov = this.fov; k = 1;
    }
    if (this.snap) { k = 1; this.snap = false; }
    this.pos.lerp(wantPos, k);
    this.look.lerp(wantLook, k);
    this.fov += (fov - this.fov) * k;
    this.cam.position.copy(this.pos);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeA * Math.max(0, this.shakeT) * 2;
      this.cam.position.add(new THREE.Vector3((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a));
    } else this.shakeA = 0;
    this.cam.lookAt(this.look);
    if (Math.abs(this.cam.fov - this.fov) > 0.01) { this.cam.fov = this.fov; this.cam.updateProjectionMatrix(); }
  }
}
