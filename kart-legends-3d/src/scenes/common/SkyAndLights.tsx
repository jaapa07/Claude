import { Environment as DreiEnvironment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Environment } from '@/game/tracks/environments';
import { skyFragment, skyVertex } from '@/shaders/sky';
import { IblSphere } from './ibl';
import { setRimLight } from '@/game/vehicles/rimLight';
import { DEFAULT_LOOK, useSceneStore } from '../sceneStore';

export interface SkyHandle { flash: number }

interface Props {
  env: Environment;
  /** Objeto que a luz do sol (e a sombra) acompanha. */
  follow?: React.MutableRefObject<THREE.Vector3>;
  shadows: boolean;
  shadowSize?: number;
  handle?: React.MutableRefObject<SkyHandle>;
  /** Distância máxima de desenho (qualidade gráfica): encurta a neblina e o plano de corte da câmera. */
  drawDistance?: number;
  /** Resolução do cubo do mapa de ambiente (Baixa usa 64). */
  envResolution?: number;
}

/** Céu em shader, neblina, luz hemisférica, sol com sombra que segue o jogador e mapa de ambiente para reflexos. */
export function SkyAndLights({ env, follow, shadows, shadowSize = 2048, handle, drawDistance = Infinity, envResolution = 128 }: Props): JSX.Element {
  const { scene, gl, camera } = useThree();
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
    const far = Math.min(env.fogFar, drawDistance);
    scene.fog = new THREE.Fog(env.fogColor, Math.min(env.fogNear, far * 0.45), far);
    gl.toneMappingExposure = env.exposure;
    // Nada além da neblina precisa ser desenhado (menos trabalho para a GPU do celular).
    const cam = camera as THREE.PerspectiveCamera;
    const prevFar = cam.far;
    if (Number.isFinite(drawDistance)) { cam.far = Math.min(prevFar, far + 40); cam.updateProjectionMatrix(); }
    return () => {
      scene.fog = null;
      if (cam.far !== prevFar) { cam.far = prevFar; cam.updateProjectionMatrix(); }
    };
  }, [scene, gl, camera, env, drawDistance]);

  // brilho (bloom) e gradação de cor do pós-processamento acompanham o ambiente da pista
  useEffect(() => {
    useSceneStore.getState().setLook({ bloom: 0.4 + env.bloom * 0.35, saturation: env.grade.saturation, contrast: env.grade.contrast });
    // luz de recorte dos pilotos: mistura do sol com o horizonte (pistas noturnas ganham borda colorida)
    setRimLight(new THREE.Color(env.sunColor).lerp(new THREE.Color(env.skyHorizon), 0.5), 0.55);
    return () => useSceneStore.getState().setLook(DEFAULT_LOOK);
  }, [env]);

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
      {/* Mapa de ambiente: HDRI da pista (Poly Haven, CC0) normalizado e tingido + o sol da pista como luz de recorte
          (dá o brilho especular forte que a faixa comprimida do HDRI corta). Desenhado uma vez num cubo. */}
      <DreiEnvironment resolution={envResolution} frames={1} background={false}>
        <color attach="background" args={[env.skyHorizon]} />
        <IblSphere env={env} />
        <Lightformer form="rect" intensity={0.6} color={env.skyTop} position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer form="circle" intensity={env.sunIntensity * 2.4} color={env.sunColor} position={[dir.x * 12, dir.y * 12, dir.z * 12]} scale={4} target={[0, 0, 0]} />
      </DreiEnvironment>
    </>
  );
}
