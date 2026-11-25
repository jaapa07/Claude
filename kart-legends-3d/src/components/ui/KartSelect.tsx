import { useState } from 'react';
import { KartWorkshop } from './Customizer';
import type { CSSProperties } from 'react';
import { humanCount, nextOf, prevOf } from '@/app/flow';
import { playerLabel } from './CharacterSelect';
import { useGameStore } from '@/app/gameStore';
import type { KartId } from '@/data/ids';
import { KARTS, KART_BY_ID, KART_STAT_LABELS } from '@/data/karts';
import type { KartStats } from '@/data/karts';
import { describeUnlock } from '@/data/unlocks';
import { assetUrl } from '@/game/core/assets';
import { useSaveStore } from '@/game/save/saveStore';
import { AssetImg, Btn, LockBadge, ScreenShell, useCardPick } from './common';

const STAT_KEYS = Object.keys(KART_STAT_LABELS) as Array<keyof KartStats>;

/** Escolha do kart. `slot` 1 = a vez do Jogador 2 (tela dividida). */
export function KartSelect({ slot = 0 }: { slot?: 0 | 1 }): JSX.Element {
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const startRace = useGameStore((s) => s.startRace);
  const unlockedKarts = useSaveStore((s) => s.unlocked.karts);
  const isLocked = (id: KartId): boolean => !unlockedKarts.includes(id);
  const two = humanCount(selection) === 2;
  const screen = slot === 1 ? 'kart2' : 'kart';
  const selected = slot === 1 ? selection.p2KartId : selection.kartId;
  // Com dois jogadores, o kart do Jogador 1 leva à vez do Jogador 2; o último kart larga.
  const next = nextOf(screen, selection);
  const pick = useCardPick<KartId>({
    selected,
    isLocked,
    onSelect: (id) => setSelection(slot === 1 ? { p2KartId: id } : { kartId: id }),
    onConfirm: () => {
      const n = nextOf(screen, useGameStore.getState().selection);
      if (n) goTo(n);
      else startRace();
    },
  });
  const focus = KART_BY_ID[pick.focusId];
  const [tab, setTab] = useState<'stats' | 'shop'>('stats');
  const focusLocked = isLocked(focus.id);
  return (
    <ScreenShell
      id={screen} title={two ? `${playerLabel(slot)} · escolha o kart` : 'Escolha o kart'}
      kicker={two ? `Tela dividida · ${slot === 0 ? 'metade de cima' : 'metade de baixo'}` : `${unlockedKarts.length} de ${KARTS.length} liberados`}
      className={two ? `screen--player screen--p${slot + 1}` : undefined}
      onBack={() => goTo(prevOf(screen, useGameStore.getState().selection))}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" disabled={isLocked(selected)} onClick={pick.confirm}>{next ? 'Vez do Jogador 2' : 'Correr!'}</Btn>}
    >
      {two && <p className="player-turn" data-testid="player-turn" data-slot={slot}>{playerLabel(slot)}</p>}
      <div className="card-grid card-grid--roster">
        {KARTS.map((k) => {
          const locked = isLocked(k.id);
          return (
            <button
              key={k.id} type="button" className="card card--portrait card--kart" data-testid={`card-kart-${k.id}`}
              style={{ '--card-color': k.primary, '--card-color-b': k.secondary } as CSSProperties} {...pick.cardProps(k.id)}
            >
              <AssetImg className="card__image" src={assetUrl(`ui/karts/${k.id}.webp`)} alt="" label={k.name} color={k.primary} />
              <span className="card__caption"><span className="card__title">{k.name}</span></span>
              {locked && <LockBadge />}
            </button>
          );
        })}
      </div>
      <div className="panel detail" data-testid="kart-detail" style={{ '--card-color': focus.primary } as CSSProperties}>
        <h2 className="detail__title">{focus.name}</h2>
        <p className="detail__text">{focus.description}</p>
        {focusLocked && <p className="detail__lock" data-testid="lock-condition"><LockBadge /> {describeUnlock(focus.unlock)}</p>}
        {!focusLocked && (
          <div className="tabs" role="tablist">
            <button type="button" role="tab" className="tab" aria-selected={tab === 'stats'} data-testid="tab-stats" onClick={() => setTab('stats')}>Atributos</button>
            <button type="button" role="tab" className="tab" aria-selected={tab === 'shop'} data-testid="tab-workshop" onClick={() => setTab('shop')}>Oficina</button>
          </div>
        )}
        {!focusLocked && tab === 'shop' ? <KartWorkshop kartId={focus.id} /> : (
        <dl className="stats" data-testid="kart-stats">
          {STAT_KEYS.map((key) => (
            <div className="stats__row" key={key} data-testid={`stat-${key}`}>
              <dt>{KART_STAT_LABELS[key]}</dt>
              <dd aria-label={`${focus.stats[key]} de 5`}>
                <span className="stats__bar">
                  {[1, 2, 3, 4, 5].map((n) => <span key={n} className="stats__pip" data-on={n <= focus.stats[key]} />)}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        )}
      </div>
    </ScreenShell>
  );
}
