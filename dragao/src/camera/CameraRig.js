import * as THREE from 'three';
import { shake } from '../core/util.js';

const gsap = window.gsap;

// Camera driven by a *paused* GSAP timeline. We never let GSAP's ticker run it:
// every frame we seek the timeline to the episode time, so playback, scrubbing and
// frame-by-frame export all produce identical camera moves.
export class CameraRig {
  constructor(init) {
    this.camera = new THREE.PerspectiveCamera(init.fov ?? 40, 1080 / 1920, 0.05, 2500);
    this.p = { x: 0, y: 1, z: 5, tx: 0, ty: 0.5, tz: 0, fov: 40, roll: 0, shake: 0, shakeFreq: 14, ...init };
    this.tl = gsap.timeline({ paused: true });
    this.tl.set(this.p, { ...this.p }, 0);
    this._target = new THREE.Vector3();
    this.follow = null; // optional function(t) -> {x,y,z} offset added to position+target
  }
  to(time, duration, props, ease = 'power2.inOut') { this.tl.to(this.p, { ...props, duration, ease }, time); return this; }
  set(time, props) { this.tl.set(this.p, props, time); return this; }
  // call once after all keys are added: initialise every tween's start values in order
  prime(duration) { this.tl.seek(duration, false); this.tl.seek(0, false); return this; }
  apply(t) {
    this.tl.seek(t, false);
    const p = this.p, c = this.camera;
    let ox = 0, oy = 0, oz = 0;
    if (this.follow) { const f = this.follow(t); ox = f[0]; oy = f[1]; oz = f[2]; }
    const s = shake(t, p.shakeFreq);
    const k = p.shake;
    c.position.set(p.x + ox + s[0] * k, p.y + oy + s[1] * k, p.z + oz + s[2] * k * 0.5);
    this._target.set(p.tx + ox + s[1] * k * 0.3, p.ty + oy + s[2] * k * 0.3, p.tz + oz);
    c.up.set(0, 1, 0);
    c.lookAt(this._target);
    c.rotateZ(p.roll);
    c.fov = p.fov; c.updateProjectionMatrix();
    return c;
  }
}
