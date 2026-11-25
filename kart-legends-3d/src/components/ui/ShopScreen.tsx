import { useState } from 'react';
import type { CSSProperties } from 'react';
import { CHARACTERS } from '@/data/characters';
import { KARTS } from '@/data/karts';
import { COSMETIC_GROUPS } from '@/data/customization';
import { CHARACTER_PRICES, COSMETIC_PRICES, KART_PRICES, TIRE_PRICES, TIRES, cosmeticKey, type ShopKind } from '@/data/shop';
import { describeUnlock, type UnlockRule } from '@/data/unlocks';
import { assetUrl } from '@/game/core/assets';
import { useSaveStore } from '@/game/save/saveStore';
import { AssetImg, ScreenShell } from './common';
import { uiSfx } from './uiAudio';

type Tab = 'character' | 'kart' | 'tire' | 'cosmetic';
const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'character', label: 'Pilotos' },
  { id: 'kart', label: 'Karts' },
  { id: 'tire', label: 'Pneus' },
  { id: 'cosmetic', label: 'Adereços' },
];

interface Item {
  id: string; kind: ShopKind; name: string; detail: string; color: string; price: number; rule?: UnlockRule;
  /** Imagem (pilotos, karts, pneus) ou amostra de cor (adereços). */
  image?: string; swatch?: string;
  /** Grupo do adereço (Roupa, Pintura…), sempre visível — há nomes repetidos entre grupos. */
  tag?: string;
}

const ITEMS: Record<Tab, Item[]> = {
  character: CHARACTERS.filter((c) => CHARACTER_PRICES[c.id] !== undefined).map((c) => ({
    id: c.id, kind: 'character', name: c.name, detail: c.title, color: c.color, image: `ui/portraits/${c.id}.webp`, price: CHARACTER_PRICES[c.id]!, rule: c.unlock,
  })),
  kart: KARTS.filter((k) => KART_PRICES[k.id] !== undefined).map((k) => ({
    id: k.id, kind: 'kart', name: k.name, detail: k.description, color: k.primary, image: `ui/karts/${k.id}.webp`, price: KART_PRICES[k.id]!, rule: k.unlock,
  })),
  tire: TIRES.filter((t) => TIRE_PRICES[t.id] !== undefined).map((t) => ({
    id: t.id, kind: 'tire', name: t.name, detail: t.description, color: t.color, image: `ui/tires/${t.id}.webp`, price: TIRE_PRICES[t.id]!,
  })),
  cosmetic: COSMETIC_GROUPS.flatMap((g) => (g.options as readonly { id: string; name: string; swatch: string }[])
    .filter((o) => COSMETIC_PRICES[cosmeticKey(g.group, o.id)] !== undefined)
    .map((o) => ({
      id: cosmeticKey(g.group, o.id), kind: 'cosmetic' as const, name: o.name, detail: g.group === 'outfit' ? 'Roupa · todos os pilotos' : `${g.label} · todos os karts`, tag: g.label,
      color: '#3a2f5c', swatch: o.swatch, price: COSMETIC_PRICES[cosmeticKey(g.group, o.id)]!,
    }))),
};

/** Saldo de moedas (menu e loja). */
export function CoinBadge({ className }: { className?: string }): JSX.Element {
  const coins = useSaveStore((s) => s.coins);
  return (
    <span className={`coin-badge ${className ?? ''}`} data-testid="coins" aria-label={`${coins} moedas`}>
      <span className="coin-badge__icon" aria-hidden="true" />{coins.toLocaleString('pt-BR')}
    </span>
  );
}

export function ShopScreen({ onBack }: { onBack: () => void }): JSX.Element {
  const [tab, setTab] = useState<Tab>('character');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const coins = useSaveStore((s) => s.coins);
  const owns = useSaveStore((s) => s.owns);
  // Assina as listas para redesenhar depois de uma compra.
  useSaveStore((s) => s.unlocked);
  useSaveStore((s) => s.owned);
  const buy = useSaveStore((s) => s.buy);

  const pick = (item: Item): void => {
    if (owns(item.kind, item.id)) return;
    if (coins < item.price) { uiSfx('ui_error'); setMessage(`Faltam ${(item.price - coins).toLocaleString('pt-BR')} moedas para ${item.name}. Corra e vença copas para ganhar mais!`); return; }
    const key = `${item.kind}-${item.id}`;
    if (confirm !== key) { uiSfx('ui_move'); setConfirm(key); setMessage(null); return; }
    if (buy(item.kind, item.id)) {
      uiSfx('purchase');
      setMessage(item.kind === 'tire' ? `${item.name} comprado! Equipe na Oficina, na escolha do kart.`
        : item.kind === 'cosmetic' ? `${item.name} comprado! ${item.id.startsWith('outfit:') ? 'Escolha a roupa na tela do piloto.' : 'Equipe na Oficina, na escolha do kart.'}`
          : `${item.name} liberado!`);
    }
    setConfirm(null);
  };

  return (
    <ScreenShell
      id="shop" title="Loja" layout="full" onBack={onBack}
      kicker="Moedas: ganhe correndo e vencendo copas"
    >
      <div className="shop__top">
        <div className="tabs" role="tablist">
          {TABS.map((t, i) => (
            <button
              key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="tabs__item" data-selected={tab === t.id}
              data-testid={`shop-tab-${t.id}`} data-autofocus={i === 0 ? 'true' : undefined}
              onClick={() => { uiSfx('ui_select'); setTab(t.id); setConfirm(null); setMessage(null); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <CoinBadge className="coin-badge--big" />
      </div>
      {message && <p className="shop__message" role="status" data-testid="shop-message">{message}</p>}
      <div className="shop__grid">
        {ITEMS[tab].map((item) => {
          const owned = owns(item.kind, item.id);
          const key = `${item.kind}-${item.id}`;
          const asking = confirm === key;
          const short = !owned && coins < item.price;
          return (
            <button
              key={key} type="button" className="card shop-item" data-testid={`shop-${key}`}
              data-owned={owned} data-short={short} data-confirm={asking}
              style={{ '--card-color': item.color } as CSSProperties} onClick={() => pick(item)}
            >
              {item.image
                ? <AssetImg className="shop-item__image" src={assetUrl(item.image)} alt="" label={item.name} color={item.color} />
                : <span className="shop-item__image shop-item__swatch" style={{ '--swatch': item.swatch } as CSSProperties} aria-hidden="true" />}
              {item.tag && <span className="shop-item__tag">{item.tag}</span>}
              <span className="shop-item__name">{item.name}</span>
              <span className="shop-item__detail">{item.detail}</span>
              {item.rule && item.rule.type !== 'shop' && !owned && <span className="shop-item__rule">ou: {describeUnlock(item.rule)}</span>}
              {item.rule?.type === 'shop' && !owned && <span className="shop-item__rule shop-item__rule--excl">Exclusivo da loja</span>}
              <span className="shop-item__price">
                {owned ? (item.kind === 'tire' || item.kind === 'cosmetic' ? 'Comprado' : 'Liberado') : asking ? 'Toque de novo para comprar' : <><span className="coin-badge__icon" aria-hidden="true" />{item.price.toLocaleString('pt-BR')}</>}
              </span>
            </button>
          );
        })}
      </div>
    </ScreenShell>
  );
}
