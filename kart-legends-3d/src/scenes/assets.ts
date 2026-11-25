import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils, type GLTF } from 'three-stdlib';
import { assetUrl } from '@/game/core/assets';
import { combineParticleAtlases } from '@/game/vfx/particles';

/** Carrega um GLB de public/assets (com suporte a compressão meshopt). Suspende até carregar. */
export function useModel(path: string): GLTF {
  return useGLTF(assetUrl(path), false, true) as unknown as GLTF;
}

export function useModels(paths: string[]): GLTF[] {
  return useGLTF(paths.map((p) => assetUrl(p)), false, true) as unknown as GLTF[];
}

/** Clona uma cena glTF preservando skins (cada instância anima de forma independente). */
export function cloneScene(gltf: GLTF): THREE.Object3D {
  return SkeletonUtils.clone(gltf.scene);
}

const combined = new WeakMap<THREE.Texture, THREE.Texture>();
/** Atlas de partículas: o próprio + o de sprites CC0 (Kenney Particle Pack), juntos numa textura 8×4. */
export function useParticleAtlas(): THREE.Texture {
  const [own, kenney] = useTexture([assetUrl('vfx/particles.webp'), assetUrl('kits/kenney-particles.webp')]) as THREE.Texture[];
  let t = combined.get(own!);
  if (!t || (t.userData as { src?: THREE.Texture }).src !== kenney) {
    t = combineParticleAtlases(own!, kenney!);
    t.userData = { src: kenney };
    combined.set(own!, t);
  }
  return t;
}

export function setShadows(root: THREE.Object3D, cast: boolean, receive: boolean): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; }
  });
}

/** Libera geometrias e materiais de uma árvore clonada (as texturas pertencem ao cache do loader). */
export function disposeClones(root: THREE.Object3D, materials: THREE.Material[]): void {
  for (const m of materials) m.dispose();
  root.removeFromParent();
}
