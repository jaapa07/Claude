import * as THREE from 'three';
import { rng, TAU } from '../timeline/util.js';
import { PX } from './particles.js';

/** Mapa tridimensional de constelações projetado por Lumi: estrelas apagadas ligadas por linhas e uma única ainda acesa. */
export class StarMap {
  constructor(n = 70, seed = 8) {
    const r = rng(seed), g = (this.group = new THREE.Group()), pos = new Float32Array(n * 3), big = new Float32Array(n), lines = [];
    for (let i = 0; i < n; i++) { const z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z), rad = 0.75 + r() * 0.35; pos.set([s * Math.cos(a) * rad, z * rad * 0.9, s * Math.sin(a) * rad], i * 3); big[i] = i === 0 ? 1 : 0; }
    pos.set([0.18, 0.42, 0.62], 0);                                   // a última estrela, bem à frente
    for (let i = 1; i < n; i++) { let best = -1, bd = 9; for (let j = 1; j < n; j++) if (j !== i) { const d = Math.hypot(pos[i * 3] - pos[j * 3], pos[i * 3 + 1] - pos[j * 3 + 1], pos[i * 3 + 2] - pos[j * 3 + 2]); if (d < bd && r() > 0.35) { bd = d; best = j; } }
      if (best > 0 && bd < 0.5) lines.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[best * 3], pos[best * 3 + 1], pos[best * 3 + 2]); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aBig', new THREE.BufferAttribute(big, 1));
    this.u = { uK: { value: 0 }, uTime: { value: 0 }, uPx: PX, uScale: { value: 1 } };
    this.points = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float aBig; uniform float uK, uTime, uPx, uScale; varying float vB; void main(){ vB = aBig; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.0, (aBig > 0.5 ? 0.16 * (1.0 + 0.25 * sin(uTime * 5.0)) : 0.035) * uScale * uK * uPx * 2.4 / -mv.z); }',
      fragmentShader: 'uniform float uK; varying float vB; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if (d > 0.5) discard; float a = smoothstep(0.5, 0.0, d); a = a * a + smoothstep(0.1, 0.0, d) * 1.5; float ray = vB * smoothstep(0.03, 0.0, abs(p.x) * abs(p.y) * 8.0) * 0.8; gl_FragColor = vec4(mix(vec3(0.35, 0.55, 1.0) * 0.8, vec3(1.0, 0.82, 0.45) * 2.2, vB) * (a + ray) * uK, 1.0); }' }));
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    this.lineMat = new THREE.LineBasicMaterial({ color: 0x4f7cff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    g.add(this.points, new THREE.LineSegments(lg, this.lineMat)); this.points.frustumCulled = false;
    this.last = new THREE.Vector3(0.18, 0.42, 0.62);
  }
  set(center, scale, k, t) { this.group.position.copy(center); this.group.scale.setScalar(scale * (0.4 + 0.6 * k)); this.group.rotation.y = t * 0.25; this.u.uK.value = k; this.u.uTime.value = t; this.u.uScale.value = scale; this.lineMat.opacity = k * 0.5; this.group.visible = k > 0.01; }
}
