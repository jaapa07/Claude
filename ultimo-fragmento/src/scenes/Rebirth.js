import * as THREE from 'three';
import { NOISE } from '../effects/glsl.js';
import { rng, smooth, clamp } from '../core/util.js';
import { Sky } from '../effects/Sky.js';
import { makeEnv } from './City.js';

// The restored universe (episode 5): hills, a forest that grows in a wave, an
// ocean that floods in, a warm city that rises, and the stars coming back.
export const HILL = new THREE.Vector3(0, 0, 0);
const heightAt = (x, z) => {
  const d = Math.hypot(x, z);
  return 6 * Math.exp(-d * d / 300) + 3 * Math.sin(x * 0.05) * Math.cos(z * 0.04) + 2 * Math.sin(x * 0.11 + z * 0.07) - Math.max(0, (z + 40) * -0.06) * 0;
};
export function groundY(x, z) { return heightAt(x, z) - Math.max(0, -z - 60) * 0.12; }

export class Rebirth {
  constructor({ renderer, seed = 555 } = {}) {
    const r = rng(seed);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xe8b48a, 60, 420);
    this.sky = new Sky({ top: 0x1a2f6a, horizon: 0xffb27a, bottom: 0x2a3550, stars: 0 });
    this.sky.uniforms.uWarm.value = 0.85; this.scene.add(this.sky.mesh);
    this.scene.environment = makeEnv(renderer); this.scene.environmentIntensity = 0.6;
    this.hemi = new THREE.HemisphereLight(0xffe2c0, 0x30406a, 1.2); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffc48a, 2.6); this.sun.position.set(-80, 40, -160); this.scene.add(this.sun);
    // terrain
    const tg = new THREE.PlaneGeometry(700, 700, 160, 160); tg.rotateX(-Math.PI / 2);
    const pos = tg.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = groundY(x, z); pos.setY(i, y);
      const g = clamp((y + 4) / 10); col.set([0.25 + 0.15 * g, 0.42 + 0.2 * g, 0.22], i * 3);
      if (y < 0.4) col.set([0.75, 0.68, 0.5], i * 3);
    }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
    this.terrainU = { uGreen: { value: 0 } };
    const tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    tm.onBeforeCompile = (sh) => { sh.uniforms.uGreen = this.terrainU.uGreen; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGreen;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(vec3(0.16, 0.15, 0.17), diffuseColor.rgb, uGreen);'); };
    this.terrain = new THREE.Mesh(tg, tm); this.terrain.receiveShadow = true; this.scene.add(this.terrain);
    // forest (instanced), growth order = distance from the hill
    const N = 1800; const trunk = new THREE.CylinderGeometry(0.15, 0.25, 1.2, 5); trunk.translate(0, 0.6, 0);
    const crown = new THREE.ConeGeometry(1.1, 3.2, 7); crown.translate(0, 2.6, 0);
    this.trunks = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x5a3d2a, roughness: 1 }), N);
    this.crowns = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ color: 0x2f7d4a, roughness: 0.9, flatShading: true }), N);
    this.trees = [];
    for (let i = 0; i < N; i++) {
      let x, z; do { x = (r() - 0.5) * 300; z = -20 - r() * 200 + 60; } while (Math.hypot(x, z) < 9 || groundY(x, z) < 0.8 || (x > 40 && z < -60));
      this.trees.push({ x, z, y: groundY(x, z), s: 0.7 + r() * 1.1, d: Math.hypot(x, z), rot: r() * 6 });
      this.crowns.setColorAt(i, new THREE.Color().setHSL(0.3 + r() * 0.08, 0.45, 0.25 + r() * 0.12));
    }
    this.scene.add(this.trunks, this.crowns);
    // ocean
    this.waterU = { uTime: { value: 0 }, uAlpha: { value: 0 } };
    this.ocean = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 1, 1), new THREE.ShaderMaterial({
      transparent: true, uniforms: this.waterU,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime, uAlpha; varying vec3 vW; ${NOISE}
        void main(){ vec3 V = normalize(cameraPosition - vW); float f = pow(1.0 - max(V.y, 0.0), 4.0);
          float n = fbm(vec3(vW.xz * 0.08, uTime * 0.3)); float g = smoothstep(0.62, 0.8, fbm(vec3(vW.xz * 0.3, uTime * 0.6)));
          vec3 c = mix(vec3(0.03, 0.2, 0.32), vec3(0.95, 0.62, 0.42), f * 0.85) + vec3(1.0, 0.85, 0.6) * g * 0.6 * (0.3 + f) + n * 0.04;
          gl_FragColor = vec4(c, uAlpha * (0.8 + 0.2 * f)); }`,
    }));
    this.ocean.rotation.x = -Math.PI / 2; this.scene.add(this.ocean);
    // city on the coast
    const M = 260; this.city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: 0.6, emissive: 0xffb060, emissiveIntensity: 0.0 }), M);
    const cm = this.city.material; this.cityU = { uLit: { value: 0 } };
    cm.onBeforeCompile = (sh) => {
      sh.uniforms.uLit = this.cityU.uLit;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP; varying vec3 vLN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = (instanceMatrix * vec4(position, 1.0)).xyz; vLN = normal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vLP; varying vec3 vLN; uniform float uLit;\n${NOISE}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          vec2 g = vec2((abs(vLN.x) > 0.5 ? vLP.z : vLP.x) / 1.4, vLP.y / 1.8); vec2 f = fract(g);
          float w = step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.75) * (1.0 - step(0.5, abs(vLN.y)));
          totalEmissiveRadiance += vec3(1.0, 0.7, 0.35) * w * step(0.35, hash12(floor(g) + floor(vLP.xz))) * uLit * 2.2;`);
    };
    this.blocks = [];
    for (let i = 0; i < M; i++) {
      const x = 55 + r() * 70, z = -70 - r() * 80, w = 2 + r() * 4, h = 4 + Math.pow(r(), 2) * 30;
      this.blocks.push({ x, z, w, d: 2 + r() * 4, h, y: Math.max(0.5, groundY(x, z)), t: r() });
    }
    this.scene.add(this.city);
    // stars returning
    const S = 3000, sp = new Float32Array(S * 3);
    for (let i = 0; i < S; i++) { const u = r() * 0.9 + 0.1, a = r() * 6.283, k = Math.sqrt(1 - u * u); sp.set([Math.cos(a) * k * 600, u * 600, Math.sin(a) * k * 600], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdde8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.scene.add(this.stars);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
  }
  update(t, { forest = 1, ocean = 1, city = 1, stars = 1, green = 1 } = {}) {
    const { _m, _q, _s, _p, _e } = this;
    this.terrainU.uGreen.value = green;
    this.trees.forEach((tr, i) => {
      const k = clamp(forest * 1.6 - tr.d / 160); const e = k < 1 ? 1 - Math.pow(1 - k, 3) * (1 + 0) : 1;
      const sc = tr.s * e * (1 + 0.15 * Math.sin(k * Math.PI));
      _p.set(tr.x, tr.y - 0.2, tr.z); _e.set(0, tr.rot, Math.sin(t * 0.8 + tr.x) * 0.02); _q.setFromEuler(_e); _s.setScalar(Math.max(sc, 0.0001)); _m.compose(_p, _q, _s);
      this.trunks.setMatrixAt(i, _m); this.crowns.setMatrixAt(i, _m);
    });
    this.trunks.instanceMatrix.needsUpdate = this.crowns.instanceMatrix.needsUpdate = true;
    this.waterU.uTime.value = t; this.waterU.uAlpha.value = ocean; this.ocean.position.y = -4 + 4.3 * ocean; this.ocean.visible = ocean > 0.001;
    this.blocks.forEach((b, i) => {
      const k = clamp(city * 1.5 - b.t * 0.5); const e = 1 - Math.pow(1 - k, 3);
      const h = Math.max(0.001, b.h * e); _p.set(b.x, b.y + h / 2 - 0.5, b.z); _q.identity(); _s.set(b.w, h, b.d); _m.compose(_p, _q, _s); this.city.setMatrixAt(i, _m);
    });
    this.city.instanceMatrix.needsUpdate = true; this.cityU.uLit.value = city;
    this.stars.material.opacity = stars;
    this.sky.uniforms.uTime.value = t; this.sky.uniforms.uWarm.value = 0.85 - 0.35 * stars; this.sky.uniforms.uStars.value = stars;
  }
}
