import * as THREE from 'three';
import { rng, TAU } from '../timeline/util.js';
import { makePlanet } from './islands.js';
import { PX } from '../particles/particles.js';

const NOISE = /* glsl */`float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*noise(p); p = p*2.07 + 3.1; a *= 0.5; } return s; }`;
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const flowerFrag = /* glsl */`precision highp float; uniform float uTime, uK, uSeed; uniform vec3 uA, uB; varying vec2 vUv; ${NOISE}
  void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x);
    float pet = 0.55 + 0.3 * cos(a * (5.0 + floor(uSeed * 4.0)) + uSeed * 9.0 + fbm(p * 2.0 + uSeed) * 2.5);                   // pétalas
    float body = smoothstep(pet * uK, pet * uK * 0.2, r); float n = fbm(p * 3.0 + uSeed * 7.0 + uTime * 0.03) * fbm(vec2(a * 2.0, r * 4.0 - uTime * 0.1) + uSeed);
    vec3 col = mix(uA, uB, smoothstep(0.0, 0.8, r / max(uK, 0.01))) * (0.25 + n * 2.6) * body + vec3(1.0, 0.95, 0.8) * smoothstep(0.12 * uK, 0.0, r) * 1.5;
    gl_FragColor = vec4(col * uK, 1.0); }`;
const shellFrag = /* glsl */`precision highp float; uniform float uK; uniform vec3 uCol; varying vec3 vN; varying vec3 vV;
  void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0); gl_FragColor = vec4(uCol * f * (1.0 - uK) * 1.6, 1.0); }`;
export const EARTH = new THREE.Vector3(0, -600, -10800);
export const GATE = 62;

/** O vazio que desperta: planetas apagados, flores de nebulosa, ondas de energia, corredor de constelações e a Terra. */
export class Cosmos {
  constructor() {
    const g = (this.group = new THREE.Group()), r = rng(1717);
    const pal = [[0xff9a6a, 0x9a4a8a], [0x6ab8ff, 0x2a4a9a], [0xc890ff, 0x5a2a8a], [0x7ae0c8, 0x2a7a6a], [0xffd27a, 0xc86a2a]];
    this.planets = [...Array(30)].map((_, i) => { const [a, b] = pal[i % 5], R = 7 + Math.pow(r(), 2) * 50, p = makePlanet(R, a, b, a);
      const th = r() * TAU, d = 90 + r() * 420; p.position.set(Math.cos(th) * d, (r() - 0.5) * 320, Math.sin(th) * d * 0.9 - 60); p.userData.d = p.position.length(); g.add(p); return p; });
    this.flowers = [...Array(12)].map((_, i) => { const u = { uTime: { value: 0 }, uK: { value: 0 }, uSeed: { value: r() }, uA: { value: new THREE.Color([0xffb050, 0x50b0ff, 0xff60c0, 0x9060ff][i % 4]) }, uB: { value: new THREE.Color([0xff5090, 0x8050ff, 0xffc050, 0x40e0d0][i % 4]) } };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: flowerFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      const th = (i / 12) * TAU + r(), d = 900 + r() * 500; m.position.set(Math.cos(th) * d, (r() - 0.5) * 900, Math.sin(th) * d - 200); m.scale.setScalar(500 + r() * 500); m.userData = { u, delay: r() }; m.renderOrder = -5; g.add(m); return m; });
    this.shells = [0xffd27a, 0x9fd8ff, 0xffb0e0].map((c) => { const u = { uK: { value: 0 }, uCol: { value: new THREE.Color(c) } };
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
        vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: shellFrag })); m.userData.u = u; m.visible = false; g.add(m); return m; });
    // corredor de constelações: portais de estrelas ligadas por linhas, ao longo de -Z
    const lp = [], li = [], pp = [], pi = [], N = 30;
    for (let i = 0; i < N; i++) { const z = -i * GATE, n = 7 + (i % 3), rad = 34 + (i % 4) * 5, rot = i * 0.4, pts = [];
      for (let k = 0; k < n; k++) { const a = k / n * TAU + rot, rr = rad * (0.82 + r() * 0.36); pts.push([Math.cos(a) * rr, Math.sin(a) * rr, z + (r() - 0.5) * 16]); }
      for (let k = 0; k < n; k++) { const a = pts[k], b = pts[(k + 1) % n]; lp.push(...a, ...b); li.push(i, i); pp.push(...a); pi.push(i); if (k % 3 === 0) { const c = pts[(k + 3) % n]; lp.push(...a, ...c); li.push(i, i); } }
      for (let k = 0; k < 26; k++) { const a = r() * TAU, rr = rad * (1.1 + r() * 2.2); pp.push(Math.cos(a) * rr, Math.sin(a) * rr, z + (r() - 0.5) * GATE); pi.push(i + 0.5); } }
    this.gateU = { uReveal: { value: 0 }, uPx: PX, uTime: { value: 0 } };
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('aI', new THREE.Float32BufferAttribute(li, 1));
    this.gateLines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({ uniforms: this.gateU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: 'attribute float aI; uniform float uReveal; varying float vA; void main(){ vA = smoothstep(0.0, 2.0, uReveal - aI); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(vec3(0.55, 0.8, 1.0) * vA * 1.1, 1.0); }' }));
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); pg.setAttribute('aI', new THREE.Float32BufferAttribute(pi, 1));
    this.gatePts = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: this.gateU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: 'attribute float aI; uniform float uReveal, uPx, uTime; varying float vA; void main(){ vA = smoothstep(0.0, 1.5, uReveal - aI) * (0.7 + 0.3 * sin(uTime * 4.0 + aI * 9.0)); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.5, (fract(aI) > 0.25 ? 0.7 : 2.2) * uPx * 2.4 / -mv.z) * step(0.001, vA); }',
      fragmentShader: 'varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if (d > 0.5) discard; float a = smoothstep(0.5, 0.0, d); a = a * a + smoothstep(0.12, 0.0, d); gl_FragColor = vec4(vec3(1.0, 0.9, 0.7) * a * vA * 1.6, 1.0); }' }));
    this.gateLines.frustumCulled = this.gatePts.frustumCulled = false; g.add(this.gateLines, this.gatePts);
    // a Terra
    this.earth = makePlanet(1100, 0x1f6fd8, 0x3fae6a, 0x8fd0ff); this.earth.position.copy(EARTH); this.earth.userData.u.uEarth.value = 1; g.add(this.earth);
  }
  /** wave: raio da onda de energia a partir da origem; bloom 0..1: nebulosas florescem; reveal: portais visíveis; dawn 0..1: a luz chega à Terra. */
  update(t, o = {}) {
    const wave = o.wave ?? 0; for (const p of this.planets) p.visible = !o.onlyEarth;
    for (const p of this.planets) { const u = p.userData.u; u.uAwake.value = THREE.MathUtils.smoothstep(wave - p.userData.d, 0, 60); u.uTime.value = t; u.uSun.value.copy(p.position).multiplyScalar(-1).normalize().add(new THREE.Vector3(0.2, 0.5, 0.3)); p.rotation.y = t * 0.05; }
    for (const f of this.flowers) { f.userData.u.uK.value = THREE.MathUtils.smoothstep((o.bloom ?? 0) * 1.5 - f.userData.delay * 0.5, 0, 1); f.userData.u.uTime.value = t; f.visible = f.userData.u.uK.value > 0.01; if (o.cam) f.lookAt(o.cam); }
    this.shells.forEach((s, i) => { const k = (o.shells?.[i] ?? -1); s.visible = k > 0 && k < 1; if (s.visible) { s.scale.setScalar(k * (o.shellR ?? 600)); s.userData.u.uK.value = k; s.position.copy(o.origin ?? s.position); } });
    this.gateU.uReveal.value = o.reveal ?? 0; this.gateU.uTime.value = t; this.gateLines.visible = this.gatePts.visible = (o.reveal ?? 0) > 0;
    const eu = this.earth.userData.u, dk = o.dawn ?? 0; eu.uTime.value = t; eu.uAwake.value = 0.25 + 0.75 * dk; eu.uSun.value.set(0.3, 0.5 + dk * 0.2, 1.0 - 1.6 * (1 - dk)).normalize(); this.earth.rotation.y = t * 0.02; this.earth.visible = o.earth ?? false;
  }
}
