import { DIFFICULTY_INFO, nextScreen, prevScreen } from '@/app/flow';
import { useGameStore } from '@/app/gameStore';
import type { Difficulty } from '@/data/ids';
import { Btn, ScreenShell, useCardPick } from './common';

export function DifficultySelect(): JSX.Element {
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const pick = useCardPick<Difficulty>({
    selected: selection.difficulty,
    onSelect: (id) => setSelection({ difficulty: id }),
    onConfirm: () => goTo(nextScreen('difficulty', selection.mode) ?? 'character'),
  });
  return (
    <ScreenShell
      id="difficulty" title="Dificuldade" kicker="Adversários" onBack={() => goTo(prevScreen('difficulty', selection.mode))}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" onClick={pick.confirm}>Confirmar</Btn>}
    >
      <div className="card-list">
        {DIFFICULTY_INFO.map((d, i) => (
          <button key={d.id} type="button" className={`card card--row card--difficulty-${d.id}`} data-testid={`card-difficulty-${d.id}`} {...pick.cardProps(d.id)}>
            <span className="card__index" aria-hidden="true">{'▲'.repeat(i + 1)}</span>
            <span className="card__text">
              <span className="card__title">{d.name}</span>
              <span className="card__desc">{d.description}</span>
            </span>
          </button>
        ))}
      </div>
    </ScreenShell>
  );
}
