import * as THREE from 'three';
import { Trail } from '../particles/trail.js';

// LUMI — a estrela viva: esfera de luz dourada, olhos expressivos, orelhinhas luminosas e cauda de partículas.
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,225,150,0.75)'); gr.addColorStop(0.5, 'rgba(255,170,60,0.22)'); gr.addColorStop(1, 'rgba(255,140,30,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
export class Lumi {
  constructor() {
    const g = (this.group = new THREE.Group());
    this.coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.6), toneMapped: false });
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), this.coreMat); g.add(this.core);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, fog: false })); this.halo.scale.setScalar(0.95); g.add(this.halo);
    const dark = new THREE.MeshBasicMaterial({ color: 0x3a1c06 }), white = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.eyes = [];
    for (const sx of [1, -1]) {
      const e = new THREE.Group(); e.position.set(0.045 * sx, 0.018, 0.105); const m = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), dark); m.scale.set(0.9, 1.25, 0.5); e.add(m);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 4), white); h.position.set(0.006, 0.012, 0.012); e.add(h); g.add(e); this.eyes.push(e);
    }
    this.ears = [];
    for (const sx of [1, -1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 6), this.coreMat); e.position.set(0.075 * sx, 0.115, 0); e.rotation.z = -0.5 * sx; g.add(e); this.ears.push(e); }
    this.light = new THREE.PointLight(0xffc870, 0.8, 7, 2); g.add(this.light);
    this.corona = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); g.add(this.corona);
    this.tail = new Trail(140, { color: 0xffc860, color2: 0xfff2c0, size: 0.035, life: 1.1, spread: 0.07, gain: 1.4 }, 71);
    this.pos = new THREE.Vector3(); this._v = new THREE.Vector3();
  }
  /** path(time) → Vector3 (posição no mundo). A cauda é reconstruída do passado da trajetória: nada é acumulado. */
  update(t, path, lookAt, o = {}) {
    const p = path(t, this._v); this.pos.copy(p); this.group.position.copy(p);
    if (lookAt) this.group.lookAt(lookAt);
    const size = o.size ?? 1, sun = o.sun ?? 0, happy = o.happy ?? 0, blink = Math.max(o.blink ?? 0, (t * 0.37 % 1) > 0.95 ? 1 : 0);
    const bob = 1 + Math.sin(t * 7) * 0.035;
    this.group.scale.setScalar(size * (1 + sun * 2.2));
    this.core.scale.set(bob, 2 - bob, bob);
    for (const e of this.eyes) { e.scale.set(1, (1 - 0.88 * blink) * (1 - happy * 0.45), 1); e.visible = sun < 0.6; }
    this.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 5 + i) * 0.25 + happy * 0.3; e.visible = sun < 0.6; });
    this.halo.scale.setScalar(0.8 + sun * 1.6 + Math.sin(t * 3.1) * 0.06); this.halo.material.opacity = 0.75; this.light.intensity = (0.8 + sun * 8) * (o.light ?? 1);
    this.corona.material.opacity = sun * 0.5; this.corona.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
    this.tail.update(t, path, 0.035 * size * (1 + sun));
    this.group.visible = true; this.tail.points.visible = true;
  }
  hide() { this.group.visible = false; this.tail.points.visible = false; }
}
