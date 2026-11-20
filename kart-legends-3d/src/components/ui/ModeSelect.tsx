import { MODE_INFO, nextScreen } from '@/app/flow';
import { useGameStore } from '@/app/gameStore';
import type { GameMode } from '@/data/ids';
import { Btn, ScreenShell, useCardPick } from './common';

export function ModeSelect(): JSX.Element {
  const mode = useGameStore((s) => s.selection.mode);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const pick = useCardPick<GameMode>({
    selected: mode,
    onSelect: (id) => setSelection({ mode: id }),
    onConfirm: () => goTo(nextScreen('mode', useGameStore.getState().selection.mode) ?? 'menu'),
  });
  return (
    <ScreenShell
      id="mode" title="Modo de jogo" kicker="Passo 1" onBack={() => goTo('menu')}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" onClick={pick.confirm}>Confirmar</Btn>}
    >
      <div className="card-list">
        {MODE_INFO.map((m, i) => (
          <button key={m.id} type="button" className="card card--row" data-testid={`card-mode-${m.id}`} {...pick.cardProps(m.id)}>
            <span className="card__index">{String(i + 1).padStart(2, '0')}</span>
            <span className="card__text">
              <span className="card__title">{m.name}</span>
              <span className="card__desc">{m.description}</span>
            </span>
            <span className="card__meta">{m.detail}</span>
          </button>
        ))}
      </div>
    </ScreenShell>
  );
}
