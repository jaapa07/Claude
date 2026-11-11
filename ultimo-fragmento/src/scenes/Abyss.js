import * as THREE from 'three';
import { NOISE, GLOBAL } from '../effects/glsl.js';
import { rng } from '../core/util.js';
import { Dust } from '../effects/Particles.js';

// The digital abyss beneath the city: glowing infinite grid floors receding into
// the depth, rising data particles and slowly turning wireframe polyhedra.
export class Abyss {
  constructor({ y = -40, center = [0, 0, 30], seed = 404, color = 0x3d7dff, accent = 0xa040ff } = {}) {
    this.group = new THREE.Group(); this.group.position.set(center[0], 0, center[2]);
    this.uniforms = { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uAccent: { value: new THREE.Color(accent) }, uFade: { value: 1 } };
    const gridMat = (k) => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { ...this.uniforms, uK: { value: k } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime, uK, uFade; uniform vec3 uColor, uAccent; varying vec3 vW;
        ${NOISE}
        float line(float x, float w){ float f = abs(fract(x) - 0.5); return smoothstep(w, 0.0, f - 0.5 + w); }
        void main(){
          vec2 g = vW.xz / (4.0 * uK);
          float l = max(line(g.x, 0.025), line(g.y + uTime * 0.15, 0.025));
          float cell = hash12(floor(g + vec2(0.0, floor(uTime * 0.15))));
          float blink = step(0.97, cell) * (0.5 + 0.5 * sin(uTime * 4.0 + cell * 50.0));
          float d = length(vW.xz - vec2(${center[0].toFixed(1)}, ${center[2].toFixed(1)}));
          float fade = exp(-d * 0.02 / uK) / uK;
          vec3 c = mix(uColor, uAccent, step(0.5, fract(cell * 7.0))) * (l * 0.7 + blink * 0.6);
          gl_FragColor = vec4(c * fade * uFade, 1.0);
        }`,
    });
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), gridMat(1 + k * 1.6)); m.rotation.x = -Math.PI / 2; m.position.y = y - k * 35; this.group.add(m);
    }
    // vertical light pillars (data streams)
    const r = rng(seed);
    const pillarMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: this.uniforms,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime, uFade; uniform vec3 uColor; varying vec2 vUv;
        void main(){ float s = step(0.6, fract(vUv.y * 30.0 - uTime * 2.0)) * 0.6 + 0.4; float e = smoothstep(0.5, 0.0, abs(vUv.x - 0.5));
          gl_FragColor = vec4(uColor * s * e * 0.7 * (1.0 - vUv.y) * uFade, 1.0); }`,
    });
    for (let i = 0; i < 26; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6 + r() * 1.2, 150), pillarMat);
      const a = r() * Math.PI * 2, R = 15 + r() * 90; p.position.set(Math.cos(a) * R, y - 40 + 75, Math.sin(a) * R); p.rotation.y = r() * Math.PI; this.group.add(p);
    }
    // infinite geometry: wireframe polyhedra at many depths
    this.shapes = [];
    const wire = new THREE.MeshBasicMaterial({ color: 0x6aa8ff, wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const wire2 = wire.clone(); wire2.color.set(0xc070ff);
    const geos = [new THREE.IcosahedronGeometry(1, 0), new THREE.OctahedronGeometry(1, 0), new THREE.TorusKnotGeometry(0.8, 0.2, 48, 6), new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.DodecahedronGeometry(1, 0)];
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(geos[i % geos.length], r() < 0.6 ? wire : wire2);
      const a = r() * Math.PI * 2, R = 8 + r() * 80; const s = 1.5 + r() * 9;
      m.position.set(Math.cos(a) * R, y + 10 - r() * 140, Math.sin(a) * R); m.scale.setScalar(s);
      m.userData = { sp: (r() - 0.5) * 0.6, ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), y0: m.position.y, bob: r() * 6 };
      this.group.add(m); this.shapes.push(m);
    }
    this.dust = new Dust({ count: 5000, box: [180, 110, 180], center: [0, y - 15, 0], color: 0x7fb6ff, size: 0.35, rise: 3.0, seed: seed + 1, opacity: 0.9 });
    this.group.add(this.dust.points);
    this.wire = [wire, wire2]; this.pillarMat = pillarMat;
  }
  update(t, fade = 1) {
    this.uniforms.uTime.value = t; this.uniforms.uFade.value = fade;
    this.dust.uniforms.uTime.value = t; this.dust.uniforms.uOpacity.value = 0.9 * fade;
    for (const w of this.wire) w.opacity = 0.55 * fade;
    for (const m of this.shapes) { const u = m.userData; m.setRotationFromAxisAngle(u.ax, t * u.sp); m.position.y = u.y0 + Math.sin(t * 0.3 + u.bob) * 2; }
    this.group.visible = fade > 0.001;
  }
}
