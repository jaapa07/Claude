import * as THREE from 'three';
import { NOISE } from '../effects/glsl.js';

// Stylised "premium animated film" surface: PBR base + soft fresnel rim light +
// a world-space freeze mask (episodes 3–5: ice spreads over the kingdom).
export const FREEZE = { uFreezeCenter: { value: new THREE.Vector3(0, 0, -1e5) }, uFreezeRadius: { value: 0 }, uFreezeAmount: { value: 0 }, uTime: { value: 0 } };
export const RIM = { uRimColor: { value: new THREE.Color(1, 0.93, 0.8) }, uRimStrength: { value: 0.35 } };

export function toon(color, { rough = 0.62, metal = 0.0, emissive = 0x000000, ei = 0, freeze = true, rim = 1, side, transparent = false, opacity = 1, flat = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive, emissiveIntensity: ei, side: side ?? THREE.FrontSide, transparent, opacity, flatShading: flat });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, RIM, freeze ? FREEZE : {});
    sh.uniforms.uRimK = { value: rim };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPosT;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPosT = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWPosT; uniform vec3 uRimColor; uniform float uRimStrength, uRimK;
      ${freeze ? 'uniform vec3 uFreezeCenter; uniform float uFreezeRadius, uFreezeAmount, uTime;' : ''}
      ${NOISE}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      ${freeze ? `float frz = uFreezeAmount * smoothstep(uFreezeRadius + 1.5, uFreezeRadius - 1.5, distance(vWPosT, uFreezeCenter) + (vnoise(vWPosT * 0.8) - 0.5) * 3.0);
      roughnessFactor = mix(roughnessFactor, 0.12, frz);` : 'float frz = 0.0;'}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec3 vdir = normalize(cameraPosition - vWPosT);
        vec3 nW = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
        float fr = pow(1.0 - clamp(dot(nW, vdir), 0.0, 1.0), 3.0);
        totalEmissiveRadiance += uRimColor * fr * uRimStrength * uRimK * (0.4 + 0.6 * diffuseColor.rgb);
        if (frz > 0.0) {
          float crack = smoothstep(0.03, 0.0, abs(fbm(vWPosT * 1.3) - 0.5));
          vec3 ice = mix(vec3(0.62, 0.86, 1.0), vec3(0.95, 0.99, 1.0), fbm(vWPosT * 0.7));
          diffuseColor.rgb = mix(diffuseColor.rgb, ice * 0.9, frz * 0.85);
          totalEmissiveRadiance += (vec3(0.35, 0.75, 1.0) * fr * 1.2 + vec3(0.6, 0.9, 1.0) * crack * 0.5) * frz;
          float sp = step(0.985, hash12(floor(vWPosT.xz * 6.0) + floor(vWPosT.y * 6.0))) * (0.5 + 0.5 * sin(uTime * 6.0 + vWPosT.x * 9.0));
          totalEmissiveRadiance += vec3(1.0) * sp * frz * 1.5;
        }
      }`);
  };
  m.customProgramCacheKey = () => `toon-${freeze ? 1 : 0}`;
  return m;
}

// Bat-wing membrane with scalloped edge
export function wingGeometry(span = 1, h = 0.6) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(span * 0.15, h * 0.55); s.quadraticCurveTo(span * 0.6, h * 1.0, span, h * 0.9);
  s.quadraticCurveTo(span * 0.85, h * 0.45, span * 0.95, h * 0.15);
  s.quadraticCurveTo(span * 0.72, h * 0.25, span * 0.62, -h * 0.05);
  s.quadraticCurveTo(span * 0.45, h * 0.15, span * 0.3, -h * 0.15);
  s.quadraticCurveTo(span * 0.18, h * 0.0, 0, -h * 0.1); s.lineTo(0, 0);
  return new THREE.ShapeGeometry(s, 10);
}
