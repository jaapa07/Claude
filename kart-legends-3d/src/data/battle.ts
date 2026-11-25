/**
 * Modo Batalha: minijogos e arenas (dados declarativos usados pela simulação, pela interface e pelos scripts).
 * Tudo original: regras, nomes e arenas próprios do Kart Legends 3D.
 */

export const BATTLE_GAME_IDS = ['estoura-balao', 'caca-cristais', 'rei-da-coroa'] as const;
export type BattleGameId = (typeof BATTLE_GAME_IDS)[number];

export const ARENA_IDS = ['praca-coreto', 'cratera-lunar'] as const;
export type ArenaId = (typeof ARENA_IDS)[number];

/** Números das regras (s, unidades) — a simulação e a interface leem daqui. */
export const BATTLE_RULES = {
  balloons: { duration: 180, start: 3, max: 5 },
  crystals: {
    duration: 150,
    /** Últimos segundos com chuva de cristais. */
    frenzy: 30,
    /** Cristais soltos na arena ao mesmo tempo (normal / frenesi). */
    cap: 12,
    frenzyCap: 22,
    /** Intervalo entre surgimentos (normal / frenesi). */
    spawnEvery: 2.2,
    frenzySpawnEvery: 0.55,
    /** Chance de uma caixa de item também dar um cristal. */
    boxChance: 0.5,
    /** Fração perdida ao ser atingido (arredondada para cima). */
    dropFraction: 0.5,
  },
  crown: { duration: 150, target: 60, /** Fator de velocidade máxima de quem está com a coroa. */ holderSpeed: 0.93 },
} as const;

export interface BattleGameMeta {
  id: BattleGameId;
  name: string;
  tagline: string;
  /** Regras curtas para o cartão de escolha. */
  rules: readonly string[];
  /** Duração da partida em segundos. */
  duration: number;
  color: string;
  /** Rótulo da pontuação no placar. */
  scoreLabel: string;
}

export const BATTLE_GAMES: readonly BattleGameMeta[] = [
  {
    id: 'estoura-balao', name: 'Estoura-Balão', tagline: 'Proteja seus 3 balões', color: '#ff4f7b', scoreLabel: 'Balões',
    duration: BATTLE_RULES.balloons.duration,
    rules: [
      'Cada kart começa com 3 balões presos atrás.',
      'Item ou batida forte estoura um balão — quem estourou rouba um (até 5).',
      'Sem balões, está fora. Vence o último na arena ou quem tiver mais balões em 3:00.',
    ],
  },
  {
    id: 'caca-cristais', name: 'Caça-Cristais', tagline: 'Junte mais cristais', color: '#4fd8e8', scoreLabel: 'Cristais',
    duration: BATTLE_RULES.crystals.duration,
    rules: [
      'Cristais surgem pela arena e às vezes nas caixas de item.',
      'Levou um golpe? Metade dos seus cristais cai no chão para quem pegar.',
      'Nos últimos 30 s vem o frenesi: chove cristal. Mais cristais em 2:30 vence.',
    ],
  },
  {
    id: 'rei-da-coroa', name: 'Rei da Coroa', tagline: 'Segure a coroa', color: '#ffc93c', scoreLabel: 'Pontos',
    duration: BATTLE_RULES.crown.duration,
    rules: [
      'Pegue a coroa: com ela você ganha 1 ponto por segundo.',
      'Quem está coroado fica um pouco mais lento e aparece no mapa.',
      'Acerte o rei para roubar a coroa. Vence quem chegar a 60 ou tiver mais pontos em 2:30.',
    ],
  },
];
export const BATTLE_GAME_BY_ID = Object.fromEntries(BATTLE_GAMES.map((g) => [g.id, g])) as Record<BattleGameId, BattleGameMeta>;

export interface ArenaMeta {
  id: ArenaId;
  name: string;
  tagline: string;
  description: string;
  colorA: string;
  colorB: string;
  music: 'race_aurora' | 'race_eclipse';
  ambience: 'sea' | 'forest' | 'meadow' | 'desert' | 'city' | 'blizzard' | 'sky' | 'storm';
}

export const ARENAS: readonly ArenaMeta[] = [
  {
    id: 'praca-coreto', name: 'Praça do Coreto', tagline: 'Praça de cidade do interior',
    description: 'Chafariz no centro, canteiros elevados com rampas, o coreto num canto e placas de turbo nas alamedas.',
    colorA: '#ffb347', colorB: '#3f8f5a', music: 'race_aurora', ambience: 'meadow',
  },
  {
    id: 'cratera-lunar', name: 'Cratera Lunar', tagline: 'Arena na Lua, sob a Terra azul',
    description: 'Uma cratera em tigela: bordas inclinadas, mesa central com rampas, crateras menores e placas de turbo.',
    colorA: '#8fa6ff', colorB: '#2b2f5c', music: 'race_eclipse', ambience: 'sky',
  },
];
export const ARENA_BY_ID = Object.fromEntries(ARENAS.map((a) => [a.id, a])) as Record<ArenaId, ArenaMeta>;

/** Moedas por colocação na batalha (1º a 8º), menores que as de corrida. */
export const COINS_BY_BATTLE_PLACE = [80, 60, 45, 35, 25, 20, 15, 10] as const;
