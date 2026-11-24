import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/app/gameStore';
import { useSettingsStore } from '@/app/settingsStore';
import { audio } from '@/game/audio/audioManager';
import { preloadCoreAssets } from '@/scenes/preload';
import { Btn, ScreenShell } from './common';

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

  return (
    <ScreenShell id="loading" layout="center" className="loading">
      <div className="loading__brand">
        <p className="screen__kicker">Corrida arcade em 3D</p>
        <h1 className="logo" aria-label="Kart Legends 3D">
          <span>Kart</span> <span className="logo__accent">Legends</span> <span className="logo__3d">3D</span>
        </h1>
      </div>
      <div className="loading__panel panel">
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} data-testid="loading-progress">
          <div className="progress__fill" style={{ width: `${percent}%` }} />
        </div>
        <p className="loading__status" data-testid="loading-status" aria-live="polite">
          {status === 'loading' && `Carregando pilotos, karts e sons… ${percent}%`}
          {status === 'ready' && 'Tudo pronto. Clique em Iniciar para ligar os motores.'}
          {status === 'error' && 'O carregamento terminou com erros:'}
        </p>
        {errors.length > 0 && (
          <ul className="loading__errors" data-testid="loading-error" role="alert">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
        <div className="loading__actions">
          {status === 'error' && <Btn testId="btn-retry-load" sound="none" onClick={run}>Tentar novamente</Btn>}
          <Btn testId="btn-start" variant="primary" sound="none" autoFocusNav disabled={status === 'loading' || starting} onClick={() => void start()}>
            {status === 'error' ? 'Iniciar mesmo assim' : 'Iniciar'}
          </Btn>
        </div>
      </div>
    </ScreenShell>
  );
}
