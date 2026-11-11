import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { glowTexture } from './Crystal.js';

// Swirling GLSL portal (episode 3 → 4 gateway): spiral arms, fbm turbulence,
// bright event-horizon ring, inner tunnel depth.
export class Portal {
  constructor({ radius = 4, color = 0x55c8ff, color2 = 0xffc860 } = {}) {
    this.group = new THREE.Group();
    this.uniforms = { uTime: { value: 0 }, uOpen: { value: 0 }, uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) } };
    this.disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.35, 96), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: this.uniforms,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime, uOpen; uniform vec3 uColor, uColor2; varying vec2 vUv;
        ${NOISE}
        void main(){
          vec2 p = (vUv - 0.5) * 2.0 * 1.35; float r = length(p), a = atan(p.y, p.x);
          float R = uOpen;
          float spiral = sin(a * 5.0 + log(r + 0.05) * 9.0 - uTime * 4.0);
          float turb = fbm(vec3(cos(a) * r * 3.0, sin(a) * r * 3.0, uTime * 0.6 - r * 2.0));
          float body = smoothstep(R, R * 0.92, r);
          float ring = exp(-pow((r - R) * 18.0, 2.0)) * 0.7;
          float depth = smoothstep(0.0, R, r);
          vec3 c = mix(uColor * 1.0, uColor2, smoothstep(0.3, 0.9, turb)) * (0.35 + 0.65 * (spiral * 0.5 + 0.5)) * body * (0.2 + 0.6 * depth);
          c += vec3(1.0, 0.95, 0.85) * smoothstep(0.25 * R, 0.0, r) * body * 0.5;
          c += mix(uColor, vec3(1.0), 0.5) * ring * step(0.01, uOpen);
          float sparks = step(0.985, hash12(floor(vec2(a * 40.0, r * 30.0 - uTime * 6.0)))) * smoothstep(R * 1.3, R, r) * step(R, r);
          c += uColor2 * sparks * 2.0;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    this.disc.frustumCulled = false; this.group.add(this.disc);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.group.add(this.halo);
    this.light = new THREE.PointLight(color, 0, 40, 1.5); this.group.add(this.light);
    this.radius = radius;
  }
  update(t, open) {
    this.uniforms.uTime.value = t; this.uniforms.uOpen.value = open;
    this.halo.scale.setScalar(this.radius * 5 * open); this.halo.material.opacity = 0.1 * Math.min(open, 1);
    this.light.intensity = 8 * open; this.group.visible = open > 0.001;
  }
}
