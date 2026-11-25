import type { CSSProperties } from 'react';
import { MODE_INFO, nextOf, prevOf } from '@/app/flow';
import { useGameStore } from '@/app/gameStore';
import type { TrackId } from '@/data/ids';
import { CUP_BY_ID, CUP_UNLOCK, TRACKS, TRACK_BY_ID } from '@/data/tracks';
import { describeUnlock } from '@/data/unlocks';
import { assetUrl } from '@/game/core/assets';
import { useSaveStore } from '@/game/save/saveStore';
import { AssetImg, Btn, LockBadge, ScreenShell, useCardPick } from './common';
import { formatTime } from './format';

export function TrackSelect(): JSX.Element {
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const unlockedCups = useSaveStore((s) => s.unlocked.cups);
  const records = useSaveStore((s) => s.records);
  const isLocked = (id: TrackId): boolean => !unlockedCups.includes(TRACK_BY_ID[id].cup);
  const pick = useCardPick<TrackId>({
    selected: selection.trackId,
    isLocked,
    onSelect: (id) => setSelection({ trackId: id, cupId: TRACK_BY_ID[id].cup }),
    onConfirm: () => goTo(nextOf('track', selection) ?? 'character'),
  });
  const focus = TRACK_BY_ID[pick.focusId];
  const focusLocked = isLocked(focus.id);
  const record = records[focus.id];
  const timeTrial = selection.mode === 'timetrial';
  const modeName = MODE_INFO.find((m) => m.id === selection.mode)?.name ?? '';
  return (
    <ScreenShell
      id="track" title="Escolha a pista" kicker={modeName} onBack={() => goTo(prevOf('track', selection))}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" disabled={isLocked(selection.trackId)} onClick={pick.confirm}>Confirmar</Btn>}
    >
      <div className="card-grid card-grid--tracks">
        {TRACKS.map((t) => {
          const locked = isLocked(t.id);
          return (
            <button
              key={t.id} type="button" className="card card--track" data-testid={`card-track-${t.id}`}
              style={{ '--card-color': t.colorA, '--card-color-b': t.colorB } as CSSProperties} {...pick.cardProps(t.id)}
            >
              <AssetImg className="card__image" src={assetUrl(`ui/tracks/${t.id}.webp`)} alt="" label={t.name} color={t.colorB} />
              <span className="card__caption">
                <span className="card__title">{t.name}</span>
                <span className="card__desc">{CUP_BY_ID[t.cup].name}</span>
              </span>
              {locked && <LockBadge />}
            </button>
          );
        })}
      </div>
      <div className="panel detail" data-testid="track-detail">
        <h2 className="detail__title">{focus.name}</h2>
        <p className="detail__subtitle">{focus.tagline} · {CUP_BY_ID[focus.cup].name}</p>
        <p className="detail__text">{focus.description}</p>
        {focusLocked
          ? <p className="detail__lock" data-testid="lock-condition"><LockBadge /> {describeUnlock(CUP_UNLOCK[focus.cup])}</p>
          : (
            <dl className="detail__records">
              <div><dt>{timeTrial ? 'Recorde no contrarrelógio' : 'Melhor corrida'}</dt><dd>{formatTime(timeTrial ? record.timeTrialMs : record.bestRaceMs)}</dd></div>
              <div><dt>Melhor volta</dt><dd>{formatTime(timeTrial ? record.timeTrialLapMs : record.bestLapMs)}</dd></div>
            </dl>
          )}
      </div>
    </ScreenShell>
  );
}
