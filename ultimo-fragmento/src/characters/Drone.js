import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Watcher drones: dark angular bodies with a single red eye. Rendered as two
// InstancedMeshes (body + glowing eye); positions are supplied per frame.
export class DroneSwarm {
  constructor(count = 300, scale = 1) {
    const body = new THREE.OctahedronGeometry(0.5, 0); body.scale(1.3, 0.55, 1.0);
    const ring = new THREE.TorusGeometry(0.75, 0.06, 6, 20); ring.rotateX(Math.PI / 2);
    const fin = new THREE.BoxGeometry(1.9, 0.05, 0.25);
    const geo = mergeGeometries([body, ring, fin].map((g) => (g.index ? g.toNonIndexed() : g))); geo.scale(scale, scale, scale);
    this.body = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x15171d, metalness: 0.85, roughness: 0.3, emissive: 0x200000, emissiveIntensity: 0.6 }), count);
    const eg = new THREE.SphereGeometry(0.17 * scale, 10, 8); eg.translate(0, -0.05 * scale, 0.42 * scale);
    this.eye = new THREE.InstancedMesh(eg, new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.25, 0.1) }), count);
    for (const m of [this.body, this.eye]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
    this.group = new THREE.Group(); this.group.add(this.body, this.eye);
    this.count = count; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
    this._look = new THREE.Matrix4();
  }
  // fn(i) -> { p: Vector3, dir: Vector3, s: number } or null (hidden)
  update(fn) {
    let shown = 0;
    for (let i = 0; i < this.count; i++) {
      const d = fn(i);
      if (!d || d.s <= 0) { this._m.makeScale(0, 0, 0); }
      else {
        this._look.lookAt(d.dir, new THREE.Vector3(), this._up); this._q.setFromRotationMatrix(this._look);
        this._s.setScalar(d.s); this._m.compose(d.p, this._q, this._s); shown++;
      }
      this.body.setMatrixAt(i, this._m); this.eye.setMatrixAt(i, this._m);
    }
    this.body.instanceMatrix.needsUpdate = this.eye.instanceMatrix.needsUpdate = true;
    this.group.visible = shown > 0;
  }
}
