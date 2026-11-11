import * as THREE from 'three';
import { NOISE, GLOBAL } from './glsl.js';
import { rng } from '../core/util.js';

// GPU morphing point cloud. Every particle lerps start -> target over its own
// window (delay..delay+span) of uProgress, plus curl-like drift. Fully driven by
// uniforms, so it is deterministic and cheap.
export class MorphPoints {
  constructor({ count, seed = 1, start, target, color = 0x4aa8ff, color2 = null, size = 1, delay = (i, r) => r() * 0.5,
    span = 0.5, opacity = 1, additive = true, drift = 0.0 }) {
    const r = rng(seed);
    const a = new Float32Array(count * 3), b = new Float32Array(count * 3), d = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const s = start(i, r), t = target(i, r);
      a.set(s, i * 3); b.set(t, i * 3); d[i * 2] = delay(i, r); d[i * 2 + 1] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(b, 3));
    g.setAttribute('aStart', new THREE.BufferAttribute(a, 3));
    g.setAttribute('aData', new THREE.BufferAttribute(d, 2));
    this.uniforms = {
      uProgress: { value: 0 }, uTime: { value: 0 }, uSize: { value: size }, uSpan: { value: span }, uDrift: { value: drift },
      uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2 ?? color) }, uOpacity: { value: opacity },
      uScatter: { value: 0 }, uScatterDir: { value: new THREE.Vector3(0, 1, 0) }, uScale: GLOBAL.uScale,
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `
        uniform float uProgress, uTime, uSize, uSpan, uDrift, uScale, uScatter; uniform vec3 uScatterDir;
        attribute vec3 aStart; attribute vec2 aData; varying float vA; varying float vR;
        ${NOISE}
        void main(){
          float k = clamp((uProgress - aData.x) / uSpan, 0.0, 1.0);
          float e = k * k * (3.0 - 2.0 * k);
          vec3 p = mix(aStart, position, e);
          // in-flight swirl (strongest mid-way)
          float mid = sin(e * 3.14159);
          vec3 sw = vec3(vnoise(p * 0.15 + aData.y * 9.0), vnoise(p * 0.15 + 4.1), vnoise(p * 0.15 + 8.7)) - 0.5;
          p += sw * mid * 6.0 * (1.0 - uDrift * 0.0);
          p += (vec3(vnoise(position * 0.4 + uTime * 0.3), vnoise(position * 0.4 + uTime * 0.3 + 5.0), vnoise(position * 0.4 + uTime * 0.3 + 9.0)) - 0.5) * uDrift;
          // scatter-away (dissolve outwards)
          float sc = clamp(uScatter * 1.3 - aData.y * 0.3, 0.0, 1.0);
          p += (uScatterDir * (2.0 + aData.y * 6.0) + (hash33(position * 3.1) - 0.5) * 8.0) * sc * sc;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.7 + 0.3 * sin(uTime * 6.0 + aData.y * 40.0);
          gl_PointSize = uSize * uScale * projectionMatrix[1][1] * (0.6 + aData.y * 0.8) * tw / -mv.z;
          vA = (0.35 + 0.65 * mid + 0.3 * e) * (1.0 - sc);
          vR = aData.y;
        }`,
      fragmentShader: `
        uniform vec3 uColor, uColor2; uniform float uOpacity; varying float vA; varying float vR;
        void main(){
          vec2 c = gl_PointCoord - 0.5; float d = length(c);
          float a = smoothstep(0.5, 0.0, d); a *= a;
          gl_FragColor = vec4(mix(uColor, uColor2, vR) * (1.0 + 1.5 * smoothstep(0.2, 0.0, d)), a * vA * uOpacity);
        }`,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
  }
  set(progress, time, opacity = 1) { this.uniforms.uProgress.value = progress; this.uniforms.uTime.value = time; this.uniforms.uOpacity.value = opacity; this.points.visible = opacity > 0.001; }
}

// Simple ambient dust/ember field in a box, drifting with time; `time` may be
// frozen by the caller to stop the world (episode 1 time-freeze).
export class Dust {
  constructor({ count = 2000, box = [60, 30, 120], center = [0, 10, -40], color = 0x88bbff, size = 0.08, seed = 7, rise = 0.3, opacity = 0.6 }) {
    const r = rng(seed); const pos = new Float32Array(count * 3), rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = center[0] + (r() - 0.5) * box[0]; pos[i * 3 + 1] = center[1] + (r() - 0.5) * box[1]; pos[i * 3 + 2] = center[2] + (r() - 0.5) * box[2]; rnd[i] = r();
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aR', new THREE.BufferAttribute(rnd, 1));
    this.uniforms = { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uRise: { value: rise }, uBoxY: { value: box[1] }, uY0: { value: center[1] - box[1] / 2 }, uOpacity: { value: opacity }, uScale: GLOBAL.uScale };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime, uSize, uRise, uBoxY, uY0, uScale; attribute float aR; varying float vA;
        void main(){ vec3 p = position;
          p.y = uY0 + mod(p.y - uY0 + uTime * uRise * (0.5 + aR), uBoxY);
          p.x += sin(uTime * 0.4 + aR * 30.0) * 0.8; p.z += cos(uTime * 0.3 + aR * 20.0) * 0.8;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * uScale * projectionMatrix[1][1] * (0.5 + aR) / -mv.z;
          vA = (0.4 + 0.6 * sin(uTime * 2.0 + aR * 50.0) * 0.5 + 0.3); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor, a * a * vA * uOpacity); }`,
    }));
    this.points.frustumCulled = false;
  }
}
