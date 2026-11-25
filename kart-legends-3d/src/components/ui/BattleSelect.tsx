import type { CSSProperties } from 'react';
import { nextScreen, prevScreen } from '@/app/flow';
import { useGameStore } from '@/app/gameStore';
import { ARENAS, ARENA_BY_ID, BATTLE_GAMES, BATTLE_GAME_BY_ID, type ArenaId, type BattleGameId } from '@/data/battle';
import { assetUrl } from '@/game/core/assets';
import { AssetImg, Btn, ScreenShell, useCardPick } from './common';
import { formatTime } from './format';

/** Ícones dos minijogos (SVG próprio). */
export function BattleIcon({ game, className }: { game: BattleGameId; className?: string }): JSX.Element {
  if (game === 'estoura-balao') {
    return (
      <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 3c5.5 0 9 4.3 9 9.4 0 5.6-4.6 10.2-8 11.1l1.1 2.2h-4.2l1.1-2.2c-3.4-.9-8-5.5-8-11.1C7 7.3 10.5 3 16 3Z" fill="currentColor" />
        <path d="M16 25.7c-.6 1.6.9 2.2.1 3.8" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <ellipse cx="12.4" cy="9.6" rx="1.8" ry="2.8" fill="#fff" opacity="0.55" transform="rotate(-25 12.4 9.6)" />
      </svg>
    );
  }
  if (game === 'caca-cristais') {
    return (
      <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 2 26 12 16 30 6 12Z" fill="currentColor" />
        <path d="M6 12h20M16 2l-4 10 4 18 4-18Z" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 10l6 5 6-9 6 9 6-5-2.5 14h-19Z" fill="currentColor" />
      <rect x="6.5" y="25" width="19" height="3.4" rx="1" fill="currentColor" />
      <circle cx="16" cy="6" r="1.8" fill="#fff" opacity="0.7" />
    </svg>
  );
}

export function BattleGameSelect(): JSX.Element {
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const pick = useCardPick<BattleGameId>({
    selected: selection.battleGame,
    onSelect: (id) => setSelection({ battleGame: id }),
    onConfirm: () => goTo(nextScreen('battleGame', 'battle') ?? 'arena'),
  });
  const focus = BATTLE_GAME_BY_ID[pick.focusId];
  return (
    <ScreenShell
      id="battleGame" title="Minijogo" kicker="Batalha" onBack={() => goTo(prevScreen('battleGame', 'battle'))}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" onClick={pick.confirm}>Confirmar</Btn>}
    >
      <div className="card-list">
        {BATTLE_GAMES.map((g) => (
          <button
            key={g.id} type="button" className="card card--row card--battle" data-testid={`card-battle-${g.id}`}
            style={{ '--card-color': g.color } as CSSProperties} {...pick.cardProps(g.id)}
          >
            <span className="card__emblem card__emblem--battle"><BattleIcon game={g.id} /></span>
            <span className="card__text">
              <span className="card__title">{g.name}</span>
              <span className="card__desc">{g.tagline}</span>
            </span>
            <span className="card__meta">{formatTime(g.duration * 1000).replace(/\.\d+$/, '')}</span>
          </button>
        ))}
      </div>
      <div className="panel detail battle-rules" data-testid="battle-rules" style={{ '--card-color': focus.color } as CSSProperties}>
        <h2 className="detail__title"><BattleIcon game={focus.id} className="battle-rules__icon" /> {focus.name}</h2>
        <ul className="battle-rules__list">
          {focus.rules.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <p className="detail__subtitle">Até 8 pilotos · itens ligados · cair da arena também custa</p>
      </div>
    </ScreenShell>
  );
}

export function ArenaSelect(): JSX.Element {
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const pick = useCardPick<ArenaId>({
    selected: selection.arenaId,
    onSelect: (id) => setSelection({ arenaId: id }),
    onConfirm: () => goTo(nextScreen('arena', 'battle') ?? 'difficulty'),
  });
  const focus = ARENA_BY_ID[pick.focusId];
  const game = BATTLE_GAME_BY_ID[selection.battleGame];
  return (
    <ScreenShell
      id="arena" title="Escolha a arena" kicker={`Batalha · ${game.name}`} onBack={() => goTo(prevScreen('arena', 'battle'))}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" onClick={pick.confirm}>Confirmar</Btn>}
    >
      <div className="card-grid card-grid--tracks card-grid--arenas">
        {ARENAS.map((a) => (
          <button
            key={a.id} type="button" className="card card--track" data-testid={`card-arena-${a.id}`}
            style={{ '--card-color': a.colorA, '--card-color-b': a.colorB } as CSSProperties} {...pick.cardProps(a.id)}
          >
            <AssetImg className="card__image" src={assetUrl(`ui/arenas/${a.id}.webp`)} alt="" label={a.name} color={a.colorB} />
            <span className="card__caption">
              <span className="card__title">{a.name}</span>
              <span className="card__desc">{a.tagline}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="panel detail" data-testid="arena-detail">
        <h2 className="detail__title">{focus.name}</h2>
        <p className="detail__subtitle">{focus.tagline}</p>
        <p className="detail__text">{focus.description}</p>
      </div>
    </ScreenShell>
  );
}
