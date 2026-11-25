import { MODE_INFO, humanCount, nextOf, prevOf, supportsTwoPlayers } from '@/app/flow';
import { useGameStore } from '@/app/gameStore';
import type { GameMode } from '@/data/ids';
import { Btn, ScreenShell, useCardPick } from './common';

export function ModeSelect(): JSX.Element {
  const mode = useGameStore((s) => s.selection.mode);
  const players = useGameStore((s) => s.selection.players);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const pick = useCardPick<GameMode>({
    selected: mode,
    onSelect: (id) => setSelection({ mode: id }),
    onConfirm: () => goTo(nextOf('mode', useGameStore.getState().selection) ?? 'menu'),
  });
  // Dois jogadores: Contrarrelógio e Treino (só para um) ficam de fora.
  const two = players === 2;
  const modes = two ? MODE_INFO.filter((m) => supportsTwoPlayers(m.id)) : MODE_INFO;
  return (
    <ScreenShell
      id="mode" title="Modo de jogo" kicker={humanCount({ players, mode: 'quick' }) === 2 ? 'Passo 1 · 2 jogadores' : 'Passo 1'}
      onBack={() => goTo(prevOf('mode', useGameStore.getState().selection))}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" onClick={pick.confirm}>Confirmar</Btn>}
    >
      <div className="card-list">
        {modes.map((m, i) => (
          <button key={m.id} type="button" className="card card--row" data-testid={`card-mode-${m.id}`} {...pick.cardProps(m.id)}>
            <span className="card__index">{String(i + 1).padStart(2, '0')}</span>
            <span className="card__text">
              <span className="card__title">{m.name}</span>
              <span className="card__desc">{two && m.id !== 'battle' ? m.description.replace('sete adversários', 'seis adversários, lado a lado') : m.description}</span>
            </span>
            <span className="card__meta">{m.detail}</span>
          </button>
        ))}
      </div>
      {two && <p className="notice" data-testid="mode-two-player-note">Contrarrelógio e Treino são só para 1 jogador.</p>}
    </ScreenShell>
  );
}
