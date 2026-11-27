import * as THREE from 'three';
import { Assets } from '../core/assets';

// Visual effects: GPU-friendly particle pool (dust, grass bits, sparks, confetti), ball trail ribbon,
// blob shadow, clay ball-marks, perfect-hit flash ring, camera flashes in the crowd.

interface Particle { p: THREE.Vector3; v: THREE.Vector3; life: number; max: number; size: number; color: THREE.Color; grav: number; drag: number; spin: number; rot: number }

export class FX {
  group = new THREE.Group();
  private parts: Particle[] = [];
  private pointsGeom: THREE.BufferGeometry;
  private points: THREE.Points;
  private MAX = 1500;
  private trailGeom: THREE.BufferGeometry;
  private trail: THREE.Mesh;
  private trailPts: THREE.Vector3[] = [];
  trailColor = new THREE.Color('#ffb347');
  private shadow: THREE.Mesh;
  private marks: THREE.Mesh[] = [];
  private markMat: THREE.MeshBasicMaterial;
  private rings: { m: THREE.Mesh; t: number }[] = [];
  private ringGeom = new THREE.RingGeometry(0.2, 0.32, 40);
  private flashes: { l: THREE.PointLight; t: number }[] = [];

  constructor() {
    const tex = Assets.t('textures/fx_dot.png');
    this.pointsGeom = new THREE.BufferGeometry();
    this.pointsGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.MAX * 3), 3));
    this.pointsGeom.setAttribute('pcolor', new THREE.BufferAttribute(new Float32Array(this.MAX * 4), 4));
    this.pointsGeom.setAttribute('size', new THREE.BufferAttribute(new Float32Array(this.MAX), 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uScale: { value: window.innerHeight } },
      vertexShader: `attribute float size; attribute vec4 pcolor; varying vec4 vC; uniform float uScale;
        void main(){ vC = pcolor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uTex; varying vec4 vC; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a * t.a); if (gl_FragColor.a < 0.01) discard; }`,
      transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(this.pointsGeom, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    // trail ribbon (camera-facing strip)
    const N = 24;
    this.trailGeom = new THREE.BufferGeometry();
    this.trailGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    this.trailGeom.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(N * 2), 1));
    const idx: number[] = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.trailGeom.setIndex(idx);
    this.trail = new THREE.Mesh(this.trailGeom, new THREE.ShaderMaterial({
      uniforms: { uColor: { value: this.trailColor } },
      vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor * 1.6, vA * 0.55); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    this.trail.frustumCulled = false;
    this.group.add(this.trail);

    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.45, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 2;
    this.group.add(this.shadow);
    this.markMat = new THREE.MeshBasicMaterial({ color: '#7a3416', transparent: true, opacity: 0.55, depthWrite: false });
    window.addEventListener('resize', () => ((this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = window.innerHeight));
  }

  burst(at: THREE.Vector3, opts: { n: number; color: string | THREE.Color; speed: number; up?: number; size?: number; life?: number; grav?: number; spread?: number; drag?: number; dir?: THREE.Vector3 }) {
    const c = new THREE.Color(opts.color);
    for (let i = 0; i < opts.n; i++) {
      if (this.parts.length >= this.MAX) this.parts.shift();
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * (opts.up ?? 0.5), Math.random() - 0.5).normalize();
      if (opts.dir) dir.lerp(opts.dir, 0.6).normalize();
      const sp = opts.speed * (0.4 + Math.random() * 0.8);
      const life = (opts.life ?? 0.8) * (0.6 + Math.random() * 0.6);
      this.parts.push({ p: at.clone().add(new THREE.Vector3((Math.random() - 0.5) * (opts.spread ?? 0.1), 0, (Math.random() - 0.5) * (opts.spread ?? 0.1))), v: dir.multiplyScalar(sp), life, max: life, size: (opts.size ?? 0.08) * (0.6 + Math.random() * 0.8), color: c.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.12), grav: opts.grav ?? 9.8, drag: opts.drag ?? 1.5, spin: 0, rot: 0 });
    }
  }

  dust(at: THREE.Vector3, surface: string, strength = 1) {
    if (surface === 'clay') {
      this.burst(at, { n: Math.round(22 * strength), color: '#c9693d', speed: 1.6 * strength, up: 0.6, size: 0.16, life: 1.1, grav: 1.2, spread: 0.25, drag: 2.5 });
    } else if (surface === 'grass') {
      this.burst(at, { n: Math.round(10 * strength), color: '#6fa63e', speed: 1.4 * strength, up: 1.2, size: 0.05, life: 0.7, grav: 6, spread: 0.15 });
    } else {
      this.burst(at, { n: Math.round(6 * strength), color: '#dfe6ee', speed: 0.8, up: 0.5, size: 0.07, life: 0.4, grav: 1, spread: 0.1 });
    }
  }

  impact(at: THREE.Vector3, perfect: boolean) {
    this.burst(at, { n: perfect ? 40 : 12, color: perfect ? '#ffd65a' : '#ffffff', speed: perfect ? 5 : 3, up: 1, size: perfect ? 0.09 : 0.05, life: 0.35, grav: 2, drag: 4 });
    if (perfect) {
      const m = new THREE.Mesh(this.ringGeom, new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.copy(at);
      this.group.add(m);
      this.rings.push({ m, t: 0 });
    }
  }

  confetti(center: THREE.Vector3) {
    const cols = ['#f5c542', '#ff4d5a', '#3ff7ff', '#ffffff', '#39e36b', '#ff2bd6'];
    for (const c of cols) this.burst(center.clone().add(new THREE.Vector3(0, 8, 0)), { n: 60, color: c, speed: 6, up: 1.5, size: 0.12, life: 4, grav: 1.2, spread: 12, drag: 1.2 });
  }

  ballMark(at: THREE.Vector3) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), this.markMat);
    m.scale.set(1, 1.7, 1);
    m.rotation.x = -Math.PI / 2;
    m.position.set(at.x, 0.004, at.z);
    m.renderOrder = 1;
    this.group.add(m);
    this.marks.push(m);
    if (this.marks.length > 24) this.group.remove(this.marks.shift()!);
  }

  clearMarks() {
    for (const m of this.marks) this.group.remove(m);
    this.marks = [];
  }

  cameraFlash(at: THREE.Vector3) {
    const l = new THREE.PointLight('#ffffff', 40, 8);
    l.position.copy(at);
    this.group.add(l);
    this.flashes.push({ l, t: 0 });
    this.burst(at, { n: 1, color: '#ffffff', speed: 0, size: 0.8, life: 0.08, grav: 0 });
  }

  /** Update ball-attached effects. */
  ball(pos: THREE.Vector3, active: boolean, camera: THREE.Camera, speedKmh: number) {
    this.shadow.position.set(pos.x, 0.006, pos.z);
    const h = Math.max(0, pos.y);
    this.shadow.scale.setScalar(1 + h * 0.25);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = active ? Math.max(0.12, 0.5 - h * 0.05) : 0;
    if (active) this.trailPts.unshift(pos.clone()); else this.trailPts.length = 0;
    const N = 24;
    if (this.trailPts.length > N) this.trailPts.length = N;
    const posA = this.trailGeom.getAttribute('position') as THREE.BufferAttribute;
    const alA = this.trailGeom.getAttribute('alpha') as THREE.BufferAttribute;
    const camPos = (camera as THREE.PerspectiveCamera).position;
    const intensity = THREE.MathUtils.clamp((speedKmh - 40) / 120, 0, 1);
    for (let i = 0; i < N; i++) {
      const p = this.trailPts[Math.min(i, this.trailPts.length - 1)] ?? pos;
      const next = this.trailPts[Math.min(i + 1, this.trailPts.length - 1)] ?? p;
      const dir = new THREE.Vector3().subVectors(p, next);
      const toCam = new THREE.Vector3().subVectors(camPos, p);
      const side = new THREE.Vector3().crossVectors(dir, toCam).normalize();
      const w = 0.035 * (1 - i / N);
      posA.setXYZ(i * 2, p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
      posA.setXYZ(i * 2 + 1, p.x - side.x * w, p.y - side.y * w, p.z - side.z * w);
      const a = this.trailPts.length > 2 ? (1 - i / N) * intensity : 0;
      alA.setX(i * 2, a); alA.setX(i * 2 + 1, a);
    }
    posA.needsUpdate = true;
    alA.needsUpdate = true;
  }

  update(dt: number, camera: THREE.Camera) {
    const pos = this.pointsGeom.getAttribute('position') as THREE.BufferAttribute;
    const col = this.pointsGeom.getAttribute('pcolor') as THREE.BufferAttribute;
    const size = this.pointsGeom.getAttribute('size') as THREE.BufferAttribute;
    let n = 0;
    this.parts = this.parts.filter((p) => (p.life -= dt) > 0);
    for (const p of this.parts) {
      p.v.y -= p.grav * dt;
      p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.p.addScaledVector(p.v, dt);
      if (p.p.y < 0.01) { p.p.y = 0.01; p.v.y *= -0.2; p.v.x *= 0.7; p.v.z *= 0.7; }
      pos.setXYZ(n, p.p.x, p.p.y, p.p.z);
      const a = Math.min(1, p.life / p.max * 2);
      col.setXYZW(n, p.color.r, p.color.g, p.color.b, a);
      size.setX(n, p.size);
      n++;
    }
    this.pointsGeom.setDrawRange(0, n);
    pos.needsUpdate = col.needsUpdate = size.needsUpdate = true;
    for (const r of this.rings) {
      r.t += dt;
      r.m.scale.setScalar(1 + r.t * 10);
      r.m.quaternion.copy(camera.quaternion);
      (r.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - r.t * 3);
    }
    this.rings = this.rings.filter((r) => (r.t < 0.4 ? true : (this.group.remove(r.m), false)));
    for (const f of this.flashes) { f.t += dt; f.l.intensity = Math.max(0, 40 * (1 - f.t * 10)); }
    this.flashes = this.flashes.filter((f) => (f.t < 0.12 ? true : (this.group.remove(f.l), false)));
  }
}
