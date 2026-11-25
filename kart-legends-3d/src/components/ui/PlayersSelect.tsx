import { nextOf, prevOf, supportsTwoPlayers } from '@/app/flow';
import { useGameStore } from '@/app/gameStore';
import { Btn, ScreenShell, useCardPick } from './common';

type Count = '1' | '2';

/** Menu → Jogar → "1 jogador / 2 jogadores" (computador/TV; no celular esta tela não aparece). */
export function PlayersSelect(): JSX.Element {
  const players = useGameStore((s) => s.selection.players);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const pick = useCardPick<Count>({
    selected: players === 2 ? '2' : '1',
    onSelect: (id) => setSelection({ players: id === '2' ? 2 : 1 }),
    onConfirm: () => {
      const sel = useGameStore.getState().selection;
      // Contrarrelógio e Treino são só para um jogador: com dois, a escolha de modo começa na Corrida Rápida.
      if (sel.players === 2 && !supportsTwoPlayers(sel.mode)) setSelection({ mode: 'quick' });
      goTo(nextOf('players', useGameStore.getState().selection) ?? 'mode');
    },
  });
  return (
    <ScreenShell
      id="players" title="Quantos jogadores?" kicker="Jogar" onBack={() => goTo(prevOf('players', useGameStore.getState().selection))}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" onClick={pick.confirm}>Confirmar</Btn>}
    >
      <div className="card-list">
        <button type="button" className="card card--row" data-testid="card-players-1" {...pick.cardProps('1')}>
          <span className="card__index">1P</span>
          <span className="card__text">
            <span className="card__title">1 jogador</span>
            <span className="card__desc">Você contra sete adversários. Todos os modos.</span>
          </span>
          <span className="card__meta">Tela cheia</span>
        </button>
        <button type="button" className="card card--row" data-testid="card-players-2" {...pick.cardProps('2')}>
          <span className="card__index">2P</span>
          <span className="card__text">
            <span className="card__title">2 jogadores</span>
            <span className="card__desc">Tela dividida: Jogador 1 em cima, Jogador 2 embaixo, contra seis adversários. Corrida Rápida, Campeonato e Batalha.</span>
          </span>
          <span className="card__meta">Tela dividida</span>
        </button>
      </div>
      <div className="panel players-keys" data-testid="players-keys">
        <h2 className="group-title">Controles com 2 jogadores</h2>
        <dl className="players-keys__grid">
          <div><dt>Jogador 1</dt><dd><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> dirigir · <kbd>Q</kbd> item · <kbd>E</kbd> drift · <kbd>R</kbd> recuperar</dd></div>
          <div><dt>Jogador 2</dt><dd><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> dirigir · <kbd>Enter</kbd> item · <kbd>Shift dir.</kbd> drift · <kbd>Backspace</kbd> recuperar</dd></div>
          <div><dt>Controles</dt><dd>1º controle → Jogador 1, 2º → Jogador 2 (com um só, ele fica com o Jogador 2). <kbd>Esc</kbd> ou Start pausa para os dois.</dd></div>
        </dl>
      </div>
    </ScreenShell>
  );
}
