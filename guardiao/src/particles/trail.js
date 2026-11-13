import * as THREE from 'three';
import { rng } from '../timeline/util.js';
import { PX } from './particles.js';

/** Rastro de partículas que segue uma trajetória analítica: a partícula i nasceu em (t − idade_i) na posição
 *  path(t − idade_i) e deriva a partir dali. Sem estado acumulado → idêntico em qualquer ordem de render. */
export class Trail {
  constructor(count, o = {}, seed = 5) {
    this.n = count; this.o = { life: 1.5, spread: 0.2, drift: [0, 0.1, 0], ...o }; const r = rng(seed);
    this.seed = new Float32Array(count * 4).map(() => r());
    const g = new THREE.BufferGeometry(); this.pos = new Float32Array(count * 3); this.al = new Float32Array(count);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(this.al, 1)); g.setAttribute('aSeed', new THREE.BufferAttribute(this.seed, 4));
    this.u = { uSize: { value: o.size ?? 0.05 }, uPx: PX, uCol: { value: new THREE.Color(o.color ?? 0xffd070) }, uCol2: { value: new THREE.Color(o.color2 ?? 0xffffff) }, uGain: { value: o.gain ?? 1 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`attribute float aA; attribute vec4 aSeed; uniform float uSize, uPx, uGain; varying float vA; varying float vMix;
        void main(){ vA = aA * uGain; vMix = aSeed.z; vec4 mv = viewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.0, uSize * (0.5 + aSeed.y) * uPx * 2.4 / -mv.z) * step(0.001, aA); }`,
      fragmentShader: /* glsl */`uniform vec3 uCol, uCol2; varying float vA; varying float vMix;
        void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if (d > 0.5) discard; float a = smoothstep(0.5, 0.0, d); a = a * a + smoothstep(0.12, 0.0, d); gl_FragColor = vec4(mix(uCol, uCol2, vMix) * a * vA, 1.0); }` }));
    this.points.frustumCulled = false; this.v = new THREE.Vector3();
    // esfera envolvente fixa: o Three.js ordena os transparentes pelo centro dela e, se calculada sob demanda,
    // ela dependeria do primeiro quadro desenhado (quebrando o determinismo)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  }
  update(t, path, size, amount = 1) {
    const { life, spread, drift } = this.o, s = this.seed; if (size) this.u.uSize.value = size;
    for (let i = 0; i < this.n; i++) {
      const cyc = (t / life + s[i * 4]) % 1, age = cyc * life, p = path(t - age, this.v), k = cyc;
      this.pos[i * 3] = p.x + (s[i * 4 + 1] - 0.5) * spread * (1 + k * 3) + drift[0] * age;
      this.pos[i * 3 + 1] = p.y + (s[i * 4 + 2] - 0.5) * spread * (1 + k * 3) + drift[1] * age;
      this.pos[i * 3 + 2] = p.z + (s[i * 4 + 3] - 0.5) * spread * (1 + k * 3) + drift[2] * age;
      this.al[i] = (1 - k) * (1 - k) * amount * (0.5 + 0.5 * Math.sin(t * 9 + i));
    }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.aA.needsUpdate = true; this.points.visible = amount > 0.001;
  }
}
