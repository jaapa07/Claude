import type { UnlockRule } from './unlocks';

/**
 * Personalização: roupas dos pilotos e modificações dos karts.
 * Tudo é recolorização das cores de vértice dos modelos (não há geometria nova), então vale para qualquer
 * piloto ou kart, inclusive os que forem criados depois.
 */

/** Como transformar uma cor (HSL, 0..1). */
export type ColorRecipe =
  | { mode: 'shift'; hue: number; sat?: number; light?: number }
  /** Define matiz e saturação, mantendo a luminosidade relativa; cinzas (saturação baixa) ficam como estão, salvo `keepGrays: false`. */
  | { mode: 'set'; hue: number; sat: number; light?: [number, number]; keepGrays?: boolean }
  /** Sem cor: só luminosidade, remapeada para a faixa [mín, máx]. */
  | { mode: 'mono'; light: [number, number] };

/** Acabamento opcional do material (metal brilhante para ouro/cromo). */
export interface Finish { metalness: number; roughness: number }

export interface OutfitDef {
  id: string;
  name: string;
  /** Cor de amostra na interface. */
  swatch: string;
  recipe: ColorRecipe | null;
  finish?: Finish;
  unlock: UnlockRule;
}

export interface KartOption {
  id: string;
  name: string;
  swatch: string;
  unlock: UnlockRule;
}

export interface PaintDef extends KartOption { recipe: ColorRecipe | null; finish?: Finish }
export interface GlowDef extends KartOption { color: string | null }

const GOLD: Finish = { metalness: 0.75, roughness: 0.3 };

export const OUTFITS: readonly OutfitDef[] = [
  { id: 'classico', name: 'Clássico', swatch: '#ff8a4c', recipe: null, unlock: { type: 'initial' } },
  { id: 'tropical', name: 'Tropical', swatch: '#3fd17a', recipe: { mode: 'shift', hue: 0.33, sat: 1.1 }, unlock: { type: 'initial' } },
  { id: 'oceano', name: 'Oceano', swatch: '#2f8fe8', recipe: { mode: 'shift', hue: 0.55, sat: 1.05 }, unlock: { type: 'races', count: 2 } },
  { id: 'noturno', name: 'Noturno', swatch: '#3a2f5c', recipe: { mode: 'shift', hue: 0, sat: 0.7, light: 0.45 }, unlock: { type: 'races', count: 5 } },
  { id: 'neve', name: 'Neve', swatch: '#eef6ff', recipe: { mode: 'mono', light: [0.72, 0.97] }, unlock: { type: 'wins', count: 2 } },
  { id: 'ouro', name: 'Ouro', swatch: '#e8b53a', recipe: { mode: 'set', hue: 0.12, sat: 0.78, light: [0.32, 0.72], keepGrays: false }, finish: GOLD, unlock: { type: 'trophy', cup: 'aurora', min: 'gold' } },
];

export const PAINTS: readonly PaintDef[] = [
  { id: 'original', name: 'Original', swatch: 'conic-gradient(#ff5a6e, #ffcf4d, #7df0a8, #4fd8e8, #7b5cff, #ff5a6e)', recipe: null, unlock: { type: 'initial' } },
  { id: 'vermelho', name: 'Vermelho', swatch: '#e2323f', recipe: { mode: 'set', hue: 0.99, sat: 0.78 }, unlock: { type: 'initial' } },
  { id: 'laranja', name: 'Laranja', swatch: '#f2762e', recipe: { mode: 'set', hue: 0.06, sat: 0.85 }, unlock: { type: 'initial' } },
  { id: 'amarelo', name: 'Amarelo', swatch: '#f4c430', recipe: { mode: 'set', hue: 0.13, sat: 0.85 }, unlock: { type: 'initial' } },
  { id: 'verde', name: 'Verde', swatch: '#3fb050', recipe: { mode: 'set', hue: 0.35, sat: 0.65 }, unlock: { type: 'initial' } },
  { id: 'ciano', name: 'Ciano', swatch: '#2ec4d6', recipe: { mode: 'set', hue: 0.52, sat: 0.7 }, unlock: { type: 'initial' } },
  { id: 'azul', name: 'Azul', swatch: '#2f6fe0', recipe: { mode: 'set', hue: 0.61, sat: 0.75 }, unlock: { type: 'initial' } },
  { id: 'roxo', name: 'Roxo', swatch: '#7b4fe0', recipe: { mode: 'set', hue: 0.73, sat: 0.65 }, unlock: { type: 'initial' } },
  { id: 'rosa', name: 'Rosa', swatch: '#ff5fa2', recipe: { mode: 'set', hue: 0.92, sat: 0.8 }, unlock: { type: 'initial' } },
  { id: 'preto', name: 'Preto', swatch: '#1d1b24', recipe: { mode: 'mono', light: [0.05, 0.2] }, unlock: { type: 'races', count: 3 } },
  { id: 'branco', name: 'Branco', swatch: '#f4f4f8', recipe: { mode: 'mono', light: [0.7, 0.95] }, unlock: { type: 'races', count: 3 } },
  { id: 'dourado', name: 'Dourado', swatch: '#e8b53a', recipe: { mode: 'set', hue: 0.12, sat: 0.8, light: [0.3, 0.7] }, finish: GOLD, unlock: { type: 'trophy', cup: 'aurora', min: 'gold' } },
];

/** Peças metálicas (rodas, escapamento, estrutura). */
export const METALS: readonly PaintDef[] = [
  { id: 'original', name: 'Original', swatch: '#9aa3b5', recipe: null, unlock: { type: 'initial' } },
  { id: 'cromado', name: 'Cromado', swatch: '#e9eef5', recipe: { mode: 'mono', light: [0.6, 0.95] }, finish: { metalness: 1, roughness: 0.15 }, unlock: { type: 'initial' } },
  { id: 'grafite', name: 'Grafite', swatch: '#2a2a32', recipe: { mode: 'mono', light: [0.06, 0.18] }, finish: { metalness: 0.6, roughness: 0.55 }, unlock: { type: 'initial' } },
  { id: 'cobre', name: 'Cobre', swatch: '#c06a3a', recipe: { mode: 'set', hue: 0.06, sat: 0.65, light: [0.25, 0.6], keepGrays: false }, finish: { metalness: 0.85, roughness: 0.3 }, unlock: { type: 'races', count: 4 } },
  { id: 'ouro', name: 'Ouro', swatch: '#e8b53a', recipe: { mode: 'set', hue: 0.12, sat: 0.8, light: [0.35, 0.75], keepGrays: false }, finish: GOLD, unlock: { type: 'wins', count: 3 } },
];

/** Cor da chama do turbo. */
export const FLAMES: readonly GlowDef[] = [
  { id: 'original', name: 'Laranja', swatch: '#ffb347', color: null, unlock: { type: 'initial' } },
  { id: 'azul', name: 'Azul', swatch: '#4fb8ff', color: '#4fb8ff', unlock: { type: 'initial' } },
  { id: 'verde', name: 'Verde', swatch: '#7df0a8', color: '#7df0a8', unlock: { type: 'initial' } },
  { id: 'rosa', name: 'Rosa', swatch: '#ff4fae', color: '#ff4fae', unlock: { type: 'races', count: 2 } },
  { id: 'roxo', name: 'Roxo', swatch: '#a06bff', color: '#a06bff', unlock: { type: 'turbo3', count: 10 } },
  { id: 'branco', name: 'Branco', swatch: '#f4f8ff', color: '#f4f8ff', unlock: { type: 'turbo3', count: 25 } },
];

/** Neon embaixo do kart. */
export const NEONS: readonly GlowDef[] = [
  { id: 'nenhum', name: 'Nenhum', swatch: 'transparent', color: null, unlock: { type: 'initial' } },
  { id: 'ciano', name: 'Ciano', swatch: '#3ff0ff', color: '#3ff0ff', unlock: { type: 'initial' } },
  { id: 'magenta', name: 'Magenta', swatch: '#ff3fd0', color: '#ff3fd0', unlock: { type: 'initial' } },
  { id: 'verde', name: 'Verde', swatch: '#5dff8a', color: '#5dff8a', unlock: { type: 'races', count: 1 } },
  { id: 'ambar', name: 'Âmbar', swatch: '#ffb43f', color: '#ffb43f', unlock: { type: 'races', count: 1 } },
  { id: 'roxo', name: 'Roxo', swatch: '#9a5cff', color: '#9a5cff', unlock: { type: 'wins', count: 1 } },
];

export interface KartLook { paint: string; metal: string; flame: string; neon: string }
export const DEFAULT_KART_LOOK: Readonly<KartLook> = { paint: 'original', metal: 'original', flame: 'original', neon: 'nenhum' };

export const KART_PARTS = [
  { key: 'paint', label: 'Pintura', options: PAINTS },
  { key: 'metal', label: 'Metais e rodas', options: METALS },
  { key: 'flame', label: 'Chama do turbo', options: FLAMES },
  { key: 'neon', label: 'Neon', options: NEONS },
] as const satisfies ReadonlyArray<{ key: keyof KartLook; label: string; options: readonly KartOption[] }>;

const byId = <T extends { id: string }>(list: readonly T[], id: string | undefined): T => list.find((o) => o.id === id) ?? list[0]!;
export const outfitById = (id: string | undefined): OutfitDef => byId(OUTFITS, id);
export const paintById = (id: string | undefined): PaintDef => byId(PAINTS, id);
export const metalById = (id: string | undefined): PaintDef => byId(METALS, id);
export const flameById = (id: string | undefined): GlowDef => byId(FLAMES, id);
export const neonById = (id: string | undefined): GlowDef => byId(NEONS, id);
