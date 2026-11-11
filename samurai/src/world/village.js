import * as THREE from 'three';
import { rng, noise2, fbm2, TAU, lerp } from '../core/util.js';
import { patchDissolve } from '../shaders/dissolve.js';
import { Clock } from './clock.js';
import { makeBeam } from '../shaders/portal.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const add = (parent, geo, mat, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };

/** Telhado japonês de quatro águas com perfil côncavo e beirais arrebitados nos cantos. */
export function roofGeo(w, d, h, lift = 0.35, n = 10) {
  const g = new THREE.PlaneGeometry(2, 2, n, n); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i), m = Math.max(Math.abs(u), Math.abs(v));
    const y = h * Math.pow(1 - m, 1.55) + lift * Math.pow(m, 4) + lift * 1.6 * Math.pow(Math.abs(u * v), 2.2) - 0.02;
    p.setXYZ(i, u * w / 2, y, -v * d / 2);
  }
  g.computeVertexNormals(); return g;
}

function houseMats(dissolve) {
  const m = { plaster: std(0xeee3cf), wood: std(0x4a2c1c, { roughness: 0.75 }), roof: std(0x2b3648, { roughness: 0.6, flatShading: true, side: THREE.DoubleSide }),
    paper: std(0xffe2b0, { emissive: 0xffb860, emissiveIntensity: 0.9 }), stone: std(0x8a8a90), red: std(0xb8262c, { roughness: 0.6 }) };
  if (dissolve) for (const k in m) patchDissolve(m[k], dissolve);
  return m;
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const sbox = (parent, mat, sx, sy, sz, x, y, z, cast = true) => { const m = add(parent, BOX, mat, x, y, z, cast); m.scale.set(sx, sy, sz); return m; };

export function makeHouse(w, d, h, M, tiers = 1) {
  const g = new THREE.Group(); let y = 0, cw = w, cd = d;
  sbox(g, M.stone, w + 0.9, 0.35, d + 0.9, 0, 0.175, 0); y = 0.35;
  for (let t = 0; t < tiers; t++) {
    const hh = t === 0 ? h : h * 0.6;
    sbox(g, M.plaster, cw, hh, cd, 0, y + hh / 2, 0);
    for (const sx of [1, -1]) for (const sz of [1, -1]) sbox(g, M.wood, 0.2, hh, 0.2, sx * cw / 2, y + hh / 2, sz * cd / 2);
    sbox(g, M.wood, cw + 0.22, 0.18, cd + 0.22, 0, y + hh - 0.09, 0, false);
    sbox(g, M.wood, cw + 0.22, 0.14, cd + 0.22, 0, y + hh * 0.36, 0, false);
    if (t === 0) {
      sbox(g, M.wood, 1.3, hh * 0.72, 0.1, 0, y + hh * 0.36, cd / 2 + 0.03, false);                                    // porta
      for (const sx of [1, -1]) sbox(g, M.paper, cw * 0.24, hh * 0.38, 0.08, sx * cw * 0.3, y + hh * 0.6, cd / 2 + 0.03, false);  // shoji iluminado
      for (const sx of [1, -1]) sbox(g, M.paper, 0.08, hh * 0.38, cd * 0.4, sx * (cw / 2 + 0.03), y + hh * 0.6, 0, false);
      sbox(g, M.wood, cw + 1.4, 0.1, 1.2, 0, 0.42, cd / 2 + 0.6);                                                       // varanda
    } else for (const sx of [1, -1]) sbox(g, M.paper, cw * 0.5, hh * 0.4, 0.06, 0, y + hh * 0.55, sx * (cd / 2 + 0.02), false);
    y += hh;
    const rw = cw * 1.5 + 1.2, rd = cd * 1.5 + 1.2, rh = Math.min(cw, cd) * (t === tiers - 1 ? 0.5 : 0.22);
    const roof = add(g, roofGeo(rw, rd, rh, 0.4), M.roof, 0, y, 0);
    if (t === tiers - 1) { sbox(g, M.wood, 0.3, 0.3, 0.3, 0, y + rh, 0); if (tiers > 1) { const sp = add(g, new THREE.ConeGeometry(0.12, 2.2, 6), M.red, 0, y + rh + 1.1, 0); } }
    y += rh * (t === tiers - 1 ? 1 : 0.55); cw *= 0.72; cd *= 0.72;
  }
  g.userData.height = y; return g;
}

function makeTorii(M) {
  const g = new THREE.Group();
  for (const sx of [1, -1]) { const p = add(g, new THREE.CylinderGeometry(0.22, 0.26, 5.2, 10), M.red, sx * 2.3, 2.6, 0); p.rotation.z = sx * -0.035; sbox(g, M.stone, 0.75, 0.4, 0.75, sx * 2.35, 0.2, 0); }
  sbox(g, M.red, 5.6, 0.3, 0.32, 0, 4.2, 0);
  const top = add(g, roofGeo(7.4, 0.7, 0.0, 0.42, 6), M.roof, 0, 5.2, 0); sbox(g, M.red, 6.6, 0.34, 0.42, 0, 5.05, 0);
  sbox(g, M.red, 0.3, 0.7, 0.2, 0, 4.65, 0);
  return g;
}
function makeLantern(M) {
  const g = new THREE.Group();
  sbox(g, M.stone, 0.5, 0.2, 0.5, 0, 0.1, 0); add(g, new THREE.CylinderGeometry(0.1, 0.13, 0.9, 6), M.stone, 0, 0.65, 0);
  sbox(g, M.stone, 0.48, 0.1, 0.48, 0, 1.15, 0); sbox(g, M.paper, 0.32, 0.3, 0.32, 0, 1.35, 0, false);
  add(g, roofGeo(0.9, 0.9, 0.3, 0.1, 4), M.stone, 0, 1.5, 0);
  return g;
}

const mistFrag = /* glsl */`
  precision highp float; uniform vec3 uCol; uniform float uTime, uSeed, uAlpha; varying vec2 vUv;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*noise(p); p = p*2.1 + 3.7; a *= 0.5; } return s; }
  void main(){
    float n = fbm(vec2(vUv.x * 5.0 + uSeed + uTime * 0.02, vUv.y * 1.6 + uSeed));
    float a = smoothstep(0.3, 0.75, n + (0.5 - abs(vUv.y - 0.45)) * 0.9) * smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
    gl_FragColor = vec4(uCol, a * uAlpha);
  }`;

export class Village {
  constructor() {
    const g = (this.group = new THREE.Group()); const r = rng(1234);
    this.M = houseMats();
    // ---------- chão: anel com furo para o pátio (o abismo se abre ali)
    const gg = new THREE.RingGeometry(6.0, 900, 96, 70); gg.rotateX(-Math.PI / 2);
    const gp = gg.attributes.position, col = new Float32Array(gp.count * 3), c = new THREE.Color(), c2 = new THREE.Color();
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), z = gp.getZ(i), rad = Math.hypot(x, z);
      const hills = Math.min(1.5, Math.max(0, rad - 95) / 100); gp.setY(i, hills * hills * 22 * (0.6 + 0.5 * fbm2(x * 0.012, z * 0.012)) + (rad > 30 ? fbm2(x * 0.05, z * 0.05) * 0.5 : 0));
      const n = fbm2(x * 0.06 + 3, z * 0.06);
      c.setHex(0x5f8f4a).lerp(c2.setHex(0x86a85a), n * 0.5 + 0.5).lerp(c2.setHex(0x3f6a52), Math.min(1, hills));
      col.set([c.r, c.g, c.b], i * 3);
    }
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals();
    this.groundMat = std(0xffffff, { vertexColors: true, roughness: 0.95 });
    const ground = new THREE.Mesh(gg, this.groundMat); ground.receiveShadow = true; g.add(ground);
    this.pathMat = std(0xb99d78, { roughness: 1 });
    const street = add(g, new THREE.PlaneGeometry(5.5, 110), this.pathMat, 0, 0.03, 62, false); street.rotation.x = -Math.PI / 2;
    const ringPath = add(g, new THREE.RingGeometry(6.0, 8.6, 48), this.pathMat, 0, 0.035, 0, false); ringPath.rotation.x = -Math.PI / 2;
    const cross = add(g, new THREE.PlaneGeometry(70, 4), this.pathMat, 0, 0.032, 26, false); cross.rotation.x = -Math.PI / 2;

    // ---------- pátio de treino: duas lajes que se afastam
    const slabM = std(0x9a958c, { roughness: 0.9, flatShading: true });
    this.slabs = [0, 1].map((i) => { const s = add(g, new THREE.CylinderGeometry(6.05, 6.05, 0.5, 28, 1, false, i * Math.PI, Math.PI), slabM, 0, -0.2, 0, false);
      const inl = add(s, new THREE.RingGeometry(3.6, 3.85, 28, 1, i * Math.PI - Math.PI / 2, Math.PI), std(0x6d6a66), 0, 0.26, 0, false); inl.rotation.x = -Math.PI / 2; inl.rotation.z = 0; return s; });
    // ---------- poço do templo subterrâneo
    const pit = (this.pit = new THREE.Group()); g.add(pit);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 18, 40, 1, true), std(0x141c30, { side: THREE.BackSide, roughness: 0.9 })); wall.position.y = -9.2; pit.add(wall);
    this.pitGlow = new THREE.MeshBasicMaterial({ color: 0x38a8ff, toneMapped: false });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const st = new THREE.Mesh(new THREE.BoxGeometry(0.16, 16, 0.1), this.pitGlow); st.position.set(Math.sin(a) * 5.9, -9, Math.cos(a) * 5.9); st.rotation.y = a; pit.add(st);
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 14, 8), std(0x232b44)); pil.position.set(Math.sin(a + 0.26) * 5.2, -11, Math.cos(a + 0.26) * 5.2); pit.add(pil); }
    for (let i = 0; i < 26; i++) { const a = i * 0.36; const stp = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.9), std(0x3a4566)); stp.position.set(Math.sin(a) * 4.9, -0.6 - i * 0.55, Math.cos(a) * 4.9); stp.rotation.y = a; pit.add(stp); }
    this.pitClock = new Clock({ color: 0x40b0ff, color2: 0xbff0ff }); this.pitClock.group.rotation.x = -Math.PI / 2; this.pitClock.group.position.y = -17.5; this.pitClock.group.scale.setScalar(5.8); pit.add(this.pitClock.group);
    this.pitLight = new THREE.PointLight(0x40a8ff, 0, 40, 1.6); this.pitLight.position.y = -2; pit.add(this.pitLight);
    this.pitBeam = makeBeam(0x58b8ff, 9, 46); this.pitBeam.position.y = -16; pit.add(this.pitBeam);

    // ---------- casas
    this.houses = [];
    const spots = [[-10, 26, 0.5, 7, 6, 3.2], [10.5, 14, -0.45, 7, 6, 3.2], [-11.5, 13, 0.4, 6.5, 5.5, 3.0], [12, 38, -0.5, 7, 6, 3.3], [-12, 42, 0.5, 8, 6, 3.4], [11, 56, -0.4, 6, 6, 3.0], [-11, 60, 0.45, 7, 6, 3.2],
      [24, 22, -0.9, 6, 5, 3.0], [-25, 30, 0.9, 6, 5, 3.0], [26, 48, -0.8, 7, 5.5, 3.1], [-26, 52, 0.8, 6, 5, 3.0], [13, 76, -0.3, 7, 6, 3.2], [-13, 80, 0.3, 7, 6, 3.2], [-19, -9, 2.3, 7, 6, 3.2], [20, -12, -2.2, 6.5, 6, 3.1], [30, 4, -1.5, 6, 5, 3.0], [-31, 8, 1.5, 6, 5, 3.0]];
    this.vanishDis = { uDissolve: { value: 0 }, uDisColor: { value: new THREE.Color(0x66c8ff) }, uDisScale: { value: 0.9 } };
    spots.forEach(([x, z, ry, w, d, h], i) => {
      const hs = makeHouse(w, d, h, i === 1 ? houseMats(this.vanishDis) : this.M); hs.position.set(x, 0, z); hs.rotation.y = ry + Math.PI / 2 * Math.sign(-x); g.add(hs); this.houses.push(hs);
    });
    this.vanishHouse = this.houses[1];
    const pagoda = makeHouse(7, 7, 3.4, this.M, 4); pagoda.position.set(-17, 0, -30); g.add(pagoda); this.pagoda = pagoda;
    const shrine = makeHouse(9, 7, 3.6, this.M, 2); shrine.position.set(15, 0, -34); g.add(shrine);
    const torii = makeTorii(this.M); torii.position.set(0, 0, 17); g.add(torii);
    const torii2 = makeTorii(this.M); torii2.position.set(0, 0, -16); g.add(torii2);
    for (const [x, z] of [[-3.6, 10.5], [3.6, 10.5], [-3.6, 24], [3.6, 24], [-3.6, 44], [3.6, 44], [-7.5, -6], [7.5, -6]]) { const l = makeLantern(this.M); l.position.set(x, 0, z); g.add(l); }

    // ---------- cerejeiras (troncos + copas instanciadas)
    const trees = [[-7, 5], [7.5, 4], [-6.5, -7.5], [8, -8], [-5.5, 19], [6.4, 28.5], [-5.5, 33], [5.5, 34], [-5.4, 50], [5.4, 51], [-17, 18], [18, 30], [-19, 42], [19, 62], [-5.5, 68], [5.6, 70], [-30, -18], [32, -22], [0, -26], [-40, 26], [42, 36], [-9, -22], [11, -24]];
    this.treeSpots = trees;
    const trunkM = std(0x3a251c, { roughness: 0.9 });
    this.blossomMat = std(0xffb3cd, { roughness: 0.9, flatShading: true, emissive: 0xff7fa8, emissiveIntensity: 0.18 });
    const blobs = []; const dummy = new THREE.Object3D();
    for (const [tx, tz] of trees) {
      const tr = new THREE.Group(); tr.position.set(tx, 0, tz); tr.rotation.y = r() * TAU; const sc = 0.85 + r() * 0.5; g.add(tr);
      const t1 = add(tr, new THREE.CylinderGeometry(0.2 * sc, 0.34 * sc, 2.6 * sc, 7), trunkM, 0, 1.3 * sc, 0); t1.rotation.z = 0.12;
      for (let b = 0; b < 4; b++) { const a = b * 1.7 + r(), br = add(tr, new THREE.CylinderGeometry(0.07 * sc, 0.15 * sc, 2.4 * sc, 5), trunkM, Math.sin(a) * 0.8 * sc, 3.2 * sc, Math.cos(a) * 0.8 * sc); br.rotation.set(Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7); }
      for (let k = 0; k < 13; k++) { const a = r() * TAU, rr = r() * 2.3 * sc, hh = (3.4 + r() * 1.9) * sc; blobs.push([tx + Math.sin(a) * rr, hh, tz + Math.cos(a) * rr, (0.9 + r() * 0.9) * sc]); }
    }
    this.blossoms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), this.blossomMat, blobs.length);
    blobs.forEach(([x, y, z, s], i) => { dummy.position.set(x, y, z); dummy.scale.set(s, s * 0.75, s); dummy.rotation.set(r() * 3, r() * 3, 0); dummy.updateMatrix(); this.blossoms.setMatrixAt(i, dummy.matrix); });
    this.blossoms.castShadow = true; this.blossoms.receiveShadow = true; g.add(this.blossoms);

    // ---------- montanhas e névoa em camadas
    this.mountMat = std(0xffffff, { vertexColors: true, flatShading: true, roughness: 1 });
    const mount = (x, z, rad, h, seed, mat) => {
      const mg = new THREE.ConeGeometry(rad, h, 22, 9); const p = mg.attributes.position, cc = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), k = 1 + 0.38 * fbm2(px * 0.03 + seed, pz * 0.03 + py * 0.02);
        p.setXYZ(i, px * k, py + (py < h * 0.45 ? fbm2(px * 0.05, pz * 0.05 + seed) * h * 0.08 : 0), pz * k);
        const snow = THREE.MathUtils.smoothstep(py / h + 0.1 * noise2(px * 0.1, pz * 0.1), 0.12, 0.3);
        c.setHex(0x4b5f7c).lerp(c2.setHex(0x6f7f9a), (py / h + 0.5)).lerp(c2.setHex(0xf2f6ff), snow); cc.set([c.r, c.g, c.b], i * 3); }
      mg.setAttribute('color', new THREE.BufferAttribute(cc, 3)); mg.computeVertexNormals();
      const m = new THREE.Mesh(mg, mat); m.position.set(x, h / 2 - 4, z); g.add(m); return m;
    };
    this.mountains = [];
    for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU + 0.16; if (Math.abs(Math.atan2(Math.sin(a), -Math.cos(a))) < 0.3) continue; const d = 300 + r() * 170;
      this.mountains.push(mount(Math.sin(a) * d, Math.cos(a) * d, 90 + r() * 70, 90 + r() * 110, i * 3.3, this.mountMat)); }
    this.bigDis = { uDissolve: { value: 0 }, uDisColor: { value: new THREE.Color(0x7fd0ff) }, uDisScale: { value: 0.045 } };
    this.bigMat = patchDissolve(std(0xffffff, { vertexColors: true, flatShading: true, roughness: 1 }), this.bigDis);
    this.bigMountain = mount(0, -330, 150, 215, 42, this.bigMat);
    this.mistU = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + r(), d = 150 + (i % 3) * 55, u = { uCol: { value: new THREE.Color(0xffffff) }, uTime: { value: 0 }, uSeed: { value: i * 7.3 }, uAlpha: { value: 0.85 } };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(260, 46), new THREE.ShaderMaterial({ uniforms: u, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: mistFrag, transparent: true, depthWrite: false }));
      m.position.set(Math.sin(a) * d, 14 + (i % 3) * 14, Math.cos(a) * d); m.lookAt(0, m.position.y, 0); m.renderOrder = 2; g.add(m); this.mistU.push(u);
    }
    this._snow = new THREE.Color(); this._c = new THREE.Color();
    this.setChasm(0); this.setSeason(0);
  }
  /** k 0..1: as lajes do pátio se afastam e o poço do templo acende. */
  setChasm(k) {
    this.slabs[0].position.x = k * 3.6; this.slabs[1].position.x = -k * 3.6;
    this.slabs[0].rotation.z = -k * 0.22; this.slabs[1].rotation.z = k * 0.22;
    this.slabs[0].position.y = -0.2 - k * 0.5; this.slabs[1].position.y = -0.2 - k * 0.5;
    this.pitLight.intensity = k * 220; this.chasm = k;
  }
  /** snow 0..1: primavera → inverno (copas brancas, chão nevado). */
  setSeason(snow) {
    this.blossomMat.color.setHex(0xffb3cd).lerp(this._c.setHex(0xf4f8ff), snow); this.blossomMat.emissiveIntensity = 0.18 * (1 - snow);
    this.groundMat.color.setHex(0xffffff).lerp(this._c.setHex(0xdfe8f5), snow * 0.0); this.groundMat.emissive.setHex(0xcfe0f5); this.groundMat.emissiveIntensity = snow * 0.55;
    this.M.roof.color.setHex(0x2b3648).lerp(this._c.setHex(0xe8eef8), snow * 0.9); this.pathMat.color.setHex(0xb99d78).lerp(this._c.setHex(0xe6ecf5), snow * 0.8);
  }
  update(t, fogColor, beam = 0) {
    for (const u of this.mistU) { u.uTime.value = t; u.uCol.value.copy(fogColor).lerp(this._c.setHex(0xffffff), 0.35); }
    this.pitClock.set(-t * 0.1, 0.9 * Math.min(1, this.chasm * 3), t);
    this.pitBeam.userData.set(beam, t);
  }
}
