import * as THREE from 'three';
import { rng, TAU } from '../timeline/util.js';
import { CloudSea } from './islands.js';
import { patchDissolve } from '../shaders/dissolve.js';
import { PX } from '../particles/particles.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const NOISE = /* glsl */`float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*noise(p); p = p*2.07 + 3.1; a *= 0.5; } return s; }`;

export const SPHERE = { c: new THREE.Vector3(0, 60, 520), r: 300 };
export const CITY = new THREE.Vector3(0, 20, 600);

const seaFrag = /* glsl */`precision highp float; uniform float uTime; uniform vec3 uDeep, uSky, uSun; varying vec3 vW; varying float vD; ${NOISE}
  void main(){ vec2 p = vW.xz * 0.012; float e = 0.15;
    float h = fbm(p + uTime * 0.05), hx = fbm(p + vec2(e, 0.0) + uTime * 0.05), hz = fbm(p + vec2(0.0, e) + uTime * 0.05);
    vec3 n = normalize(vec3((h - hx) * 5.0, 1.0, (h - hz) * 5.0)); vec3 v = normalize(cameraPosition - vW);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 col = mix(uDeep, uSky, clamp(fres + 0.12, 0.0, 1.0)); col += uSun * pow(max(dot(reflect(-v, n), normalize(vec3(0.3, 0.6, 0.7))), 0.0), 60.0) * 1.5;
    col += vec3(0.4, 0.9, 1.0) * smoothstep(0.62, 0.7, fbm(p * 3.0 - uTime * 0.03)) * 0.25;                    // veios luminosos
    float edge = 1.0 - smoothstep(1150.0, 1400.0, length(vW.xz));
    gl_FragColor = vec4(col, (0.86 + fres * 0.14) * edge * (1.0 - smoothstep(2500.0, 3600.0, vD))); }`;
const sphereFrag = /* glsl */`precision highp float; uniform float uTime, uInside; uniform vec3 uDeep, uRim; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${NOISE}
  void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0); vec3 v = normalize(vV);
    float fres = pow(1.0 - abs(dot(n, v)), 2.0);
    vec2 q = vec2(atan(vP.z, vP.x) * 3.0, vP.y * 5.0); float c1 = fbm(q * 2.0 + uTime * 0.12), c2 = fbm(q * 4.0 - uTime * 0.17);
    float caust = smoothstep(0.05, 0.0, abs(c1 - c2)) ;                                                       // linhas de cáustica
    vec3 col = mix(uDeep, uRim, fres) + vec3(0.6, 0.95, 1.0) * caust * (0.35 + 0.65 * fres);
    float a = mix(0.5 + fres * 0.45 + caust * 0.3, 0.12 + caust * 0.2 + fres * 0.3, uInside);
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0)); }`;

/** O oceano suspenso no céu, a esfera de água flutuante e a cidade antiga submersa. */
export class SkyOcean {
  constructor() {
    const g = (this.group = new THREE.Group()), r = rng(515), d = new THREE.Object3D(), C = SPHERE.c, R = SPHERE.r;
    this.sea = new CloudSea(-260, 40); g.add(this.sea.group);
    this.seaU = { uTime: { value: 0 }, uDeep: { value: new THREE.Color(0x0a3f78) }, uSky: { value: new THREE.Color() }, uSun: { value: new THREE.Color() } };
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000, 1, 1), new THREE.ShaderMaterial({ uniforms: this.seaU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vD = distance(w.xyz, cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: seaFrag }));
    surf.rotation.x = -Math.PI / 2; surf.position.set(0, -20, -200); surf.renderOrder = 3; g.add(surf); this.surface = surf;
    // a esfera de água
    this.sphU = { uTime: { value: 0 }, uInside: { value: 0 }, uDeep: { value: new THREE.Color(0x0b4a68) }, uRim: { value: new THREE.Color(0x7fe4ff) } };
    this.sphere = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), new THREE.ShaderMaterial({ uniforms: this.sphU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: sphereFrag }));
    this.sphere.position.copy(C); this.sphere.renderOrder = 6; g.add(this.sphere);
    // ruínas submersas: colunas, arcos e blocos ao longo do caminho da baleia
    const stone = std(0x4f7088, { roughness: 0.9, flatShading: true });
    const cols = new THREE.InstancedMesh(new THREE.CylinderGeometry(3.2, 3.8, 1, 8), stone, 90), arcs = new THREE.InstancedMesh(new THREE.TorusGeometry(16, 2.4, 6, 14, Math.PI), stone, 22), blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stone, 70);
    for (let i = 0; i < 90; i++) { const k = i / 90, side = i % 2 ? 1 : -1, z = C.z - 250 + k * 330, x = side * (48 + r() * 60) + Math.sin(k * 5) * 20, h = 30 + r() * 80, y = C.y - 150 + r() * 60;
      d.position.set(x, y + h / 2, z); d.rotation.set((r() - 0.5) * 0.25, r() * 3, (r() - 0.5) * 0.25); d.scale.set(1, h, 1); d.updateMatrix(); cols.setMatrixAt(i, d.matrix); }
    for (let i = 0; i < 22; i++) { const k = i / 22, z = C.z - 240 + k * 300; d.position.set(Math.sin(k * 7) * 30, C.y - 70 + Math.sin(k * 9) * 30, z); d.rotation.set(0, (r() - 0.5) * 0.6, (r() - 0.5) * 0.5); d.scale.setScalar(2.4 + r() * 2.2); d.updateMatrix(); arcs.setMatrixAt(i, d.matrix); }
    for (let i = 0; i < 70; i++) { const a = r() * TAU, rr = 60 + r() * 190; d.position.set(Math.cos(a) * rr, C.y - 170 + r() * 300, C.z - 200 + r() * 330); d.rotation.set(r() * 3, r() * 3, r() * 3); d.scale.set(6 + r() * 16, 4 + r() * 10, 6 + r() * 14); d.updateMatrix(); blocks.setMatrixAt(i, d.matrix); }
    g.add(cols, arcs, blocks);
    // árvores cristalinas
    this.crystalMat = std(0x7ff0ff, { emissive: 0x30c8e8, emissiveIntensity: 0.9, flatShading: true, roughness: 0.25, metalness: 0.3 });
    const cry = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), this.crystalMat, 260);
    for (let i = 0; i < 260; i++) { const tree = Math.floor(i / 10), tr = rng(tree * 13 + 5), a = tr() * TAU, rr = 40 + tr() * 170, bx = Math.cos(a) * rr, bz = C.z - 220 + tr() * 330, by = C.y - 160 + tr() * 120, k = (i % 10) / 10;
      d.position.set(bx + (r() - 0.5) * 14 * k, by + k * 46, bz + (r() - 0.5) * 14 * k); d.rotation.set((r() - 0.5) * 1.2, r() * 3, (r() - 0.5) * 1.2); d.scale.set(1.6 + r() * 2.4, (i % 10 === 0 ? 24 : 5 + r() * 9), 1.6 + r() * 2.4); d.updateMatrix(); cry.setMatrixAt(i, d.matrix); }
    g.add(cry);
    // águas-vivas luminosas (sino + tentáculos), pulsando
    const bell = new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI * 0.55); const jg = [bell];
    this.jellyMat = new THREE.MeshBasicMaterial({ color: 0xc890ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    this.jelly = new THREE.InstancedMesh(bell, this.jellyMat, 80); this.tent = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.02, 1, 4), this.jellyMat, 80 * 5);
    this.jd = [...Array(80)].map(() => ({ x: (r() - 0.5) * 360, y: C.y - 150 + r() * 300, z: C.z - 260 + r() * 400, s: 3 + r() * 6, ph: r() * TAU, sp: 0.6 + r() * 0.8 }));
    this.jelly.frustumCulled = this.tent.frustumCulled = false; this.jelly.boundingSphere = new THREE.Sphere(C.clone(), 400); this.tent.boundingSphere = new THREE.Sphere(C.clone(), 400); g.add(this.jelly, this.tent); this.d = d;
    // peixes luminosos
    const fg = new THREE.ConeGeometry(0.5, 2.2, 5); fg.rotateX(Math.PI / 2); const tg = new THREE.ConeGeometry(0.55, 0.9, 3); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -1.4);
    const fpos = [...fg.toNonIndexed().attributes.position.array, ...tg.toNonIndexed().attributes.position.array]; const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3)); fgeo.computeVertexNormals();
    this.fish = new THREE.InstancedMesh(fgeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 320); this.fish.frustumCulled = false; this.fish.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const fc = [new THREE.Color(0.5, 1.6, 2.0), new THREE.Color(2.0, 1.4, 0.5), new THREE.Color(1.8, 0.7, 1.6), new THREE.Color(0.6, 2.0, 1.2)];
    this.fd = [...Array(320)].map((_, i) => { this.fish.setColorAt(i, fc[i % 4]); return { school: i % 8, a: r() * TAU, rr: 0.5 + r(), h: r() - 0.5, s: 0.7 + r() * 1.4, sp: 0.7 + r() * 0.6 }; });
    // cidade antiga: torres que se desfazem
    this.cityDis = { uDissolve: { value: 0 }, uDisColor: { value: new THREE.Color(0xffd27a) }, uDisScale: { value: 0.09 } };
    const tw = patchDissolve(std(0x8fb0c8, { roughness: 0.7, flatShading: true, emissive: 0x3a90b0, emissiveIntensity: 0.9 }), this.cityDis), tip = patchDissolve(std(0xe0c070, { metalness: 0.7, roughness: 0.3, emissive: 0xc08a20, emissiveIntensity: 1.2 }), this.cityDis);
    this.city = new THREE.Group(); this.city.position.copy(CITY); g.add(this.city);
    const towers = []; const T = 54;
    const tm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.72, 1, 1, 8), tw, T), tt = new THREE.InstancedMesh(new THREE.ConeGeometry(1.25, 1, 8), tip, T), ring = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.25, 1.25, 0.06, 8), tip, T * 2);
    for (let i = 0; i < T; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * 95, h = 40 + r() * 110 * (1 - rr / 130), w = 5 + r() * 7, x = Math.cos(a) * rr, z = Math.sin(a) * rr * 0.7; towers.push([x, z, h, w]);
      d.rotation.set(0, r() * 3, 0); d.position.set(x, h / 2 - 40, z); d.scale.set(w, h, w); d.updateMatrix(); tm.setMatrixAt(i, d.matrix);
      d.position.set(x, h - 40 + w * 0.9, z); d.scale.set(w, w * 1.8, w); d.updateMatrix(); tt.setMatrixAt(i, d.matrix);
      for (let k = 0; k < 2; k++) { d.position.set(x, h * (0.45 + k * 0.3) - 40, z); d.scale.set(w * (0.95 - k * 0.1), h * 0.5, w * (0.95 - k * 0.1)); d.updateMatrix(); ring.setMatrixAt(i * 2 + k, d.matrix); } }
    const base = new THREE.Mesh(new THREE.ConeGeometry(120, 110, 12, 3), patchDissolve(std(0x3a5568, { flatShading: true }), this.cityDis)); base.rotation.x = Math.PI; base.position.y = -95; base.scale.z = 0.75;
    this.city.add(tm, tt, ring, base);
    // partículas: nascem nas torres e se reorganizam como uma constelação gigante
    const N = 7000, a0 = new Float32Array(N * 3), a1 = new Float32Array(N * 3), sd = new Float32Array(N);
    const nodes = [...Array(34)].map(() => { const a = r() * TAU, z = r() * 2 - 1, s = Math.sqrt(1 - z * z); return [Math.cos(a) * s * 150, z * 120 + 40, Math.sin(a) * s * 90]; });
    const edges = []; for (let i = 1; i < nodes.length; i++) { let b = 0, bd = 1e9; for (let j = 0; j < i; j++) { const dd = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1], nodes[i][2] - nodes[j][2]); if (dd < bd) { bd = dd; b = j; } } edges.push([i, b]); }
    for (let i = 0; i < N; i++) { const [x, z, h, w] = towers[Math.floor(r() * T)], a = r() * TAU; a0.set([x + Math.cos(a) * w * 0.8, r() * h - 40, z + Math.sin(a) * w * 0.8], i * 3);
      if (r() < 0.45) { const nd = nodes[Math.floor(r() * nodes.length)], q = Math.pow(r(), 2) * 9; a1.set([nd[0] + (r() - 0.5) * q, nd[1] + (r() - 0.5) * q, nd[2] + (r() - 0.5) * q], i * 3); }
      else { const [e0, e1] = edges[Math.floor(r() * edges.length)], k = r(); a1.set([nodes[e0][0] + (nodes[e1][0] - nodes[e0][0]) * k, nodes[e0][1] + (nodes[e1][1] - nodes[e0][1]) * k, nodes[e0][2] + (nodes[e1][2] - nodes[e0][2]) * k], i * 3); }
      sd[i] = r(); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(a0, 3)); pg.setAttribute('aEnd', new THREE.BufferAttribute(a1, 3)); pg.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
    this.morphU = { uK: { value: 0 }, uA: { value: 0 }, uTime: { value: 0 }, uPx: PX };
    this.morph = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: this.morphU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`attribute vec3 aEnd; attribute float aS; uniform float uK, uA, uTime, uPx; varying float vA; varying float vS;
        void main(){ float k = clamp(uK * 1.5 - aS * 0.5, 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);
          vec3 p = mix(position, aEnd, k); float sw = sin(k * 3.14159); p += vec3(sin(aS * 40.0 + uTime), cos(aS * 31.0 + uTime * 1.3), sin(aS * 17.0 - uTime)) * 26.0 * sw; p.y += sw * 30.0;
          vS = aS; vA = uA * (0.4 + 0.6 * sin(uTime * 3.0 + aS * 50.0) * sin(uTime * 3.0 + aS * 50.0));
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.0, (0.9 + aS * 1.6 + k * 1.2) * uPx * 2.4 / -mv.z) * step(0.001, uA); }`,
      fragmentShader: 'varying float vA; varying float vS; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if (d > 0.5) discard; float a = smoothstep(0.5, 0.0, d); a = a * a + smoothstep(0.12, 0.0, d); gl_FragColor = vec4(mix(vec3(1.0, 0.78, 0.4), vec3(0.6, 0.9, 1.0), vS) * a * vA * 1.3, 1.0); }' }));
    this.morph.frustumCulled = false; this.city.add(this.morph);
    this.v = new THREE.Vector3();
  }
  /** t: tempo; atmo; anchor: posição da baleia (os cardumes a acompanham); city 0..1: torres → constelação. */
  update(t, atmo, anchor, city = 0, camPos) {
    this.sea.update(t, atmo); this.seaU.uTime.value = t; this.seaU.uSky.value.copy(atmo.u.uLow.value).lerp(atmo.hemi.color, 0.4); this.seaU.uSun.value.copy(atmo.sun.color);
    const inside = camPos ? THREE.MathUtils.smoothstep(SPHERE.r - camPos.distanceTo(SPHERE.c), -5, 25) : 0;
    this.sphU.uTime.value = t; this.sphU.uInside.value = inside; this.inside = inside;
    const d = this.d;
    this.jd.forEach((j, i) => { const pulse = 0.5 + 0.5 * Math.sin(t * j.sp * 2 + j.ph), y = j.y + t * 1.5 * j.sp + Math.sin(t * 0.4 + j.ph) * 4;
      d.position.set(j.x + Math.sin(t * 0.2 + j.ph) * 5, y, j.z); d.rotation.set(Math.sin(t * 0.5 + j.ph) * 0.2, j.ph, 0); d.scale.set(j.s * (1.1 - pulse * 0.25), j.s * (0.75 + pulse * 0.35), j.s * (1.1 - pulse * 0.25)); d.updateMatrix(); this.jelly.setMatrixAt(i, d.matrix);
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, len = j.s * (2.2 + 0.6 * Math.sin(t * 1.5 + k + j.ph)); d.position.set(j.x + Math.sin(t * 0.2 + j.ph) * 5 + Math.cos(a) * j.s * 0.55, y - len / 2, j.z + Math.sin(a) * j.s * 0.55); d.rotation.set(Math.sin(t + k + j.ph) * 0.2, 0, Math.cos(t * 0.8 + k) * 0.2); d.scale.set(j.s * 1.5, len, j.s * 1.5); d.updateMatrix(); this.tent.setMatrixAt(i * 5 + k, d.matrix); } });
    this.jelly.instanceMatrix.needsUpdate = this.tent.instanceMatrix.needsUpdate = true;
    this.updateFish(t, anchor);
    this.cityDis.uDissolve.value = city * 1.08; this.morphU.uK.value = city; this.morphU.uA.value = Math.min(1, city * 6); this.morphU.uTime.value = t;
    this.crystalMat.emissiveIntensity = 0.8 + 0.3 * Math.sin(t * 1.7);
  }
  /** cardumes de peixes luminosos em redemoinho ao redor de um ponto (também usados no mundo renascido). */
  updateFish(t, anchor, scale = 1) {
    const d = this.d;
    this.fd.forEach((f, i) => {                                           // cardumes em redemoinho ao redor da baleia
      const sc = f.school, ca = sc * 0.785 + t * 0.07, cr = 70 + (sc % 3) * 45, cx = anchor.x + Math.cos(ca) * cr, cy = anchor.y + (sc % 4 - 1.5) * 26, cz = anchor.z + Math.sin(ca) * cr + (sc - 4) * 20;
      const a = f.a + t * f.sp * (sc % 2 ? 1 : -1) * 0.8, R = 8 + f.rr * 16;
      d.position.set(cx + Math.cos(a) * R, cy + f.h * 14 + Math.sin(a * 2 + f.a) * 2, cz + Math.sin(a) * R);
      d.rotation.set(0, -a + (sc % 2 ? 0 : Math.PI) + Math.sin(t * 9 * f.sp + f.a) * 0.25, 0); d.scale.setScalar(f.s * scale); d.updateMatrix(); this.fish.setMatrixAt(i, d.matrix); });
    this.fish.instanceMatrix.needsUpdate = true;
  }
}
