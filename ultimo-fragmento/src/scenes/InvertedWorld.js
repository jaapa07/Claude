import * as THREE from 'three';
import { NOISE } from '../effects/glsl.js';
import { rng, smooth, clamp } from '../core/util.js';
import { Sky } from '../effects/Sky.js';
import { Dust } from '../effects/Particles.js';
import { GoldenGiant } from '../characters/GoldenGiant.js';
import { Portal } from '../effects/Portal.js';
import { makeEnv } from './City.js';

// Episode 3/4 world on the other side of the fall: gravity is upside down,
// islands float (some hang inverted), clocks drift apart, oceans hover as
// water bodies, and a golden guardian watches. NEO floats at the origin.
export const GIANT_POS = new THREE.Vector3(-6, -12, -58);
export const PORTAL_POS = new THREE.Vector3(9, 2.2, -16);

function island(r, size, mats) {
  const g = new THREE.Group();
  const rock = new THREE.ConeGeometry(size, size * 1.9, 9, 4); rock.rotateX(Math.PI); rock.translate(0, -size * 0.95, 0);
  const pos = rock.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); const k = 0.75 + r() * 0.5; if (y < -0.01) { pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); } }
  rock.computeVertexNormals();
  g.add(new THREE.Mesh(rock, mats.rock));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(size * 1.02, size * 0.98, size * 0.18, 18), mats.grass); top.position.y = size * 0.02; g.add(top);
  for (let i = 0; i < 3 + size * 2; i++) {
    const a = r() * 6.28, d = r() * size * 0.75, h = size * (0.25 + r() * 0.35);
    const tr = new THREE.Mesh(new THREE.ConeGeometry(h * 0.32, h, 7), mats.tree); tr.position.set(Math.cos(a) * d, size * 0.1 + h / 2, Math.sin(a) * d); g.add(tr);
  }
  // waterfall falling *upwards*
  if (r() < 0.5) { const wf = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.25, size * 3), mats.fall); wf.position.set(size * 0.8, size * 1.5, 0); wf.rotation.y = Math.PI / 2; g.add(wf); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return g;
}

function gearGeometry(R, teeth = 16, depth = 0.2) {
  const s = new THREE.Shape(); const n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; const rr = (i % 4 < 2) ? R : R * 0.86; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const hole = new THREE.Path(); hole.absarc(0, 0, R * 0.3, 0, Math.PI * 2, true); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -depth / 2); return g;
}

function clockFace() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, '#fff7e6'); gr.addColorStop(1, '#d8c9a6');
  g.fillStyle = gr; g.beginPath(); g.arc(256, 256, 250, 0, 6.29); g.fill();
  g.strokeStyle = '#3b2f1e'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#3b2f1e'; g.font = '700 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  roman.forEach((n, i) => { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; g.save(); g.translate(256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190); g.rotate(a + Math.PI / 2); g.fillText(n, 0, 0); g.restore(); });
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; g.lineWidth = i % 5 ? 2 : 5; g.beginPath(); g.moveTo(256 + Math.cos(a) * 232, 256 + Math.sin(a) * 232); g.lineTo(256 + Math.cos(a) * (i % 5 ? 222 : 212), 256 + Math.sin(a) * (i % 5 ? 222 : 212)); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function waterMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    transparent: true, uniforms, side: THREE.DoubleSide,
    vertexShader: `uniform float uTime; varying vec3 vN; varying vec3 vW; varying vec3 vP;
      ${NOISE}
      void main(){ vec3 p = position; float w = (vnoise(p * 0.35 + uTime * 0.6) - 0.5) * 0.9 + sin(p.x * 0.5 + uTime * 1.3) * 0.15;
        p += normal * w; vP = position; vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uTime, uAlpha; varying vec3 vN; varying vec3 vW; varying vec3 vP;
      ${NOISE}
      void main(){ vec3 V = normalize(cameraPosition - vW); float f = pow(1.0 - abs(dot(normalize(vN), V)), 2.5);
        float caust = smoothstep(0.55, 0.8, fbm(vP * 0.6 + vec3(0.0, uTime * 0.5, 0.0)));
        vec3 deep = vec3(0.02, 0.18, 0.32), shallow = vec3(0.1, 0.65, 0.8);
        vec3 c = mix(deep, shallow, f) + vec3(0.7, 1.0, 1.0) * caust * 0.35 + vec3(1.0, 0.9, 0.7) * pow(f, 6.0) * 0.8;
        gl_FragColor = vec4(c, (0.55 + 0.4 * f) * uAlpha); }`,
  });
}

export class InvertedWorld {
  constructor({ renderer, seed = 303 } = {}) {
    const r = rng(seed);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x2a3a5c, 0.004);
    this.sky = new Sky({ top: 0x071034, horizon: 0xb8705e, bottom: 0x241a4d, nebula: 0x7a3f9c, stars: 1 });
    this.scene.add(this.sky.mesh);
    this.scene.environment = makeEnv(renderer); this.scene.environmentIntensity = 0.5;
    this.scene.add(new THREE.HemisphereLight(0xffd9a8, 0x3a4f8a, 1.1));
    const sun = new THREE.DirectionalLight(0xffc890, 2.2); sun.position.set(30, 40, 20); this.scene.add(sun);
    const mats = {
      rock: new THREE.MeshStandardMaterial({ color: 0x6b5a73, roughness: 0.9, flatShading: true }),
      grass: new THREE.MeshStandardMaterial({ color: 0x5fae7a, roughness: 0.8, flatShading: true }),
      tree: new THREE.MeshStandardMaterial({ color: 0x2f7d5b, roughness: 0.8, flatShading: true }),
      fall: new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
    };
    this.islands = [];
    for (let i = 0; i < 16; i++) {
      const size = 2 + r() * 7; const g = island(r, size, mats);
      const a = r() * Math.PI * 2, d = 18 + r() * 70; const inv = i % 3 === 0;
      g.position.set(Math.cos(a) * d, (inv ? 18 + r() * 30 : -8 - r() * 25) * (0.6 + d / 120), Math.sin(a) * d - 25);
      if (inv) g.rotation.z = Math.PI; g.rotation.y = r() * 6;
      g.userData = { base: g.position.clone(), ph: r() * 10, rise: 8 + r() * 14, t0: 4.6 + r() * 3.2 };
      this.scene.add(g); this.islands.push(g);
    }
    // disassembled clocks: face, rim, gears and hands drifting apart
    this.clocks = [];
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.9, roughness: 0.3 });
    const face = new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.6, side: THREE.DoubleSide });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b2118, metalness: 0.6, roughness: 0.4 });
    for (const [cx, cy, cz, sc] of [[-14, 9, -20, 3.2], [24, 15, -38, 4.5], [-26, -8, -40, 5.5], [30, 26, -72, 7]]) {
      const c = new THREE.Group(); c.position.set(cx, cy, cz); c.scale.setScalar(sc); c.lookAt(0, 0, 0);
      const pieces = [];
      const add = (m, dx, dy, dz, sp) => { c.add(m); pieces.push({ m, d: new THREE.Vector3(dx, dy, dz), sp }); };
      add(new THREE.Mesh(new THREE.CircleGeometry(1, 48), face), 0, 0, 0, 0.05);
      add(new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.07, 10, 48), brass), 0, 0, 0.5, 0.1);
      for (let k = 0; k < 5; k++) add(new THREE.Mesh(gearGeometry(0.25 + r() * 0.35, 10 + Math.floor(r() * 10), 0.08), brass), (r() - 0.5) * 2.4, (r() - 0.5) * 2.4, -0.4 - r() * 1.2, (r() - 0.5) * 3);
      const hh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.03), dark); hh.geometry.translate(0, 0.25, 0); add(hh, 0.6, 0.9, 0.8, 0.4);
      const mh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.03), dark); mh.geometry.translate(0, 0.4, 0); add(mh, -0.7, 0.4, 1.1, -0.7);
      c.userData = { pieces, ph: r() * 5 }; this.scene.add(c); this.clocks.push(c);
    }
    // suspended oceans
    this.waterU = { uTime: { value: 0 }, uAlpha: { value: 1 } };
    const wm = waterMaterial(this.waterU);
    this.oceans = [];
    for (const [x, y, z, s] of [[22, 6, -30, 9], [-30, 16, -52, 13], [4, -18, -26, 6], [38, 26, -80, 16]]) {
      const o = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), wm); o.position.set(x, y, z); o.scale.set(s, s * 0.55, s); o.userData = { s, t0: 6.0 + r() * 2.5 };
      this.scene.add(o); this.oceans.push(o);
    }
    // an inverted sea hanging overhead
    this.topSea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 80, 80), wm); this.topSea.rotation.x = Math.PI / 2; this.topSea.position.y = 70; this.scene.add(this.topSea);
    this.motes = new Dust({ count: 3000, box: [120, 70, 120], center: [0, 5, -30], color: 0xffd9a0, size: 0.12, rise: -0.6, seed: 5, opacity: 0.8 });
    this.scene.add(this.motes.points);
    this.giant = new GoldenGiant(); this.giant.group.position.copy(GIANT_POS); this.giant.group.rotation.y = 0.12; this.scene.add(this.giant.group);
    this.portal = new Portal({ radius: 3.2 }); this.portal.group.position.copy(PORTAL_POS); this.portal.group.lookAt(0, 1, 6); this.scene.add(this.portal.group);
  }
  update(t, { reveal = 1, form = 0, point = 0, portal = 0, giant = 1 } = {}) {
    this.sky.uniforms.uTime.value = t; this.waterU.uTime.value = t; this.motes.uniforms.uTime.value = t;
    for (const g of this.islands) {
      const u = g.userData, k = smooth(u.t0, u.t0 + 2.4, t) * reveal;
      g.position.set(u.base.x, u.base.y + Math.sin(t * 0.4 + u.ph) * 0.8 - (1 - k) * u.rise * Math.sign(u.base.y || 1), u.base.z);
      g.scale.setScalar(Math.max(0.001, k)); g.visible = k > 0.001;
    }
    for (const c of this.clocks) {
      const k = smooth(5.2, 9.0, t) * reveal; c.visible = k > 0.001; c.scale.setScalar(c.scale.x);
      c.userData.pieces.forEach((p, i) => { p.m.position.copy(p.d).multiplyScalar(0.3 + k * (1 + Math.sin(t * 0.3 + i) * 0.1)); p.m.rotation.z = t * p.sp; });
      c.rotation.z = Math.sin(t * 0.2 + c.userData.ph) * 0.3;
    }
    for (const o of this.oceans) { const k = smooth(o.userData.t0, o.userData.t0 + 2, t) * reveal; o.visible = k > 0.01; const s = o.userData.s * k; o.scale.set(s, s * 0.55, s); o.rotation.y = t * 0.1; }
    this.topSea.visible = reveal > 0.01; this.waterU.uAlpha.value = clamp(reveal);
    this.giant.update(t, form, point, giant); this.giant.group.visible = form > 0.001;
    this.portal.update(t, portal);
  }
}
