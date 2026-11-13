import * as THREE from 'three';
import { TAU } from '../timeline/util.js';
import { Trail } from '../particles/trail.js';

// ASTRA — a baleia celestial. 260 m de comprimento (Kaito tem 1,7 m): corpo azul translúcido, constelações
// sob a pele, barbatanas de energia. O nado é uma onda que percorre a coluna, calculada no vertex shader.
export const ASTRA = { L: 260, W: 34, H: 27 };
const shape = (u) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(1 - u, 0.62))), 0.55);
const BEND = `float bendY(float u, float ph){ return sin(u * 3.2 - ph) * ${(0.06 * ASTRA.L).toFixed(2)} * pow(1.0 - u, 1.6); }`;
export const bendY = (u, ph) => Math.sin(u * 3.2 - ph) * 0.06 * ASTRA.L * Math.pow(1 - u, 1.6);

const skinVert = /* glsl */`
  uniform float uPhase; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vFog;
  ${BEND}
  void main(){ vUv = uv; vec3 p = position; p.y += bendY(uv.x, uPhase);
    vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vFog = -mv.z; gl_Position = projectionMatrix * mv; }`;
const skinFrag = /* glsl */`
  precision highp float;
  uniform float uTime, uGlow, uAlpha; uniform vec3 fogColor; uniform float fogDensity, uFogK;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vFog;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  vec2 star(vec2 id){ return id + 0.2 + 0.6 * vec2(hash(id), hash(id + 9.7)); }
  float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
  void main(){
    float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.2);
    float belly = smoothstep(0.62, 0.86, abs(vUv.y - 0.5) * 2.0);                         // v = 0.5 é o dorso
    vec3 col = mix(vec3(0.015, 0.06, 0.2), vec3(0.05, 0.22, 0.55), belly * 0.7 + 0.15);
    col += vec3(0.06, 0.2, 0.42) * belly * smoothstep(0.35, 0.5, abs(fract(vUv.y * 46.0) - 0.5)) * smoothstep(0.35, 0.9, vUv.x);   // sulcos do ventre
    col = mix(col, vec3(0.25, 0.7, 1.0), fres * 0.75);
    // constelações sob a pele: uma estrela por célula, ligadas às vizinhas
    vec2 g = vec2(vUv.x * 13.0, vUv.y * 9.0); vec2 id = floor(g); float st = 0.0, ln = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 c = id + vec2(float(x), float(y)); vec2 s = star(c); float h = hash(c + 3.3);
      float tw = 0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 30.0);
      st += smoothstep(0.11, 0.0, length(g - s)) * tw + smoothstep(0.34, 0.0, length(g - s)) * 0.18;
      if (h > 0.4) ln += smoothstep(0.035, 0.0, seg(g, s, star(c + vec2(1.0, 0.0))));
      if (h < 0.5) ln += smoothstep(0.035, 0.0, seg(g, s, star(c + vec2(0.0, 1.0))));
    }
    float body = smoothstep(0.02, 0.1, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
    vec3 light = (vec3(1.0, 0.92, 0.7) * st * 2.6 + vec3(0.5, 0.8, 1.0) * ln * 0.7) * uGlow * body;
    col += light; col += vec3(0.1, 0.3, 0.7) * 0.25 * (0.5 + 0.5 * sin(vUv.x * 30.0 - uTime * 1.5)) * fres;
    float a = clamp(0.6 + fres * 0.35 + st + ln * 0.3, 0.0, 1.0) * uAlpha;
    float f = 1.0 - exp(-fogDensity * fogDensity * vFog * vFog * uFogK);
    gl_FragColor = vec4(mix(col, fogColor, f * 0.85), a);
  }`;
const finFrag = /* glsl */`
  precision highp float; uniform float uTime, uGlow; uniform vec3 uColA, uColB; varying vec2 vUv;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  void main(){
    float flow = noise(vec2(vUv.x * 5.0 - uTime * 0.9, vUv.y * 14.0)) * 0.6 + noise(vec2(vUv.x * 12.0 - uTime * 1.6, vUv.y * 30.0)) * 0.4;
    float ribs = smoothstep(0.3, 0.5, abs(fract(vUv.y * 9.0 + flow * 0.3) - 0.5));
    float a = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.55, 1.0, vUv.x)) * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    a *= 0.35 + 0.65 * flow + (1.0 - ribs) * 0.5;
    gl_FragColor = vec4(mix(uColA, uColB, vUv.x + flow * 0.3) * a * uGlow * 1.7, a);
  }`;

export class Astra {
  constructor() {
    const g = (this.group = new THREE.Group()), { L, W, H } = ASTRA, NU = 64, NV = 28; g.rotation.order = 'YXZ';
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= NU; i++) { const u = i / NU, s = shape(u), z = (u - 0.5) * L;
      for (let k = 0; k <= NV; k++) { const v = k / NV, a = (v - 0.5) * TAU, flat = Math.cos(a) < 0 ? 0.82 : 1;      // v = 0.5 → topo
        pos.push(Math.sin(a) * W * 0.5 * s, Math.cos(a) * H * 0.5 * s * flat - (1 - s) * 2, z); uv.push(u, v); } }
    for (let i = 0; i < NU; i++) for (let k = 0; k < NV; k++) { const a = i * (NV + 1) + k, b = a + NV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    this.u = { uPhase: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 1 }, uAlpha: { value: 1 }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0.001 }, uFogK: { value: 1 } };
    this.body = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: skinVert, fragmentShader: skinFrag, transparent: true, depthWrite: true })); this.body.frustumCulled = false; g.add(this.body);
    // cauda: duas lâminas com a mesma pele
    const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.bezierCurveTo(14, 4, 34, -6, 46, -26); fl.bezierCurveTo(30, -18, 14, -16, 0, -12); fl.closePath();
    const fgeo = new THREE.ShapeGeometry(fl, 8); fgeo.rotateX(Math.PI / 2); const fuv = fgeo.attributes.uv; for (let i = 0; i < fuv.count; i++) fuv.setXY(i, 0.3 + fuv.getX(i) * 0.004, 0.5 + fuv.getY(i) * 0.004);
    const flukeMat = new THREE.ShaderMaterial({ uniforms: { ...this.u, uPhase: { value: 0 } }, vertexShader: skinVert.replace('p.y += bendY(uv.x, uPhase);', ''), fragmentShader: skinFrag, transparent: true, side: THREE.DoubleSide });
    this.tail = new THREE.Group(); g.add(this.tail);
    for (const sx of [1, -1]) { const m = new THREE.Mesh(fgeo, flukeMat); m.scale.x = sx; m.frustumCulled = false; this.tail.add(m); }
    // barbatanas de energia
    this.finU = { uTime: { value: 0 }, uGlow: { value: 1 }, uColA: { value: new THREE.Color(0x40d8ff) }, uColB: { value: new THREE.Color(0x9a70ff) } };
    const finMat = new THREE.ShaderMaterial({ uniforms: this.finU, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: finFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false });
    this.fins = [];
    for (const sx of [1, -1]) {
      const fg = new THREE.PlaneGeometry(78, 30, 12, 4); fg.translate(39, 0, 0); const p = fg.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 78; p.setY(i, p.getY(i) * (1 - x * 0.75) - x * x * 16); p.setZ(i, -x * x * 30); }
      const pivot = new THREE.Group(); pivot.position.set(sx * W * 0.42, -H * 0.2, L * 0.16); pivot.scale.x = sx; const m = new THREE.Mesh(fg, finMat); m.rotation.x = -Math.PI / 2; m.frustumCulled = false; pivot.add(m); g.add(pivot); this.fins.push(pivot);
    }
    // crista dorsal de energia e olhos
    const dg = new THREE.PlaneGeometry(90, 14, 10, 2); const dp = dg.attributes.position; for (let i = 0; i < dp.count; i++) { const x = dp.getX(i) / 90 + 0.5; dp.setY(i, (dp.getY(i) + 7) * Math.sin(x * Math.PI)); }
    this.dorsal = new THREE.Mesh(dg, finMat); this.dorsal.rotation.y = Math.PI / 2; this.dorsal.position.set(0, H * 0.46, -L * 0.02); this.dorsal.frustumCulled = false; g.add(this.dorsal);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xbff4ff, toneMapped: false });
    for (const sx of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), eyeM); e.position.set(sx * W * 0.37, -1.5, L * 0.31); g.add(e); }
    // rastro de estrelas deixado pelas barbatanas
    this.wake = new Trail(1100, { color: 0x9fdcff, color2: 0xfff0c0, size: 1.6, life: 11, spread: 46, drift: [0, 1.2, 0], gain: 1.5 }, 91);
    this.v = new THREE.Vector3();
  }
  /** ponto sobre o dorso onde Kaito viaja (coordenadas locais → mundo). */
  backPoint(out, u = 0.7, phase = this.u.uPhase.value) { out.set(0, ASTRA.H * 0.5 * shape(u) - (1 - shape(u)) * 2 + bendY(u, phase) - 0.25, (u - 0.5) * ASTRA.L); return this.group.localToWorld(out); }
  /** t: tempo; path(time, out): trajetória do centro do corpo (para o rastro); glow: brilho das constelações. */
  update(t, o = {}) {
    const ph = t * (o.speed ?? 0.9); this.u.uPhase.value = ph; this.u.uTime.value = t; this.finU.uTime.value = t; this.u.uGlow.value = o.glow ?? 1; this.finU.uGlow.value = o.fins ?? 1; this.u.uAlpha.value = o.alpha ?? 1; this.u.uFogK.value = o.fogK ?? 1;
    if (o.fog) { this.u.fogColor.value.copy(o.fog.color); this.u.fogDensity.value = o.fog.density; }
    this.tail.position.set(0, bendY(0.03, ph) - 1, (0.03 - 0.5) * ASTRA.L); this.tail.rotation.x = Math.cos(0.03 * 3.2 - ph) * 0.45;
    this.fins.forEach((f, i) => { f.rotation.z = (i ? -1 : 1) * (Math.sin(ph * 1.0 + 0.6) * 0.3 - 0.12); f.rotation.x = Math.sin(ph + 1.4) * 0.12; });
    this.group.updateMatrixWorld();
    if (o.path) this.wake.update(t, o.path, 1.6, o.wake ?? 1); else this.wake.points.visible = false;
    this.group.visible = true;
  }
  hide() { this.group.visible = false; this.wake.points.visible = false; }
}
