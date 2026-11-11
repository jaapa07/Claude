import * as THREE from 'three';
import { NOISE, GLOBAL } from './glsl.js';

// Dragon fire breath: a GPU particle stream. Each particle's age is derived from
// time (fract), so the stream is fully deterministic. Particles are only alive
// if they were emitted inside the [uOn, uOff] window. Colour ramps from
// white-hot → yellow → orange → red → dark smoke.
export class FireJet {
  constructor({ count = 1400, life = 0.9, speed = 14, spread = 0.18, size = 1.0, seed = 1 } = {}) {
    const a = new Float32Array(count * 4);
    let s = seed * 9301 + 49297; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < count; i++) a.set([r(), r() * 2 - 1, r() * 2 - 1, r()], i * 4);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); g.setAttribute('aR', new THREE.BufferAttribute(a, 4));
    this.u = { uTime: { value: 0 }, uOn: { value: -10 }, uOff: { value: -9 }, uLife: { value: life }, uSpeed: { value: speed }, uSpread: { value: spread }, uSize: { value: size },
      uOrigin: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3(0, 1, 0) }, uScale: GLOBAL.uScale, uSuck: { value: new THREE.Vector4(0, 0, 0, 0) } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime, uOn, uOff, uLife, uSpeed, uSpread, uSize, uScale; uniform vec3 uOrigin, uDir; uniform vec4 uSuck;
        attribute vec4 aR; varying float vAge; varying float vAlive; varying float vR;
        ${NOISE}
        void main(){
          float age = fract((uTime + aR.x * uLife) / uLife) * uLife;
          float te = uTime - age;
          vAlive = step(uOn, te) * step(te, uOff);
          vec3 d = normalize(uDir); vec3 side = normalize(cross(d, abs(d.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0))); vec3 up2 = cross(side, d);
          float k = age / uLife;
          vec3 p = uOrigin + d * uSpeed * age * (1.0 - 0.35 * k) + (side * aR.y + up2 * aR.z) * uSpread * uSpeed * age;
          p.y += 2.5 * age * age;
          p += (vec3(vnoise(p * 0.8 + uTime * 3.0), vnoise(p * 0.8 + 5.0 + uTime * 3.0), vnoise(p * 0.8 + 9.0)) - 0.5) * 1.2 * k * uSpeed * 0.1;
          // optional attractor (the ice monster absorbs the fire)
          p = mix(p, uSuck.xyz, smoothstep(0.2, 1.0, k) * uSuck.w);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (0.25 + k * 1.6) * (0.7 + aR.w * 0.6) * uScale * projectionMatrix[1][1] / -mv.z * vAlive;
          vAge = k; vR = aR.w;
        }`,
      fragmentShader: `varying float vAge; varying float vAlive; varying float vR;
        void main(){ if (vAlive < 0.5) discard; vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.0, d);
          vec3 hot = vec3(1.0, 0.98, 0.85), yel = vec3(1.0, 0.8, 0.2), ora = vec3(1.0, 0.42, 0.08), red = vec3(0.75, 0.1, 0.03), smoke = vec3(0.12, 0.08, 0.08);
          vec3 col = vAge < 0.15 ? mix(hot, yel, vAge / 0.15) : vAge < 0.45 ? mix(yel, ora, (vAge - 0.15) / 0.3) : vAge < 0.75 ? mix(ora, red, (vAge - 0.45) / 0.3) : mix(red, smoke, (vAge - 0.75) / 0.25);
          float a = soft * (1.0 - smoothstep(0.7, 1.0, vAge)) * 0.85;
          gl_FragColor = vec4(col * (1.6 - vAge), a); }` }));
    this.points.frustumCulled = false;
  }
  set(t, origin, dir, on, off, { suck = null } = {}) {
    this.u.uTime.value = t; this.u.uOrigin.value.copy(origin); this.u.uDir.value.copy(dir); this.u.uOn.value = on; this.u.uOff.value = off;
    if (suck) this.u.uSuck.value.set(suck[0], suck[1], suck[2], suck[3]); else this.u.uSuck.value.w = 0;
    this.points.visible = t >= on && t <= off + this.u.uLife.value;
  }
}
