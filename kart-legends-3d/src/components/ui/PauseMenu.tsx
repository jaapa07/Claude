import { useGameStore } from '@/app/gameStore';
import { MODE_INFO } from '@/app/flow';
import { TRACK_BY_ID } from '@/data/tracks';
import { isTouchDevice } from '@/app/settingsStore';
import { AccelerationPicker } from './AccelerationPicker';
import { Btn } from './common';
import { SettingsScreen } from './SettingsScreen';
import { useUiStore } from './uiStore';

export function PauseMenu(): JSX.Element {
  const race = useGameStore((s) => s.race);
  const setPaused = useGameStore((s) => s.setPaused);
  const restartRace = useGameStore((s) => s.restartRace);
  const quitToMenu = useGameStore((s) => s.quitToMenu);
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
  const modeName = MODE_INFO.find((m) => m.id === race?.mode)?.name ?? '';
  return (
    <div className="overlay">
      <section className="pause panel" data-testid="screen-pause" data-nav-scope role="dialog" aria-modal="true" aria-label="Jogo pausado">
        <p className="screen__kicker">{modeName}{race ? ` · ${TRACK_BY_ID[race.trackId].name}` : ''}</p>
        <h1 className="display-title">Pausa</h1>
        <div className="pause__buttons">
          <Btn testId="btn-resume" variant="primary" autoFocusNav onClick={() => setPaused(false)}>Continuar</Btn>
          <Btn testId="btn-restart" onClick={restartRace}>Reiniciar</Btn>
          <Btn testId="btn-pause-settings" onClick={() => setSettingsOpen(true)}>Configurações</Btn>
          <Btn testId="btn-quit" variant="danger" sound="ui_back" onClick={quitToMenu}>Sair</Btn>
        </div>
        {touch && <AccelerationPicker />}
      </section>
    </div>
  );
}
