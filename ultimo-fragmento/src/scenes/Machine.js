import * as THREE from 'three';
import { NOISE } from '../effects/glsl.js';
import { glowTexture } from '../effects/Crystal.js';

// The heart of the world: an armoured sphere of 8 petals wrapped by three
// gyroscopic rings. Opening it reveals the energy core (GLSL plasma).
export class Machine {
  constructor({ radius = 12 } = {}) {
    this.group = new THREE.Group(); this.R = radius;
    const metal = new THREE.MeshStandardMaterial({ color: 0x8a94a6, metalness: 0.92, roughness: 0.32, side: THREE.DoubleSide });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a303c, metalness: 0.85, roughness: 0.4, side: THREE.DoubleSide });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x0b2440, emissive: 0x3aa0ff, emissiveIntensity: 2.5 });
    this.glowMat = glowMat;
    // petals: meridian slices around the z axis, hinged at the back pole
    this.petals = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const hinge = new THREE.Group(); hinge.position.z = -radius; this.group.add(hinge);
      const g = new THREE.SphereGeometry(radius, 20, 24, 0, (Math.PI * 2) / n - 0.035, 0, Math.PI);
      g.rotateX(Math.PI / 2); g.rotateZ((i / n) * Math.PI * 2); g.translate(0, 0, radius);
      const outer = new THREE.Mesh(g, i % 2 ? metal : dark); hinge.add(outer);
      const seam = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.005, radius * 0.012, 6, 64, Math.PI), glowMat);
      seam.rotation.set(0, Math.PI / 2, (i / n) * Math.PI * 2); seam.rotateX(0); seam.position.z = radius; seam.rotation.order = 'ZYX'; hinge.add(seam);
      const mid = (i + 0.5) / n * Math.PI * 2; hinge.userData = { axis: new THREE.Vector3(-Math.sin(mid), Math.cos(mid), 0) };
      this.petals.push(hinge);
    }
    // gyroscopic rings
    this.rings = [1.25, 1.42, 1.6].map((k, i) => {
      const ring = new THREE.Group(); this.group.add(ring);
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(radius * k, radius * 0.045, 12, 120), i === 1 ? dark : metal));
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(radius * k, radius * 0.012, 6, 120), glowMat)).position.z = radius * 0.05;
      for (let j = 0; j < 24; j++) { const b = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.06, radius * 0.14, radius * 0.1), dark); const a = (j / 24) * Math.PI * 2; b.position.set(Math.cos(a) * radius * k, Math.sin(a) * radius * k, 0); b.rotation.z = a; ring.add(b); }
      ring.userData = { tilt: [0.4 + i * 0.5, i * 0.9, 0] };
      return ring;
    });
    // core
    this.coreU = { uTime: { value: 0 }, uPower: { value: 1 }, uHue: { value: 0 } };
    this.core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.55, 64, 48), new THREE.ShaderMaterial({
      uniforms: this.coreU,
      vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vV; void main(){ vP = position; vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime, uPower, uHue; varying vec3 vN; varying vec3 vP; varying vec3 vV;
        ${NOISE}
        void main(){ vec3 p = normalize(vP);
          float n = fbm(p * 3.0 + vec3(0.0, 0.0, uTime * 0.4)); float n2 = fbm(p * 7.0 - uTime * 0.3);
          float vein = smoothstep(0.05, 0.0, abs(n - 0.5)) + smoothstep(0.04, 0.0, abs(n2 - 0.5)) * 0.6;
          float f = pow(1.0 - abs(dot(normalize(vN), vV)), 2.0);
          vec3 base = mix(vec3(0.1, 0.45, 1.0), vec3(1.0, 0.75, 0.4), uHue);
          vec3 c = base * (0.6 + n * 1.2) + vec3(0.9, 0.97, 1.0) * vein * 1.4 + base * f * 2.0;
          gl_FragColor = vec4(c * uPower * 0.7, 1.0); }`,
    }));
    this.group.add(this.core);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x58b4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.halo.scale.setScalar(radius * 4); this.group.add(this.halo);
    this.light = new THREE.PointLight(0x7cc4ff, 0, radius * 12, 1.2); this.group.add(this.light);
    // socket on the core where NEO's own core fits (episode 5)
    this.socket = new THREE.Group(); this.socket.position.set(0, 0, radius * 0.56); this.group.add(this.socket);
    const sock = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.06, radius * 0.012, 10, 40), glowMat); this.socket.add(sock);
  }
  update(t, open, power = 1) {
    const e = open;
    for (const h of this.petals) { h.setRotationFromAxisAngle(h.userData.axis, e * 1.9); }
    this.rings.forEach((r, i) => {
      const [a, b] = r.userData.tilt;
      r.rotation.set(a + t * (0.15 + i * 0.05) * (0.3 + e), b + t * (0.2 - i * 0.07) * (0.3 + e), t * 0.1);
      r.scale.setScalar(1 + e * (0.08 + i * 0.04));
    });
    this.coreU.uTime.value = t; this.coreU.uPower.value = power * (0.3 + 0.7 * Math.min(1, e * 1.5));
    this.halo.material.opacity = 0.18 * power * e; this.light.intensity = 14 * power * e;
    this.glowMat.emissiveIntensity = 2.0 + 1.5 * e;
  }
}
