import { useGameStore } from '@/app/gameStore';
import { MODE_INFO } from '@/app/flow';
import { TRACK_BY_ID } from '@/data/tracks';
import { ARENA_BY_ID, BATTLE_GAME_BY_ID } from '@/data/battle';
import { isTouchDevice } from '@/app/settingsStore';
import { AccelerationPicker } from './AccelerationPicker';
import { Btn } from './common';
import { SettingsScreen } from './SettingsScreen';
import { useUiStore } from './uiStore';

export function PauseMenu(): JSX.Element {
  const race = useGameStore((s) => s.race);
  const battle = useGameStore((s) => s.battle);
  const setPaused = useGameStore((s) => s.setPaused);
  const restartRace = useGameStore((s) => s.restartRace);
  const quitToMenu = useGameStore((s) => s.quitToMenu);
  const backToSelection = useGameStore((s) => s.backToSelection);
  const settingsOpen = useUiStore((s) => s.pauseSettingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setPauseSettingsOpen);

  if (settingsOpen) {
    return (
      <div className="overlay overlay--solid">
        <SettingsScreen inRace onBack={() => setSettingsOpen(false)} />
      </div>
    );
  }
  const touch = isTouchDevice();
  const modeName = battle ? `Batalha · ${BATTLE_GAME_BY_ID[battle.game].name}` : MODE_INFO.find((m) => m.id === race?.mode)?.name ?? '';
  return (
    <div className="overlay">
      <section className="pause panel" data-testid="screen-pause" data-nav-scope role="dialog" aria-modal="true" aria-label="Jogo pausado">
        <p className="screen__kicker">{modeName}{race ? ` · ${TRACK_BY_ID[race.trackId].name}` : battle ? ` · ${ARENA_BY_ID[battle.arenaId].name}` : ''}</p>
        <h1 className="display-title">Pausa</h1>
        <div className="pause__buttons">
          <Btn testId="btn-resume" variant="primary" autoFocusNav onClick={() => setPaused(false)}>Continuar</Btn>
          <Btn testId="btn-restart" onClick={restartRace}>Reiniciar</Btn>
          <Btn testId="btn-pause-settings" onClick={() => setSettingsOpen(true)}>Configurações</Btn>
          <Btn testId="btn-back-select" sound="ui_back" onClick={backToSelection}>
            Voltar {battle ? 'à escolha da arena' : race?.mode === 'championship' ? 'à escolha da copa' : 'à escolha da pista'}
          </Btn>
          <Btn testId="btn-quit" variant="danger" sound="ui_back" onClick={quitToMenu}>Sair para o menu</Btn>
        </div>
        {!touch && <p className="pause__hint" data-testid="pause-hint"><kbd>Esc</kbd> continua a corrida</p>}
        {touch && <AccelerationPicker />}
      </section>
    </div>
  );
}
