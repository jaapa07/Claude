import { useState, type CSSProperties } from 'react';
import { KART_PARTS, OUTFITS, outfitById, type KartOption } from '@/data/customization';
import type { CharacterId, KartId } from '@/data/ids';
import { COSMETIC_PRICES, TIRE_PRICES, cosmeticKey } from '@/data/shop';
import { describeUnlock } from '@/data/unlocks';
import { assetUrl } from '@/game/core/assets';
import { kartLookOf, useCustomStore } from '@/game/custom/customStore';
import { isRuleMet, useSaveStore } from '@/game/save/saveStore';
import { LockBadge } from './common';
import { uiSfx } from './uiAudio';

/** Opção liberada? As da loja (adereços e pneus) só depois de compradas. */
function useUnlocked(group: string): (o: KartOption) => boolean {
  const trophies = useSaveStore((s) => s.trophies);
  const records = useSaveStore((s) => s.records);
  const stats = useSaveStore((s) => s.stats);
  const tires = useSaveStore((s) => s.owned.tires);
  const cosmetics = useSaveStore((s) => s.owned.cosmetics);
  return (o) => {
    if (o.unlock.type !== 'shop') return isRuleMet(o.unlock, { trophies, records, stats });
    return group === 'tire' ? tires.includes(o.id) : cosmetics.includes(cosmeticKey(group, o.id));
  };
}

/**
 * Amostras com imagem (`url(assets/…)`): numa variável CSS o endereço relativo seria resolvido a partir da
 * folha de estilos, então vira absoluto aqui.
 */
function resolveSwatch(swatch: string): string {
  if (!swatch.includes('url(assets/')) return swatch;
  return swatch.replace(/url\(assets\//g, `url(${new URL(assetUrl(''), document.baseURI).href}`);
}

/** Texto do cadeado: "na loja por N moedas" para itens à venda. */
function lockText(group: string, o: KartOption): string {
  if (o.unlock.type !== 'shop') return describeUnlock(o.unlock);
  const price = group === 'tire' ? TIRE_PRICES[o.id] : COSMETIC_PRICES[cosmeticKey(group, o.id)];
  return price ? `compre na Loja por ${price.toLocaleString('pt-BR')} moedas` : describeUnlock(o.unlock);
}

/** Fileira de amostras de cor; as bloqueadas mostram o cadeado e a condição ao passar/tocar. */
function Swatches({ group, label, options, value, onPick, testId }: {
  group: string; label: string; options: readonly KartOption[]; value: string; onPick: (id: string) => void; testId: string;
}): JSX.Element {
  const unlocked = useUnlocked(group);
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
              title={open ? o.name : `${o.name} — ${lockText(group, o)}`} aria-label={open ? o.name : `${o.name} (bloqueado: ${lockText(group, o)})`}
              style={{ '--swatch': resolveSwatch(o.swatch) } as CSSProperties}
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
      {lockedTap && <p className="swatches__lock" data-testid={`${testId}-lock`}><LockBadge /> {lockedTap.name}: {lockText(group, lockedTap)}</p>}
    </div>
  );
}

/** Roupas do piloto (tela de escolha do piloto). */
export function OutfitPicker({ characterId }: { characterId: CharacterId }): JSX.Element {
  const outfit = useCustomStore((s) => s.outfits[characterId]);
  const setOutfit = useCustomStore((s) => s.setOutfit);
  return <Swatches group="outfit" label="Roupa" options={OUTFITS} value={outfitById(outfit).id} onPick={(id) => setOutfit(characterId, id)} testId="outfit" />;
}

/** Oficina do kart: pintura, metais, chama do turbo e neon. */
export function KartWorkshop({ kartId }: { kartId: KartId }): JSX.Element {
  const look = useCustomStore((s) => kartLookOf(s.karts, kartId));
  const setPart = useCustomStore((s) => s.setKartPart);
  return (
    <div className="workshop" data-testid="kart-workshop">
      {KART_PARTS.map((p) => (
        <Swatches key={p.key} group={p.key} label={p.label} options={p.options} value={look[p.key]} onPick={(id) => setPart(kartId, p.key, id)} testId={`mod-${p.key}`} />
      ))}
    </div>
  );
}
