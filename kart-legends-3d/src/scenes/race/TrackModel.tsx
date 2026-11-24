import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { TrackId } from '@/data/ids';
import { assetUrl } from '@/game/core/assets';
import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';
import { useModel } from '../assets';

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

/** Malha da pista (GLB em setores): configura sombras e anima água/cachoeiras por deslocamento de UV. */
export function TrackModel({ trackId, shadows }: { trackId: TrackId; shadows: boolean }): JSX.Element {
  const gltf = useModel(`tracks/${trackId}.glb`);
  useEffect(() => {
    if (loaded && loaded.trackId !== trackId) releaseTrack(loaded);
    loaded = { trackId, gltf };
  }, [trackId, gltf]);
  const flowing = useMemo(() => {
    const maps: { map: THREE.Texture; speed: [number, number] }[] = [];
    const seen = new Set<THREE.Material>();
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      const isProps = o.name.includes('props') || o.parent?.name.includes('props');
      const isWater = mat.name === 'water' || mat.name === 'water_fall';
      m.receiveShadow = !isWater;
      m.castShadow = shadows && !!isProps && !mat.transparent;
      if (seen.has(mat)) return;
      seen.add(mat);
      mat.envMapIntensity = mat.name === 'road_wet' || mat.name === 'road_ice' ? 1.6 : 0.7;
      if (isWater && mat.map) {
        mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
        maps.push({ map: mat.map, speed: mat.name === 'water' ? [0.012, 0.02] : [0, -0.9] });
      }
    });
    return maps;
  }, [gltf, shadows]);
  useEffect(() => () => { for (const f of flowing) f.map.offset.set(0, 0); }, [flowing]);
  useFrame((_, dt) => {
    for (const f of flowing) { f.map.offset.x += f.speed[0] * dt; f.map.offset.y += f.speed[1] * dt; }
  });
  return <primitive object={gltf.scene} />;
}
