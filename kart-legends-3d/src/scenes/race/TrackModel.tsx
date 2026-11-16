import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { TrackId } from '@/data/ids';
import { useModel } from '../assets';

/** Malha da pista (GLB em setores): configura sombras e anima água/cachoeiras por deslocamento de UV. */
export function TrackModel({ trackId, shadows }: { trackId: TrackId; shadows: boolean }): JSX.Element {
  const gltf = useModel(`tracks/${trackId}.glb`);
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
