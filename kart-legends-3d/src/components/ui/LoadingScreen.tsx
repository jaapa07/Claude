import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from '@/app/gameStore';
import { useSettingsStore } from '@/app/settingsStore';
import { audio } from '@/game/audio/audioManager';
import { preloadCoreAssets } from '@/scenes/preload';
import { useSceneStore } from '@/scenes/sceneStore';
import { assetUrl } from '@/game/core/assets';
import { AssetImg, Btn, ScreenShell } from './common';

type Status = 'loading' | 'ready' | 'error';

function errorText(label: string, err: unknown): string {
  return `${label}: ${err instanceof Error ? err.message : String(err)}`;
}

export function LoadingScreen(): JSX.Element {
  const goTo = useGameStore((s) => s.goTo);
  const [status, setStatus] = useState<Status>('loading');
  const [assetProgress, setAssetProgress] = useState(0);
  const [audioDone, setAudioDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const runId = useRef(0);

  const run = (): void => {
    const id = ++runId.current;
    setStatus('loading');
    setErrors([]);
    setAssetProgress(0);
    setAudioDone(false);
    const found: string[] = [];
    const audioTask = (async () => {
      try {
        await audio.preload();
      } catch (err) {
        found.push(errorText('Falha ao carregar o áudio', err));
      }
      if (runId.current === id) setAudioDone(true);
    })();
    const assetTask = (async () => {
      try {
        await preloadCoreAssets((p: number) => {
          if (runId.current !== id) return;
          const v = p > 1 ? p / 100 : p;
          setAssetProgress(Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0)));
        });
        if (runId.current === id) setAssetProgress(1);
      } catch (err) {
        found.push(errorText('Falha ao carregar modelos e texturas', err));
      }
    })();
    void Promise.all([audioTask, assetTask]).then(() => {
      if (runId.current !== id) return;
      setErrors(found);
      setStatus(found.length > 0 ? 'error' : 'ready');
    });
  };

  useEffect(() => {
    run();
    return () => {
      runId.current += 1;
    };
  }, []);

  const start = async (): Promise<void> => {
    if (starting) return;
    setStarting(true);
    try {
      // O navegador só libera áudio depois de um gesto do usuário: este clique.
      await audio.unlock();
      audio.setVolumes(useSettingsStore.getState().volumes);
    } catch (err) {
      console.error('[loading] áudio indisponível', err);
    }
    goTo('menu');
  };

  const progress = status === 'loading' ? assetProgress * 0.85 + (audioDone ? 0.15 : 0) : 1;
  const percent = Math.round(progress * 100);

  const ready = status !== 'loading';

  // Abertura 3D: com tudo baixado, a cena de karts correndo entra atrás do logotipo (o fundo em CSS some quando
  // ela desenha). Sem ela se o sistema pede menos movimento ou se o carregamento falhou.
  const attractReady = useSceneStore((s) => s.attractReady);
  useEffect(() => {
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    useSceneStore.getState().setAttract(status === 'ready' && !reduced);
  }, [status]);
  useEffect(() => () => useSceneStore.getState().setAttract(false), []);

  return (
    <ScreenShell id="loading" layout="center" className={`loading intro${attractReady ? ' intro--attract' : ''}`}>
      <IntroBackdrop />
      <div className="loading__brand intro__brand">
        <p className="screen__kicker intro__kicker">Corrida arcade em 3D</p>
        <h1 className="logo intro__logo" aria-label="Kart Legends 3D">
          <span className="intro__word">{'Kart'.split('').map((ch, i) => <span key={i} className="intro__letter" style={{ '--i': i } as CSSProperties}>{ch}</span>)}</span>{' '}
          <span className="intro__word logo__accent intro__shine">{'Legends'.split('').map((ch, i) => <span key={i} className="intro__letter" style={{ '--i': i + 5 } as CSSProperties}>{ch}</span>)}</span>{' '}
          <span className="logo__3d intro__3d">3D</span>
        </h1>
      </div>
      <div className="loading__panel panel intro__panel">
        <div className="progress intro__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} data-testid="loading-progress">
          <div className="progress__fill intro__track-fill" style={{ width: `${percent}%` }} />
          <span className="intro__track-kart" style={{ left: `${percent}%` }} aria-hidden="true">
            <AssetImg className="intro__track-icon" src={assetUrl('ui/icons/nilo.webp')} alt="" label="" color="#f2762e" />
          </span>
          <span className="intro__track-flag" aria-hidden="true" />
        </div>
        <p className="loading__status" data-testid="loading-status" aria-live="polite">
          {status === 'loading' && `Carregando pilotos, karts e sons… ${percent}%`}
          {status === 'ready' && 'Tudo pronto. Toque em Iniciar para ligar os motores!'}
          {status === 'error' && 'O carregamento terminou com erros:'}
        </p>
        {errors.length > 0 && (
          <ul className="loading__errors" data-testid="loading-error" role="alert">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
        <div className="loading__actions">
          {status === 'error' && <Btn testId="btn-retry-load" sound="none" onClick={run}>Tentar novamente</Btn>}
          <Btn
            testId="btn-start" variant="primary" sound="none" autoFocusNav className={ready ? 'intro__start intro__start--ready' : 'intro__start'}
            disabled={status === 'loading' || starting} onClick={() => void start()}
          >
            {status === 'error' ? 'Iniciar mesmo assim' : 'Iniciar'}
          </Btn>
        </div>
      </div>
    </ScreenShell>
  );
}

/** Pilotos que passam correndo pela estrada da abertura (ícones já carregados pelo pré-carregamento). */
const PARADE: ReadonlyArray<{ id: string; lane: number; speed: number; delay: number }> = [
  { id: 'nilo', lane: 0, speed: 6.5, delay: 0 },
  { id: 'lumi', lane: 1, speed: 7.4, delay: 1.2 },
  { id: 'boro', lane: 0, speed: 8.1, delay: 2.6 },
  { id: 'yuki', lane: 1, speed: 6.9, delay: 3.4 },
  { id: 'kora', lane: 0, speed: 7.7, delay: 4.5 },
  { id: 'kaito', lane: 1, speed: 6.2, delay: 5.3 },
];

/**
 * Cenário animado da abertura, todo em CSS (leve para o celular): céu ao entardecer com estrelas, sol, montanhas
 * em camadas que deslizam em velocidades diferentes, estrada com faixas correndo, riscos de velocidade e os
 * pilotos passando. Respeita "reduzir movimento" do sistema.
 */
function IntroBackdrop(): JSX.Element {
  return (
    <div className="intro__scene" aria-hidden="true">
      <div className="intro__stars" />
      <div className="intro__sun" />
      <div className="intro__layer intro__layer--far" />
      <div className="intro__layer intro__layer--mid" />
      <div className="intro__layer intro__layer--near" />
      <div className="intro__road">
        <div className="intro__road-lines" />
        {PARADE.map((p) => (
          <div
            key={p.id} className="intro__racer"
            style={{ '--lane': p.lane, '--speed': `${p.speed}s`, '--delay': `${p.delay}s` } as CSSProperties}
          >
            <span className="intro__trail" />
            <AssetImg className="intro__racer-icon" src={assetUrl(`ui/icons/${p.id}.webp`)} alt="" label="" color="#7b5cff" />
          </div>
        ))}
      </div>
      <div className="intro__streaks" />
    </div>
  );
}
