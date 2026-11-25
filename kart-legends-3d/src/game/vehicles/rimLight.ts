import * as THREE from 'three';

/**
 * Luz de recorte (fresnel) nos pilotos e karts: uma borda clara na cor do céu da pista que separa o personagem
 * do cenário. Custo: poucas instruções no shader já existente (sem passe extra). Os uniformes são globais e o
 * ambiente da cena ajusta a cor/intensidade (`setRimLight`).
 */
const RIM = {
  uRimColor: { value: new THREE.Color('#ffe8d0') },
  uRimPower: { value: 2.6 },
};

/** Cor e força da luz de recorte conforme o ambiente visível. */
export function setRimLight(color: THREE.ColorRepresentation, intensity: number): void {
  RIM.uRimColor.value.set(color).multiplyScalar(intensity);
}

/** Materiais já alterados (um clone não herda o onBeforeCompile, então é rastreado por instância). */
const patched = new WeakSet<THREE.Material>();
const SKIP = /^(glow|face_|glass)/;
/** Peso por material: pelo e tecido "pegam" mais luz na borda; pintura e metal já refletem o ambiente. */
function weight(name: string): number {
  if (name === 'fur' || name === 'chars_fur' || name.includes('fur')) return 1;
  if (name.includes('cloth') || name === 'skin' || name === 'std' || name === 'matte') return 0.75;
  if (name === 'paint' || name === 'glossy') return 0.35;
  return 0.25;
}

/** Aplica a luz de recorte aos materiais da árvore (idempotente: cada material é alterado uma vez). */
export function applyRimLight(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
      if (!mat.isMeshStandardMaterial || patched.has(mat) || SKIP.test(mat.name) || mat.transparent) continue;
      const w = weight(mat.name);
      patched.add(mat);
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uRimColor = RIM.uRimColor;
        shader.uniforms.uRimPower = RIM.uRimPower;
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimPower;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          {
            float rimF = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
            totalEmissiveRadiance += uRimColor * ( pow( rimF, uRimPower ) * ${w.toFixed(2)} ) * diffuseColor.rgb;
          }`);
      };
      mat.customProgramCacheKey = () => `rim${w}`;
      mat.needsUpdate = true;
    }
  });
}
