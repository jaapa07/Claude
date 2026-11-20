import type { CSSProperties } from 'react';
import { prevScreen } from '@/app/flow';
import { useGameStore } from '@/app/gameStore';
import type { KartId } from '@/data/ids';
import { KARTS, KART_BY_ID, KART_STAT_LABELS } from '@/data/karts';
import type { KartStats } from '@/data/karts';
import { describeUnlock } from '@/data/unlocks';
import { assetUrl } from '@/game/core/assets';
import { useSaveStore } from '@/game/save/saveStore';
import { AssetImg, Btn, LockBadge, ScreenShell, useCardPick } from './common';

const STAT_KEYS = Object.keys(KART_STAT_LABELS) as Array<keyof KartStats>;

export function KartSelect(): JSX.Element {
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const startRace = useGameStore((s) => s.startRace);
  const unlockedKarts = useSaveStore((s) => s.unlocked.karts);
  const isLocked = (id: KartId): boolean => !unlockedKarts.includes(id);
  const pick = useCardPick<KartId>({
    selected: selection.kartId,
    isLocked,
    onSelect: (id) => setSelection({ kartId: id }),
    onConfirm: startRace,
  });
  const focus = KART_BY_ID[pick.focusId];
  const focusLocked = isLocked(focus.id);
  return (
    <ScreenShell
      id="kart" title="Escolha o kart" kicker={`${unlockedKarts.length} de ${KARTS.length} liberados`}
      onBack={() => goTo(prevScreen('kart', selection.mode))}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" disabled={isLocked(selection.kartId)} onClick={pick.confirm}>Correr!</Btn>}
    >
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
      </div>
    </ScreenShell>
  );
}
