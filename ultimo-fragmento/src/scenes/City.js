import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { NOISE } from '../effects/glsl.js';
import { rng } from '../core/util.js';
import { MorphPoints, Dust } from '../effects/Particles.js';

// The abandoned city (episodes 1–2). Same seed => identical layout in both
// episodes, which is what makes the episode-1 → episode-2 match cut exact.
export const CITY_SEED = 1999;

export function makeEnv(renderer) {
  if (!renderer) return null;
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return tex;
}

function buildingMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({ color: 0x1b2333, roughness: 0.82, metalness: 0.15, envMapIntensity: 0.25 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWN; uniform float uReveal, uCut, uTime, uLit, uBase, uScan; uniform vec3 uScanColor;
        ${NOISE}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float hRel = vWPos.y - uBase;
        if (hRel > uReveal) discard;
        if (hRel > uCut + (vnoise(vWPos * 0.6) - 0.5) * 3.0) discard;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 n = normalize(vWN);
          float side = 1.0 - step(0.6, abs(n.y));
          float u = abs(n.x) > abs(n.z) ? vWPos.z : vWPos.x;
          vec2 g = vec2(u / 2.4, vWPos.y / 3.3);
          vec2 f = fract(g); vec2 id = floor(g);
          float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.25, f.y) * step(f.y, 0.78) * side * step(2.5, vWPos.y);
          float h = hash12(id + floor(vWPos.x * 0.05) * 13.0 + floor(vWPos.z * 0.05) * 7.0);
          float lit = step(0.93, h) * (0.5 + 0.5 * sin(uTime * (1.0 + h * 5.0) + h * 40.0));
          float broken = step(h, 0.3);
          vec3 wc = mix(vec3(0.02, 0.05, 0.1), vec3(0.15, 0.5, 1.0) * 1.6 * lit, uLit);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.01, 0.015, 0.025), win * (1.0 - broken * 0.5));
          totalEmissiveRadiance += wc * win * (1.0 - broken);
          // grime streaks
          diffuseColor.rgb *= 0.75 + 0.35 * fbm(vec3(vWPos.x * 0.3, vWPos.y * 0.05, vWPos.z * 0.3));
          // materialisation scan edge + cut edge
          float e1 = smoothstep(1.2, 0.0, uReveal - hRel) * step(hRel, uReveal) * uScan;
          float e2 = smoothstep(1.5, 0.0, abs(hRel - uCut)) * step(uCut, 900.0);
          totalEmissiveRadiance += uScanColor * (e1 * 3.0 + e2 * 2.5);
          // faint wireframe edges while materialising
          totalEmissiveRadiance += uScanColor * 0.25 * uScan * (smoothstep(0.92, 1.0, f.x) + smoothstep(0.92, 1.0, f.y)) * side;
        }`);
  };
  m.customProgramCacheKey = () => 'city-building';
  return m;
}

export class City {
  constructor({ renderer, seed = CITY_SEED, zMin = -230, zMax = 40, particles = 70000 } = {}) {
    const r = rng(seed);
    this.group = new THREE.Group();
    this.shared = { uTime: { value: 0 }, uLit: { value: 0.6 }, uScanColor: { value: new THREE.Color(0x3aa0ff) } };
    this.buildings = [];
    const lots = [];
    for (const side of [-1, 1]) {
      let z = zMax;
      while (z > zMin) {
        const d = 7 + r() * 9, w = 7 + r() * 10, h = 14 + Math.pow(r(), 1.6) * 52;
        const x = side * (7.5 + w / 2 + r() * 1.5);
        lots.push({ x, z: z - d / 2, w, d, h, side });
        z -= d + 1 + r() * 3;
      }
      // second row, taller, for skyline depth
      z = zMax;
      while (z > zMin - 60) {
        const d = 10 + r() * 14, w = 10 + r() * 14, h = 30 + Math.pow(r(), 1.3) * 70;
        lots.push({ x: side * (32 + w / 2 + r() * 10), z: z - d / 2, w, d, h, side, back: true });
        z -= d + 2 + r() * 6;
      }
    }
    // far skyline ring
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2, R = 170 + r() * 60, w = 14 + r() * 20, h = 40 + r() * 90;
      lots.push({ x: Math.cos(a) * R, z: -60 + Math.sin(a) * R, w, d: w, h, far: true });
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    lots.forEach((L, i) => {
      const uniforms = { ...this.shared, uReveal: { value: 999 }, uCut: { value: 999 }, uBase: { value: 0 }, uScan: { value: 0 } };
      const mesh = new THREE.Mesh(geo, buildingMaterial(uniforms));
      mesh.scale.set(L.w, L.h, L.d); mesh.position.set(L.x, L.h / 2, L.z);
      mesh.castShadow = !L.far; mesh.receiveShadow = true;
      const b = { ...L, mesh, uniforms, id: i, broken: !L.far && r() < 0.45, seed: r(), pivot: new THREE.Group() };
      b.pivot.position.set(L.x, 0, L.z); mesh.position.set(0, L.h / 2, 0); b.pivot.add(mesh);
      // broken crown: tilted slabs on top
      if (b.broken) {
        for (let k = 0; k < 3; k++) {
          const s = new THREE.Mesh(geo, mesh.material);
          const sw = L.w * (0.3 + r() * 0.5), sd = L.d * (0.3 + r() * 0.5), sh = 2 + r() * 5;
          s.scale.set(sw, sh, sd); s.position.set((r() - 0.5) * L.w * 0.5, L.h + sh * 0.3, (r() - 0.5) * L.d * 0.5);
          s.rotation.set((r() - 0.5) * 0.6, r(), (r() - 0.5) * 0.6); s.castShadow = true; b.pivot.add(s);
        }
      }
      this.group.add(b.pivot); this.buildings.push(b);
    });

    // ground with road, cracks, puddles
    this.hole = { uHole: { value: new THREE.Vector3(1e4, 0, 0) } };
    this.groundUniforms = { uTime: this.shared.uTime, uCrack: { value: 0 }, ...this.hole };
    const gmat = new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.55, metalness: 0.2, envMapIntensity: 0.12 });
    gmat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.groundUniforms);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWPos; uniform float uTime, uCrack; uniform vec3 uHole;\n${NOISE}`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          float holeEdge = uHole.x + (vnoise(vec3(vWPos.xz * 0.35, 1.0)) - 0.5) * 5.0 + (vnoise(vec3(vWPos.xz * 1.7, 2.0)) - 0.5) * 1.2;
          if (uHole.y > 0.5 && vWPos.z > holeEdge) discard;`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float wet = smoothstep(0.55, 0.7, fbm(vec3(vWPos.xz * 0.15, 3.0)));
          roughnessFactor = mix(roughnessFactor, 0.3, wet);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float road = step(abs(vWPos.x), 5.0);
          float walk = step(5.0, abs(vWPos.x)) * step(abs(vWPos.x), 7.4);
          diffuseColor.rgb += vec3(0.05, 0.06, 0.08) * walk + vec3(0.06) * walk * step(0.92, fract(vWPos.z / 1.5));
          float lane = step(abs(vWPos.x), 0.12) * step(0.5, fract(vWPos.z / 6.0)) * road;
          diffuseColor.rgb = mix(diffuseColor.rgb * 1.6, diffuseColor.rgb, road);
          diffuseColor.rgb += vec3(0.25, 0.22, 0.12) * lane * 0.6;
          float n = fbm(vec3(vWPos.xz * 0.5, 1.0));
          diffuseColor.rgb *= 0.7 + 0.5 * n;
          float crack = smoothstep(0.008, 0.0, abs(fbm(vec3(vWPos.xz * 0.25, 7.0)) - 0.5)) * step(0.4, fbm(vec3(vWPos.xz * 0.1, 2.0)));
          diffuseColor.rgb *= 1.0 - crack * 0.7;
          totalEmissiveRadiance += vec3(0.5, 0.2, 1.0) * crack * uCrack * 2.0;
          totalEmissiveRadiance += vec3(0.6, 0.25, 1.0) * smoothstep(0.7, 0.0, holeEdge - vWPos.z) * 0.6 * uHole.z * uHole.y;`);
    };
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700, 1, 1), gmat);
    this.ground.rotation.x = -Math.PI / 2; this.ground.position.z = -80; this.ground.receiveShadow = true;
    this.group.add(this.ground);

    // rubble & wrecks (instanced)
    const rubGeo = new THREE.DodecahedronGeometry(1, 0);
    const n = 900; const rubMat = new THREE.MeshStandardMaterial({ color: 0x2b3240, roughness: 0.95, flatShading: true });
    rubMat.onBeforeCompile = (sh) => {
      sh.uniforms.uHole = this.hole.uHole;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec3 uHole;').replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
        #endif
        float dzz = max(0.0, mvPosition.z - uHole.x + 2.0); mvPosition.y -= uHole.y * pow(dzz, 1.6) * 1.4;
        mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`);
    };
    this.rubble = new THREE.InstancedMesh(rubGeo, rubMat, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const pile = Math.floor(r() * 30); const pz = zMax - (pile / 30) * (zMax - zMin) + (r() - 0.5) * 6;
      const side = r() < 0.5 ? -1 : 1, off = r();
      const px = side * (4.6 + off * 3.5);
      const s = (0.08 + Math.pow(r(), 3) * 1.1) * (0.35 + 0.65 * off);
      p.set(px, s * 0.4, pz); e.set(r() * 3, r() * 3, r() * 3); q.setFromEuler(e); sc.set(s * (0.6 + r()), s * (0.4 + r() * 0.6), s * (0.6 + r()));
      m4.compose(p, q, sc); this.rubble.setMatrixAt(i, m4);
    }
    this.rubble.castShadow = true; this.rubble.receiveShadow = true; this.group.add(this.rubble);
    // abandoned cars
    const carMat = new THREE.MeshStandardMaterial({ color: 0x2c3442, roughness: 0.5, metalness: 0.6 });
    for (let i = 0; i < 10; i++) {
      const car = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), carMat); body.position.y = 0.5; car.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), carMat); cab.position.set(0, 1.1, -0.3); car.add(cab);
      car.position.set((r() < 0.5 ? -1 : 1) * (3.6 + r() * 1.0), 0, -16 - r() * (-16 - zMin - 20));
      car.rotation.set(0, r() * 0.8 - 0.4 + (r() < 0.2 ? Math.PI / 2 : 0), (r() - 0.5) * 0.2);
      car.traverse((o) => { o.castShadow = o.receiveShadow = true; });
      this.group.add(car); (this.cars ||= []).push(car);
    }

    // particles that build the buildings (sampled on box surfaces, edges favoured)
    const near = this.buildings.filter((b) => !b.far);
    const areas = near.map((b) => b.h * (b.w + b.d));
    const total = areas.reduce((a, b) => a + b, 0);
    this.particles = new MorphPoints({
      count: particles, seed: seed + 1, size: 0.32, color: 0x2f7dff, color2: 0x9fe0ff, span: 0.45,
      start: (i, rr) => { const a = rr() * Math.PI * 2, R = 30 + rr() * 140; return [Math.cos(a) * R, 60 + rr() * 140, -60 + Math.sin(a) * R]; },
      target: (i, rr) => {
        let k = rr() * total, j = 0; while (k > areas[j] && j < areas.length - 1) { k -= areas[j]; j++; }
        const b = near[j]; const face = rr();
        let x, z; const y = rr() * b.h;
        if (face < 0.5) { x = b.x + (rr() < 0.5 ? -1 : 1) * b.w / 2; z = b.z + (rr() - 0.5) * b.d; } else { z = b.z + (rr() < 0.5 ? -1 : 1) * b.d / 2; x = b.x + (rr() - 0.5) * b.w; }
        // snap some to edges & floor lines
        const yy = rr() < 0.4 ? Math.round(y / 3.3) * 3.3 : y;
        return [x, Math.min(yy, b.h), z];
      },
      delay: (i, rr) => rr() * 0.55,
    });
    this.group.add(this.particles.points);
    this.dust = new Dust({ count: 2500, box: [40, 24, 140], center: [0, 12, -50], color: 0x7fb2ff, size: 0.09, rise: 0.25, opacity: 0.8 });
    this.group.add(this.dust.points);

    // lighting
    this.hemi = new THREE.HemisphereLight(0x3a5a8c, 0x0a0c12, 0.55); this.group.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x9cc0ff, 1.4);
    this.moon.position.set(-30, 60, 20); this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(1024, 1024);
    const sc2 = this.moon.shadow.camera; sc2.left = -14; sc2.right = 14; sc2.top = 14; sc2.bottom = -14; sc2.near = 1; sc2.far = 160;
    this.moon.shadow.bias = -0.0008; this.moon.shadow.normalBias = 0.02;
    this.group.add(this.moon); this.group.add(this.moon.target);
    this.env = makeEnv(renderer);
  }
  // keep the shadow frustum around the action
  focus(x, y, z) { this.moon.position.set(x - 30, y + 60, z + 20); this.moon.target.position.set(x, y, z); }
  // building reveal height (0 → hidden, 1 → full) with a per-building stagger
  setReveal(k, scan = 1) {
    for (const b of this.buildings) {
      const local = Math.max(0, Math.min(1, (k - b.seed * 0.35) / 0.65));
      b.uniforms.uReveal.value = local >= 1 ? 999 : (local * (b.h + 8)) - 0.01;
      b.uniforms.uScan.value = scan;
    }
  }
  setTime(t) { this.shared.uTime.value = t; }
}
