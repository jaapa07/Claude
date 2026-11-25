/** Identificadores canônicos compartilhados por dados, simulação, assets e interface. */
export const CHARACTER_IDS = ['nilo', 'boro', 'lumi', 'kora', 'tiko', 'mavi', 'runi', 'zera', 'capi', 'tuca', 'yuki', 'kaito', 'ren', 'sora'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export const KART_IDS = ['flecha', 'engrenagem', 'cometa', 'broto', 'faisca', 'mare', 'duna', 'geada'] as const;
export type KartId = (typeof KART_IDS)[number];

export const TRACK_IDS = [
  'porto-lanternas', 'bosque-cristal', 'vale-moinhos', 'canion-solar',
  'cidade-neon', 'pico-boreal', 'jardim-celeste', 'fortaleza-tempestade',
  'recife-coral', 'templo-esmeralda', 'vulcao-rubro', 'estacao-lunar',
] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export const CUP_IDS = ['aurora', 'eclipse', 'meteoro'] as const;
export type CupId = (typeof CUP_IDS)[number];

export const ITEM_IDS = [
  'pulso-solar', 'bolha-guardia', 'nevoa-prisma', 'faisca-rastreadora', 'onda-vento', 'cristal-salto',
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'quick' | 'championship' | 'timetrial' | 'training';
export type TrophyTier = 'bronze' | 'silver' | 'gold';
