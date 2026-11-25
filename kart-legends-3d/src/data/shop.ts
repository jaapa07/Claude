import { COINS_BY_BATTLE_PLACE } from './battle';
import type { Difficulty, GameMode, TrophyTier } from './ids';

/**
 * Economia do jogo: moedas ganhas em corridas e copas e gastas na loja (pilotos, karts e pneus).
 * Preços e ganhos ficam aqui para facilitar o balanceamento.
 */

/** Moedas de quem começa um save novo. */
export const START_COINS = 300;

/** Moedas por posição de chegada (1º a 8º) em Corrida Rápida e Campeonato. */
export const COINS_BY_POSITION = [150, 110, 90, 70, 55, 40, 30, 20] as const;
/** Multiplicador por dificuldade (mais difícil paga mais). */
export const COIN_DIFFICULTY: Record<Difficulty, number> = { easy: 1, normal: 1.25, hard: 1.6 };
/** Bônus pelo troféu ao fim de uma copa. */
export const COINS_TROPHY: Record<TrophyTier, number> = { gold: 600, silver: 400, bronze: 250 };
/** Contrarrelógio: por concluir e por bater o próprio recorde. */
export const COINS_TIME_TRIAL = { finish: 20, record: 60 } as const;

export interface CoinInput {
  mode: GameMode;
  difficulty: Difficulty;
  /** Posição do jogador (1..8); ignorada fora das corridas com adversários. */
  position: number;
  /** O jogador cruzou a chegada. */
  finished: boolean;
  /** Troféu conquistado nesta corrida (última da copa). */
  trophy: TrophyTier | null;
  /** Novo recorde de tempo no Contrarrelógio. */
  timeTrialRecord: boolean;
}

/** Moedas ganhas em uma corrida (já com bônus de troféu). */
export function coinsForRace(i: CoinInput): number {
  if (i.mode === 'quick' || i.mode === 'championship') {
    const base = COINS_BY_POSITION[Math.min(COINS_BY_POSITION.length, Math.max(1, i.position)) - 1]!;
    const race = Math.round((base * COIN_DIFFICULTY[i.difficulty]) / 5) * 5;
    return race + (i.trophy ? COINS_TROPHY[i.trophy] : 0);
  }
  if (i.mode === 'timetrial' && i.finished) return COINS_TIME_TRIAL.finish + (i.timeTrialRecord ? COINS_TIME_TRIAL.record : 0);
  return 0;
}

/** Moedas por colocação numa batalha (menos que uma corrida), com o mesmo multiplicador de dificuldade. */
export function coinsForBattle(i: { difficulty: Difficulty; position: number; racers: number }): number {
  const table = COINS_BY_BATTLE_PLACE;
  // com menos participantes a tabela é "comprimida": o último sempre recebe o valor do 8º
  const slot = i.racers > 1 ? Math.round(((Math.max(1, Math.min(i.racers, i.position)) - 1) / (i.racers - 1)) * 7) : 0;
  return Math.round((table[slot]! * COIN_DIFFICULTY[i.difficulty]) / 5) * 5;
}

export type ShopKind = 'character' | 'kart' | 'tire' | 'cosmetic';

/**
 * Preços. Pilotos: só os ninjas exclusivos (regra `{ type: 'shop' }`); os demais se liberam jogando.
 * Karts bloqueados podem ser comprados antes de serem liberados jogando.
 */
export const CHARACTER_PRICES: Readonly<Record<string, number>> = {
  // Só os 4 ninjas são vendidos (e só comprando). Os outros pilotos saem jogando, pelas missões de desbloqueio.
  yuki: 4000, kaito: 5000, ren: 4500, sora: 4500,
};
export const KART_PRICES: Readonly<Record<string, number>> = {
  faisca: 900, mare: 1200, duna: 1500, geada: 1800,
};
export const TIRE_PRICES: Readonly<Record<string, number>> = {
  offroad: 500, slick: 600, raios: 800, neon: 900, estrela: 700, neve: 650, flor: 550,
};

/**
 * Adereços (roupas e itens da Oficina) vendidos na loja, pela chave `grupo:id`.
 * As opções básicas de cada grupo são grátis; estas só comprando.
 */
export const COSMETIC_PRICES: Readonly<Record<string, number>> = {
  'outfit:oceano': 600, 'outfit:noturno': 800, 'outfit:neve': 900, 'outfit:ouro': 1800,
  'paint:preto': 400, 'paint:branco': 400, 'paint:dourado': 1500,
  'metal:cobre': 500, 'metal:ouro': 1200,
  'flame:rosa': 300, 'flame:roxo': 450, 'flame:branco': 600,
  'neon:verde': 350, 'neon:ambar': 350, 'neon:roxo': 500,
};
export const cosmeticKey = (group: string, id: string): string => `${group}:${id}`;

export const SHOP_PRICES: Record<ShopKind, Readonly<Record<string, number>>> = {
  character: CHARACTER_PRICES, kart: KART_PRICES, tire: TIRE_PRICES, cosmetic: COSMETIC_PRICES,
};

/** Pneus vendidos na loja (modelos em assets/tires/<id>.glb, ícones em ui/tires/<id>.webp). */
export const TIRES: ReadonlyArray<{ id: string; name: string; description: string; color: string }> = [
  { id: 'offroad', name: 'Garra Off-road', description: 'Cravos grossos para terra, areia e neve.', color: '#8a6a3a' },
  { id: 'slick', name: 'Slick de Corrida', description: 'Liso, largo e baixo, com aro de raios finos.', color: '#c9ccd4' },
  { id: 'raios', name: 'Raios Dourados', description: 'Raios finos, aro dourado e faixa branca clássica.', color: '#e8b53a' },
  { id: 'neon', name: 'Neon Turbo', description: 'Anel ciano que brilha no escuro.', color: '#3ff0ff' },
  { id: 'estrela', name: 'Estrela', description: 'Aro de cinco pontas, colorido e chamativo.', color: '#ff5fa2' },
  { id: 'neve', name: 'Corrente de Neve', description: 'Correntes de aço para não escorregar no gelo.', color: '#9fd8ff' },
  { id: 'flor', name: 'Pétala', description: 'Aro em forma de flor, em tons pastel.', color: '#ffb3d1' },
];
