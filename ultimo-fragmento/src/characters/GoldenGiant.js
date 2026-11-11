import * as THREE from 'three';
import { MorphPoints } from '../effects/Particles.js';
import { glowTexture } from '../effects/Crystal.js';

// The guardian: a colossal humanoid made only of golden particles. Body and the
// pointing arm are separate point clouds so the arm can rotate at the shoulder.
function sampleEllipsoid(r, c, s) { // point on/in an ellipsoid shell
  const u = r() * 2 - 1, a = r() * Math.PI * 2, k = Math.sqrt(1 - u * u), sh = 0.85 + r() * 0.15;
  return [c[0] + Math.cos(a) * k * s[0] * sh, c[1] + u * s[1] * sh, c[2] + Math.sin(a) * k * s[2] * sh];
}
function sampleCapsule(r, a, b, rad) {
  const t = r(), x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
  const ang = r() * Math.PI * 2, rr = rad * (0.8 + r() * 0.2) * (1 - t * 0.35);
  return [x + Math.cos(ang) * rr, y + (r() - 0.5) * rad * 0.4, z + Math.sin(ang) * rr];
}
export class GoldenGiant {
  constructor({ seed = 33, count = 46000 } = {}) {
    this.group = new THREE.Group();
    const parts = [
      { w: 0.17, f: (r) => sampleEllipsoid(r, [0, 30, 0], [5.2, 6.0, 5.0]) },                // head
      { w: 0.30, f: (r) => sampleEllipsoid(r, [0, 17, 0], [8.5, 10, 5.5]) },                 // chest
      { w: 0.15, f: (r) => sampleEllipsoid(r, [0, 5, 0], [6.5, 6, 4.5]) },                   // abdomen, fading into mist
      { w: 0.13, f: (r) => sampleCapsule(r, [-8, 24, 0], [-14, 6, 4], 2.6) },                // left arm
      { w: 0.07, f: (r) => sampleCapsule(r, [-14, 6, 4], [-12, -2, 9], 2.0) },
      { w: 0.18, f: (r) => { const p = sampleEllipsoid(r, [0, -6, 0], [9, 8, 7]); p[1] -= r() * 10; return p; } }, // trailing mist
    ];
    const pick = (r) => { let x = r(); for (const p of parts) { if ((x -= p.w) <= 0) return p.f(r); } return parts[0].f(r); };
    const swirl = (i, r) => { const a = r() * Math.PI * 2, R = 12 + r() * 22; return [Math.cos(a) * R, -10 + r() * 50, Math.sin(a) * R * 0.6 - 6]; };
    this.body = new MorphPoints({ count, seed, size: 0.45, color: 0xffb347, color2: 0xfff1b0, span: 0.4, start: swirl, target: (i, r) => pick(r), delay: (i, r) => r() * 0.6, drift: 0.5 });
    this.group.add(this.body.points);
    // pointing arm (right): local coords from shoulder pivot, pointing down -y
    this.shoulder = new THREE.Group(); this.shoulder.position.set(8, 24, 0); this.group.add(this.shoulder);
    this.arm = new MorphPoints({
      count: 9000, seed: seed + 1, size: 0.42, color: 0xffb347, color2: 0xfff1b0, span: 0.4, drift: 0.4,
      start: (i, r) => { const s = swirl(i, r); return [s[0] - 8, s[1] - 24, s[2]]; },
      target: (i, r) => { if (r() < 0.12) { const a = r() * 6.28, rr = r() * 2.4; return [Math.cos(a) * rr, -21 - r() * 3, Math.sin(a) * rr]; } return sampleCapsule(r, [0, 0, 0], [0, -21, 0], 2.6); },
      delay: (i, r) => r() * 0.6,
    });
    this.shoulder.add(this.arm.points);
    this.eyes = [-1, 1].map((s) => { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff4d0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.position.set(s * 2.1, 31, 4.6); e.scale.setScalar(3.2); this.group.add(e); return e; });
    this.light = new THREE.PointLight(0xffb347, 0, 120, 1.2); this.light.position.set(0, 20, 10); this.group.add(this.light);
  }
  update(t, form, point, opacity = 1) {
    this.body.set(form, t, opacity * 0.32); this.arm.set(form, t, opacity * 0.36);
    // arm: hangs (slightly forward) → raised pointing to the side/forward
    this.shoulder.rotation.set(-0.25 - point * 1.1, 0, 0.35 + point * 1.0);
    const eo = Math.max(0, (form - 0.85) / 0.15) * opacity;
    for (const e of this.eyes) { e.material.opacity = eo * (0.85 + 0.15 * Math.sin(t * 3)); e.scale.setScalar(2.4 + eo * 1.4); }
    this.light.intensity = 40 * form * opacity;
  }
}
