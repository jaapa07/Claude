import * as THREE from 'three';
import { NOISE } from './glsl.js';

// "O Último Fragmento": a floating purple crystal (elongated octahedron) with an
// inner refracting swirl, fresnel rim and additive halo.
export class Crystal {
  constructor({ color = 0xb04dff, size = 0.18 } = {}) {
    this.group = new THREE.Group();
    this.uniforms = { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uPower: { value: 1 } };
    const geo = new THREE.OctahedronGeometry(size, 0); geo.scale(0.62, 1.35, 0.62);
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true,
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = position; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime, uPower; uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        ${NOISE}
        void main(){
          float f = pow(1.0 - abs(dot(normalize(vN), vV)), 2.0);
          float inner = fbm(vec3(vP * 14.0 + vec3(0.0, uTime * 0.8, 0.0)));
          float swirl = smoothstep(0.45, 0.8, fbm(vec3(vP.xz * 20.0, vP.y * 6.0 - uTime)));
          vec3 c = uColor * (0.5 + inner * 1.4) + vec3(1.0, 0.8, 1.0) * swirl * 0.8 + vec3(0.9, 0.7, 1.0) * f * 2.0;
          gl_FragColor = vec4(c * uPower * 0.9, 0.85);
        }`,
    }));
    this.group.add(this.mesh);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    this.halo.scale.setScalar(size * 6); this.group.add(this.halo);
    this.light = new THREE.PointLight(color, 1, 9, 2); this.group.add(this.light);
  }
  update(t, power = 1) {
    this.uniforms.uTime.value = t; this.uniforms.uPower.value = power;
    this.mesh.rotation.y = t * 0.9; this.mesh.position.y = Math.sin(t * 1.7) * 0.03;
    this.halo.material.opacity = 0.4 * Math.min(power, 1.5); this.light.intensity = 1.2 * power;
  }
}

let _glow;
export function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c); _glow.colorSpace = THREE.SRGBColorSpace; return _glow;
}

// Expanding energy shell (time-freeze shockwave, light explosion)
export class Shockwave {
  constructor({ color = 0xc080ff } = {}) {
    this.uniforms = { uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0 }, uTime: { value: 0 } };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: this.uniforms,
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = position; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uAlpha, uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        ${NOISE}
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), vV)), 3.0);
          float n = 0.6 + 0.8 * fbm(vP * 4.0 + uTime);
          float lines = 0.7 + 0.3 * step(0.5, fract(vP.y * 20.0 + uTime * 3.0));
          gl_FragColor = vec4(uColor * f * n * lines * 2.0, f * uAlpha); }`,
    }));
    this.mesh.frustumCulled = false; this.mesh.visible = false;
  }
  set(radius, alpha, t) { this.mesh.visible = alpha > 0.001 && radius > 0.001; this.mesh.scale.setScalar(Math.max(radius, 0.001)); this.uniforms.uAlpha.value = alpha; this.uniforms.uTime.value = t; }
}
