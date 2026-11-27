import { nextOf, prevOf, supportsTwoPlayers } from '@/app/flow';
import { useGameStore } from '@/app/gameStore';
import { Fragment } from 'react';
import { ACTION_IDS, ACTION_LABELS, useSettingsStore } from '@/app/settingsStore';
import { keyLabel } from '@/game/input/keyLabels';
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
      {players === 2 ? <TwoPlayerKeys /> : <OnePlayerKeys />}
    </ScreenShell>
  );
}

/** 1 jogador: as teclas que o jogador configurou (Configurações → Controles), não as do padrão. */
function OnePlayerKeys(): JSX.Element {
  const bindings = useSettingsStore((s) => s.bindings);
  return (
    <div className="panel players-keys" data-testid="players-keys" data-players="1">
      <h2 className="group-title">Seus controles (1 jogador)</h2>
      <dl className="players-keys__grid players-keys__grid--table">
        {ACTION_IDS.map((a) => (
          <div key={a} data-testid={`players-key-${a}`}>
            <dt>{ACTION_LABELS[a]}</dt>
            <dd>
              {bindings[a].length === 0 ? <span className="players-keys__none">sem tecla</span> : bindings[a].map((c, i) => (
                <Fragment key={c}>{i > 0 && ' ou '}<kbd>{keyLabel(c)}</kbd></Fragment>
              ))}
            </dd>
          </div>
        ))}
        <div className="players-keys__wide">
          <dt>Controle</dt>
          <dd>Analógico vira · A ou RT acelera · B ou LT freia · X ou RB drift · Y ou LB item · Back recupera · Start pausa. Troque as teclas em Configurações.</dd>
        </div>
      </dl>
    </div>
  );
}

/** 2 jogadores: teclas fixas da tela dividida (o remapeamento de 1 jogador não vale aqui). */
function TwoPlayerKeys(): JSX.Element {
  return (
    <div className="panel players-keys" data-testid="players-keys" data-players="2">
      <h2 className="group-title">Controles com 2 jogadores (padrão)</h2>
      <dl className="players-keys__grid">
        <div><dt>Jogador 1</dt><dd><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> dirigir · <kbd>Q</kbd> item · <kbd>E</kbd> drift · <kbd>R</kbd> recuperar</dd></div>
        <div><dt>Jogador 2</dt><dd><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> dirigir · <kbd>Enter</kbd> item · <kbd>Shift dir.</kbd> drift · <kbd>Backspace</kbd> recuperar</dd></div>
        <div><dt>Controles</dt><dd>1º controle → Jogador 1, 2º → Jogador 2 (com um só, ele fica com o Jogador 2). <kbd>Esc</kbd> ou Start pausa para os dois.</dd></div>
      </dl>
    </div>
  );
}
