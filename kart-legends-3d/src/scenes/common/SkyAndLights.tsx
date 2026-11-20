import { Environment as DreiEnvironment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Environment } from '@/game/tracks/environments';
import { skyFragment, skyVertex } from '@/shaders/sky';

export interface SkyHandle { flash: number }

interface Props {
  env: Environment;
  /** Objeto que a luz do sol (e a sombra) acompanha. */
  follow?: React.MutableRefObject<THREE.Vector3>;
  shadows: boolean;
  shadowSize?: number;
  handle?: React.MutableRefObject<SkyHandle>;
}

/** Céu em shader, neblina, luz hemisférica, sol com sombra que segue o jogador e mapa de ambiente para reflexos. */
export function SkyAndLights({ env, follow, shadows, shadowSize = 2048, handle }: Props): JSX.Element {
  const { scene, gl } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const dir = useMemo(() => new THREE.Vector3(...env.sunDir).normalize(), [env]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: {
      uTop: { value: new THREE.Color(env.skyTop) }, uHorizon: { value: new THREE.Color(env.skyHorizon) }, uBottom: { value: new THREE.Color(env.skyBottom) },
      uSunDir: { value: dir }, uSunColor: { value: new THREE.Color(env.sunColor) },
      uStars: { value: env.stars }, uAurora: { value: env.aurora }, uClouds: { value: env.clouds }, uTime: { value: 0 }, uFlash: { value: 0 },
    },
  }), [env, dir]);
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    scene.fog = new THREE.Fog(env.fogColor, env.fogNear, env.fogFar);
    gl.toneMappingExposure = env.exposure;
    return () => { scene.fog = null; };
  }, [scene, gl, env]);

  useFrame((state, dt) => {
    material.uniforms.uTime!.value += dt;
    const flash = handle?.current.flash ?? 0;
    material.uniforms.uFlash!.value = flash * 0.6;
    if (handle && handle.current.flash > 0) handle.current.flash = Math.max(0, handle.current.flash - dt * 3.2);
    if (hemi.current) hemi.current.intensity = env.ambientIntensity + flash * 2.5;
    const s = sun.current;
    if (s) {
      const p = follow?.current ?? state.camera.position;
      s.position.set(p.x + dir.x * 90, p.y + dir.y * 90, p.z + dir.z * 90);
      s.target.position.set(p.x, p.y, p.z);
      s.target.updateMatrixWorld();
    }
  }, -1);

  return (
    <>
      <mesh material={material} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      <hemisphereLight ref={hemi} args={[env.ambientSky, env.ambientGround, env.ambientIntensity]} />
      <directionalLight
        ref={sun} color={env.sunColor} intensity={env.sunIntensity} castShadow={shadows}
        shadow-mapSize-width={shadowSize} shadow-mapSize-height={shadowSize}
        shadow-camera-left={-48} shadow-camera-right={48} shadow-camera-top={48} shadow-camera-bottom={-48}
        shadow-camera-near={10} shadow-camera-far={200} shadow-bias={-0.0006} shadow-normalBias={0.04}
      />
      <DreiEnvironment resolution={64} frames={1} background={false}>
        <color attach="background" args={[env.skyHorizon]} />
        <Lightformer form="rect" intensity={2.2} color={env.skyTop} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer form="circle" intensity={env.sunIntensity * 2.4} color={env.sunColor} position={[dir.x * 12, dir.y * 12, dir.z * 12]} scale={5} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color={env.ambientGround} position={[0, -8, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} />
      </DreiEnvironment>
    </>
  );
}
