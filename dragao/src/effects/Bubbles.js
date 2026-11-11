import * as THREE from 'three';
import { NOISE, GLOBAL } from './glsl.js';
import { rng, clamp } from '../core/util.js';

// Soap-bubble shader: thin-film iridescence (hue shifts with view angle + swirling
// film thickness), fresnel opacity, fake twin specular highlights and an
// elastic vertex wobble. Works for single meshes and for instanced fields.
const BUBBLE_VERT = `
  uniform float uTime, uWobble; attribute float aSeed; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vSeed;
  ${NOISE}
  void main(){
    float sd = 0.0;
    #ifdef USE_INSTANCING
      sd = aSeed;
    #endif
    vSeed = sd;
    vec3 p = position;
    float w = (vnoise(p * 2.2 + vec3(uTime * 1.3 + sd * 10.0)) - 0.5) * uWobble + sin(p.y * 3.0 + uTime * 5.0 + sd * 20.0) * uWobble * 0.25;
    p += normal * w;
    vP = position;
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
    vec4 wp = m * vec4(p, 1.0);
    vN = normalize(mat3(m) * normal); vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const BUBBLE_FRAG = `
  uniform float uTime, uAlpha, uTint; uniform vec3 uTintColor; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vSeed;
  ${NOISE}
  void main(){
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    float c = clamp(abs(dot(n, vV)), 0.0, 1.0);
    float fr = pow(1.0 - c, 2.2);
    float film = fbm(vP * 1.6 + vec3(0.0, uTime * 0.35, vSeed * 7.0)) * 1.4 + (1.0 - c) * 1.2 + vP.y * 0.4;
    vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (film + vec3(0.0, 0.33, 0.67)));
    vec3 col = mix(vec3(1.0), rainbow, 0.75) * (0.35 + fr * 1.4);
    vec3 L1 = normalize(vec3(-0.5, 0.7, 0.6)), L2 = normalize(vec3(0.6, -0.3, 0.7));
    vec3 R = reflect(-vV, n);
    float s1 = pow(max(dot(R, L1), 0.0), 120.0) * 3.0, s2 = pow(max(dot(R, L2), 0.0), 40.0) * 0.6;
    col += vec3(1.0) * (s1 + s2);
    col = mix(col, uTintColor, uTint * 0.4);
    float a = clamp(0.07 + fr * 0.75 + s1, 0.0, 1.0) * uAlpha;
    gl_FragColor = vec4(col, a);
  }`;

export function bubbleMaterial(uniforms) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader: BUBBLE_VERT, fragmentShader: BUBBLE_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });
}

export class Bubble {
  constructor({ radius = 1 } = {}) {
    this.uniforms = { uTime: { value: 0 }, uWobble: { value: 0.06 }, uAlpha: { value: 1 }, uTint: { value: 0 }, uTintColor: { value: new THREE.Color(0x9fe0ff) } };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), bubbleMaterial(this.uniforms));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; this.radius = radius;
    this.pop = new PopBurst(); this.mesh.visible = false;
  }
  // r = radius, squash = elastic deformation (1 = round), popK = 0..1 pop progress
  set(pos, r, t, { wobble = 0.06, squash = 1, alpha = 1, tint = 0, popT = null } = {}) {
    this.mesh.position.copy(pos); this.mesh.scale.set(r / Math.sqrt(squash), r * squash, r / Math.sqrt(squash));
    this.uniforms.uTime.value = t; this.uniforms.uWobble.value = wobble; this.uniforms.uAlpha.value = alpha; this.uniforms.uTint.value = tint;
    const popped = popT != null && t >= popT;
    this.mesh.visible = r > 0.001 && alpha > 0.001 && !popped;
    this.pop.set(pos, r, popT == null ? -1 : t - popT);
  }
}

// droplets + ring flash when a bubble pops (closed-form ballistic)
export class PopBurst {
  constructor(n = 70, seed = 3) {
    const r = rng(seed), dir = new Float32Array(n * 3), sp = new Float32Array(n);
    for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * 6.283, k = Math.sqrt(1 - u * u); dir.set([Math.cos(a) * k, u, Math.sin(a) * k], i * 3); sp[i] = 0.6 + r() * 0.8; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dir, 3)); g.setAttribute('aSp', new THREE.BufferAttribute(sp, 1));
    this.u = { uAge: { value: -1 }, uR: { value: 1 }, uScale: GLOBAL.uScale };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uAge, uR, uScale; attribute float aSp; varying float vA;
        void main(){ float a = max(uAge, 0.0); vec3 p = position * uR * (1.0 + a * aSp * 3.0) + vec3(0.0, -2.5 * a * a * uR, 0.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uR * 0.12 * uScale * projectionMatrix[1][1] / -mv.z; vA = 1.0 - smoothstep(0.0, 0.45, a); }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.85, 0.95, 1.0), smoothstep(0.5, 0.1, d) * vA); }` }));
    this.points.frustumCulled = false; this.points.visible = false;
  }
  set(pos, r, age) { this.points.position.copy(pos); this.u.uAge.value = age; this.u.uR.value = r; this.points.visible = age >= 0 && age < 0.5; }
}

// Hundreds of bubbles (sneeze, hiccups, celebration). Closed-form flight per
// bubble: exponential drag on the launch velocity + buoyancy + lateral wobble,
// then a pop (scale → 0) at the end of its life.
export class BubbleField {
  constructor(count = 400, seed = 5) {
    this.count = count; this.data = []; this.r = rng(seed);
    this.uniforms = { uTime: { value: 0 }, uWobble: { value: 0.08 }, uAlpha: { value: 1 }, uTint: { value: 0 }, uTintColor: { value: new THREE.Color(0xffffff) } };
    const g = new THREE.SphereGeometry(1, 20, 14);
    const seeds = new Float32Array(count); for (let i = 0; i < count; i++) seeds[i] = this.r();
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    this.mesh = new THREE.InstancedMesh(g, bubbleMaterial(this.uniforms), count);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; this.used = 0;
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
  }
  // emit n bubbles from origin with direction cone
  emit({ n, t0, t1 = t0, origin, dir = [0, 0, 1], speed = 4, spread = 0.6, size = [0.05, 0.2], life = [2, 4], drag = 1.5, lift = 0.4 }) {
    const r = this.r;
    for (let i = 0; i < n && this.used < this.count; i++) {
      const d = new THREE.Vector3(dir[0] + (r() - 0.5) * spread * 2, dir[1] + (r() - 0.5) * spread * 2, dir[2] + (r() - 0.5) * spread * 2).normalize().multiplyScalar(speed * (0.4 + r() * 0.8));
      this.data[this.used++] = { o: Array.isArray(origin) ? origin : origin.toArray(), v: d.toArray(), t: t0 + (t1 - t0) * r(), s: size[0] + (size[1] - size[0]) * Math.pow(r(), 2), life: life[0] + (life[1] - life[0]) * r(), drag, lift: lift * (0.6 + r() * 0.8), ph: r() * 10 };
    }
  }
  update(t) {
    const { _m, _p, _q, _s } = this; this.uniforms.uTime.value = t; let shown = 0;
    for (let i = 0; i < this.count; i++) {
      const d = this.data[i]; const tau = d ? t - d.t : -1;
      if (!d || tau < 0 || tau > d.life) { _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, _m); continue; }
      const f = (1 - Math.exp(-d.drag * tau)) / d.drag;
      _p.set(d.o[0] + d.v[0] * f + Math.sin(tau * 2.3 + d.ph) * 0.15 * tau, d.o[1] + d.v[1] * f + d.lift * tau, d.o[2] + d.v[2] * f + Math.cos(tau * 1.9 + d.ph) * 0.15 * tau);
      const grow = clamp(tau / 0.25), popk = clamp((tau - (d.life - 0.08)) / 0.08);
      const sc = d.s * (0.3 + 0.7 * (1 - Math.pow(1 - grow, 3))) * (1 + popk * 0.4) * (popk >= 1 ? 0 : 1);
      _s.set(sc, sc * (1 + Math.sin(tau * 9 + d.ph) * 0.06), sc); _m.compose(_p, _q, _s); this.mesh.setMatrixAt(i, _m); shown++;
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.visible = shown > 0;
  }
}
