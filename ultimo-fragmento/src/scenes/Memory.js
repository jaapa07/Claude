import * as THREE from 'three';
import { NOISE } from '../effects/glsl.js';
import { rng } from '../core/util.js';

// Holographic memories: a 4×4 atlas drawn on Canvas — 15 versions of NEO in
// destroyed worlds + 1 blueprint ("the creator") — shown on thousands of
// instanced screens.
const PALETTES = [
  ['#3a0a0a', '#c2361b', '#ff9a4a'], ['#06131f', '#1d5a7a', '#9fe0ff'], ['#140a22', '#5a2a8a', '#e09aff'], ['#1a1606', '#8a6a1a', '#ffd36a'],
  ['#061a10', '#1f7a4a', '#9affc0'], ['#200a14', '#8a1a4a', '#ff8ab0'], ['#0a0a0a', '#555555', '#e0e0e0'], ['#1f0f05', '#a0501a', '#ffb070'],
];
function drawNeo(g, x, y, s, v, r) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#e9eef5'; g.strokeStyle = '#2f8cff'; g.lineWidth = 3;
  g.beginPath(); g.ellipse(0, -62, 34, 30, 0, 0, Math.PI * 2); g.fill();          // head
  g.fillStyle = '#0a0d14'; g.beginPath(); g.ellipse(0, -60, 26, 18, 0, 0, Math.PI * 2); g.fill(); // visor
  const eye = v % 5 === 3 ? '#ff3a2a' : '#49b8ff';
  g.fillStyle = eye; g.shadowColor = eye; g.shadowBlur = 12;
  if (v % 4 !== 1) g.fillRect(-15, -66, 9, 11); g.fillRect(6, -66, 9, 11); g.shadowBlur = 0;
  g.fillStyle = '#e9eef5'; g.beginPath(); g.roundRect(-22, -32, 44, 48, 16); g.fill();       // body
  g.fillStyle = '#2f8cff'; g.fillRect(-22, -6, 44, 5);
  g.beginPath(); g.arc(0, -16, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e9eef5';
  g.save(); g.translate(-26, -26); g.rotate(v % 3 === 0 ? 0.9 : 0.2); g.fillRect(-5, 0, 10, 34); g.restore();
  if (v % 6 !== 2) { g.save(); g.translate(26, -26); g.rotate(-0.25); g.fillRect(-5, 0, 10, 34); g.restore(); }
  g.fillRect(-16, 14, 12, 22); g.fillRect(4, 14, 12, 22);
  if (v % 2) { g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(-10, -80); g.lineTo(2, -64); g.lineTo(-4, -50); g.stroke(); } // cracked visor
  g.restore();
}
export function memoryAtlas(seed = 4) {
  const N = 4, S = 512, c = document.createElement('canvas'); c.width = c.height = N * S; const g = c.getContext('2d'); const r = rng(seed);
  for (let i = 0; i < 16; i++) {
    const x0 = (i % N) * S, y0 = Math.floor(i / N) * S;
    g.save(); g.beginPath(); g.rect(x0, y0, S, S); g.clip(); g.translate(x0, y0);
    if (i === 15) { // blueprint: the creator
      g.fillStyle = '#04152e'; g.fillRect(0, 0, S, S); g.strokeStyle = 'rgba(80,170,255,0.35)'; g.lineWidth = 1;
      for (let k = 0; k < S; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, S); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(S, k); g.stroke(); }
      g.globalAlpha = 0.9; drawNeo(g, S / 2, 330, 2.2, 0, r); g.globalAlpha = 1;
      g.strokeStyle = '#7fd0ff'; g.lineWidth = 2; g.beginPath(); g.arc(S / 2, 250, 200, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#bfe6ff'; g.font = '700 30px Orbitron, Arial'; g.textAlign = 'center'; g.fillText('PROJETO: MUNDO', S / 2, 52); g.fillText('AUTOR: N.E.O.', S / 2, 480);
      g.restore(); continue;
    }
    const [a, b, hi] = PALETTES[i % PALETTES.length];
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, a); gr.addColorStop(0.65, b); gr.addColorStop(1, '#050505'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    // sun / moon
    g.fillStyle = hi; g.globalAlpha = 0.5; g.beginPath(); g.arc(80 + r() * 350, 90 + r() * 100, 30 + r() * 50, 0, 7); g.fill(); g.globalAlpha = 1;
    // ruined skyline
    g.fillStyle = '#07080c';
    let x = -10; while (x < S) { const w = 30 + r() * 60, h = 80 + r() * 220; g.beginPath(); g.moveTo(x, S); g.lineTo(x, S - h); g.lineTo(x + w * 0.3, S - h - r() * 30); g.lineTo(x + w * 0.6, S - h + 20 + r() * 40); g.lineTo(x + w, S - h * (0.6 + r() * 0.3)); g.lineTo(x + w, S); g.fill(); x += w + r() * 10; }
    // smoke / embers
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(255,255,255,${r() * 0.12})`; g.beginPath(); g.arc(r() * S, r() * S * 0.8, r() * 30, 0, 7); g.fill(); }
    drawNeo(g, 200 + r() * 120, 430, 1.5 + r() * 0.5, i, r);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, S, 44);
    g.fillStyle = hi; g.font = '600 24px Orbitron, Arial'; g.fillText(`MUNDO #${String(100 + i * 37).padStart(4, '0')} — PERDIDO`, 18, 30);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class ScreenField {
  // placements: array of { p: Vector3, q: Quaternion, s: number }
  constructor(placements, atlas, seed = 9) {
    const r = rng(seed), n = placements.length;
    const geo = new THREE.PlaneGeometry(1.6, 1);
    const tile = new Float32Array(n), sd = new Float32Array(n);
    for (let i = 0; i < n; i++) { tile[i] = Math.floor(r() * 15); sd[i] = r(); }
    geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(tile, 1));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 1));
    this.uniforms = { uAtlas: { value: atlas }, uTime: { value: 0 }, uAll: { value: 0 }, uBright: { value: 1 }, uReveal: { value: 1 } };
    this.mesh = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aTile, aSeed; varying vec2 vUv; varying float vTile, vSeed;
        void main(){ vUv = uv; vTile = aTile; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uAtlas; uniform float uTime, uAll, uBright, uReveal; varying vec2 vUv; varying float vTile, vSeed;
        ${NOISE}
        void main(){
          float on = step(vSeed, uReveal);
          float sw = step(vSeed, uAll);
          float tile = mix(vTile, 15.0, sw);
          // flicker / channel switching
          float ch = floor(uTime * (0.3 + vSeed * 0.5) + vSeed * 10.0);
          tile = mix(mod(tile + ch * 3.0, 15.0), 15.0, sw);
          vec2 uv = vUv; uv.x = uv.x * 0.625 + 0.1875; // 16:10 window into the square tile
          float gl = step(0.97, hash12(vec2(floor(uv.y * 30.0), floor(uTime * 15.0) + vSeed * 50.0)));
          uv.x += gl * 0.03;
          vec2 a = (vec2(mod(tile, 4.0), 3.0 - floor(tile / 4.0)) + uv) / 4.0;
          vec3 c = texture2D(uAtlas, a).rgb;
          c = mix(c, vec3(dot(c, vec3(0.33))) * vec3(0.5, 0.85, 1.3), 0.35 * (1.0 - sw));
          c *= 0.82 + 0.18 * sin(vUv.y * 260.0 + uTime * 8.0);
          float edge = 1.0 - smoothstep(0.0, 0.03, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)) );
          c += vec3(0.3, 0.7, 1.0) * edge * 1.2;
          float fl = 0.8 + 0.2 * sin(uTime * 20.0 + vSeed * 90.0);
          gl_FragColor = vec4(c * uBright * fl * on, 1.0);
        }`,
    }), n);
    const m = new THREE.Matrix4(), sc = new THREE.Vector3();
    placements.forEach((pl, i) => { sc.setScalar(pl.s); m.compose(pl.p, pl.q, sc); this.mesh.setMatrixAt(i, m); });
    this.mesh.frustumCulled = false;
  }
}

// placements: rings forming a tunnel along -z, then a sphere shell
export function tunnelPlacements({ rings = 56, per = 12, radius = 4.2, step = 2.6, seed = 2 } = {}) {
  const r = rng(seed), out = [], up = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4();
  for (let k = 0; k < rings; k++) for (let j = 0; j < per; j++) {
    const a = (j / per) * Math.PI * 2 + k * 0.21 + (r() - 0.5) * 0.1, rr = radius + (r() - 0.5) * 0.8;
    const p = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, -k * step - r() * 1.2);
    m.lookAt(p, new THREE.Vector3(0, 0, p.z), up); const q = new THREE.Quaternion().setFromRotationMatrix(m);
    out.push({ p, q, s: 1.3 + r() * 0.6 });
  }
  return out;
}
export function spherePlacements({ n = 2200, radius = 70, center = new THREE.Vector3(0, 0, -200), seed = 3 } = {}) {
  const r = rng(seed), out = [], m = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const y = 1 - 2 * (i + 0.5) / n, rad = Math.sqrt(1 - y * y), th = i * 2.399963;
    const R = radius * (0.75 + r() * 0.5);
    const p = new THREE.Vector3(Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R).add(center);
    m.lookAt(p, center, up); out.push({ p, q: new THREE.Quaternion().setFromRotationMatrix(m), s: 3 + r() * 4 });
  }
  return out;
}
