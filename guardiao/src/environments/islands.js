import * as THREE from 'three';
import { rng, fbm2, TAU } from '../timeline/util.js';
import { PX } from '../particles/particles.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const add = (parent, geo, mat, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const NOISE = /* glsl */`float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*noise(p); p = p*2.07 + 3.1; a *= 0.5; } return s; }`;

function roofGeo(w, d, h, lift = 0.35, n = 8) {
  const g = new THREE.PlaneGeometry(2, 2, n, n), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i), m = Math.max(Math.abs(u), Math.abs(v)); p.setXYZ(i, u * w / 2, h * Math.pow(1 - m, 1.55) + lift * Math.pow(m, 4) + lift * 1.6 * Math.pow(Math.abs(u * v), 2.2), -v * d / 2); }
  g.computeVertexNormals(); return g;
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const sbox = (p, m, sx, sy, sz, x, y, z) => { const b = add(p, BOX, m, x, y, z); b.scale.set(sx, sy, sz); return b; };
function house(M, w = 5, d = 4.4, h = 2.6, tiers = 1) {
  const g = new THREE.Group(); let y = 0.25, cw = w, cd = d; sbox(g, M.stone, w + 0.7, 0.25, d + 0.7, 0, 0.125, 0);
  for (let t = 0; t < tiers; t++) { const hh = t ? h * 0.6 : h; sbox(g, M.wall, cw, hh, cd, 0, y + hh / 2, 0); sbox(g, M.wood, cw + 0.16, 0.14, cd + 0.16, 0, y + hh - 0.07, 0);
    for (const sx of [1, -1]) { sbox(g, M.paper, cw * 0.26, hh * 0.4, 0.07, sx * cw * 0.27, y + hh * 0.58, cd / 2 + 0.02); sbox(g, M.paper, 0.07, hh * 0.4, cd * 0.4, sx * (cw / 2 + 0.02), y + hh * 0.58, 0); }
    if (!t) sbox(g, M.wood, 1.0, hh * 0.7, 0.08, 0, y + hh * 0.35, cd / 2 + 0.03);
    y += hh; const rh = Math.min(cw, cd) * (t === tiers - 1 ? 0.48 : 0.2); add(g, roofGeo(cw * 1.45 + 1, cd * 1.45 + 1, rh, 0.34), M.roof, 0, y, 0); y += rh * (t === tiers - 1 ? 1 : 0.5); cw *= 0.72; cd *= 0.72; }
  return g;
}

const fallFrag = /* glsl */`precision highp float; uniform float uTime, uGlow; uniform vec3 uCol; varying vec2 vUv; ${NOISE}
  void main(){ float s = noise(vec2(vUv.x * 9.0, vUv.y * 5.0 + uTime * 1.9)) * 0.6 + noise(vec2(vUv.x * 26.0, vUv.y * 9.0 + uTime * 3.1)) * 0.4;
    float a = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) * smoothstep(0.0, 0.5, vUv.y) * (0.35 + 0.65 * s);
    float mist = smoothstep(0.35, 0.0, vUv.y) * noise(vec2(vUv.x * 4.0 + uTime * 0.2, vUv.y * 3.0 - uTime * 0.3));
    gl_FragColor = vec4(uCol * (0.55 + 0.7 * s + uGlow) , clamp(a * 0.85 + mist * 0.35, 0.0, 1.0) * smoothstep(0.0, 0.08, vUv.y)); }`;

/** Ilha flutuante: topo gramado, rocha invertida, cachoeiras que caem no vazio e árvores bioluminescentes. */
export function makeIsland(R, seed, shared, o = {}) {
  const g = new THREE.Group(), r = rng(seed), { M, fallMat, canopy } = shared;
  const tg = new THREE.CylinderGeometry(R, R * 0.93, R * 0.14, 28, 1), tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), z = tp.getZ(i), k = 1 + 0.12 * fbm2(x * 0.08 + seed, z * 0.08); tp.setX(i, x * k); tp.setZ(i, z * k); }
  tg.computeVertexNormals(); add(g, tg, M.grass, 0, -R * 0.07, 0, false);
  const rg = new THREE.ConeGeometry(R * 0.95, R * 1.7, 14, 5), rp = rg.attributes.position;
  for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i), k = 1 + 0.35 * fbm2(x * 0.1 + seed * 2, z * 0.1 + y * 0.07); rp.setXYZ(i, x * k, y, z * k); }
  rg.computeVertexNormals(); const rock = add(g, rg, M.rock, 0, -R * 0.14 - R * 0.85, 0, false); rock.rotation.x = Math.PI;
  for (let i = 0; i < (o.falls ?? 3); i++) {
    const a = (o.fallAngles?.[i] ?? r() * TAU), w = R * (0.12 + r() * 0.1), h = R * 3.2;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 1), fallMat); f.position.set(Math.sin(a) * R * 1.03, -h / 2 - 0.2, Math.cos(a) * R * 1.03); f.rotation.y = a; f.renderOrder = 3; g.add(f);
    const lip = add(g, new THREE.BoxGeometry(w, 0.3, R * 0.5), M.water, Math.sin(a) * R * 0.8, 0.03, Math.cos(a) * R * 0.8, false); lip.rotation.y = a;
  }
  for (let i = 0; i < (o.trees ?? 6); i++) {
    const a = r() * TAU, d = R * (0.35 + r() * 0.5), x = Math.sin(a) * d, z = Math.cos(a) * d, s = (o.treeScale ?? 1) * (0.8 + r() * 0.7);
    if (o.keepClear && Math.hypot(x - o.keepClear[0], z - o.keepClear[1]) < o.keepClear[2]) continue;
    add(g, new THREE.CylinderGeometry(0.16 * s, 0.3 * s, 3.2 * s, 6), M.trunk, x, 1.6 * s, z);
    for (let k = 0; k < 4; k++) { const c = add(g, new THREE.IcosahedronGeometry((1.2 + r() * 0.8) * s, 1), canopy[(i + k) % canopy.length], x + (r() - 0.5) * 2.2 * s, (3.6 + r() * 1.6) * s, z + (r() - 0.5) * 2.2 * s); c.scale.y = 0.8; }
  }
  g.userData = { R, ph: r() * TAU };
  return g;
}

const cloudFrag = /* glsl */`precision highp float; uniform float uTime, uAlpha; uniform vec3 uLit, uShade, uFog; varying vec3 vW; varying float vD; ${NOISE}
  void main(){ vec2 p = vW.xz * 0.0016; float n = fbm(p + vec2(uTime * 0.006, 0.0)) * 0.65 + fbm(p * 3.1 - vec2(0.0, uTime * 0.01)) * 0.35;
    float billow = smoothstep(0.3, 0.75, n); vec3 col = mix(uShade, uLit, billow);
    float f = 1.0 - exp(-vD * vD * 0.00000022); col = mix(col, uFog, f);
    float holes = uAlpha < 0.99 ? smoothstep(0.42, 0.62, n) : 1.0;
    gl_FragColor = vec4(col, holes * uAlpha * (1.0 - smoothstep(4200.0, 5200.0, vD))); }`;
const planetFrag = /* glsl */`precision highp float; uniform vec3 uA, uB, uSun, uRim; uniform float uTime, uAwake, uEarth, uAmb; varying vec3 vN; varying vec3 vP; varying vec3 vV; ${NOISE}
  void main(){ vec3 n = normalize(vN); float lat = vP.y * 3.0 + fbm(vec2(vP.x * 2.0 + uTime * 0.01, vP.y * 6.0)) * 0.6;
    vec3 col = mix(uA, uB, smoothstep(0.3, 0.7, noise(vec2(lat * 2.2, 0.0)) * 0.6 + fbm(vec2(vP.x * 3.0 + vP.z, lat * 3.0)) * 0.4));
    if (uEarth > 0.5) { float land = fbm(vP.xy * 2.6 + vP.z * 1.7 + 3.0) * 0.6 + fbm(vP.zy * 5.0 + 9.0) * 0.4; col = mix(uA * (0.75 + 0.5 * fbm(vP.xz * 6.0)), uB * (0.7 + 0.6 * fbm(vP.xy * 9.0)), smoothstep(0.5, 0.56, land));
      col = mix(col, vec3(1.0), smoothstep(0.55, 0.75, fbm(vP.xy * 4.0 + vec2(uTime * 0.01, 0.0) + vP.z * 3.0)) * 0.85); col = mix(col, vec3(1.0), smoothstep(0.82, 0.95, abs(vP.y))); }
    float d = max(dot(n, normalize(uSun)), 0.0); col *= (uAmb + (1.0 - uAmb) * smoothstep(-0.05, 0.9, d)) * mix(0.05, 1.0, uAwake);
    float rim = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 2.5); col += uRim * rim * (0.25 + 0.75 * d) * mix(0.12, 1.3, uAwake);
    gl_FragColor = vec4(col, 1.0); }`;
const PVERT = 'varying vec3 vN; varying vec3 vP; varying vec3 vV; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
export function makePlanet(radius, a, b, rim = 0x6fa8ff) {
  const u = { uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uSun: { value: new THREE.Vector3(0.4, 0.5, 0.6) }, uRim: { value: new THREE.Color(rim) }, uTime: { value: 0 }, uAwake: { value: 1 }, uEarth: { value: 0 }, uAmb: { value: 0.06 } };
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.ShaderMaterial({ uniforms: u, vertexShader: PVERT, fragmentShader: planetFrag, fog: false })); m.scale.setScalar(radius); m.userData.u = u; return m;
}

/** Mar de nuvens em duas camadas (a de cima tem vãos). Reutilizado em vários cenários. */
export class CloudSea {
  constructor(y = -95, gap = 26) {
    this.group = new THREE.Group(); this._c = new THREE.Color();
    this.u = [1, 0.75].map((a) => ({ uTime: { value: 0 }, uAlpha: { value: a }, uLit: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uFog: { value: new THREE.Color() } }));
    this.u.forEach((u, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(11000, 11000, 1, 1), new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: i === 0,
      vertexShader: 'varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz + vec3(float(' + i + ') * 913.0); vD = distance(w.xyz, cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: cloudFrag }));
      m.rotation.x = -Math.PI / 2; m.position.y = y + i * gap; m.renderOrder = 1 + i; this.group.add(m); });
  }
  update(t, atmo) { for (const u of this.u) { u.uTime.value = t; u.uFog.value.copy(atmo.scene.fog.color); u.uShade.value.copy(atmo.u.uLow.value).multiplyScalar(0.5).lerp(this._c.copy(atmo.scene.fog.color), 0.4); u.uLit.value.copy(atmo.hemi.color).multiplyScalar(0.55).lerp(this._c.copy(atmo.sun.color), 0.35 * atmo.sun.intensity / 3); } }
}

/** O mundo de Kaito: ilha da vila, ilhas vizinhas, castelo suspenso, mar de nuvens e planetas gigantes no horizonte. */
export class SkyIslands {
  constructor() {
    const g = (this.group = new THREE.Group()), r = rng(2024);
    const M = (this.M = { grass: std(0x3f8a5a, { roughness: 1 }), rock: std(0x4a3f5c, { flatShading: true, roughness: 0.95 }), trunk: std(0x2a2038), water: std(0x7fd8ff, { emissive: 0x3aa8e0, emissiveIntensity: 0.7, roughness: 0.2 }),
      wall: std(0xe9e0d0), wood: std(0x4a2c1c), roof: std(0x2a3558, { flatShading: true, side: THREE.DoubleSide, roughness: 0.6 }), paper: std(0xffe2b0, { emissive: 0xffb860, emissiveIntensity: 1.0 }), stone: std(0x8a8a98) });
    this.canopy = [0x40e0d0, 0x9a6cff, 0x5ab8ff, 0xff8ad0].map((c) => std(c, { flatShading: true, emissive: c, emissiveIntensity: 0.55, roughness: 0.8 }));
    this.fallU = { uTime: { value: 0 }, uGlow: { value: 0 }, uCol: { value: new THREE.Color(0xbfe8ff) } };
    const fallMat = new THREE.ShaderMaterial({ uniforms: this.fallU, vertexShader: VERT, fragmentShader: fallFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const shared = { M, fallMat, canopy: this.canopy };
    // ilha da vila: Kaito observa o céu no mirante (0, 0, -25), voltado para -Z
    this.home = makeIsland(30, 7, shared, { falls: 4, fallAngles: [2.3, 4.0, 0.9, 5.4], trees: 16, keepClear: [0, -22, 9] }); g.add(this.home);
    for (const [x, z, ry, t] of [[-9, -4, 0.5, 1], [9, -2, -0.5, 1], [-12, 9, 0.9, 1], [12, 10, -0.9, 1], [0, 15, 0, 2], [-19, -9, 1.3, 1], [19, -10, -1.3, 1]]) { const h = house(M, 5, 4.4, 2.6, t); h.position.set(x, 0, z); h.rotation.y = ry + Math.PI; this.home.add(h); }
    const deck = add(this.home, new THREE.CylinderGeometry(4.2, 4.6, 0.3, 20), M.stone, 0, 0.1, -25, false);
    for (let i = 0; i < 7; i++) { const a = Math.PI * 0.62 + i / 6 * Math.PI * 0.76; add(this.home, new THREE.CylinderGeometry(0.09, 0.09, 1.0, 6), M.wood, Math.sin(a) * 4.0, 0.7, -25 + Math.cos(a) * 4.0); }
    const path = add(this.home, new THREE.PlaneGeometry(2.6, 40), std(0xb9a27c, { roughness: 1 }), 0, 0.02, -4, false); path.rotation.x = -Math.PI / 2;
    for (const [x, z] of [[-2.2, -14], [2.2, -14], [-2.2, -2], [2.2, -2], [-2.2, 9], [2.2, 9]]) { add(this.home, new THREE.CylinderGeometry(0.08, 0.1, 1.5, 6), M.wood, x, 0.75, z); add(this.home, new THREE.BoxGeometry(0.34, 0.4, 0.34), M.paper, x, 1.6, z, false); }
    // ilhas vizinhas
    this.islands = [];
    for (const [x, y, z, R] of [[-70, 12, -130, 22], [85, -8, -190, 28], [-150, 40, -330, 44], [170, 55, -420, 38], [40, 70, -560, 30], [-260, -10, -520, 50], [280, 10, -260, 34], [-110, -30, 90, 26], [120, 20, 140, 30], [-20, 90, -820, 60], [330, 80, -700, 46], [-380, 60, -760, 52]]) {
      const is = makeIsland(R, R * 3.1 + x, shared, { falls: 2 + (R > 40 ? 1 : 0), trees: 5, treeScale: 1.6 }); is.position.set(x, y, z); is.userData.y = y; g.add(is); this.islands.push(is);
    }
    // castelo suspenso
    const castle = new THREE.Group(); castle.position.set(-150, 40, -330); castle.scale.setScalar(3.2); g.add(castle); this.castle = castle;
    for (const [x, z, h, rr] of [[0, 0, 9, 2.2], [-3.6, 1.5, 6, 1.5], [3.4, -1, 7, 1.6], [0.5, 3.8, 5, 1.3], [-1.5, -3.6, 5.5, 1.3]]) {
      add(castle, new THREE.CylinderGeometry(rr * 0.85, rr, h, 10), M.wall, x, h / 2, z); add(castle, roofGeo(rr * 3.2, rr * 3.2, rr * 1.6, 0.3, 6), M.roof, x, h, z); add(castle, new THREE.ConeGeometry(0.12, 2, 5), this.canopy[1], x, h + rr * 1.6 + 1, z);
      for (let k = 0; k < 3; k++) add(castle, new THREE.BoxGeometry(0.4, 0.7, 0.1), M.paper, x, h * (0.35 + k * 0.22), z + rr * 0.92, false);
    }
    this.sea = new CloudSea(-95); g.add(this.sea.group);
    // planetas gigantes próximos ao horizonte
    this.planet = makePlanet(620, 0xd89a5a, 0x7a4a8a, 0xffb878); this.planet.position.set(1100, 420, -2600); g.add(this.planet);
    const ring = new THREE.Mesh(new THREE.RingGeometry(760, 1180, 96, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, vertexShader: VERT,
      fragmentShader: 'precision highp float; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float b = 0.5 + 0.5 * sin(r * 140.0) * sin(r * 37.0); gl_FragColor = vec4(vec3(1.0, 0.85, 0.65) * (0.35 + 0.65 * b), 0.42 * b); }' }));
    ring.position.copy(this.planet.position); ring.rotation.set(1.25, 0.3, 0.2); g.add(ring);
    this.moon = makePlanet(170, 0x6fa8d8, 0x2a4a8a, 0x9fd0ff); this.moon.position.set(-950, 620, -2100); g.add(this.moon); this.moon.userData.u.uAmb.value = this.planet.userData.u.uAmb.value = 0.32;
    // flores e luzes que cobrem as ilhas depois do renascimento (sequência 5)
    const N = 2600, fp = new Float32Array(N * 3), fc = new Float32Array(N * 3), fs = new Float32Array(N), cols = [0xff7ab8, 0xffd060, 0x7ad8ff, 0xc890ff, 0xffffff].map((c) => new THREE.Color(c));
    const all = [[0, 0, 0, 30], ...this.islands.map((is) => [is.position.x, is.position.y, is.position.z, is.userData.R])];
    for (let i = 0; i < N; i++) { const [ix, iy, iz, R] = all[i < 900 ? 0 : 1 + Math.floor(r() * this.islands.length)], a = r() * TAU, d = Math.sqrt(r()) * R * 0.95; fp.set([ix + Math.sin(a) * d, iy + 0.25, iz + Math.cos(a) * d], i * 3); const c = cols[Math.floor(r() * 5)]; fc.set([c.r, c.g, c.b], i * 3); fs[i] = r(); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); fg.setAttribute('aS', new THREE.BufferAttribute(fs, 1));
    this.flowerU = { uBloom: { value: 0 }, uPx: PX, uTime: { value: 0 } };
    this.flowers = new THREE.Points(fg, new THREE.ShaderMaterial({ uniforms: this.flowerU, vertexColors: true, transparent: true, depthWrite: false,
      vertexShader: 'attribute float aS; uniform float uBloom, uPx, uTime; varying vec3 vC; varying float vK; void main(){ vC = color; vK = clamp(uBloom * 1.6 - aS * 0.6, 0.0, 1.0); vec3 p = position; p.y += vK * (0.25 + aS * 0.5) + sin(uTime * 2.0 + aS * 40.0) * 0.04; vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(vK * (0.32 + aS * 0.3) * uPx * 2.4 / -mv.z, 1.0, uPx * 0.07); }',
      fragmentShader: 'varying vec3 vC; varying float vK; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if (d > 0.5 || vK < 0.01) discard; float pet = 0.75 + 0.25 * cos(atan(p.y, p.x) * 5.0); if (d > 0.5 * pet) discard; gl_FragColor = vec4(mix(vC, vec3(1.0, 0.95, 0.7), smoothstep(0.16, 0.0, d)) * 0.82, 1.0); }' }));
    this.flowers.frustumCulled = false; g.add(this.flowers);
    this._c = new THREE.Color();
  }
  /** t: tempo; atmo: atmosfera (cores das nuvens); bloom 0..1: mundo renascido (flores, cachoeiras e copas mais luminosas). */
  update(t, atmo, bloom = 0) {
    this.fallU.uTime.value = t; this.fallU.uGlow.value = bloom * 0.9; this.flowerU.uBloom.value = bloom; this.flowerU.uTime.value = t; this.flowers.visible = bloom > 0.01;
    for (const c of this.canopy) c.emissiveIntensity = 0.5 + bloom * 0.6 + 0.12 * Math.sin(t * 1.3);
    for (const is of this.islands) is.position.y = is.userData.y + Math.sin(t * 0.3 + is.userData.ph) * 1.5;
    this.sea.update(t, atmo);
    for (const p of [this.planet, this.moon]) { p.userData.u.uSun.value.copy(atmo.sunDir); p.userData.u.uTime.value = t; }
  }
}
