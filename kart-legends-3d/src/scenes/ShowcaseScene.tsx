import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Screen } from '@/app/gameTypes';
import type { CharacterId, KartId } from '@/data/ids';
import { CHARACTER_BY_ID } from '@/data/characters';
import { suspend } from 'suspend-react';
import type { TrackId } from '@/data/ids';
import { ENVIRONMENTS, STUDIO_ENVIRONMENT } from '@/game/tracks/environments';
import { loadTrackData } from '@/game/tracks/trackData';
import { TrackModel } from './race/TrackModel';
import { KartModel } from '@/game/vehicles/kartModel';
import { useModel } from './assets';
import { SkyAndLights } from './common/SkyAndLights';

const IDLE = { speed: 0, steer: 0, drifting: false, driftDir: 0, driftLevel: 0, boost: 0, spin: 0, grounded: true, shield: false, invulnerable: false, hop: 0, mood: 'idle' as const };

interface Shot { pos: [number, number, number]; target: [number, number, number]; fov: number }
const SHOTS: Partial<Record<Screen, Shot>> & { default: Shot } = {
  default: { pos: [2.4, 1.7, 5.6], target: [-1.5, 0.8, 0], fov: 42 },
  character: { pos: [1.2, 1.55, 3.5], target: [-0.85, 1.0, 0], fov: 40 },
  kart: { pos: [2.9, 1.2, 4.4], target: [-1.2, 0.5, 0], fov: 40 },
  menu: { pos: [3.2, 1.5, 6.4], target: [-1.9, 0.9, 0], fov: 40 },
};

/** Kart e piloto selecionados sobre um palco giratório (fundo dos menus e telas de seleção). */
export function ShowcaseScene({ screen, characterId, kartId, studio }: { screen: Screen; characterId: CharacterId; kartId: KartId; studio?: 'character' | 'kart' }): JSX.Element {
  const kart = useModel(`karts/${kartId}.glb`);
  const character = useModel(`characters/${characterId}.glb`);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const model = useMemo(() => new KartModel(kart, studio === 'kart' ? null : character, null), [kart, character, studio]);
  useEffect(() => () => model.dispose(), [model]);
  const turn = useRef(0.6);
  const look = useRef(new THREE.Vector3(-1.5, 0.8, 0));
  const first = useRef(true);
  const accent = CHARACTER_BY_ID[characterId].color;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!studio) turn.current += dt * 0.35;
    model.group.rotation.y = studio ? (studio === 'character' ? 0.45 : 0.85) : turn.current;
    model.update(dt, IDLE);
    const shot = studio === 'character' ? { pos: [0.75, 1.55, 2.55], target: [0, 1.12, 0.05], fov: 30 } as Shot
      : studio === 'kart' ? { pos: [0.4, 1.7, 5.2], target: [0, 0.5, 0], fov: 30 } as Shot
        : SHOTS[screen] ?? SHOTS.default;
    const k = first.current ? 1 : Math.min(1, dt * 2.6);
    first.current = false;
    camera.position.lerp(new THREE.Vector3(...shot.pos), k);
    look.current.lerp(new THREE.Vector3(...shot.target), k);
    camera.lookAt(look.current);
    if (Math.abs(camera.fov - shot.fov) > 0.05) { camera.fov += (shot.fov - camera.fov) * k; camera.updateProjectionMatrix(); }
  });

  return (
    <>
      {!studio && <SkyAndLights env={STUDIO_ENVIRONMENT} shadows shadowSize={1024} />}
      {studio && (
        <>
          <hemisphereLight args={['#ffffff', '#8a7f9a', 1.5]} />
          <directionalLight position={[3, 6, 5]} intensity={2.6} color="#fff4e2" />
          <directionalLight position={[-4, 3, -3]} intensity={1.1} color={accent} />
        </>
      )}
      <primitive object={model.group} />
      {!studio && (
        <group>
          <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
            <circleGeometry args={[3.1, 64]} />
            <meshStandardMaterial color="#231a3d" roughness={0.35} metalness={0.5} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
            <ringGeometry args={[3.0, 3.16, 64]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.4} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={-0.06} receiveShadow>
            <circleGeometry args={[60, 48]} />
            <meshStandardMaterial color="#120d24" roughness={0.6} metalness={0.3} />
          </mesh>
        </group>
      )}
    </>
  );
}

/** Vista de apresentação de uma pista (usada para gerar as miniaturas da seleção de pista). */
export function TrackPreviewScene({ trackId }: { trackId: TrackId }): JSX.Element {
  const data = suspend(() => loadTrackData(trackId), ['track-data', trackId]);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const shot = data.introCamera[0]!;
  useFrame(() => {
    camera.position.set(shot.pos[0], shot.pos[1] + 6, shot.pos[2]);
    camera.lookAt(shot.target[0], shot.target[1], shot.target[2]);
    if (camera.fov !== 55) { camera.fov = 55; camera.updateProjectionMatrix(); }
  });
  return (
    <>
      <SkyAndLights env={ENVIRONMENTS[trackId]} shadows={false} />
      <TrackModel trackId={trackId} shadows={false} />
    </>
  );
}
