import * as THREE from 'three';
import { NOISE } from './glsl.js';

// Sky dome with stars, nebula and a digital-failure ("glitch") mode where the
// sky tears into pixel blocks and wireframe grid.
export class Sky {
  constructor({ top = 0x02040c, horizon = 0x0b1a33, bottom = 0x010203, stars = 1, radius = 900, nebula = 0x1a1040 } = {}) {
    this.uniforms = {
      uTop: { value: new THREE.Color(top) }, uHorizon: { value: new THREE.Color(horizon) }, uBottom: { value: new THREE.Color(bottom) },
      uNebula: { value: new THREE.Color(nebula) }, uStars: { value: stars }, uTime: { value: 0 }, uGlitch: { value: 0 }, uRed: { value: 0 },
      uFlip: { value: 0 }, uWarm: { value: 0 },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: this.uniforms,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
      fragmentShader: `
        uniform vec3 uTop, uHorizon, uBottom, uNebula; uniform float uStars, uTime, uGlitch, uRed, uWarm; varying vec3 vDir;
        ${NOISE}
        void main(){
          vec3 d = normalize(vDir);
          float y = d.y;
          vec3 col = y > 0.0 ? mix(uHorizon, uTop, pow(y, 0.55)) : mix(uHorizon, uBottom, pow(-y, 0.4));
          vec2 sp = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0)));
          // glitch: quantise the lookup direction into blocks and shift them
          float g = uGlitch;
          vec2 cell = floor(sp * vec2(18.0, 26.0));
          float tt = floor(uTime * 12.0);
          float on = step(1.0 - g * 0.6, hash12(cell + tt * 0.37));
          vec2 sp2 = sp + (hash33(vec3(cell, tt)).xy - 0.5) * 0.25 * on;
          float neb = fbm(vec3(sp2 * 2.2, uTime * 0.02));
          col += uNebula * smoothstep(0.45, 0.85, neb) * 0.6 * smoothstep(-0.1, 0.4, y);
          // stars
          vec2 sg = sp2 * vec2(160.0, 160.0);
          float st = hash12(floor(sg));
          float star = step(0.9965, st) * smoothstep(0.5, 0.0, length(fract(sg) - 0.5)) * (0.6 + 0.4 * sin(uTime * 3.0 + st * 99.0));
          col += vec3(0.8, 0.9, 1.0) * star * uStars * smoothstep(-0.05, 0.2, y);
          // digital failure layers
          if (g > 0.0) {
            vec2 gp = sp * vec2(40.0, 40.0);
            float grid = max(smoothstep(0.96, 1.0, fract(gp.x)), smoothstep(0.96, 1.0, fract(gp.y)));
            col += vec3(0.1, 0.5, 1.0) * grid * on * g * 1.5;
            float band = step(0.93, hash12(vec2(floor(sp.y * 60.0), tt)));
            col = mix(col, vec3(hash12(cell + 3.0), hash12(cell + 5.0) * 0.4, 1.0) * 0.8, band * g * 0.7);
            col += on * g * vec3(0.25, 0.05, 0.35) * hash12(cell * 1.7 + tt);
            col = mix(col, 1.0 - col, step(0.985, hash12(cell + tt)) * g);
          }
          col = mix(col, col * vec3(1.8, 0.35, 0.3) + vec3(0.12, 0.0, 0.0) * smoothstep(-0.1, 0.6, y), uRed);
          col = mix(col, mix(vec3(1.0, 0.62, 0.38), vec3(0.32, 0.55, 0.95), smoothstep(-0.05, 0.6, y)), uWarm);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -10;
  }
}
