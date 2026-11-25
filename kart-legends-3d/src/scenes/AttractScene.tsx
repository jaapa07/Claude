import { useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { DEFAULT_KART_LOOK, type KartLook } from '@/data/customization';
import type { CharacterId, KartId } from '@/data/ids';
import { assetUrl } from '@/game/core/assets';
import { ENVIRONMENTS, type Environment } from '@/game/tracks/environments';
import { KartModel, type KartVisualState } from '@/game/vehicles/kartModel';
import { useModels } from './assets';
import { SkyAndLights } from './common/SkyAndLights';
import type { QualityProfile } from './quality';
import { useSceneStore } from './sceneStore';

/**
 * Cena de abertura ("attract"): depois do carregamento, atrás do logotipo, karts de verdade correm e derrapam
 * num anel de asfalto ao entardecer (HDRI do Poly Haven nos reflexos), com a câmera trocando de plano a cada
 * poucos segundos. Só usa modelos já baixados pelo pré-carregamento; na qualidade Baixa, 2 karts e sem sombras.
 * Nada aqui toca na simulação: é só desenho.
 */
export const ATTRACT_ENVIRONMENT: Environment = {
  ...ENVIRONMENTS['porto-lanternas'], fogNear: 70, fogFar: 300, weather: 'none', clouds: 0, stars: 0.35, bloom: 0.8,
  sunDir: [-0.62, 0.42, -0.62], sunIntensity: 3, ambientIntensity: 1.25, ambientGround: '#8a6a50',
  ibl: { map: 'venice_sunset', intensity: 1.05, tint: '#ffc8b0' },
};

const R = 40;
const HALF_WIDTH = 4.6;

interface Runner { character: CharacterId; kart: KartId; look?: Partial<KartLook>; lane: number; speed: number; phase: number }
const RUNNERS: Runner[] = [
  { character: 'nilo', kart: 'flecha', look: { paint: 'dourado', metal: 'cromado', neon: 'ciano' }, lane: -1.6, speed: 0.36, phase: 0 },
  { character: 'lumi', kart: 'cometa', look: { metal: 'cromado', neon: 'magenta' }, lane: 1.7, speed: 0.355, phase: -0.11 },
  { character: 'boro', kart: 'engrenagem', lane: 0.2, speed: 0.348, phase: -0.24 },
  { character: 'yuki', kart: 'geada', look: { paint: 'preto', metal: 'ouro' }, lane: -0.8, speed: 0.352, phase: -0.37 },
];

/** Anel de asfalto com zebras vermelhas e brancas nas bordas (cores por vértice, um material só). */
function useTrackGeometry(): { road: THREE.BufferGeometry; kerbs: THREE.BufferGeometry } {
  return useMemo(() => {
    const road = new THREE.RingGeometry(R - HALF_WIDTH, R + HALF_WIDTH, 160, 1);
    road.rotateX(-Math.PI / 2);
    const kerbs = new THREE.BufferGeometry();
    const pos: number[] = [], col: number[] = [];
    const red = new THREE.Color('#e2323f'), white = new THREE.Color('#f4f4f8');
    const N = 160;
    for (const [r0, r1] of [[R - HALF_WIDTH - 0.9, R - HALF_WIDTH], [R + HALF_WIDTH, R + HALF_WIDTH + 0.9]] as const) {
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        const c = i % 2 ? red : white;
        const p = (r: number, a: number): number[] => [Math.cos(a) * r, 0.02, Math.sin(a) * r];
        pos.push(...p(r0, a0), ...p(r1, a0), ...p(r1, a1), ...p(r0, a0), ...p(r1, a1), ...p(r0, a1));
        for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
      }
    }
    kerbs.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    kerbs.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    kerbs.computeVertexNormals();
    return { road, kerbs };
  }, []);
}

/** Árvores (cones) e lanternas instanciadas em volta do anel: duas chamadas de desenho cada. */
function Scenery({ count }: { count: number }): JSX.Element {
  const trees = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const lamps = useRef<THREE.InstancedMesh>(null);
  const poles = useRef<THREE.InstancedMesh>(null);
  const lampCount = 24;
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let seed = 7;
    const rnd = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const r = rnd() < 0.35 ? R - HALF_WIDTH - 11 - rnd() * 18 : R + HALF_WIDTH + 11 + rnd() * 60;
      const h = 4 + rnd() * 7;
      p.set(Math.cos(a) * r, h / 2 + 0.8, Math.sin(a) * r);
      s.set(h * 0.38, h, h * 0.38);
      m.compose(p, q.identity(), s);
      trees.current!.setMatrixAt(i, m);
      trees.current!.setColorAt(i, color.setHSL(0.28 + rnd() * 0.12, 0.45, 0.2 + rnd() * 0.12));
      p.y = 0.5; s.set(0.35, 1, 0.35);
      m.compose(p, q, s);
      trunks.current!.setMatrixAt(i, m);
    }
    for (let i = 0; i < lampCount; i++) {
      const a = (i / lampCount) * Math.PI * 2;
      const r = i % 2 ? R + HALF_WIDTH + 2 : R - HALF_WIDTH - 2;
      m.compose(p.set(Math.cos(a) * r, 3.2, Math.sin(a) * r), q.identity(), s.set(1, 1, 1));
      lamps.current!.setMatrixAt(i, m);
      m.compose(p.set(Math.cos(a) * r, 1.5, Math.sin(a) * r), q, s.set(1, 1, 1));
      poles.current!.setMatrixAt(i, m);
    }
    for (const r of [trees, trunks, lamps, poles]) { r.current!.instanceMatrix.needsUpdate = true; if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true; }
  }, [count]);
  return (
    <>
      <instancedMesh frustumCulled={false} ref={trees} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial roughness={0.85} flatShading />
      </instancedMesh>
      <instancedMesh frustumCulled={false} ref={trunks} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.5, 0.6, 1, 6]} />
        <meshStandardMaterial color="#4a3020" roughness={0.9} />
      </instancedMesh>
      <instancedMesh frustumCulled={false} ref={poles} args={[undefined, undefined, lampCount]}>
        <cylinderGeometry args={[0.08, 0.1, 3, 6]} />
        <meshStandardMaterial color="#2a2230" roughness={0.5} metalness={0.6} />
      </instancedMesh>
      <instancedMesh frustumCulled={false} ref={lamps} args={[undefined, undefined, lampCount]}>
        <sphereGeometry args={[0.45, 12, 8]} />
        <meshStandardMaterial color="#ffb070" emissive="#ffa040" emissiveIntensity={3.2} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

interface Shot { kind: 'chase' | 'roadside' | 'crane'; time: number }
const SHOTS: Shot[] = [{ kind: 'roadside', time: 5.5 }, { kind: 'chase', time: 6 }, { kind: 'crane', time: 6.5 }];

export function AttractScene({ quality }: { quality: QualityProfile }): JSX.Element {
  const runners = useMemo(() => RUNNERS.slice(0, quality.shadows ? 4 : 2), [quality.shadows]);
  const gltfs = useModels(runners.flatMap((r) => [`karts/${r.kart}.glb`, `characters/${r.character}.glb`]));
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const models = useMemo(() => runners.map((r, i) => {
    const m = new KartModel(gltfs[i * 2]!, gltfs[i * 2 + 1]!, null);
    m.applyLook({ ...DEFAULT_KART_LOOK, ...r.look });
    return m;
  }), [runners, gltfs]);
  useEffect(() => () => { for (const m of models) m.dispose(); }, [models]);
  const { road, kerbs } = useTrackGeometry();
  // texturas próprias já baixadas pelo pré-carregamento
  const [asphalt, grass] = useTexture([assetUrl('textures/trk_asphalt.webp'), assetUrl('textures/trk_grass.webp')]) as THREE.Texture[];
  useMemo(() => {
    for (const [t, rep] of [[asphalt!, 24], [grass!, 60]] as const) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
    }
  }, [asphalt, grass]);
  useEffect(() => () => { road.dispose(); kerbs.dispose(); }, [road, kerbs]);
  const focus = useRef(new THREE.Vector3());
  const st = useRef({
    t: 0, shot: 0, shotT: 0, frames: 0,
    angle: runners.map((r) => r.phase),
    vis: runners.map((): KartVisualState => ({ speed: 0, steer: 0, drifting: false, driftDir: 0, driftLevel: 0, boost: 0, spin: 0, grounded: true, shield: false, invulnerable: false, hop: 0, mood: 'race' })),
    look: new THREE.Vector3(), camPos: new THREE.Vector3(), tmp: new THREE.Vector3(),
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const s = st.current;
    s.t += dt;
    // primeiro quadro desenhado: a interface pode revelar a cena (o fundo em CSS some)
    if (++s.frames === 3) useSceneStore.getState().setAttractReady(true);
    runners.forEach((r, i) => {
      const m = models[i]!, v = s.vis[i]!;
      // ciclo de 7 s por kart: reta "normal", entra no drift (níveis 1→3) e solta o miniturbo
      const c = (s.t + i * 1.7) % 7;
      const drifting = c > 2 && c < 5.4;
      const boosting = c >= 5.4 && c < 6.6;
      const w = r.speed * (boosting ? 1.22 : 1);
      s.angle[i]! += w * dt;
      const a = s.angle[i]!;
      const lane = R + r.lane + (drifting ? 0.9 * Math.sin((c - 2) / 3.4 * Math.PI) : 0);
      m.group.position.set(Math.cos(a) * lane, 0, Math.sin(a) * lane);
      m.group.rotation.set(0, -a, 0);
      v.speed = w * R; v.steer = drifting ? 0.9 : 0.35; v.drifting = drifting; v.driftDir = 1;
      v.driftLevel = drifting ? Math.min(3, 1 + Math.floor((c - 2) / 1.1)) : 0;
      v.boost = boosting ? 1 - (c - 5.4) / 1.2 : 0;
      v.hop = drifting && c - 2 < 0.22 ? (c - 2) / 0.22 : 0;
      m.update(dt, v);
      if (boosting && c - 5.4 < dt * 1.5 && i % 2 === 0) m.emote('happy', 1.2);
    });
    // câmera: três planos em sequência, com transição suave
    s.shotT += dt;
    const shot = SHOTS[s.shot % SHOTS.length]!;
    if (s.shotT > shot.time) { s.shotT = 0; s.shot++; }
    const lead = models[0]!.group.position;
    const la = s.angle[0]!;
    const fwd = s.tmp.set(-Math.sin(la), 0, Math.cos(la));
    let k = 1 - Math.exp(-3 * dt);
    if (s.frames < 3) k = 1;
    if (shot.kind === 'chase') {
      s.camPos.copy(lead).addScaledVector(fwd, -6.5);
      s.camPos.x += Math.cos(la) * 1.5; s.camPos.y += 2.1; s.camPos.z += Math.sin(la) * 1.5;
      s.look.copy(lead).addScaledVector(fwd, 6).setY(3.2);
    } else if (shot.kind === 'roadside') {
      // câmera parada na beira da pista, baixa, um pouco à frente do pelotão
      const ca = la + 0.2 - s.shotT * 0.035;
      s.camPos.set(Math.cos(ca) * (R + HALF_WIDTH + 1.5), 0.9, Math.sin(ca) * (R + HALF_WIDTH + 1.5));
      s.look.copy(lead).setY(2.6);
    } else {
      const ca = la - 0.35 + s.shotT * 0.05;
      s.camPos.set(Math.cos(ca) * (R - 12), 6 + s.shotT * 0.4, Math.sin(ca) * (R - 12));
      s.look.copy(lead).setY(3.4);
    }
    camera.position.lerp(s.camPos, s.shotT < 0.05 ? 1 : k);
    focus.current.copy(lead);
    camera.lookAt(s.look);
    if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
  });
  useEffect(() => () => useSceneStore.getState().setAttractReady(false), []);

  return (
    <>
      <SkyAndLights env={ATTRACT_ENVIRONMENT} follow={focus} shadows={quality.shadows} shadowSize={quality.shadowSize} envResolution={quality.envResolution} />
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial map={asphalt} color="#8a8698" roughness={0.62} envMapIntensity={1.2} />
      </mesh>
      <mesh geometry={kerbs} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.03} receiveShadow>
        <circleGeometry args={[260, 48]} />
        <meshStandardMaterial map={grass} color="#9ab070" roughness={0.95} />
      </mesh>
      <Scenery count={quality.shadows ? 140 : 60} />
      {models.map((m, i) => <primitive key={i} object={m.group} />)}
    </>
  );
}
