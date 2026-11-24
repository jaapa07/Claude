import type { CSSProperties } from 'react';
import { nextScreen, prevScreen } from '@/app/flow';
import { useGameStore } from '@/app/gameStore';
import { CHARACTERS, CHARACTER_BY_ID } from '@/data/characters';
import type { CharacterId } from '@/data/ids';
import { KART_BY_ID } from '@/data/karts';
import { describeUnlock } from '@/data/unlocks';
import { assetUrl } from '@/game/core/assets';
import { useSaveStore } from '@/game/save/saveStore';
import { OutfitPicker } from './Customizer';
import { AssetImg, Btn, LockBadge, ScreenShell, useCardPick } from './common';

export function CharacterSelect(): JSX.Element {
  const selection = useGameStore((s) => s.selection);
  const setSelection = useGameStore((s) => s.setSelection);
  const goTo = useGameStore((s) => s.goTo);
  const unlocked = useSaveStore((s) => s.unlocked);
  const isLocked = (id: CharacterId): boolean => !unlocked.characters.includes(id);
  const pick = useCardPick<CharacterId>({
    selected: selection.characterId,
    isLocked,
    onSelect: (id) => {
      // Sugere o kart preferido do personagem, se já estiver liberado.
      const kartId = CHARACTER_BY_ID[id].kartId;
      setSelection(unlocked.karts.includes(kartId) ? { characterId: id, kartId } : { characterId: id });
    },
    onConfirm: () => goTo(nextScreen('character', selection.mode) ?? 'kart'),
  });
  const focus = CHARACTER_BY_ID[pick.focusId];
  const focusLocked = isLocked(focus.id);
  return (
    <ScreenShell
      id="character" title="Escolha o piloto" kicker={`${unlocked.characters.length} de ${CHARACTERS.length} liberados`}
      onBack={() => goTo(prevScreen('character', selection.mode))}
      footer={<Btn testId="btn-confirm" variant="primary" sound="none" disabled={isLocked(selection.characterId)} onClick={pick.confirm}>Confirmar</Btn>}
    >
      <div className="card-grid card-grid--roster card-grid--characters">
        {CHARACTERS.map((c) => {
          const locked = isLocked(c.id);
          return (
            <button
              key={c.id} type="button" className="card card--portrait" data-testid={`card-character-${c.id}`}
              style={{ '--card-color': c.color, '--card-color-b': c.accent } as CSSProperties} {...pick.cardProps(c.id)}
            >
              <AssetImg className="card__image" src={assetUrl(`ui/portraits/${c.id}.webp`)} alt="" label={c.name} color={c.color} />
              <span className="card__caption"><span className="card__title">{c.name}</span></span>
              {locked && <LockBadge />}
            </button>
          );
        })}
      </div>
      <div className="panel detail" data-testid="character-detail" style={{ '--card-color': focus.color } as CSSProperties}>
        <h2 className="detail__title">{focus.name}</h2>
        <p className="detail__subtitle">{focus.title}</p>
        <p className="detail__text">{focus.bio}</p>
        {focusLocked
          ? <p className="detail__lock" data-testid="lock-condition"><LockBadge /> {describeUnlock(focus.unlock)}</p>
          : <p className="detail__meta">Kart preferido: {KART_BY_ID[focus.kartId].name}</p>}
        {!focusLocked && <OutfitPicker characterId={focus.id} />}
      </div>
    </ScreenShell>
  );
}
