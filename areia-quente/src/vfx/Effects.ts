import * as THREE from 'three';
import { assets } from '../core/Assets';

type P = {
  alive: boolean; pos: THREE.Vector3; vel: THREE.Vector3; life: number; max: number; s0: number; s1: number;
  color: THREE.Color; a0: number; grav: number; drag: number; rot: number; vr: number; frames: number; floor: boolean;
};

/** Partículas billboard instanciadas com flipbook (atlas de sprites do Kenney). */
export class Particles {
  mesh: THREE.InstancedMesh;
  ps: P[] = [];
  private aFrame: THREE.InstancedBufferAttribute;
  private aAlpha: THREE.InstancedBufferAttribute;
  private aRot: THREE.InstancedBufferAttribute;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private sv = new THREE.Vector3();

  constructor(tex: THREE.Texture, cols: number, rows: number, max: number, additive: boolean, frames = cols * rows) {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.aFrame = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.aRot = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    geo.setAttribute('aFrame', this.aFrame);
    geo.setAttribute('aAlpha', this.aAlpha);
    geo.setAttribute('aRot', this.aRot);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, grid: { value: new THREE.Vector2(cols, rows) } },
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute float aFrame; attribute float aAlpha; attribute float aRot; uniform vec2 grid; varying vec2 vUv; varying float vA; varying vec3 vC;
        void main(){
          vec4 c = modelViewMatrix * vec4(instanceMatrix[3].xyz, 1.0);
          float s = length(instanceMatrix[0].xyz);
          float cr = cos(aRot), sr = sin(aRot);
          vec2 p = vec2(position.x*cr - position.y*sr, position.x*sr + position.y*cr) * s;
          c.xy += p;
          gl_Position = projectionMatrix * c;
          float f = floor(aFrame); vec2 cell = vec2(mod(f, grid.x), grid.y - 1.0 - floor(f / grid.x));
          vUv = (cell + uv) / grid; vA = aAlpha;
          #ifdef USE_INSTANCING_COLOR
            vC = instanceColor;
          #else
            vC = vec3(1.0);
          #endif
        }`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vA; varying vec3 vC;
        void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(t.rgb * vC, t.a * vA); if (gl_FragColor.a < 0.01) discard; }`,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    for (let i = 0; i < max; i++) this.ps.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, max: 1, s0: 1, s1: 1, color: new THREE.Color(), a0: 1, grav: 0, drag: 0, rot: 0, vr: 0, frames, floor: false });
    this.mesh.count = max;
    for (let i = 0; i < max; i++) { this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this.m); }
  }

  emit(o: { pos: THREE.Vector3; vel?: THREE.Vector3; life: number; s0: number; s1?: number; color?: THREE.ColorRepresentation; alpha?: number; grav?: number; drag?: number; vr?: number; floor?: boolean }) {
    const p = this.ps.find((x) => !x.alive);
    if (!p) return;
    p.alive = true; p.pos.copy(o.pos); p.vel.copy(o.vel ?? new THREE.Vector3()); p.life = 0; p.max = o.life;
    p.s0 = o.s0; p.s1 = o.s1 ?? o.s0; p.color.set(o.color ?? 0xffffff); p.a0 = o.alpha ?? 1; p.grav = o.grav ?? 0; p.drag = o.drag ?? 0;
    p.rot = Math.random() * 6.28; p.vr = o.vr ?? (Math.random() - 0.5) * 2; p.floor = !!o.floor;
  }

  update(dt: number) {
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      if (!p.alive) continue;
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) { p.alive = false; this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this.m); this.aAlpha.setX(i, 0); continue; }
      p.vel.y -= p.grav * dt;
      p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      if (p.floor && p.pos.y < 0.05) { p.pos.y = 0.05; p.vel.y *= -0.2; p.vel.x *= 0.6; p.vel.z *= 0.6; }
      p.rot += p.vr * dt;
      const s = p.s0 + (p.s1 - p.s0) * k;
      this.m.compose(p.pos, this.q, this.sv.set(s, s, s));
      this.mesh.setMatrixAt(i, this.m);
      this.mesh.setColorAt(i, p.color);
      this.aFrame.setX(i, Math.min(p.frames - 1, k * p.frames));
      this.aAlpha.setX(i, p.a0 * (k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9));
      this.aRot.setX(i, p.rot);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.aFrame.needsUpdate = true; this.aAlpha.needsUpdate = true; this.aRot.needsUpdate = true;
  }

  clear() { for (const p of this.ps) p.alive = false; }
}

/** Pegadas na areia: quads instanciados que somem em ~8 s. */
export class Footprints {
  mesh: THREE.InstancedMesh;
  private age: Float32Array;
  private aAge: THREE.InstancedBufferAttribute;
  private i = 0;
  private m = new THREE.Matrix4();
  constructor(max = 400) {
    const geo = new THREE.PlaneGeometry(0.14, 0.28).rotateX(-Math.PI / 2);
    this.age = new Float32Array(max).fill(99);
    this.aAge = new THREE.InstancedBufferAttribute(this.age, 1);
    geo.setAttribute('aAge', this.aAge);
    const mat = new THREE.MeshBasicMaterial({ map: assets.tex('vfx/footprint.png'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float aAge; varying float vAge;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vAge = aAge;');
      sh.fragmentShader = 'varying float vAge;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.a *= clamp(1.0 - vAge/8.0, 0.0, 1.0) * 0.8;');
    };
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    for (let k = 0; k < max; k++) { this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(k, this.m); }
  }
  add(x: number, z: number, yaw: number, side: number) {
    const k = this.i++ % this.age.length;
    const off = side * 0.09;
    this.m.makeRotationY(yaw).setPosition(x + Math.cos(yaw) * off, 0.015, z - Math.sin(yaw) * off);
    this.mesh.setMatrixAt(k, this.m);
    this.age[k] = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  update(dt: number) {
    for (let k = 0; k < this.age.length; k++) this.age[k] += dt;
    this.aAge.needsUpdate = true;
  }
}

/** Rastro (fita) atrás da bola. */
export class Trail {
  mesh: THREE.Mesh;
  private pts: THREE.Vector3[] = [];
  private geo = new THREE.BufferGeometry();
  private n: number;
  mat: THREE.MeshBasicMaterial;
  constructor(n = 24) {
    this.n = n;
    const pos = new Float32Array(n * 2 * 3);
    const uv = new Float32Array(n * 2 * 2);
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    for (let i = 0; i < n; i++) { uv.set([i / (n - 1), 0, i / (n - 1), 1], i * 4); }
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({ map: assets.tex('vfx/trace_01.png'), color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
  }
  update(p: THREE.Vector3, cam: THREE.Camera, speed: number, fire: boolean) {
    this.pts.unshift(p.clone());
    if (this.pts.length > this.n) this.pts.pop();
    const target = speed > 12 || fire ? Math.min(1, (speed - 8) / 10) : 0;
    this.mat.opacity += (target - this.mat.opacity) * 0.2;
    this.mat.color.set(fire ? 0xff8a2a : 0xffffff);
    const pos = this.geo.attributes.position as THREE.BufferAttribute;
    const camPos = cam.position;
    for (let i = 0; i < this.n; i++) {
      const a = this.pts[Math.min(i, this.pts.length - 1)];
      const b = this.pts[Math.min(i + 1, this.pts.length - 1)];
      const dir = new THREE.Vector3().subVectors(a, b);
      const toCam = new THREE.Vector3().subVectors(camPos, a);
      const side = new THREE.Vector3().crossVectors(dir, toCam).normalize().multiplyScalar((fire ? 0.22 : 0.1) * (1 - i / this.n));
      pos.setXYZ(i * 2, a.x + side.x, a.y + side.y, a.z + side.z);
      pos.setXYZ(i * 2 + 1, a.x - side.x, a.y - side.y, a.z - side.z);
    }
    pos.needsUpdate = true;
  }
  reset() { this.pts = []; this.mat.opacity = 0; }
}

/** Coleção de efeitos usados na partida. */
export class FX {
  dust: Particles; sparks: Particles; stars: Particles; fire: Particles; smoke: Particles; confetti: Particles; boom: Particles; ring: Particles;
  footprints: Footprints;
  group = new THREE.Group();
  constructor() {
    const T = (u: string) => assets.tex(u);
    this.dust = new Particles(T('vfx/puff_5x5.png'), 5, 5, 260, false);
    this.smoke = new Particles(T('vfx/smoke_04.png'), 1, 1, 60, false);
    this.sparks = new Particles(T('vfx/spark_04.png'), 1, 1, 240, true);
    this.stars = new Particles(T('vfx/star_06.png'), 1, 1, 120, true);
    this.fire = new Particles(T('vfx/flame_04.png'), 1, 1, 260, true);
    this.confetti = new Particles(T('vfx/confetti.png'), 4, 1, 500, false);
    this.boom = new Particles(T('vfx/explosion_3x3.png'), 3, 3, 12, true);
    this.ring = new Particles(T('vfx/circle_05.png'), 1, 1, 20, true);
    this.footprints = new Footprints();
    for (const p of [this.dust, this.smoke, this.sparks, this.stars, this.fire, this.confetti, this.boom, this.ring]) this.group.add(p.mesh);
    this.group.add(this.footprints.mesh);
  }
  update(dt: number) {
    for (const p of [this.dust, this.smoke, this.sparks, this.stars, this.fire, this.confetti, this.boom, this.ring]) p.update(dt);
    this.footprints.update(dt);
  }
  clear() { for (const p of [this.dust, this.smoke, this.sparks, this.stars, this.fire, this.confetti, this.boom, this.ring]) p.clear(); }

  sandPuff(pos: THREE.Vector3, n = 3, power = 1, color = 0xf0d6a8) {
    for (let i = 0; i < n; i++) {
      this.dust.emit({ pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.1, (Math.random() - 0.5) * 0.3)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 2 * power, (0.6 + Math.random()) * power, (Math.random() - 0.5) * 2 * power),
        life: 0.6 + Math.random() * 0.5, s0: 0.25 * power + 0.15, s1: 0.9 * power + 0.3, color, alpha: 0.75, grav: 1.5, drag: 2.5 });
    }
  }
  kickBurst(pos: THREE.Vector3, dir: THREE.Vector3, power: number, fire: boolean) {
    this.sandPuff(pos, Math.round(4 + power * 6), 0.8 + power);
    for (let i = 0; i < 6 + power * 10; i++) {
      const v = dir.clone().multiplyScalar(2 + Math.random() * 6 * power).add(new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4));
      this.stars.emit({ pos, vel: v, life: 0.35 + Math.random() * 0.3, s0: 0.35, s1: 0.05, color: fire ? 0xffa030 : 0xfff2b0, drag: 3 });
    }
    if (power > 0.75) this.ring.emit({ pos, life: 0.35, s0: 0.3, s1: 3.2, color: fire ? 0xff7a1a : 0xffffff, alpha: 0.8, vr: 0 });
    if (fire) {
      this.boom.emit({ pos, life: 0.5, s0: 1.2, s1: 2.6, alpha: 1 });
    }
  }
  fireTrail(pos: THREE.Vector3) {
    this.fire.emit({ pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1)),
      vel: new THREE.Vector3(0, 0.8, 0), life: 0.35, s0: 0.55, s1: 0.1, color: Math.random() < 0.5 ? 0xff7a1a : 0xffd23a, alpha: 0.9 });
  }
  auraSparks(pos: THREE.Vector3) {
    this.sparks.emit({ pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 1.6, (Math.random() - 0.5) * 0.8)),
      vel: new THREE.Vector3(0, 1.5 + Math.random(), 0), life: 0.5, s0: 0.3, s1: 0.05, color: 0x8fd8ff, alpha: 1 });
  }
  confettiBurst(center: THREE.Vector3, n = 200, spread = 8) {
    for (let i = 0; i < n; i++) {
      this.confetti.emit({ pos: center.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, 6 + Math.random() * 4, (Math.random() - 0.5) * spread)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3), life: 3 + Math.random() * 2,
        s0: 0.22, s1: 0.18, color: 0xffffff, grav: 2.2, drag: 1.4, vr: (Math.random() - 0.5) * 12, floor: true });
    }
  }
}
