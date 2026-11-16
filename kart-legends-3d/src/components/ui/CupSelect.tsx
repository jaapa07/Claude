import type { CSSProperties } from 'react';
import { nextScreen, prevScreen } from '@/app/flow';
import { useGameStore } from '@/app/gameStore';
import type { CupId } from '@/data/ids';
import { CUPS, CUP_BY_ID, CUP_UNLOCK, TRACK_BY_ID } from '@/data/tracks';
import { describeUnlock } from '@/data/unlocks';
import { assetUrl } from '@/game/core/assets';
import { useSaveStore } from '@/game/save/saveStore';
import { AssetImg, Btn, LockBadge, ScreenShell, useCardPick } from './common';
import { TROPHY_LABEL } from './format';

export function CupSelect(): JSX.Element {
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const unlockedCups = useSaveStore((s) => s.unlocked.cups);
  const trophies = useSaveStore((s) => s.trophies);
  const isLocked = (id: CupId): boolean => !unlockedCups.includes(id);
  const pick = useCardPick<CupId>({
    selected: selection.cupId,
    isLocked,
    onSelect: (id) => setSelection({ cupId: id, trackId: CUP_BY_ID[id].tracks[0] }),
    onConfirm: () => goTo(nextScreen('cup', selection.mode) ?? 'difficulty'),
  });
  const focus = CUP_BY_ID[pick.focusId];
  return (
    <ScreenShell
      id="cup" title="Escolha a copa" kicker="Campeonato" onBack={() => goTo(prevScreen('cup', selection.mode))}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" disabled={isLocked(selection.cupId)} onClick={pick.confirm}>Confirmar</Btn>}
    >
      <div className="card-list">
        {CUPS.map((cup) => {
          const locked = isLocked(cup.id);
          const trophy = trophies[cup.id];
          return (
            <button key={cup.id} type="button" className="card card--row card--cup" style={{ '--card-color': cup.color } as CSSProperties} data-testid={`card-cup-${cup.id}`} {...pick.cardProps(cup.id)}>
              <span className="card__emblem" aria-hidden="true">{locked ? <LockBadge /> : '★'}</span>
              <span className="card__text">
                <span className="card__title">{cup.name}</span>
                <span className="card__desc">{locked ? describeUnlock(CUP_UNLOCK[cup.id]) : cup.description}</span>
              </span>
              <span className="card__meta">{trophy ? `Troféu: ${TROPHY_LABEL[trophy]}` : 'Sem troféu'}</span>
            </button>
          );
        })}
      </div>
      <div className="panel detail">
        <h2 className="detail__title">{focus.name}</h2>
        <ol className="cup-tracks">
          {focus.tracks.map((id, i) => {
            const t = TRACK_BY_ID[id];
            return (
              <li key={id} className="cup-tracks__item">
                <AssetImg className="cup-tracks__thumb" src={assetUrl(`ui/tracks/${id}.webp`)} alt="" label={t.name} color={t.colorB} />
                <span className="cup-tracks__name">{i + 1}. {t.name}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </ScreenShell>
  );
}
