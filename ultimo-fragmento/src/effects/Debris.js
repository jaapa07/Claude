import * as THREE from 'three';
import { rng, clamp } from '../core/util.js';

// Instanced cube fragments with closed-form ballistic flight:
//   p(τ) = origin + v·τ + ½·g·τ²   (τ = time since this cube's release)
// No integration => any frame can be evaluated directly (deterministic export).
export class CubeDebris {
  constructor({ count = 2000, size = 0.8, color = 0x2a3550, emissive = 0x2266ff, emissiveIntensity = 0.6, seed = 3, metal = 0.3 } = {}) {
    this.count = count;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, roughness: 0.6, metalness: metal });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.data = [];
    this.r = rng(seed); this.size = size;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this.used = 0;
  }
  // spawn n cubes inside a box (cx,cy,cz,w,h,d) released between t0..t1
  emitBox({ n, box, t0, t1, vel = [0, 6, 0], spread = 4, gravity = [0, 4, 0], spin = 3, life = 6, size = this.size, order = 'top', shape = [1, 1, 1] }) {
    const r = this.r;
    for (let i = 0; i < n && this.used < this.count; i++) {
      const u = r(), v = r(), w = r();
      const y = box[1] + (u - 0.5) * box[4];
      const rel = order === 'top' ? 1 - u : order === 'bottom' ? u : r();
      this.data[this.used++] = {
        o: [box[0] + (v - 0.5) * box[3], y, box[2] + (w - 0.5) * box[5]],
        v: [vel[0] + (r() - 0.5) * spread, vel[1] + (r() - 0.5) * spread, vel[2] + (r() - 0.5) * spread],
        g: gravity, t: t0 + (t1 - t0) * rel * 0.9 + r() * (t1 - t0) * 0.1,
        ax: [r() - 0.5, r() - 0.5, r() - 0.5], spin: spin * (0.5 + r()), life, s: size * (0.5 + r() * 0.8), shape,
      };
    }
  }
  update(time) {
    const { _m, _q, _e, _s, _p } = this;
    let k = 0;
    for (let i = 0; i < this.used; i++) {
      const d = this.data[i], tau = time - d.t;
      if (tau < 0 || tau > d.life) { _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, _m); continue; }
      _p.set(d.o[0] + d.v[0] * tau + 0.5 * d.g[0] * tau * tau, d.o[1] + d.v[1] * tau + 0.5 * d.g[1] * tau * tau, d.o[2] + d.v[2] * tau + 0.5 * d.g[2] * tau * tau);
      _e.set(d.ax[0] * d.spin * tau, d.ax[1] * d.spin * tau, d.ax[2] * d.spin * tau); _q.setFromEuler(_e);
      const sc = d.s * clamp(tau / 0.15) * (1 - clamp((tau - d.life * 0.7) / (d.life * 0.3)));
      _s.set(sc * d.shape[0], sc * d.shape[1], sc * d.shape[2]); _m.compose(_p, _q, _s); this.mesh.setMatrixAt(i, _m); k++;
    }
    for (let i = this.used; i < this.count; i++) { _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, _m); }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = k > 0;
  }
}
