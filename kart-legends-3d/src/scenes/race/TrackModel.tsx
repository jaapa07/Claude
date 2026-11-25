import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { TrackId } from '@/data/ids';
import { assetUrl } from '@/game/core/assets';
import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';
import { useModel } from '../assets';
import { applySurfaceDetail } from '../common/surfaceDetail';

/** Última pista carregada: ao trocar de pista, a anterior sai da memória (importante no celular). */
let loaded: { trackId: TrackId; gltf: GLTF } | null = null;

function releaseTrack(entry: { trackId: TrackId; gltf: GLTF }): void {
  const textures = new Set<THREE.Texture>();
  entry.gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) textures.add(v);
      mat.dispose();
    }
  });
  for (const t of textures) t.dispose();
  useGLTF.clear(assetUrl(`tracks/${entry.trackId}.glb`));
}

/** Malha da pista (GLB em setores): configura sombras e anima água, lava e cachoeiras por deslocamento de UV. */
export function TrackModel({ trackId, shadows, detail = false }: { trackId: TrackId; shadows: boolean; detail?: boolean }): JSX.Element {
  const gltf = useModel(`tracks/${trackId}.glb`);
  useEffect(() => {
    if (loaded && loaded.trackId !== trackId) releaseTrack(loaded);
    loaded = { trackId, gltf };
  }, [trackId, gltf]);
  // relevo dos pisos e rochas (Média/Alta)
  useEffect(() => (detail ? applySurfaceDetail(gltf.scene).cancel : undefined), [gltf, detail]);
  const flowing = useMemo(() => {
    const maps: { map: THREE.Texture; speed: [number, number]; mat: THREE.MeshStandardMaterial; glow: number }[] = [];
    const seen = new Set<THREE.Material>();
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      const isProps = o.name.includes('props') || o.parent?.name.includes('props');
      const isWater = mat.name === 'water' || mat.name === 'water_fall' || mat.name === 'lava' || mat.name === 'lava_fall';
      m.receiveShadow = !isWater;
      m.castShadow = shadows && !!isProps && !mat.transparent;
      if (seen.has(mat)) return;
      seen.add(mat);
      mat.envMapIntensity = mat.name === 'road_wet' || mat.name === 'road_ice' ? 1.6 : 0.7;
      if (isWater && mat.map) {
        mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
        if (mat.emissiveMap && mat.emissiveMap !== mat.map) { mat.emissiveMap.wrapS = mat.emissiveMap.wrapT = THREE.RepeatWrapping; mat.emissiveMap.needsUpdate = true; }
        const speed: [number, number] = mat.name === 'water' ? [0.012, 0.02] : mat.name === 'lava' ? [0.006, 0.01] : mat.name === 'lava_fall' ? [0, -0.35] : [0, -0.9];
        // a lava "respira": o brilho pulsa devagar (só um uniforme, custo zero)
        maps.push({ map: mat.map, speed, mat, glow: mat.name.startsWith('lava') ? mat.emissiveIntensity : 0 });
      }
    });
    return maps;
  }, [gltf, shadows]);
  useEffect(() => () => { for (const f of flowing) { f.map.offset.set(0, 0); f.mat.emissiveMap?.offset.set(0, 0); if (f.glow > 0) f.mat.emissiveIntensity = f.glow; } }, [flowing]);
  const clock = useMemo(() => ({ t: 0 }), []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.t += dt;
    for (const f of flowing) {
      // a água oscila de leve na direção da correnteza (marola); o deslocamento fica em [0, 1) para não perder precisão
      const surge = f.speed[0] !== 0 ? 1 + Math.sin(clock.t * 0.9 + f.speed[1] * 40) * 0.25 : 1;
      f.map.offset.x = (f.map.offset.x + f.speed[0] * surge * dt) % 1;
      f.map.offset.y = (f.map.offset.y + f.speed[1] * surge * dt) % 1;
      // o mapa de brilho da lava acompanha a cor (senão o brilho fica parado sob o fluxo)
      const em = f.mat.emissiveMap;
      if (em && em !== f.map) em.offset.copy(f.map.offset);
      if (f.glow > 0) f.mat.emissiveIntensity = f.glow * (0.86 + 0.14 * Math.sin(clock.t * 1.4) * Math.sin(clock.t * 0.53 + 1));
    }
  });
  return <primitive object={gltf.scene} />;
}
