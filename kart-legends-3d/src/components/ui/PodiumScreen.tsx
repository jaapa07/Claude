import type { CSSProperties } from 'react';
import { useGameStore } from '@/app/gameStore';
import { CHARACTER_BY_ID } from '@/data/characters';
import type { CharacterId } from '@/data/ids';
import { CUP_BY_ID, TRACK_BY_ID } from '@/data/tracks';
import { Btn } from './common';
import { TROPHY_LABEL, ordinal } from './format';

interface PodiumEntry { characterId: CharacterId; isPlayer: boolean; detail: string }

export function PodiumScreen(): JSX.Element {
  const result = useGameStore((s) => s.lastResult);
  const rewards = useGameStore((s) => s.lastRewards);
  const championship = useGameStore((s) => s.championship);
  const continueAfterResults = useGameStore((s) => s.continueAfterResults);

  // Fim de copa: pódio pela classificação geral. Corrida Rápida: pela ordem de chegada.
  let top: PodiumEntry[] = [];
  let title = 'Pódio';
  if (championship?.finished) {
    top = championship.standings.slice(0, 3).map((e) => ({ characterId: e.characterId, isPlayer: e.isPlayer, detail: `${e.points} pts` }));
    title = CUP_BY_ID[championship.cupId].name;
  } else if (result) {
    top = [...result.results].sort((a, b) => a.position - b.position).slice(0, 3)
      .map((r) => ({ characterId: r.characterId, isPlayer: r.isPlayer, detail: '' }));
    title = TRACK_BY_ID[result.trackId].name;
  }
  const playerPosition = championship?.finished ? rewards?.championshipPosition ?? null : result?.playerPosition ?? null;

  return (
    <section className="screen podium" data-testid="screen-podium" data-nav-scope aria-label="Pódio">
      <header className="podium__header">
        <p className="screen__kicker">Pódio</p>
        <h1 className="display-title">{title}</h1>
        {championship?.finished && (
          <p className="podium__trophy" data-testid="podium-trophy" data-tier={rewards?.trophy ?? 'none'}>
            {rewards?.trophy
              ? <>Troféu de <strong>{TROPHY_LABEL[rewards.trophy]}</strong> conquistado!</>
              : <>Você terminou em {playerPosition ? ordinal(playerPosition) : '—'}. O troféu fica para a próxima.</>}
          </p>
        )}
        {!championship && playerPosition !== null && playerPosition > 3 && (
          <p className="podium__trophy" data-tier="none">Você chegou em {ordinal(playerPosition)}.</p>
        )}
      </header>
      <footer className="podium__footer">
        <ol className="podium__names">
          {top.map((e, i) => {
            const c = CHARACTER_BY_ID[e.characterId];
            return (
              <li key={c.id} className="podium__plate" data-place={i + 1} data-player={e.isPlayer} data-testid={`podium-place-${i + 1}`} style={{ '--row-color': c.color } as CSSProperties}>
                <span className="podium__place">{ordinal(i + 1)}</span>
                <span className="podium__name">{c.name}{e.isPlayer && <span className="tag">Você</span>}</span>
                {e.detail && <span className="podium__detail">{e.detail}</span>}
              </li>
            );
          })}
        </ol>
        <Btn testId="btn-continue" variant="primary" autoFocusNav onClick={continueAfterResults}>Continuar</Btn>
      </footer>
    </section>
  );
}
