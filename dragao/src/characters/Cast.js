import * as THREE from 'three';
import { toon } from './materials.js';
import { NOISE } from '../effects/glsl.js';
import { clamp, lerp, rng } from '../core/util.js';

const add = (g, m, parent, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) => { const o = new THREE.Mesh(g, m); o.position.set(...p); o.scale.set(...s); o.rotation.set(...r); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; parent.add(o); return o; };
const sph = (r, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h);

function cartoonEyes(parent, M, { r, sep, y, z, iris = 0x1b0d16, white = true }) {
  return [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * sep, y, z); parent.add(g);
    if (white) add(sph(r, 18, 14), M.white, g, [0, 0, 0], [0.85, 1.1, 0.6]);
    const pupil = add(sph(r * (white ? 0.6 : 1), 16, 12), toon(iris, { rough: 0.25, rim: 0 }), g, [0, 0, r * (white ? 0.45 : 0)], [0.85, 1.1, 0.5]);
    add(sph(r * 0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), g, [r * 0.22, r * 0.35, r * 0.75]);
    const lid = add(new THREE.SphereGeometry(r * 1.08, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.skin, g, [0, 0, 0], [0.85, 1.1, 0.62]);
    return { g, pupil, lid, s, r };
  });
}
function setEyes(eyes, open, lx = 0, ly = 0, big = 1) {
  for (const e of eyes) { e.g.scale.setScalar(big); e.pupil.position.x = lx * e.r * 0.35; e.pupil.position.y = ly * e.r * 0.35; const c = clamp(1 - open, 0, 1); e.lid.rotation.x = -Math.PI / 2 + c * Math.PI / 2 - 0.1; e.lid.visible = c > 0.02; }
}

// LUNA — tiny fairy: purple hair, yellow dress, transparent iridescent wings
export class Luna {
  constructor() {
    this.root = new THREE.Group(); this.group = new THREE.Group(); this.root.add(this.group);
    const M = { skin: toon(0xffd2b3, { rough: 0.6 }), hair: toon(0x9b4dff, { rough: 0.5 }), dress: toon(0xffd23a, { rough: 0.55 }), white: toon(0xffffff, { rough: 0.2, rim: 0.2 }), mouth: toon(0x7a1a2a, { rim: 0 }), shoe: toon(0x7a3fd0) };
    const g = this.group;
    this.body = new THREE.Group(); this.body.position.y = 0.1; g.add(this.body);
    add(new THREE.ConeGeometry(0.055, 0.1, 20, 1, true), M.dress, this.body, [0, 0.0, 0]).material.side = THREE.DoubleSide;
    add(sph(0.028), M.dress, this.body, [0, 0.055, 0], [1, 1.1, 0.9]);
    add(new THREE.TorusGeometry(0.054, 0.006, 6, 24), M.dress, this.body, [0, -0.05, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) { add(new THREE.CapsuleGeometry(0.006, 0.04, 4, 8), M.skin, this.body, [s * 0.016, -0.075, 0]); add(sph(0.01), M.shoe, this.body, [s * 0.016, -0.1, 0.005], [1, 0.7, 1.5]); }
    this.arms = [-1, 1].map((s) => { const sh = new THREE.Group(); sh.position.set(s * 0.026, 0.07, 0); this.body.add(sh); add(new THREE.CapsuleGeometry(0.0055, 0.045, 4, 8), M.skin, sh, [0, -0.026, 0]); add(sph(0.008), M.skin, sh, [0, -0.054, 0]); return { sh, s }; });
    this.head = new THREE.Group(); this.head.position.y = 0.125; this.body.add(this.head);
    add(sph(0.05), M.skin, this.head, [0, 0, 0], [1, 1.02, 0.95]);
    add(sph(0.056), M.hair, this.head, [0, 0.012, -0.008], [1.04, 1.0, 1.0]).scale.set(1.04, 0.98, 1.0);
    add(sph(0.026), M.hair, this.head, [0, 0.06, -0.02]);                       // bun
    for (let i = -2; i <= 2; i++) add(sph(0.016), M.hair, this.head, [i * 0.016, 0.034, 0.04], [1, 0.8, 0.7]); // bangs
    this.pony = new THREE.Group(); this.pony.position.set(0, 0.03, -0.05); this.head.add(this.pony);
    for (let i = 0; i < 4; i++) add(sph(0.018 - i * 0.003), M.hair, this.pony, [0, -i * 0.022, -i * 0.012]);
    this.eyes = cartoonEyes(this.head, M, { r: 0.014, sep: 0.02, y: 0.0, z: 0.042, iris: 0x4a1a7a });
    this.mouth = add(sph(0.008), M.mouth, this.head, [0, -0.025, 0.046], [1.2, 0.3, 0.6]);
    for (const s of [-1, 1]) add(new THREE.CircleGeometry(0.008, 12), new THREE.MeshBasicMaterial({ color: 0xff8ab0, transparent: true, opacity: 0.6 }), this.head, [s * 0.03, -0.012, 0.043], [1.3, 0.8, 1], [0, s * 0.5, 0]);
    // wand
    this.wand = new THREE.Group(); this.arms[1].sh.add(this.wand); this.wand.position.set(0, -0.055, 0.01);
    add(new THREE.CylinderGeometry(0.002, 0.002, 0.05, 6), toon(0xffffff), this.wand, [0, 0, 0.02], [1, 1, 1], [Math.PI / 2, 0, 0]);
    this.star = add(new THREE.OctahedronGeometry(0.01, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.2) }), this.wand, [0, 0, 0.048]);
    // wings: iridescent membranes
    this.wingU = { uTime: { value: 0 } };
    const wm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: this.wingU,
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ vec2 p = vUv - 0.5; float d = length(p * vec2(1.0, 1.6)); if (d > 0.5) discard;
          float f = 1.0 - abs(dot(normalize(vN), vV)); vec3 rain = 0.5 + 0.5 * cos(6.2831 * (f * 1.5 + vUv.x + vec3(0.0, 0.33, 0.67)) + uTime);
          float vein = smoothstep(0.02, 0.0, abs(fract(atan(p.y, p.x) * 1.2) - 0.5) * d);
          float edge = smoothstep(0.42, 0.5, d);
          gl_FragColor = vec4(mix(vec3(0.85, 0.95, 1.0), rain, 0.55) + vein * 0.4 + edge, 0.28 + edge * 0.5 + f * 0.25); }` });
    this.wings = [];
    for (const s of [-1, 1]) for (const [sz, y, a] of [[0.075, 0.07, 0.5], [0.055, 0.03, -0.35]]) {
      const piv = new THREE.Group(); piv.position.set(s * 0.008, y, -0.02); this.body.add(piv);
      const m = add(new THREE.PlaneGeometry(sz, sz * 0.62), wm, piv, [s * sz * 0.45, 0, 0], [1, 1, 1], [0, 0, s * a]); m.castShadow = false;
      this.wings.push({ piv, s });
    }
  }
  pose(p = {}, t = 0) {
    this.wingU.uTime.value = t;
    this.body.position.y = 0.1 + Math.sin(t * 3.2) * 0.006 * (p.hover ?? 1);
    this.body.rotation.set(p.lean ?? 0, p.turn ?? 0, Math.sin(t * 2.1) * 0.05 + (p.tilt ?? 0));
    this.head.rotation.set(-(p.lookUp ?? 0) * 0.5, (p.headYaw ?? 0) * 0.6, (p.tilt ?? 0) * 0.6 + Math.sin(t * 1.7) * 0.06);
    this.pony.rotation.set(Math.sin(t * 4) * 0.2, 0, Math.sin(t * 3) * 0.2);
    setEyes(this.eyes, p.eyeOpen ?? 1, p.lookX ?? 0, p.lookY ?? 0, p.eyeBig ?? 1);
    const m = p.mouth ?? 0; this.mouth.scale.set(1.2 - m * 0.2, 0.3 + m * 1.2, 0.6);
    for (const w of this.wings) w.piv.rotation.set(0, w.s * (0.3 + Math.sin(t * 38) * 0.55), 0);
    this.arms.forEach((a, i) => { const up = i ? (p.armR ?? 0.3) : (p.armL ?? 0); a.sh.rotation.set(lerp(0.1, -2.6, up) + (i ? Math.sin(t * 5) * 0.15 * (p.wave ?? 0) : 0), 0, a.s * (0.35 + (p.cheer ?? 0) * 0.6)); });
  }
}

// REI GORAN — short, round, white beard, golden crown, red cape. Very dramatic.
export class King {
  constructor() {
    this.root = new THREE.Group(); this.group = new THREE.Group(); this.root.add(this.group);
    const M = { skin: toon(0xffc9a5), beard: toon(0xf6f4ef, { rough: 0.9 }), tunic: toon(0x2f5fd0), gold: toon(0xffc23a, { rough: 0.25, metal: 0.8 }), cape: toon(0xd0182a, { side: THREE.DoubleSide }), fur: toon(0xffffff, { rough: 1 }), boot: toon(0x4a2a18), white: toon(0xffffff, { rough: 0.2, rim: 0.2 }), mouth: toon(0x6a1426, { rim: 0 }), gem: new THREE.MeshStandardMaterial({ color: 0xff2050, emissive: 0x801020, roughness: 0.1 }) };
    this.body = new THREE.Group(); this.body.position.y = 0.3; this.group.add(this.body);
    this.belly = add(sph(0.3), M.tunic, this.body, [0, 0.12, 0], [1, 0.95, 0.95]);
    add(new THREE.TorusGeometry(0.29, 0.03, 8, 30), M.gold, this.body, [0, 0.05, 0], [1, 1, 0.95], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * 0.13, -0.12, 0); this.body.add(l); add(new THREE.CapsuleGeometry(0.06, 0.08, 4, 10), M.tunic, l, [0, -0.04, 0]); add(sph(0.075), M.boot, l, [0, -0.13, 0.03], [1, 0.6, 1.4]); (this.legs ||= []).push(l); }
    this.arms = [-1, 1].map((s) => { const sh = new THREE.Group(); sh.position.set(s * 0.27, 0.28, 0); this.body.add(sh); add(new THREE.CapsuleGeometry(0.055, 0.16, 4, 10), M.tunic, sh, [0, -0.1, 0]); add(sph(0.055), M.skin, sh, [0, -0.22, 0]); return { sh, s }; });
    this.head = new THREE.Group(); this.head.position.y = 0.52; this.body.add(this.head);
    add(sph(0.17), M.skin, this.head, [0, 0, 0]);
    add(sph(0.05), M.skin, this.head, [0, -0.01, 0.17], [1, 0.9, 0.9]); // big nose
    this.beard = add(new THREE.ConeGeometry(0.17, 0.42, 18), M.beard, this.head, [0, -0.2, 0.08], [1, 1, 0.55], [Math.PI, 0, 0]);
    for (const s of [-1, 1]) add(new THREE.CapsuleGeometry(0.03, 0.1, 4, 8), M.beard, this.head, [s * 0.065, -0.055, 0.155], [1, 1, 1], [0, 0, s * 1.2]);  // mustache
    this.mouth = add(sph(0.045), M.mouth, this.head, [0, -0.1, 0.15], [1.2, 0.1, 0.5]);
    this.eyes = cartoonEyes(this.head, M, { r: 0.032, sep: 0.06, y: 0.05, z: 0.14 });
    this.brows = [-1, 1].map((s) => add(new THREE.CapsuleGeometry(0.018, 0.06, 4, 8), M.beard, this.head, [s * 0.065, 0.1, 0.15], [1, 1, 0.7], [0, 0, Math.PI / 2]));
    // crown
    this.crown = new THREE.Group(); this.crown.position.y = 0.14; this.head.add(this.crown);
    add(new THREE.CylinderGeometry(0.13, 0.12, 0.08, 24, 1, true), M.gold, this.crown).material.side = THREE.DoubleSide;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(new THREE.ConeGeometry(0.025, 0.07, 6), M.gold, this.crown, [Math.cos(a) * 0.125, 0.07, Math.sin(a) * 0.125]); add(sph(0.012), M.gem, this.crown, [Math.cos(a) * 0.127, 0.0, Math.sin(a) * 0.127]); }
    // cape: plane with fluttering vertex shader on top of toon material
    const capeGeo = new THREE.PlaneGeometry(0.62, 0.78, 8, 12); capeGeo.translate(0, -0.39, 0);
    this.capeU = { uTime: { value: 0 }, uWind: { value: 0.3 } };
    const cm = M.cape; const prev = cm.onBeforeCompile;
    cm.onBeforeCompile = (sh, r) => { prev(sh, r); Object.assign(sh.uniforms, this.capeU); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uWind;').replace('#include <begin_vertex>', `#include <begin_vertex>
      float k = -position.y / 0.78; transformed.z -= k * k * (0.18 + 0.1 * sin(uTime * 5.0 + position.x * 8.0) * uWind) + k * 0.08;
      transformed.x *= 1.0 + k * 0.35; transformed.z += sin(position.x * 10.0 + uTime * 7.0) * 0.03 * k * uWind;`); };
    cm.customProgramCacheKey = () => 'cape';
    this.cape = add(capeGeo, cm, this.body, [0, 0.45, -0.24], [1, 1, 1], [0.12, 0, 0]);
    add(new THREE.TorusGeometry(0.2, 0.05, 8, 24, Math.PI), M.fur, this.body, [0, 0.43, -0.05], [1.2, 1, 1], [-1.2, 0, 0]);
  }
  pose(p = {}, t = 0) {
    this.capeU.uTime.value = t; this.capeU.uWind.value = p.wind ?? 0.3;
    const panic = p.panic ?? 0;
    this.body.position.y = 0.3 + Math.abs(Math.sin(t * 14)) * 0.03 * panic + (p.hop ?? 0) * 0.1;
    this.body.rotation.set(p.lean ?? 0, p.turn ?? 0, Math.sin(t * 12) * 0.06 * panic + (p.tilt ?? 0));
    this.head.rotation.set(-(p.lookUp ?? 0) * 0.5, (p.headYaw ?? 0) * 0.5, Math.sin(t * 18) * 0.08 * panic);
    setEyes(this.eyes, p.eyeOpen ?? 1, p.lookX ?? 0, p.lookY ?? 0, p.eyeBig ?? 1);
    const m = p.mouth ?? 0; this.mouth.scale.set(1.2 + m * 0.2, 0.1 + m * 1.1, 0.5);
    this.brows.forEach((b, i) => { b.position.y = 0.1 + (p.browUp ?? 0) * 0.04; b.rotation.z = Math.PI / 2 + (i ? -1 : 1) * ((p.browUp ?? 0) * 0.4 - (p.angry ?? 0) * 0.4); });
    this.arms.forEach((a, i) => { const flail = Math.sin(t * 16 + i * 2) * 0.6 * panic; a.sh.rotation.set(lerp(0, -2.6, (i ? p.armR : p.armL) ?? 0) + flail, 0, a.s * (0.3 + (p.armsOut ?? 0) * 0.9 + Math.abs(flail) * 0.3)); });
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 16 + i * Math.PI) * 0.6 * (p.run ?? 0); });
    this.crown.rotation.z = Math.sin(t * 20) * 0.05 * panic + (p.crownTilt ?? 0); this.crown.position.y = 0.14 + (p.crownHop ?? 0) * 0.12;
  }
}

// Ice material: glassy, faceted, inner glow and cracks
export function iceMaterial({ glow = 0.4 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.08, metalness: 0.1, transparent: false, opacity: 1, flatShading: true, envMapIntensity: 1.6 });
  const u = { uGlow: { value: glow }, uTime: { value: 0 }, uHeat: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vWP2;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvOP = position; vWP2 = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vOP; varying vec3 vWP2; uniform float uGlow, uTime, uHeat;\n${NOISE}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 vd = normalize(cameraPosition - vWP2); vec3 nW = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
        float fr = pow(1.0 - clamp(dot(nW, vd), 0.0, 1.0), 2.0);
        float inner = fbm(vWP2 * 0.35 + uTime * 0.05);
        float crack = smoothstep(0.025, 0.0, abs(fbm(vWP2 * 0.6) - 0.5));
        diffuseColor.rgb = mix(vec3(0.08, 0.28, 0.62), vec3(0.45, 0.78, 1.0), inner);
        totalEmissiveRadiance += vec3(0.25, 0.65, 1.0) * (fr * 1.0 + inner * uGlow * 0.6) + vec3(0.6, 0.95, 1.0) * crack * 1.2;
        totalEmissiveRadiance += vec3(1.0, 0.42, 0.12) * uHeat * (0.9 + fr * 1.5) * (0.6 + inner);`);
  };
  m.userData.u = u; m.customProgramCacheKey = () => 'ice';
  return m;
}

// The ice monster: a hulking giant built from ice crystals (height ≈ 14 m at scale 1)
export class IceMonster {
  constructor(seed = 8) {
    const r = rng(seed); this.root = new THREE.Group(); this.group = new THREE.Group(); this.root.add(this.group);
    this.mat = iceMaterial({ glow: 0.35 }); const dark = toon(0x0a2a4a, { rim: 0 });
    const chunk = (parent, c, s, n = 6) => { for (let i = 0; i < n; i++) add(new THREE.IcosahedronGeometry(1, 0), this.mat, parent, [c[0] + (r() - 0.5) * s[0], c[1] + (r() - 0.5) * s[1], c[2] + (r() - 0.5) * s[2]], [s[0] * (0.45 + r() * 0.3), s[1] * (0.45 + r() * 0.3), s[2] * (0.45 + r() * 0.3)], [r() * 3, r() * 3, r() * 3]); };
    this.torso = new THREE.Group(); this.torso.position.y = 6; this.group.add(this.torso);
    chunk(this.torso, [0, 1.5, 0], [5.5, 5, 3.6], 9);
    this.head = new THREE.Group(); this.head.position.set(0, 5.2, 0.4); this.torso.add(this.head);
    chunk(this.head, [0, 0.6, 0], [3.4, 2.8, 2.6], 6);
    for (let i = 0; i < 7; i++) add(new THREE.ConeGeometry(0.35, 1.6 + r() * 1.8, 5), this.mat, this.head, [(i - 3) * 0.5, 2.0 + r() * 0.4, -0.3], [1, 1, 1], [-(r() * 0.3), 0, (i - 3) * -0.18]);
    this.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.2, 3.0) });
    this.eyes = [-1, 1].map((s) => add(sph(0.38, 14, 10), this.eyeMat, this.head, [s * 0.75, 0.75, 1.35], [1, 0.75, 0.5]));
    this.brows = [-1, 1].map((s) => add(new THREE.BoxGeometry(1.0, 0.25, 0.4), this.mat, this.head, [s * 0.75, 1.2, 1.4], [1, 1, 1], [0, 0, s * -0.35]));
    this.mouth = add(sph(0.6, 14, 10), dark, this.head, [0, -0.15, 1.3], [1.5, 0.2, 0.5]);
    this.arms = [-1, 1].map((s) => { const sh = new THREE.Group(); sh.position.set(s * 3.2, 3.2, 0); this.torso.add(sh); chunk(sh, [s * 0.4, -2.2, 0], [1.8, 4.8, 1.8], 5); const hand = new THREE.Group(); hand.position.set(s * 0.4, -4.8, 0.2); sh.add(hand); chunk(hand, [0, 0, 0], [2.0, 1.8, 1.8], 4); return { sh, s, hand }; });
    this.legs = [-1, 1].map((s) => { const l = new THREE.Group(); l.position.set(s * 1.5, 0, 0); this.torso.add(l); chunk(l, [0, -3, 0], [2.2, 6, 2.2], 5); return l; });
    this.light = new THREE.PointLight(0x7fd0ff, 0, 60, 1.2); this.light.position.set(0, 8, 4); this.group.add(this.light);
  }
  pose(p = {}, t = 0) {
    this.mat.userData.u.uTime.value = t; this.mat.userData.u.uHeat.value = p.heat ?? 0;
    const step = p.walk ?? 0, amt = p.walkAmt ?? 0;
    this.torso.position.y = 6 + Math.abs(Math.sin(step * Math.PI)) * 0.4 * amt;
    this.torso.rotation.set(p.lean ?? 0, Math.sin(step * Math.PI) * 0.1 * amt + (p.turn ?? 0), Math.sin(step * Math.PI) * 0.05 * amt + (p.tilt ?? 0));
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(step * Math.PI + i * Math.PI) * 0.4 * amt + (p.dangle ?? 0) * Math.sin(t * 6 + i * 2) * 0.5; });
    this.arms.forEach((a, i) => { const up = i ? (p.armR ?? 0) : (p.armL ?? 0); a.sh.rotation.set(lerp(Math.sin(step * Math.PI + i * Math.PI) * 0.3 * amt, -2.4, up) + (p.flail ?? 0) * Math.sin(t * 9 + i) * 0.8, 0, a.s * (0.15 + (p.armsOut ?? 0) * 0.9)); });
    this.head.rotation.set(-(p.lookUp ?? 0) * 0.5, p.headYaw ?? 0, Math.sin(t * 7) * 0.08 * (p.flail ?? 0));
    const roar = p.roar ?? 0; this.mouth.scale.set(1.5 + roar * 0.3, 0.2 + roar * 1.4, 0.5);
    this.eyes.forEach((e) => e.scale.set(1 + (p.scared ?? 0) * 0.5, 0.75 * (p.eyeOpen ?? 1) + (p.scared ?? 0) * 0.6, 0.5));
    this.brows.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * (0.35 - (p.scared ?? 0) * 0.8); b.position.y = 1.2 + (p.scared ?? 0) * 0.35; });
    this.eyeMat.color.setRGB(0.6 * (p.eyeGlow ?? 1), 2.2 * (p.eyeGlow ?? 1), 3.0 * (p.eyeGlow ?? 1));
    this.light.intensity = 60 * (p.glow ?? 1);
  }
}

// The snow spirit hiding inside the monster
export class SnowSpirit {
  constructor() {
    this.root = new THREE.Group(); this.group = new THREE.Group(); this.root.add(this.group);
    const M = { skin: toon(0xf6fbff, { rough: 0.95 }), white: toon(0xffffff, { rough: 0.2, rim: 0.2 }), cheek: new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.8 }), mouth: toon(0x2a3a6a, { rim: 0 }), ice: iceMaterial({ glow: 0.6 }) };
    this.body = add(sph(0.3, 28, 20), M.skin, this.group, [0, 0.3, 0], [1, 0.92, 1]);
    for (let i = 0; i < 18; i++) { const a = i * 2.4, y = (i / 18) * 0.5; add(sph(0.08, 10, 8), M.skin, this.group, [Math.cos(a) * 0.26, 0.06 + y, Math.sin(a) * 0.26]); }
    this.head = new THREE.Group(); this.head.position.y = 0.32; this.group.add(this.head);
    this.eyes = cartoonEyes(this.head, M, { r: 0.07, sep: 0.1, y: 0.06, z: 0.24, iris: 0x14284a });
    for (const s of [-1, 1]) add(new THREE.CircleGeometry(0.04, 14), M.cheek, this.head, [s * 0.17, -0.03, 0.245], [1.3, 0.8, 1], [0, s * 0.5, 0]);
    this.mouth = add(sph(0.03), M.mouth, this.head, [0, -0.06, 0.28], [1.3, 0.4, 0.5]);
    for (let i = 0; i < 3; i++) add(new THREE.OctahedronGeometry(0.06, 0), M.ice, this.head, [(i - 1) * 0.07, 0.3, 0], [0.6, 1.6, 0.6], [0, 0, (i - 1) * -0.4]);
    this.arms = [-1, 1].map((s) => add(sph(0.07, 10, 8), M.skin, this.group, [s * 0.3, 0.3, 0.05], [1, 1.4, 1]));
  }
  pose(p = {}, t = 0) {
    const shiver = p.shiver ?? 0, happy = p.happy ?? 0;
    this.group.position.x = Math.sin(t * 50) * 0.01 * shiver;
    this.group.position.y = Math.abs(Math.sin(t * 7)) * 0.08 * happy;
    setEyes(this.eyes, p.eyeOpen ?? 1, p.lookX ?? 0, p.lookY ?? 0, 1 + shiver * 0.15);
    this.mouth.scale.set(1.3, 0.4 + (p.mouth ?? 0) * 1.2 + happy * 0.3, 0.5);
    this.arms.forEach((a, i) => { a.position.y = 0.3 + Math.sin(t * 8 + i * 2) * 0.05 * happy + (p.cover ?? 0) * 0.15; a.position.x = (i ? 1 : -1) * (0.3 - (p.cover ?? 0) * 0.15); });
  }
}
