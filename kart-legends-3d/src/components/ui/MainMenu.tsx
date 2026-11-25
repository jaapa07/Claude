import { isTouchDevice } from '@/app/settingsStore';
import { useGameStore } from '@/app/gameStore';
import { canChoosePlayers, nextOf } from '@/app/flow';
import { useSaveStore } from '@/game/save/saveStore';
import { Btn, ScreenShell } from './common';
import { CoinBadge } from './ShopScreen';

export function MainMenu(): JSX.Element {
  const goTo = useGameStore((s) => s.goTo);
  const setSelection = useGameStore((s) => s.setSelection);
  const play = (): void => {
    // No celular não há tela dividida: sempre 1 jogador, direto para a escolha do modo.
    if (!canChoosePlayers()) setSelection({ players: 1 });
    goTo(nextOf('menu', useGameStore.getState().selection) ?? 'mode');
  };
  const loadStatus = useSaveStore((s) => s.loadStatus);
  const stats = useSaveStore((s) => s.stats);
  return (
    <ScreenShell id="menu" layout="side" className="menu">
      <CoinBadge className="coin-badge--big menu__coins" />
      <div className="menu__brand">
        <p className="screen__kicker">Corrida arcade em 3D</p>
        <h1 className="logo" aria-label="Kart Legends 3D">
          <span>Kart</span> <span className="logo__accent">Legends</span> <span className="logo__3d">3D</span>
        </h1>
      </div>
      <nav className="menu__buttons" aria-label="Menu principal">
        <Btn testId="btn-play" variant="primary" className="btn--xl" autoFocusNav onClick={play}>Jogar</Btn>
        <Btn testId="btn-shop" className="btn--xl" onClick={() => goTo('shop')}>Loja</Btn>
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
        {isTouchDevice() ? 'Toque para escolher · Celular na horizontal · Controle Bluetooth compatível' : 'Setas e Enter navegam · Esc volta · Gamepad compatível'}
      </p>
    </ScreenShell>
  );
}
