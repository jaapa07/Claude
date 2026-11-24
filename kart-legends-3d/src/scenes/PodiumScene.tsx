import { dressPlayer } from '@/game/custom/customStore';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CharacterId, KartId, TrophyTier } from '@/data/ids';
import { audio } from '@/game/audio/audioManager';
import { STUDIO_ENVIRONMENT, type Environment } from '@/game/tracks/environments';
import { KartModel } from '@/game/vehicles/kartModel';
import { RaceVfx } from '@/game/vfx/raceVfx';
import { cloneScene, setShadows, useModel, useModels, useParticleAtlas } from './assets';
import { SkyAndLights } from './common/SkyAndLights';

export interface PodiumEntry { characterId: CharacterId; kartId: KartId; isPlayer: boolean }

const SPOTS: [number, number, number][] = [[0, 1.0, 0], [-4.2, 0.6, 0], [4.2, 0.3, 0]];
const ENV: Environment = { ...STUDIO_ENVIRONMENT, skyTop: '#1a1450', skyHorizon: '#ff7a59', skyBottom: '#ffd08a', fogNear: 60, fogFar: 300, stars: 0.8, bloom: 0.7 };
const POSE = { speed: 0, steer: 0, drifting: false, driftDir: 0, driftLevel: 0, boost: 0, spin: 0, grounded: true, shield: false, invulnerable: false, hop: 0 };

/** Cerimônia do pódio: os três primeiros nos degraus, comemorando, com confetes e troféu. */
export function PodiumScene({ entries, trophy }: { entries: PodiumEntry[]; trophy: TrophyTier | null }): JSX.Element {
  const top = entries.slice(0, 3);
  const podium = useModel('items/podium.glb');
  const karts = useModels(top.map((e) => `karts/${e.kartId}.glb`));
  const chars = useModels(top.map((e) => `characters/${e.characterId}.glb`));
  const trophyGltf = useModel(`items/trophy-${trophy ?? 'gold'}.glb`);
  const atlas = useParticleAtlas();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const stage = useMemo(() => { const s = cloneScene(podium); setShadows(s, true, true); return s; }, [podium]);
  const models = useMemo(() => top.map((e, i) => {
    const m = new KartModel(karts[i]!, chars[i]!, null);
    if (e.isPlayer) dressPlayer(m, e.characterId, e.kartId);
    return m;
  }), [karts, chars]);
  const vfx = useMemo(() => new RaceVfx(atlas, ENV, 1500), [atlas]);
  const cup = useMemo(() => { const c = cloneScene(trophyGltf); c.scale.setScalar(1.6); return c; }, [trophyGltf]);
  const t = useRef(0);
  const burst = useRef(0);
  useEffect(() => {
    audio.sfx('finish', { volume: 0.7 });
    return () => { for (const m of models) m.dispose(); vfx.dispose(); };
  }, [models, vfx]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    t.current += dt;
    models.forEach((m, i) => {
      const s = SPOTS[i]!;
      m.group.position.set(s[0], s[1], s[2] + 0.2);
      m.group.rotation.y = i === 0 ? 0 : i === 1 ? 0.35 : -0.35;
      m.update(dt, { ...POSE, mood: 'podium' });
    });
    cup.rotation.y = t.current * 1.2;
    cup.position.set(0, 3.1 + Math.sin(t.current * 2) * 0.08, 1.2);
    burst.current -= dt;
    if (burst.current <= 0) { burst.current = 0.7; vfx.confetti((Math.random() - 0.5) * 8, 2, 1, 60); }
    vfx.update(dt, size.height, camera.fov);
    const a = Math.sin(t.current * 0.25) * 0.5;
    const d = 12.5 - Math.min(2.5, t.current * 0.5);
    camera.position.set(Math.sin(a) * d, 3.4, Math.cos(a) * d);
    camera.lookAt(0, 1.7, 0);
    if (camera.fov !== 44) { camera.fov = 44; camera.updateProjectionMatrix(); }
  });

  return (
    <>
      <SkyAndLights env={ENV} shadows shadowSize={1024} />
      <primitive object={stage} />
      {models.map((m, i) => <primitive key={i} object={m.group} />)}
      {trophy && <primitive object={cup} />}
      <primitive object={vfx.solid} />
      <primitive object={vfx.glow} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.03} receiveShadow>
        <circleGeometry args={[80, 48]} />
        <meshStandardMaterial color="#1a1433" roughness={0.5} metalness={0.3} />
      </mesh>
    </>
  );
}
