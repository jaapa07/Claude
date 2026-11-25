import { useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { suspend } from 'suspend-react';
import * as THREE from 'three';
import { assetUrl } from '@/game/core/assets';
import type { HdriId } from '@/game/tracks/iblSources';
import type { Environment } from '@/game/tracks/environments';

interface EnvMeta { scale: number; mean: number; sunU: number; sunV: number }

/** Metadados dos mapas de ambiente (escala da faixa comprimida e posição do sol em cada HDRI). */
export function useEnvMeta(): Record<string, EnvMeta> {
  return suspend(async () => {
    const r = await fetch(assetUrl('env/env.json'));
    if (!r.ok) throw new Error(`Mapas de ambiente ausentes (env/env.json: ${r.status})`);
    return ((await r.json()) as { maps: Record<string, EnvMeta> }).maps;
  }, ['kl3d-env-meta']);
}

/** Radiância média (linear) que o HDRI entrega depois de normalizado: perto do antigo ambiente de "estúdio". */
const TARGET_MEAN = 0.5;

/**
 * Esfera com o HDRI da pista, desenhada só dentro do cubo do mapa de ambiente (não aparece na tela):
 * normalizada pela luminância média, tingida com a paleta da pista e girada para o sol do HDRI coincidir com o
 * sol da pista (os reflexos batem com a luz direcional).
 */
export function IblSphere({ env }: { env: Environment }): JSX.Element {
  const meta = useEnvMeta()[env.ibl.map as HdriId];
  const map = useTexture(assetUrl(`env/${env.ibl.map}.webp`));
  map.colorSpace = THREE.SRGBColorSpace;
  map.mapping = THREE.UVMapping;
  const material = useMemo(() => {
    const k = meta ? (meta.scale > 0 ? TARGET_MEAN / Math.max(0.02, meta.mean) : 1) : 1;
    const color = new THREE.Color(env.ibl.tint).multiplyScalar(k * env.ibl.intensity);
    return new THREE.MeshBasicMaterial({ map, color, side: THREE.BackSide, toneMapped: false, fog: false, depthWrite: false });
  }, [map, meta, env]);
  useEffect(() => () => material.dispose(), [material]);
  // com scale.x = −1 a coluna u do HDRI fica na direção (cos 2πu, ·, sin 2πu); gira para o azimute do sol da pista
  const rotY = meta ? Math.PI * 2 * meta.sunU - Math.atan2(env.sunDir[2], env.sunDir[0]) : 0;
  return (
    <mesh material={material} scale={[-50, 50, 50]} rotation-y={rotY} renderOrder={-1}>
      <sphereGeometry args={[1, 48, 24]} />
    </mesh>
  );
}

/** Pré-carrega o mapa de ambiente de uma pista (chamado junto com o modelo da pista). */
export function preloadEnvMap(id: HdriId): void {
  useTexture.preload(assetUrl(`env/${id}.webp`));
}
