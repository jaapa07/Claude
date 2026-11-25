import { create } from 'zustand';
import { CHARACTER_IDS, KART_IDS, type CharacterId, type KartId } from '@/data/ids';
import { DEFAULT_KART_LOOK, FLAMES, KART_PARTS, METALS, NEONS, OUTFITS, PAINTS, TIRE_OPTIONS, outfitById, type KartLook } from '@/data/customization';
import type { KartModel } from '@/game/vehicles/kartModel';
import { readKey, writeKey } from '@/game/save/storage';

export const CUSTOM_KEY = 'kl3d.custom.v1';

export interface CustomData {
  /** Roupa escolhida por piloto. */
  outfits: Partial<Record<CharacterId, string>>;
  /** Modificações por kart. */
  karts: Partial<Record<KartId, KartLook>>;
}

export interface CustomState extends CustomData {
  setOutfit: (character: CharacterId, outfit: string) => void;
  setKartPart: (kart: KartId, part: keyof KartLook, option: string) => void;
}

const VALID: Record<keyof KartLook, readonly { id: string }[]> = { paint: PAINTS, metal: METALS, flame: FLAMES, neon: NEONS, tire: TIRE_OPTIONS };

/** Lê a personalização salva ignorando ids desconhecidos (dados antigos ou corrompidos). */
export function parseCustom(text: string | null): CustomData {
  const out: CustomData = { outfits: {}, karts: {} };
  if (!text) return out;
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return out; }
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as { outfits?: Record<string, unknown>; karts?: Record<string, Record<string, unknown>> };
  for (const c of CHARACTER_IDS) {
    const v = r.outfits?.[c];
    if (typeof v === 'string' && OUTFITS.some((o) => o.id === v)) out.outfits[c] = v;
  }
  for (const k of KART_IDS) {
    const v = r.karts?.[k];
    if (typeof v !== 'object' || v === null) continue;
    const look: KartLook = { ...DEFAULT_KART_LOOK };
    for (const { key } of KART_PARTS) {
      const opt = v[key];
      if (typeof opt === 'string' && VALID[key].some((o) => o.id === opt)) look[key] = opt;
    }
    out.karts[k] = look;
  }
  return out;
}

export const useCustomStore = create<CustomState>()((set, get) => {
  const save = (): void => {
    const { outfits, karts } = get();
    writeKey(CUSTOM_KEY, JSON.stringify({ outfits, karts }));
  };
  return {
    ...parseCustom(readKey(CUSTOM_KEY)),
    setOutfit: (character, outfit) => { set({ outfits: { ...get().outfits, [character]: outfit } }); save(); },
    setKartPart: (kart, part, option) => {
      const look = { ...(get().karts[kart] ?? DEFAULT_KART_LOOK), [part]: option };
      set({ karts: { ...get().karts, [kart]: look } });
      save();
    },
  };
});

export const kartLookOf = (karts: CustomData['karts'], kart: KartId): KartLook => karts[kart] ?? DEFAULT_KART_LOOK;

/** Veste o piloto e modifica o kart do jogador com a personalização salva. Devolve se a pintura foi trocada. */
export function dressPlayer(model: KartModel, character: CharacterId, kart: KartId): boolean {
  const { outfits, karts } = useCustomStore.getState();
  model.applyOutfit(outfitById(outfits[character]));
  const look = kartLookOf(karts, kart);
  model.applyLook(look);
  return look.paint !== DEFAULT_KART_LOOK.paint;
}
