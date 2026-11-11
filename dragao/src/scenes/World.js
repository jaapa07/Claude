import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { toon, FREEZE } from '../characters/materials.js';
import { NOISE } from '../effects/glsl.js';
import { rng, clamp } from '../core/util.js';

// The kingdom — one deterministic world shared by all 5 episodes:
//   ACADEMY  : arena on a mountain plateau (episode 1)
//   KINGDOM  : valley town with market square and the royal castle (episodes 2–5)
export const ACADEMY = new THREE.Vector3(0, 0, 0);
export const MARKET = new THREE.Vector3(0, -42, -150);
export const CASTLE = new THREE.Vector3(0, -42, -188);
export const STALLS = [...Array(6)].map((_, i) => { const a = Math.PI * 0.15 + (i / 6) * Math.PI * 2; return { x: MARKET.x + Math.cos(a) * 8.5, z: MARKET.z + Math.sin(a) * 8.5, a }; });

function stripeTexture(c1, c2) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 8; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * 16, 0, 16, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class World {
  constructor({ renderer, seed = 77 } = {}) {
    const r = rng(seed); const S = this.scene = new THREE.Scene();
    S.fog = new THREE.Fog(0xbfe3ff, 60, 520);
    const pm = new THREE.PMREMGenerator(renderer); S.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); S.environmentIntensity = 0.3;
    // sky
    this.skyU = { uTime: { value: 0 }, uFreeze: { value: 0 }, uDark: { value: 0 }, uWarm: { value: 0 } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: this.skyU, fog: false,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
      fragmentShader: `uniform float uTime, uFreeze, uDark, uWarm; varying vec3 vD; ${NOISE}
        void main(){ float y = vD.y; vec3 top = vec3(0.22, 0.55, 0.98), hor = vec3(1.0, 0.86, 0.68), bot = vec3(0.55, 0.75, 0.95);
          vec3 c = y > 0.0 ? mix(hor, top, pow(y, 0.6)) : mix(hor, bot, pow(-y, 0.5));
          vec3 sd = normalize(vec3(-0.5, 0.35, -0.8)); float sun = max(dot(vD, sd), 0.0);
          c += vec3(1.0, 0.85, 0.55) * (pow(sun, 400.0) * 3.0 + pow(sun, 12.0) * 0.35);
          vec3 frozen = mix(vec3(0.72, 0.84, 0.95), vec3(0.35, 0.5, 0.75), pow(max(y, 0.0), 0.6)) + 0.05 * fbm(vec3(vD.xz * 6.0, uTime * 0.2));
          c = mix(c, frozen, uFreeze);
          c = mix(c, c * vec3(0.45, 0.5, 0.65), uDark);
          c = mix(c, mix(vec3(1.0, 0.7, 0.45), vec3(0.45, 0.6, 0.95), pow(max(y, 0.0), 0.5)), uWarm);
          gl_FragColor = vec4(c, 1.0); }` }));
    sky.frustumCulled = false; S.add(sky);
    // lights
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6a8a4a, 0.75); S.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d6, 1.55); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 200; this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.03;
    S.add(this.sun, this.sun.target); this.focus(ACADEMY, 16);
    // materials
    const M = { rock: toon(0x9a8f9e, { rough: 0.9, flat: true }), rockD: toon(0x7a6f86, { rough: 0.9, flat: true }), grass: toon(0x6cc04a, { rough: 0.9 }), snow: toon(0xffffff, { rough: 0.7, flat: true }),
      stone: toon(0xe8dcc4, { rough: 0.85 }), stoneD: toon(0xc9b99a, { rough: 0.85 }), wood: toon(0x9a6232, { rough: 0.8 }), roofB: toon(0x3d7bd8, { rough: 0.6 }), roofR: toon(0xe0473a, { rough: 0.6 }),
      roofP: toon(0x9b5de5, { rough: 0.6 }), trunk: toon(0x7a4a26), leaf: toon(0x4fae3a, { rough: 0.8, flat: true }), leaf2: toon(0x7fcf3f, { rough: 0.8, flat: true }), dark: toon(0x3a2a40), gold: toon(0xffc23a, { metal: 0.7, rough: 0.3 }), cobble: toon(0xb39a76, { rough: 0.95 }) };
    this.M = M;
    const add = (g, m, p, s = [1, 1, 1], rot = [0, 0, 0], parent = S, shadow = true) => { const o = new THREE.Mesh(g, m); o.position.set(...p); o.scale.set(...s); o.rotation.set(...rot); o.castShadow = shadow; o.receiveShadow = true; parent.add(o); return o; };
    // ---------- distant mountains (ring) ----------
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + r() * 0.1, R = 300 + r() * 160, h = 120 + r() * 160, w = 70 + r() * 70;
      add(new THREE.ConeGeometry(w, h, 7), i % 2 ? M.rock : M.rockD, [Math.cos(a) * R, -60 + h / 2, -120 + Math.sin(a) * R], [1, 1, 1], [0, r() * 3, 0], S, false);
      add(new THREE.ConeGeometry(w * 0.36, h * 0.36, 7), M.snow, [Math.cos(a) * R, -60 + h * 0.82, -120 + Math.sin(a) * R], [1, 1, 1], [0, r() * 3, 0], S, false);
    }
    // ---------- academy plateau ----------
    add(new THREE.CylinderGeometry(22, 12, 30, 12), M.rock, [0, -15.05, 0], [1, 1, 1], [0, 0.2, 0]);
    add(new THREE.CylinderGeometry(22.2, 22.2, 0.6, 40), M.grass, [0, -0.3, 0]);
    add(new THREE.CylinderGeometry(11, 11, 0.12, 48), M.cobble, [0, 0.03, 0]);
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; add(new THREE.BoxGeometry(1.3, 0.5 + (i % 2) * 0.3, 0.8), M.stoneD, [Math.cos(a) * 11.4, 0.25, Math.sin(a) * 11.4], [1, 1, 1], [0, -a, 0]); }
    // academy building + banners
    const acad = new THREE.Group(); acad.position.set(0, 0, -16); S.add(acad);
    add(new THREE.BoxGeometry(14, 8, 6), M.stone, [0, 4, 0], [1, 1, 1], [0, 0, 0], acad);
    add(new THREE.CylinderGeometry(0.01, 10, 5, 4), M.roofR, [0, 10.5, 0], [1, 1, 0.45], [0, Math.PI / 4, 0], acad);
    for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(2.4, 2.4, 13, 16), M.stone, [s * 8, 6.5, 0.5], [1, 1, 1], [0, 0, 0], acad); add(new THREE.ConeGeometry(3.0, 5, 16), M.roofR, [s * 8, 15.5, 0.5], [1, 1, 1], [0, 0, 0], acad); }
    add(new THREE.BoxGeometry(3, 4.5, 0.4), M.dark, [0, 2.25, 3.05], [1, 1, 1], [0, 0, 0], acad);
    this.flags = [];
    const flagMat = toon(0xff6f61, { side: THREE.DoubleSide }); this.flagU = { uTime: { value: 0 } };
    const prev = flagMat.onBeforeCompile; flagMat.onBeforeCompile = (sh, rr) => { prev(sh, rr); sh.uniforms.uTime2 = this.flagU.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime2;').replace('#include <begin_vertex>', '#include <begin_vertex>\n float fk = max(position.x, 0.0); transformed.z += sin(position.x * 3.0 - uTime2 * 6.0) * 0.18 * fk; transformed.y += sin(position.x * 2.0 - uTime2 * 4.0) * 0.06 * fk;'); };
    flagMat.customProgramCacheKey = () => 'flag';
    const flag = (x, y, z, s = 1, parent = S) => { add(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 6 * s, 8), M.wood, [x, y + 3 * s, z], [1, 1, 1], [0, 0, 0], parent); const fg = new THREE.PlaneGeometry(2.4 * s, 1.4 * s, 10, 4); fg.translate(1.2 * s, 0, 0); add(fg, flagMat, [x, y + 5.2 * s, z], [1, 1, 1], [0, 0, 0], parent); };
    for (let i = 0; i < 6; i++) { const a = Math.PI * 0.15 + (i / 6) * Math.PI * 2; flag(Math.cos(a) * 12.4, 0, Math.sin(a) * 12.4); }
    // rocks for the big dragons
    this.perches = [new THREE.Vector3(-9.5, 0, -8), new THREE.Vector3(9.5, 0, -9), new THREE.Vector3(-3, 0, -11.5)];
    this.perches.forEach((p, i) => { const h = 1.6 + i * 0.6; add(new THREE.CylinderGeometry(2.2, 2.8, h, 7), M.rockD, [p.x, h / 2, p.z]); p.y = h; });
    // director podium
    this.podium = new THREE.Vector3(-4.2, 0.7, -3.4);
    add(new THREE.CylinderGeometry(0.9, 1.05, 0.7, 16), M.stoneD, [this.podium.x, 0.35, this.podium.z]);
    // training dummies
    for (const [x, z] of [[6.5, 2.5], [7.8, -1.5], [-7.5, 3.5]]) { add(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), M.wood, [x, 0.9, z]); add(new THREE.SphereGeometry(0.42, 12, 10), toon(0xe3c06a), [x, 1.6, z], [1, 1.3, 1]); }
    // ---------- floating islands with castles ----------
    this.islands = [];
    for (const [x, y, z, s, roof] of [[-60, 40, -90, 1, M.roofP], [70, 55, -60, 1.3, M.roofB], [30, 70, -230, 1.6, M.roofR], [-110, 60, -200, 1.2, M.roofB]]) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); S.add(g);
      add(new THREE.ConeGeometry(9, 16, 8), M.rock, [0, -8, 0], [1, 1, 1], [Math.PI, 0, 0], g, false);
      add(new THREE.CylinderGeometry(9.2, 9, 1.2, 16), M.grass, [0, 0, 0], [1, 1, 1], [0, 0, 0], g, false);
      for (let k = 0; k < 3; k++) { const tx = (k - 1) * 4; const h = 6 + k * 2; add(new THREE.CylinderGeometry(1.4, 1.4, h, 12), M.stone, [tx, h / 2, (k % 2) * 2], [1, 1, 1], [0, 0, 0], g, false); add(new THREE.ConeGeometry(1.9, 3.5, 12), roof, [tx, h + 1.7, (k % 2) * 2], [1, 1, 1], [0, 0, 0], g, false); }
      g.userData = { y, ph: r() * 6 }; this.islands.push(g);
    }
    // ---------- valley & kingdom ----------
    add(new THREE.PlaneGeometry(1200, 1200), M.grass, [0, -42.05, -150], [1, 1, 1], [-Math.PI / 2, 0, 0], S, false).receiveShadow = true;
    for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, R = 80 + r() * 140; const hr = 18 + r() * 25; add(new THREE.SphereGeometry(hr, 16, 10), M.grass, [MARKET.x + Math.cos(a) * R, -42 - hr * 0.3, MARKET.z + Math.sin(a) * R], [1.6, 0.35, 1.6], [0, 0, 0], S, false); }
    add(new THREE.CylinderGeometry(14, 14, 0.15, 48), M.cobble, [MARKET.x, -41.95, MARKET.z]);
    // castle
    const C = new THREE.Group(); C.position.copy(CASTLE); S.add(C); this.castle = C;
    add(new THREE.BoxGeometry(16, 20, 14), M.stone, [0, 10, 0], [1, 1, 1], [0, 0, 0], C);
    add(new THREE.CylinderGeometry(0.01, 13, 8, 4), M.roofB, [0, 24, 0], [1, 1, 0.9], [0, Math.PI / 4, 0], C);
    this.towers = [];
    for (const [x, z, h] of [[-11, 8, 26], [11, 8, 26], [-11, -8, 30], [11, -8, 30], [0, -2, 36]]) {
      const tw = new THREE.Group(); tw.position.set(x, 0, z); C.add(tw); this.towers.push(tw);
      add(new THREE.CylinderGeometry(3.2, 3.5, h, 18), M.stone, [0, h / 2, 0], [1, 1, 1], [0, 0, 0], tw);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; add(new THREE.BoxGeometry(0.9, 1.0, 0.9), M.stone, [Math.cos(a) * 3.2, h + 0.5, Math.sin(a) * 3.2], [1, 1, 1], [0, -a, 0], tw); }
      add(new THREE.ConeGeometry(4, 9, 18), x === 0 ? M.roofR : M.roofB, [0, h + 5.4, 0], [1, 1, 1], [0, 0, 0], tw);
      flag(0, h + 9, 0, 0.8, tw);
    }
    for (const [x, z, w, d] of [[0, 8, 22, 1.6], [-11, 0, 1.6, 16], [11, 0, 1.6, 16]]) add(new THREE.BoxGeometry(w, 9, d), M.stoneD, [x, 4.5, z], [1, 1, 1], [0, 0, 0], C);
    add(new THREE.BoxGeometry(4.5, 6, 0.6), M.wood, [0, 3, 8.9], [1, 1, 1], [0, 0, 0], C);
    add(new THREE.TorusGeometry(2.25, 0.3, 8, 20, Math.PI), M.stone, [0, 6, 8.9], [1, 1, 1], [0, 0, 0], C);
    // houses around the square
    this.houses = [];
    const walls = [0xfff1d6, 0xffd6d6, 0xd8ecff, 0xfff4b8, 0xe2ffd6].map((c) => toon(c, { rough: 0.85 }));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1; if (Math.abs(Math.sin(a) + 1) < 0.25) continue; // keep the castle view open
      const R = 18 + (i % 2) * 5, w = 4 + r() * 2.5, h = 4 + r() * 3, d = 4 + r() * 2;
      const g = new THREE.Group(); g.position.set(MARKET.x + Math.cos(a) * R, -42, MARKET.z + Math.sin(a) * R); g.rotation.y = -a - Math.PI / 2; S.add(g);
      add(new THREE.BoxGeometry(w, h, d), walls[i % walls.length], [0, h / 2, 0], [1, 1, 1], [0, 0, 0], g);
      add(new THREE.CylinderGeometry(0.01, w * 0.78, 3, 4), [M.roofR, M.roofB, M.roofP][i % 3], [0, h + 1.5, 0], [1, 1, d / w], [0, Math.PI / 4, 0], g);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.8, 0.9, 0.1), M.dark, [s * w * 0.25, h * 0.6, d / 2 + 0.05], [1, 1, 1], [0, 0, 0], g);
      add(new THREE.BoxGeometry(1.0, 1.8, 0.1), M.wood, [0, 0.9, d / 2 + 0.05], [1, 1, 1], [0, 0, 0], g);
      this.houses.push(g);
    }
    // trees
    this.trees = [];
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, R = 28 + r() * 50; const x = MARKET.x + Math.cos(a) * R, z = MARKET.z + Math.sin(a) * R;
      if (Math.abs(x - CASTLE.x) < 18 && Math.abs(z - CASTLE.z) < 16) continue;
      const g = new THREE.Group(); g.position.set(x, -42, z); S.add(g); const s = 0.8 + r() * 0.8; g.scale.setScalar(s);
      add(new THREE.CylinderGeometry(0.3, 0.4, 2.4, 7), M.trunk, [0, 1.2, 0], [1, 1, 1], [0, 0, 0], g);
      add(new THREE.IcosahedronGeometry(1.8, 1), i % 2 ? M.leaf : M.leaf2, [0, 3.6, 0], [1, 1.1, 1], [r(), r(), 0], g);
      add(new THREE.IcosahedronGeometry(1.2, 1), i % 2 ? M.leaf2 : M.leaf, [0.8, 4.6, 0.2], [1, 1, 1], [r(), r(), 0], g);
      this.trees.push(g);
    }
    // market stalls (canopies + fruit piles). Fruits are listed so episodes can simulate them.
    this.fruits = []; this.stalls = [];
    const fruitTypes = [{ c: 0xe8322a, r: 0.13 }, { c: 0xffa21a, r: 0.13 }, { c: 0x8ad13a, r: 0.12 }, { c: 0x7a3fb0, r: 0.08 }, { c: 0xffe14a, r: 0.11 }];
    const canopies = [['#ff6f61', '#ffffff'], ['#49b8ff', '#ffffff'], ['#ffd23a', '#ff8a3a'], ['#9b5de5', '#ffffff'], ['#3fbf7f', '#ffffff'], ['#ff8ab0', '#ffffff']];
    STALLS.forEach((st, i) => {
      const g = new THREE.Group(); g.position.set(st.x, -42, st.z); g.rotation.y = -st.a + Math.PI / 2; S.add(g);
      add(new THREE.BoxGeometry(3.2, 0.9, 1.4), M.wood, [0, 0.45, 0], [1, 1, 1], [0, 0, 0], g);
      for (const [px, pz] of [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]]) add(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), M.wood, [px, 1.3, pz], [1, 1, 1], [0, 0, 0], g);
      const can = add(new THREE.BoxGeometry(3.6, 0.08, 2.0), toon(0xffffff, { rough: 0.8 }), [0, 2.65, 0.1], [1, 1, 1], [0.18, 0, 0], g); can.material.map = stripeTexture(...canopies[i]);
      this.stalls.push({ g, can, ...st });
      const ft = fruitTypes[i % fruitTypes.length];
      for (let k = 0; k < 22; k++) {
        const lx = -1.3 + (k % 8) * 0.37, lz = -0.45 + Math.floor(k / 8) * 0.38, ly = 0.9 + ft.r + (k > 15 ? ft.r * 1.4 : 0);
        const p = new THREE.Vector3(lx, ly, lz).applyEuler(g.rotation).add(g.position);
        this.fruits.push({ p, r: ft.r, c: ft.c, stall: i });
      }
    });
    // watermelons on stall 0 (one ends up on Pipo's head)
    this.fruits.push({ p: new THREE.Vector3(0, 0, 0).add(STALLS[1]).setY(-42 + 1.15), r: 0.32, c: 0x2f9a3a, stall: 1, melon: true });
    const fg = new THREE.SphereGeometry(1, 14, 10);
    this.fruitMesh = new THREE.InstancedMesh(fg, toon(0xffffff, { rough: 0.45 }), this.fruits.length);
    const m4 = new THREE.Matrix4(); this.fruits.forEach((f, i) => { m4.compose(f.p, new THREE.Quaternion(), new THREE.Vector3(f.r, f.r, f.r)); this.fruitMesh.setMatrixAt(i, m4); this.fruitMesh.setColorAt(i, new THREE.Color(f.c)); });
    this.fruitMesh.castShadow = true; this.fruitMesh.frustumCulled = false; S.add(this.fruitMesh);
    // clouds
    this.clouds = [];
    const cloudM = toon(0xffffff, { rough: 1, rim: 1.4 });
    for (let i = 0; i < 22; i++) {
      const g = new THREE.Group(); const a = r() * Math.PI * 2, R = 60 + r() * 260; g.position.set(Math.cos(a) * R, 25 + r() * 70, -120 + Math.sin(a) * R); S.add(g);
      for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(4 + r() * 4, 14, 10), cloudM, [(k - 2.5) * 4 + r() * 2, r() * 2, r() * 3], [1, 0.7, 1], [0, 0, 0], g, false);
      g.userData = { x: g.position.x, sp: 0.5 + r() }; this.clouds.push(g);
    }
  }
  focus(p, size = 16) { this.sun.position.set(p.x - 40, p.y + 70, p.z + 35); this.sun.target.position.copy(p); const c = this.sun.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.updateProjectionMatrix(); }
  update(t) {
    this.skyU.uTime.value = t; this.flagU.uTime.value = t; FREEZE.uTime.value = t;
    for (const g of this.islands) g.position.y = g.userData.y + Math.sin(t * 0.5 + g.userData.ph) * 1.2;
    for (const g of this.clouds) g.position.x = g.userData.x + t * g.userData.sp;
  }
  setFruit(i, pos, rot, scale = 1) { const f = this.fruits[i]; const m = new THREE.Matrix4().compose(pos, rot, new THREE.Vector3(f.r * scale, f.r * scale, f.r * scale)); this.fruitMesh.setMatrixAt(i, m); this.fruitMesh.instanceMatrix.needsUpdate = true; }
}
