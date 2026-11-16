import { useGameStore } from '@/app/gameStore';
import { useSaveStore } from '@/game/save/saveStore';
import { Btn, ScreenShell } from './common';

export function MainMenu(): JSX.Element {
  const goTo = useGameStore((s) => s.goTo);
  const loadStatus = useSaveStore((s) => s.loadStatus);
  const stats = useSaveStore((s) => s.stats);
  return (
    <ScreenShell id="menu" layout="side" className="menu">
      <div className="menu__brand">
        <p className="screen__kicker">Corrida arcade em 3D</p>
        <h1 className="logo" aria-label="Kart Legends 3D">
          <span>Kart</span> <span className="logo__accent">Legends</span> <span className="logo__3d">3D</span>
        </h1>
      </div>
      <nav className="menu__buttons" aria-label="Menu principal">
        <Btn testId="btn-play" variant="primary" className="btn--xl" autoFocusNav onClick={() => goTo('mode')}>Jogar</Btn>
        <Btn testId="btn-progress" className="btn--xl" onClick={() => goTo('progress')}>Progressão</Btn>
        <Btn testId="btn-settings" className="btn--xl" onClick={() => goTo('settings')}>Configurações</Btn>
      </nav>
      {loadStatus === 'recovered' && (
        <p className="notice notice--warn" role="alert" data-testid="save-recovered">
          O progresso salvo estava ilegível e foi reiniciado. Uma cópia dos dados antigos ficou guardada no navegador.
        </p>
      )}
      <p className="menu__hint">
        {stats.races > 0 ? `${stats.races} corridas · ${stats.wins} vitórias · ` : ''}
        Setas e Enter navegam · Esc volta · Gamepad compatível
      </p>
    </ScreenShell>
  );
}
