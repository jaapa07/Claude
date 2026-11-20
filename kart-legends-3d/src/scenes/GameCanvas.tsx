import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/app/gameStore';
import { useSettingsStore } from '@/app/settingsStore';
import { CHARACTER_BY_ID } from '@/data/characters';
import { CHARACTER_IDS, KART_IDS, type CharacterId, type KartId, type TrackId } from '@/data/ids';
import { PodiumScene, type PodiumEntry } from './PodiumScene';
import { QUALITY } from './quality';
import { RaceScene } from './race/RaceScene';
import { useSceneStore } from './sceneStore';
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
  const raceNonce = useGameStore((s) => s.raceNonce);
  const selection = useGameStore((s) => s.selection);
  const lastResult = useGameStore((s) => s.lastResult);
  const championship = useGameStore((s) => s.championship);
  const qualityId = useSettingsStore((s) => s.quality);
  const quality = QUALITY[qualityId];
  const loading = useSceneStore((s) => s.loading);
  const fps = useSceneStore((s) => s.fps);
  const studio = useMemo(studioRequest, []);

  const podium = useMemo((): PodiumEntry[] => {
    if (championship?.finished) return [...championship.standings].sort((a, b) => b.points - a.points);
    return lastResult ? lastResult.results.map((r) => ({ characterId: r.characterId, kartId: r.kartId, isPlayer: r.isPlayer })) : [];
  }, [championship, lastResult]);
  const trophy = useMemo(() => {
    if (!championship?.finished) return null;
    const pos = [...championship.standings].sort((a, b) => b.points - a.points).findIndex((s) => s.isPlayer);
    return pos === 0 ? 'gold' as const : pos === 1 ? 'silver' as const : pos === 2 ? 'bronze' as const : null;
  }, [championship]);

  const mode = studio ? 'studio' : (screen === 'race' || screen === 'results') && race ? 'race' : screen === 'podium' && podium.length ? 'podium' : screen === 'loading' ? 'none' : 'showcase';

  return (
    <div className="game-canvas" data-testid="game-canvas" data-mode={mode} data-loading={loading ? '1' : '0'} data-fps={fps}>
      <Canvas
        key={qualityId}
        shadows={quality.shadows ? { type: THREE.PCFSoftShadowMap } : false}
        dpr={quality.dpr}
        camera={{ fov: 60, near: 0.3, far: 1600, position: [3, 2, 6] }}
        gl={{ antialias: quality.antialias, powerPreference: 'high-performance', alpha: !!studio && studio.kind !== 'track', preserveDrawingBuffer: !!studio }}
        onCreated={({ gl }) => { if (studio && studio.kind !== 'track') gl.setClearColor(0x000000, 0); }}
      >
        <FpsProbe />
        <Suspense fallback={<LoadingSignal />}>
          {mode === 'race' && race && <RaceScene key={raceNonce} config={race} />}
          {mode === 'podium' && <PodiumScene entries={podium} trophy={trophy} />}
          {mode === 'showcase' && <ShowcaseScene screen={screen} characterId={selection.characterId} kartId={selection.kartId} />}
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
          <EffectComposer multisampling={qualityId === 'high' ? 4 : 0}>
            <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1.05} luminanceSmoothing={0.2} />
            <Vignette offset={0.25} darkness={0.42} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
      {loading && mode === 'race' && <div className="scene-loading" role="status">Carregando pista…</div>}
    </div>
  );
}
