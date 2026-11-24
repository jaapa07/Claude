import { useState, type CSSProperties } from 'react';
import { KART_PARTS, OUTFITS, outfitById, type KartOption } from '@/data/customization';
import type { CharacterId, KartId } from '@/data/ids';
import { describeUnlock } from '@/data/unlocks';
import { kartLookOf, useCustomStore } from '@/game/custom/customStore';
import { isRuleMet, useSaveStore } from '@/game/save/saveStore';
import { LockBadge } from './common';
import { uiSfx } from './uiAudio';

/** Opção liberada pelo progresso salvo? */
function useUnlocked(): (o: KartOption) => boolean {
  const trophies = useSaveStore((s) => s.trophies);
  const records = useSaveStore((s) => s.records);
  const stats = useSaveStore((s) => s.stats);
  return (o) => isRuleMet(o.unlock, { trophies, records, stats });
}

/** Fileira de amostras de cor; as bloqueadas mostram o cadeado e a condição ao passar/tocar. */
function Swatches({ label, options, value, onPick, testId }: {
  label: string; options: readonly KartOption[]; value: string; onPick: (id: string) => void; testId: string;
}): JSX.Element {
  const unlocked = useUnlocked();
  const current = options.find((o) => o.id === value) ?? options[0]!;
  // Última opção bloqueada tocada: mostra o que falta para liberá-la.
  const [lockedTap, setLockedTap] = useState<KartOption | null>(null);
  return (
    <div className="swatches" data-testid={testId}>
      <div className="swatches__head">
        <span className="swatches__label">{label}</span>
        <span className="swatches__value">{current.name}</span>
      </div>
      <div className="swatches__row" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const open = unlocked(o);
          return (
            <button
              key={o.id} type="button" role="radio" aria-checked={o.id === value} className="swatch"
              data-testid={`${testId}-${o.id}`} data-selected={o.id === value} data-locked={!open}
              title={open ? o.name : `${o.name} — ${describeUnlock(o.unlock)}`} aria-label={open ? o.name : `${o.name} (bloqueado: ${describeUnlock(o.unlock)})`}
              style={{ '--swatch': o.swatch } as CSSProperties}
              onClick={() => {
                if (!open) { uiSfx('ui_error'); setLockedTap(o); return; }
                setLockedTap(null);
                uiSfx('ui_select');
                onPick(o.id);
              }}
            >
              {!open && <LockBadge />}
            </button>
          );
        })}
      </div>
      {lockedTap && <p className="swatches__lock" data-testid={`${testId}-lock`}><LockBadge /> {lockedTap.name}: {describeUnlock(lockedTap.unlock)}</p>}
    </div>
  );
}

/** Roupas do piloto (tela de escolha do piloto). */
export function OutfitPicker({ characterId }: { characterId: CharacterId }): JSX.Element {
  const outfit = useCustomStore((s) => s.outfits[characterId]);
  const setOutfit = useCustomStore((s) => s.setOutfit);
  return <Swatches label="Roupa" options={OUTFITS} value={outfitById(outfit).id} onPick={(id) => setOutfit(characterId, id)} testId="outfit" />;
}

/** Oficina do kart: pintura, metais, chama do turbo e neon. */
export function KartWorkshop({ kartId }: { kartId: KartId }): JSX.Element {
  const look = useCustomStore((s) => kartLookOf(s.karts, kartId));
  const setPart = useCustomStore((s) => s.setKartPart);
  return (
    <div className="workshop" data-testid="kart-workshop">
      {KART_PARTS.map((p) => (
        <Swatches key={p.key} label={p.label} options={p.options} value={look[p.key]} onPick={(id) => setPart(kartId, p.key, id)} testId={`mod-${p.key}`} />
      ))}
    </div>
  );
}
