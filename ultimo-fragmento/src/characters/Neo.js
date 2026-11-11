import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { NOISE } from '../effects/glsl.js';
import { clamp, lerp } from '../core/util.js';

// NEO — the single source of truth for the hero's look. Every episode builds NEO
// from this file, so proportions, colours and materials never drift.
//   height 0.60 m · white metal body · blue accents · round head with a dark visor
//   two digital eyes (shader) · backpack with a removable blue energy core
export const NEO_SPEC = Object.freeze({
  height: 0.6,
  white: 0xf2f4f7, blue: 0x2f8cff, glow: 0x49b8ff, visor: 0x05070c, joint: 0x9aa6b8,
});

// Shared dissolve hook: noise-based discard with a glowing edge (used for NEO's
// sacrifice in episode 5). Injected into standard materials.
function addDissolve(mat, uniforms) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDissolve = uniforms.uDissolve;
    sh.uniforms.uEdgeColor = uniforms.uEdgeColor;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos; uniform float uDissolve; uniform vec3 uEdgeColor;\n${NOISE}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float dn = fbm(vWPos * 28.0);
        float dz = dn - (uDissolve * 1.15 - 0.1);
        if (uDissolve > 0.0 && dz < 0.0) discard;
        totalEmissiveRadiance += uEdgeColor * smoothstep(0.08, 0.0, dz) * step(0.0001, uDissolve) * 4.0;`);
  };
  mat.customProgramCacheKey = () => 'neo-dissolve';
}

// Eye shader: two rounded digital eyes, controllable openness, gaze, mood and glow.
function makeEyeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uOpen: { value: 1 }, uLook: { value: new THREE.Vector2() }, uMood: { value: 0 },
      uColor: { value: new THREE.Color(NEO_SPEC.glow) }, uPower: { value: 1 }, uTime: { value: 0 }, uDissolve: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uOpen, uMood, uPower, uTime, uDissolve; uniform vec2 uLook; uniform vec3 uColor; varying vec2 vUv;
      float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      float eye(vec2 p){
        p -= uLook * vec2(0.09, 0.06);
        float h = mix(0.012, 0.15, uOpen);
        // mood > 0: happy arcs, mood < 0: worried tilt
        p.y += uMood * 0.35 * p.x * p.x * 8.0;
        float d = sdRound(p, vec2(0.085, h), min(0.08, h));
        return d;
      }
      void main(){
        vec2 p = vUv - 0.5; p.x *= 2.0;
        float s = sign(p.x);
        vec2 q = vec2(abs(p.x) - 0.36, p.y);
        q.y += (uMood < 0.0 ? -uMood * 0.25 * (q.x * s) * s : 0.0);
        float d = eye(vec2(q.x * s, q.y));
        float core = smoothstep(0.01, -0.005, d);
        float glow = exp(-max(d, 0.0) * 28.0) * 0.55;
        float scan = 0.85 + 0.15 * sin(vUv.y * 180.0 + uTime * 6.0);
        vec3 c = uColor * (core * scan * 1.9 + glow) * uPower;
        float a = clamp(core + glow, 0.0, 1.0) * uPower;
        c += vec3(1.0) * smoothstep(0.012, -0.03, d) * 0.5 * uPower; // hot white centre
        gl_FragColor = vec4(c, a);
      }`,
  });
}

export class Neo {
  constructor({ coreAttached = true } = {}) {
    const S = NEO_SPEC;
    this.group = new THREE.Group(); this.group.name = 'NEO';
    this.uniforms = { uDissolve: { value: 0 }, uEdgeColor: { value: new THREE.Color(0x66ccff) } };
    const white = new THREE.MeshStandardMaterial({ color: S.white, metalness: 0.35, roughness: 0.28, envMapIntensity: 1.1 });
    const blue = new THREE.MeshStandardMaterial({ color: S.blue, metalness: 0.4, roughness: 0.3, emissive: S.blue, emissiveIntensity: 0.35 });
    const joint = new THREE.MeshStandardMaterial({ color: S.joint, metalness: 0.8, roughness: 0.35 });
    const visor = new THREE.MeshStandardMaterial({ color: S.visor, metalness: 0.9, roughness: 0.08, envMapIntensity: 1.6 });
    this.coreMat = new THREE.MeshStandardMaterial({ color: 0x9fdcff, emissive: S.glow, emissiveIntensity: 4, roughness: 0.2 });
    this.mats = { white, blue, joint, visor };
    for (const m of [white, blue, joint, visor, this.coreMat]) addDissolve(m, this.uniforms);
    const mesh = (g, m, parent, pos, rot) => {
      const o = new THREE.Mesh(g, m); if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot);
      o.castShadow = true; o.receiveShadow = true; (parent || this.group).add(o); return o;
    };

    // ---- skeleton (pivot groups) ----
    this.hips = new THREE.Group(); this.hips.position.y = 0.17; this.group.add(this.hips);
    this.torso = new THREE.Group(); this.hips.add(this.torso);
    this.neck = new THREE.Group(); this.neck.position.y = 0.17; this.torso.add(this.neck);
    this.head = new THREE.Group(); this.head.position.y = 0.11; this.neck.add(this.head);

    // torso: rounded capsule-ish body, blue belt + chest light
    mesh(new THREE.CapsuleGeometry(0.095, 0.08, 8, 24), white, this.torso, [0, 0.085, 0]).scale.set(1, 1, 0.86);
    mesh(new THREE.TorusGeometry(0.093, 0.012, 10, 40), blue, this.torso, [0, 0.03, 0], [Math.PI / 2, 0, 0]).scale.set(1, 0.86, 1);
    this.chest = mesh(new THREE.CircleGeometry(0.022, 24), this.coreMat, this.torso, [0, 0.11, 0.083]);
    mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 24), blue, this.torso, [0, 0.11, 0.08]);
    mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.04, 20), joint, this.neck, [0, 0.0, 0]);
    mesh(new THREE.TorusGeometry(0.04, 0.007, 8, 24), blue, this.neck, [0, 0.015, 0], [Math.PI / 2, 0, 0]);

    // head: big rounded dome, visor, ear discs, antenna
    mesh(new THREE.SphereGeometry(0.14, 40, 28), white, this.head, [0, 0.09, 0]).scale.set(1.08, 0.92, 1);
    const vis = mesh(new THREE.SphereGeometry(0.128, 40, 24, Math.PI * 0.14, Math.PI * 0.72, Math.PI * 0.27, Math.PI * 0.44), visor, this.head, [0, 0.09, 0.022]);
    vis.scale.set(1.08, 0.92, 1); vis.rotation.y = 0;
    for (const s of [-1, 1]) {
      mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 24), blue, this.head, [s * 0.148, 0.09, 0], [0, 0, Math.PI / 2]);
      mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.034, 24), white, this.head, [s * 0.15, 0.09, 0], [0, 0, Math.PI / 2]);
    }
    mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.08, 8), joint, this.head, [0.05, 0.25, -0.02], [0, 0, -0.25]);
    this.antennaTip = mesh(new THREE.SphereGeometry(0.014, 12, 10), this.coreMat, this.head, [0.06, 0.29, -0.02]);
    this.eyeMat = makeEyeMaterial();
    this.eyes = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.11), this.eyeMat);
    this.eyes.position.set(0, 0.095, 0.162); this.head.add(this.eyes);

    // arms: shoulder pivot -> upper capsule -> elbow pivot -> forearm + hand
    this.arms = [-1, 1].map((s) => {
      const sh = new THREE.Group(); sh.position.set(s * 0.115, 0.15, 0); this.torso.add(sh);
      mesh(new THREE.SphereGeometry(0.03, 16, 12), blue, sh);
      mesh(new THREE.CapsuleGeometry(0.022, 0.05, 6, 12), white, sh, [0, -0.045, 0]);
      const el = new THREE.Group(); el.position.y = -0.09; sh.add(el);
      mesh(new THREE.SphereGeometry(0.02, 12, 10), joint, el);
      mesh(new THREE.CapsuleGeometry(0.02, 0.045, 6, 12), white, el, [0, -0.04, 0]);
      const hand = mesh(new THREE.SphereGeometry(0.026, 16, 12), white, el, [0, -0.085, 0]); hand.scale.set(1, 0.9, 1.1);
      const palm = new THREE.Group(); palm.position.y = -0.09; el.add(palm);
      return { sh, el, s, palm };
    });
    // legs
    this.legs = [-1, 1].map((s) => {
      const hip = new THREE.Group(); hip.position.set(s * 0.05, 0, 0); this.hips.add(hip);
      mesh(new THREE.CapsuleGeometry(0.03, 0.04, 6, 12), joint, hip, [0, -0.04, 0]);
      const knee = new THREE.Group(); knee.position.y = -0.075; hip.add(knee);
      mesh(new THREE.CapsuleGeometry(0.033, 0.03, 6, 12), white, knee, [0, -0.035, 0]);
      const foot = mesh(new RoundedBoxGeometry(0.075, 0.035, 0.11, 3, 0.015), white, knee, [0, -0.078, 0.015]);
      mesh(new THREE.BoxGeometry(0.076, 0.008, 0.06), blue, foot, [0, -0.012, 0.0]);
      return { hip, knee, s };
    });

    // backpack + removable core
    this.pack = new THREE.Group(); this.pack.position.set(0, 0.1, -0.1); this.torso.add(this.pack);
    mesh(new RoundedBoxGeometry(0.15, 0.17, 0.07, 4, 0.025), white, this.pack, [0, 0, -0.01]);
    mesh(new THREE.TorusGeometry(0.045, 0.01, 10, 32), blue, this.pack, [0, 0.01, -0.047]);
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.016, 0.12, 0.02), blue, this.pack, [s * 0.062, 0, -0.04]);
    this.core = new THREE.Group();
    this.coreMesh = mesh(new THREE.IcosahedronGeometry(0.034, 2), this.coreMat, this.core);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: S.glow, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.core.add(halo); this.coreHalo = halo;
    this.coreHome = new THREE.Vector3(0, 0.01, -0.05);
    this.core.position.copy(this.coreHome); this.pack.add(this.core);
    if (!coreAttached) this.core.visible = false;

    this.group.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    this.state = {};
  }

  // Pose from a plain object; everything optional. Angles in radians.
  // walk/run: phase (cycles), amount 0..1 ; reach: right arm forward 0..1 ; look: head yaw/pitch
  pose(p = {}, t = 0) {
    const ph = (p.phase || 0) * Math.PI * 2;
    const walk = p.walk || 0, run = p.run || 0, mv = clamp(walk + run);
    const amp = lerp(0.45, 0.95, run) * mv;
    const bob = Math.abs(Math.sin(ph)) * (0.012 * walk + 0.03 * run);
    this.hips.position.y = 0.17 + bob - (p.crouch || 0) * 0.04 + (p.jumpTuck || 0) * 0.02;
    this.torso.rotation.x = (p.lean || 0) + run * 0.28 + walk * 0.05;
    this.torso.rotation.y = Math.sin(ph) * 0.12 * mv;
    this.torso.rotation.z = Math.sin(ph) * 0.04 * mv;
    // idle breathing / hover
    const idle = 1 - mv;
    this.torso.position.y = Math.sin(t * 2.2) * 0.004 * idle;
    this.legs.forEach((l, i) => {
      const s = i ? 1 : -1; const a = Math.sin(ph + (i ? Math.PI : 0));
      l.hip.rotation.x = -a * amp * 0.8 - (p.jumpTuck || 0) * 0.9 + (p.sitHip || 0);
      l.knee.rotation.x = Math.max(0, -Math.cos(ph + (i ? Math.PI : 0))) * amp * 1.4 + (p.jumpTuck || 0) * 1.4 + (p.crouch || 0) * 0.6;
      l.hip.rotation.z = s * (p.spread || 0) * 0.3;
    });
    this.arms.forEach((a, i) => {
      const sw = Math.sin(ph + (i ? 0 : Math.PI));
      let x = sw * amp * 0.9 - run * 0.2, z = a.s * (0.12 + run * 0.1 + (p.armsOut || 0) * 1.1), el = -0.25 - run * 0.9;
      if (i === 1 && p.reach) { x = lerp(x, -1.45, p.reach); z = lerp(z, 0.08, p.reach); el = lerp(el, -0.1, p.reach); }
      if (i === 0 && p.reachL) { x = lerp(x, -1.45, p.reachL); z = lerp(z, -0.08, p.reachL); el = lerp(el, -0.1, p.reachL); }
      if (i === 0 && p.backReach) { x = lerp(x, 0.5, p.backReach); z = lerp(z, -0.35, p.backReach); el = lerp(el, -2.2, p.backReach); }
      if (p.armsUp) { x = lerp(x, -2.6, p.armsUp); z = lerp(z, a.s * 0.4, p.armsUp); el = lerp(el, -0.2, p.armsUp); }
      a.sh.rotation.set(x, 0, z); a.el.rotation.x = el;
    });
    this.neck.rotation.set(-(p.lookUp || 0) * 0.5, (p.lookYaw || 0) * 0.6, (p.tilt || 0));
    this.head.rotation.set(-(p.lookUp || 0) * 0.5, (p.lookYaw || 0) * 0.4, (p.tilt || 0) * 0.5);
    const e = this.eyeMat.uniforms;
    e.uOpen.value = p.eyeOpen ?? 1; e.uMood.value = p.mood || 0; e.uTime.value = t;
    e.uLook.value.set(p.eyeX || 0, p.eyeY || 0);
    e.uPower.value = p.eyePower ?? 1;
    const glow = p.coreGlow ?? 1;
    this.coreMat.emissiveIntensity = 4 * glow; this.coreHalo.material.opacity = 0.18 * glow;
    this.coreMesh.rotation.set(t * 1.3, t * 0.9, 0);
    this.uniforms.uDissolve.value = p.dissolve || 0;
    e.uDissolve.value = p.dissolve || 0;
  }

  // blink helper: deterministic blink every ~3.3s
  static blink(t, offset = 0) {
    const k = ((t + offset) % 3.3) / 3.3; const b = Math.abs(k - 0.96) < 0.025 ? 1 - Math.abs(k - 0.96) / 0.025 : 0;
    return 1 - b;
  }
}
