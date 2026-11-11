import * as THREE from 'three';
import { NOISE } from './glsl.js';

// The watcher: a colossal red digital eye in the sky. Billboard plane with a
// procedural iris; uBreak shatters it into cells (they become drones in ep. 2).
export class GiantEye {
  constructor({ size = 260 } = {}) {
    this.uniforms = { uOpen: { value: 0 }, uTime: { value: 0 }, uBreak: { value: 0 }, uLook: { value: new THREE.Vector2() }, uIntensity: { value: 1 }, uDilate: { value: 0 } };
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.62), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: this.uniforms, fog: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uOpen, uTime, uBreak, uIntensity, uDilate; uniform vec2 uLook; varying vec2 vUv;
        ${NOISE}
        void main(){
          vec2 p = (vUv - 0.5) * vec2(2.0, 1.24);
          // almond shape: two arcs; lid opening scales vertical extent
          float open = max(uOpen, 0.001);
          float lid = (1.0 - p.x * p.x) * 0.62 * open;
          float inside = smoothstep(0.0, 0.02, lid - abs(p.y));
          float rim = exp(-abs(abs(p.y) - lid) * 40.0) * step(abs(p.x), 1.0) * smoothstep(1.0, 0.7, abs(p.x));
          // cells for shattering
          vec2 cell = floor(vUv * vec2(40.0, 25.0));
          float ch = hash12(cell);
          float broken = step(ch, uBreak * 1.1 - 0.05);
          vec2 q = p - uLook * 0.2;
          float r = length(q * vec2(1.0, 1.05));
          float ang = atan(q.y, q.x);
          float irisR = 0.36;
          float iris = smoothstep(irisR, irisR - 0.02, r);
          float fib = fbm(vec3(ang * 6.0, r * 8.0 - uTime * 0.3, uTime * 0.1));
          vec3 col = vec3(0.0);
          vec3 sclera = vec3(0.10, 0.0, 0.01) + vec3(0.25, 0.0, 0.02) * fbm(vec3(p * 6.0, 1.0));
          // veins of data
          float vein = smoothstep(0.03, 0.0, abs(fract(ang * 3.0 + fbm(vec3(p * 3.0, 2.0)) * 2.0) - 0.5) * r) * smoothstep(irisR, 1.0, r);
          sclera += vec3(0.6, 0.02, 0.0) * vein * 0.5;
          vec3 irisCol = mix(vec3(1.0, 0.05, 0.02), vec3(1.0, 0.55, 0.1), pow(fib, 2.0)) * (0.6 + 1.4 * smoothstep(irisR, 0.1, r));
          irisCol += vec3(1.0, 0.2, 0.05) * smoothstep(0.02, 0.0, abs(r - irisR + 0.02)) * 2.0;
          // rings of digital code
          irisCol *= 0.75 + 0.25 * step(0.5, fract(r * 30.0 - uTime * 0.6));
          float pupilW = mix(0.05, 0.15, uDilate);
          float pupil = smoothstep(0.01, 0.0, abs(q.x) - pupilW * sqrt(max(0.0, 1.0 - q.y * q.y / 0.11)));
          pupil *= step(abs(q.y), 0.33);
          col = mix(sclera, irisCol, iris);
          col = mix(col, vec3(0.0), pupil * iris);
          col *= inside;
          col += vec3(1.0, 0.1, 0.03) * rim * 0.8 * smoothstep(0.0, 0.2, open);
          // outer halo
          float halo = exp(-length(p * vec2(0.7, 1.3)) * 3.2) * 0.3 * smoothstep(0.0, 0.4, open);
          col += vec3(0.8, 0.02, 0.0) * halo;
          // shatter: broken cells vanish with a hot edge
          float edge = step(ch, uBreak * 1.1 + 0.05) - broken;
          col = col * (1.0 - broken) + vec3(1.0, 0.25, 0.1) * edge * inside * 1.5;
          // scanlines
          col *= 0.85 + 0.15 * sin(vUv.y * 400.0 + uTime * 20.0);
          gl_FragColor = vec4(col * uIntensity, 1.0);
        }`,
    }));
    this.mesh.frustumCulled = false;
  }
}
