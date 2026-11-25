import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, BrightnessContrast, EffectComposer, FXAA, HueSaturation, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/app/gameStore';
import { useSettingsStore } from '@/app/settingsStore';
import { CHARACTER_BY_ID } from '@/data/characters';
import { CHARACTER_IDS, KART_IDS, type CharacterId, type KartId, type TrackId } from '@/data/ids';
import { PerformanceMonitor } from '@react-three/drei';
import { setRimEnabled } from '@/game/vehicles/rimLight';
import { AttractScene } from './AttractScene';
import { PodiumScene, type PodiumEntry } from './PodiumScene';
import { QUALITY } from './quality';
import { BattleScene } from './battle/BattleScene';
import { RaceScene } from './race/RaceScene';
import { useSceneStore } from './sceneStore';
import { splitQuality } from './split';
import { ShowcaseScene, TrackPreviewScene } from './ShowcaseScene';

function LoadingSignal(): null {
  useEffect(() => {
    useSceneStore.getState().setLoading(true);
    return () => useSceneStore.getState().setLoading(false);
  }, []);
  return null;
}

/** Mede o FPS real (média de 1 s) e publica para a interface e os testes. */
function FpsProbe(): null {
  const acc = useRef({ frames: 0, time: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    a.frames++; a.time += dt;
    if (a.time >= 1) { useSceneStore.getState().setFps(Math.round(a.frames / a.time)); a.frames = 0; a.time = 0; }
  });
  return null;
}

/**
 * Gancho dos testes/capturas (?e2e=1): permite desligar o laço de quadros e avançar quadro a quadro com um
 * passo fixo, para gravar sequências de animação determinísticas mesmo com renderização por software.
 */
function FrameStepHook({ setManual }: { setManual: (on: boolean) => void }): null {
  const advance = useThree((s) => s.advance);
  const clock = useThree((s) => s.clock);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('e2e')) return;
    const w = window as unknown as { __kl3dFrames?: unknown };
    w.__kl3dFrames = {
      manual: (on: boolean) => setManual(on),
      step: (frames: number, dt = 1 / 30) => { for (let i = 0; i < frames; i++) advance(clock.elapsedTime + dt); },
      /** Posição e campo de visão da câmera atual (inspeção da câmera de corrida). */
      camera: () => ({ pos: camera.position.toArray(), fov: (camera as THREE.PerspectiveCamera).fov }),
      /** Redesenha o quadro atual visto de outro ponto (inspeção de cenário animado). */
      view: (pos: [number, number, number], target: [number, number, number]) => {
        camera.position.set(...pos);
        camera.lookAt(...target);
        camera.updateMatrixWorld();
        gl.render(scene, camera);
      },
    };
    return () => { delete w.__kl3dFrames; };
  }, [setManual, advance, clock, gl, scene, camera]);
  return null;
}

/** Modo estúdio (?studio=character:nilo | kart:flecha): usado pelo script que gera retratos e miniaturas. */
function studioRequest(): { kind: 'character' | 'kart' | 'track'; id: string } | null {
  const v = new URLSearchParams(window.location.search).get('studio');
  if (!v) return null;
  const [kind, id] = v.split(':');
  return (kind === 'character' || kind === 'kart' || kind === 'track') && id ? { kind, id } : null;
}

/** Fundo 3D em tela cheia: vitrine dos menus, corrida e pódio. Lê o store de fluxo e nunca o conduz. */
export function GameCanvas(): JSX.Element {
  const screen = useGameStore((s) => s.screen);
  const race = useGameStore((s) => s.race);
  const battle = useGameStore((s) => s.battle);
  const raceNonce = useGameStore((s) => s.raceNonce);
  const selection = useGameStore((s) => s.selection);
  const lastResult = useGameStore((s) => s.lastResult);
  const championship = useGameStore((s) => s.championship);
  const qualityId = useSettingsStore((s) => s.quality);
  const loading = useSceneStore((s) => s.loading);
  const fps = useSceneStore((s) => s.fps);
  const look = useSceneStore((s) => s.look);
  const attract = useSceneStore((s) => s.attract);
  const studio = useMemo(studioRequest, []);
  const [manualFrames, setManualFrames] = useState(false);

  const podium = useMemo((): PodiumEntry[] => {
    if (championship?.finished) return [...championship.standings].sort((a, b) => b.points - a.points);
    return lastResult ? lastResult.results.map((r) => ({ characterId: r.characterId, kartId: r.kartId, isPlayer: r.isPlayer })) : [];
  }, [championship, lastResult]);
  const trophy = useMemo(() => {
    if (!championship?.finished) return null;
    const pos = [...championship.standings].sort((a, b) => b.points - a.points).findIndex((s) => s.isPlayer);
    return pos === 0 ? 'gold' as const : pos === 1 ? 'silver' as const : pos === 2 ? 'bronze' as const : null;
  }, [championship]);

  const mode = studio ? 'studio' : (screen === 'race' || screen === 'results') && (race || battle) ? 'race' : screen === 'podium' && podium.length ? 'podium' : screen === 'loading' ? (attract ? 'attract' : 'none') : 'showcase';
  // Tela dividida: a cena é desenhada duas vezes, então a qualidade fica limitada (ver `splitQuality`).
  const split = mode === 'race' && ((race ?? battle)?.racers.filter((r) => r.isPlayer).length ?? 0) >= 2;
  const quality = split ? splitQuality(QUALITY[qualityId]) : QUALITY[qualityId];
  // Luz de recorte dos pilotos: desligada na Baixa (celulares), antes de os modelos serem montados.
  setRimEnabled(qualityId !== 'low');
  // Resolução adaptativa: se o FPS cai, a cena é desenhada com menos pixels (e volta a subir quando sobra folga).
  const [dprScale, setDprScale] = useState(1);
  const maxDpr = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, quality.dpr[1]);
  const dpr = studio ? quality.dpr : Math.max(0.6, Math.min(maxDpr, Math.max(quality.dpr[0], maxDpr) * dprScale));

  return (
    <div className="game-canvas" data-testid="game-canvas" data-mode={mode} data-split={split ? '1' : '0'} data-loading={loading ? '1' : '0'} data-fps={fps}>
      <Canvas
        key={qualityId}
        frameloop={manualFrames ? 'never' : 'always'}
        shadows={quality.shadows ? { type: THREE.PCFSoftShadowMap } : false}
        dpr={dpr}
        camera={{ fov: 60, near: 0.3, far: 1600, position: [3, 2, 6] }}
        gl={{ antialias: quality.antialias, powerPreference: 'high-performance', alpha: !!studio && studio.kind !== 'track', preserveDrawingBuffer: !!studio }}
        onCreated={({ gl }) => { if (studio && studio.kind !== 'track') gl.setClearColor(0x000000, 0); }}
      >
        <FpsProbe />
        {!studio && (
          <PerformanceMonitor
            bounds={() => [42, 58]} flipflops={6}
            onDecline={() => setDprScale((v) => Math.max(0.55, +(v - 0.15).toFixed(2)))}
            onIncline={() => setDprScale((v) => Math.min(1, +(v + 0.1).toFixed(2)))}
          />
        )}
        <FrameStepHook setManual={setManualFrames} />
        <Suspense fallback={<LoadingSignal />}>
          {mode === 'race' && race && <RaceScene key={raceNonce} config={race} />}
          {mode === 'race' && battle && <BattleScene key={raceNonce} config={battle} />}
          {mode === 'podium' && <PodiumScene entries={podium} trophy={trophy} />}
          {mode === 'attract' && <AttractScene quality={quality} />}
          {mode === 'showcase' && (
            // vez do Jogador 2 (tela dividida): o palco mostra a escolha dele
            screen === 'character2' || screen === 'kart2'
              ? <ShowcaseScene screen={screen} characterId={selection.p2CharacterId} kartId={selection.p2KartId} />
              : <ShowcaseScene screen={screen} characterId={selection.characterId} kartId={selection.kartId} />
          )}
          {mode === 'studio' && studio?.kind === 'track' && <TrackPreviewScene trackId={studio.id as TrackId} />}
          {mode === 'studio' && studio && studio.kind !== 'track' && (
            <ShowcaseScene
              screen="menu" studio={studio.kind}
              characterId={(CHARACTER_IDS as readonly string[]).includes(studio.id) ? studio.id as CharacterId : 'nilo'}
              kartId={(KART_IDS as readonly string[]).includes(studio.id) ? studio.id as KartId : CHARACTER_BY_ID[studio.id as CharacterId]?.kartId ?? 'flecha'}
            />
          )}
        </Suspense>
        {quality.post && (!studio || studio.kind === 'track') && (
          // FXAA (na Média o MSAA do canvas não vale dentro do pós-processamento; a Alta soma MSAA 4× no buffer).
          // Gradação leve por pista (saturação/contraste) depois do mapeamento de tons.
          <EffectComposer multisampling={qualityId === 'high' ? 4 : 0}>
            <Bloom mipmapBlur intensity={look.bloom} luminanceThreshold={1.05} luminanceSmoothing={0.2} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <HueSaturation saturation={look.saturation} />
            <BrightnessContrast contrast={look.contrast} />
            <Vignette offset={0.28} darkness={0.38} />
            <FXAA />
          </EffectComposer>
        )}
      </Canvas>
      {loading && mode === 'race' && <div className="scene-loading" role="status">{battle ? 'Carregando arena…' : 'Carregando pista…'}</div>}
    </div>
  );
}
