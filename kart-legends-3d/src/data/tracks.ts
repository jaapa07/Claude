import type { CupId, TrackId } from './ids';

export interface TrackMeta {
  id: TrackId;
  name: string;
  cup: CupId;
  /** Posição dentro da copa (0 a 3). */
  order: number;
  tagline: string;
  description: string;
  /** Cores de interface (cartões, fundo de carregamento). */
  colorA: string;
  colorB: string;
  music: 'race_aurora' | 'race_eclipse';
  ambience: 'sea' | 'forest' | 'meadow' | 'desert' | 'city' | 'blizzard' | 'sky' | 'storm';
}

export interface CupMeta {
  id: CupId;
  name: string;
  description: string;
  color: string;
  tracks: readonly TrackId[];
}

export const TRACKS: readonly TrackMeta[] = [
  { id: 'porto-lanternas', name: 'Porto das Lanternas', cup: 'aurora', order: 0, tagline: 'Cidade costeira ao pôr do sol', description: 'Ruas de pedra, mercado, cais e um atalho pelo píer para quem tem coragem.', colorA: '#ff8a4c', colorB: '#5b3a8c', music: 'race_aurora', ambience: 'sea' },
  { id: 'bosque-cristal', name: 'Bosque de Cristal', cup: 'aurora', order: 1, tagline: 'Floresta fantástica', description: 'Árvores gigantes, cristais luminosos, cavernas e pontes de madeira entre a névoa.', colorA: '#3fd6a8', colorB: '#234a6b', music: 'race_aurora', ambience: 'forest' },
  { id: 'vale-moinhos', name: 'Vale dos Moinhos', cup: 'aurora', order: 2, tagline: 'Região montanhosa', description: 'Campos, moinhos, rio e longos trechos de terra com rampas.', colorA: '#8fd14f', colorB: '#3d8fd1', music: 'race_aurora', ambience: 'meadow' },
  { id: 'canion-solar', name: 'Cânion Solar', cup: 'aurora', order: 3, tagline: 'Deserto rochoso', description: 'Desfiladeiros, ruínas, pontes estreitas e tempestades de areia.', colorA: '#f2a03d', colorB: '#a8452b', music: 'race_aurora', ambience: 'desert' },
  { id: 'cidade-neon', name: 'Cidade Neon', cup: 'eclipse', order: 0, tagline: 'Circuito urbano noturno', description: 'Viadutos, túneis e ruas molhadas refletindo painéis luminosos.', colorA: '#ff3fa4', colorB: '#1b1f5e', music: 'race_eclipse', ambience: 'city' },
  { id: 'pico-boreal', name: 'Pico Boreal', cup: 'eclipse', order: 1, tagline: 'Montanhas congeladas', description: 'Gelo escorregadio, cavernas e penhascos sob a aurora boreal.', colorA: '#7be0ff', colorB: '#2b3f8c', music: 'race_eclipse', ambience: 'blizzard' },
  { id: 'jardim-celeste', name: 'Jardim Celeste', cup: 'eclipse', order: 2, tagline: 'Ilhas suspensas', description: 'Jardins flutuantes ligados por pontes e grandes saltos sobre as nuvens.', colorA: '#9ee6ff', colorB: '#f7a8d8', music: 'race_eclipse', ambience: 'sky' },
  { id: 'fortaleza-tempestade', name: 'Fortaleza Tempestade', cup: 'eclipse', order: 3, tagline: 'Castelo fantástico', description: 'Muralhas, salões, portões móveis e relâmpagos nas curvas mais difíceis.', colorA: '#8e7bd6', colorB: '#1d2233', music: 'race_eclipse', ambience: 'storm' },
  { id: 'recife-coral', name: 'Recife de Coral', cup: 'meteoro', order: 0, tagline: 'Ilha tropical', description: 'Praias de areia, passarelas sobre a lagoa, arcos de coral e um salto sobre o canal.', colorA: '#3fe0d0', colorB: '#f2c46b', music: 'race_aurora', ambience: 'sea' },
  { id: 'templo-esmeralda', name: 'Templo Esmeralda', cup: 'meteoro', order: 1, tagline: 'Ruínas na selva', description: 'Trilhas de terra entre pirâmides, ponte de cordas sobre o rio e troncos que balançam no santuário.', colorA: '#46c46a', colorB: '#1f4a3a', music: 'race_aurora', ambience: 'forest' },
  { id: 'vulcao-rubro', name: 'Vulcão Rubro', cup: 'meteoro', order: 2, tagline: 'Rios de lava', description: 'Estradas de basalto sobre um mar de lava, pontes de ferro e rochas incandescentes rolando.', colorA: '#ff5a2a', colorB: '#3a1414', music: 'race_eclipse', ambience: 'desert' },
  { id: 'estacao-lunar', name: 'Estação Lunar', cup: 'meteoro', order: 3, tagline: 'Base na Lua', description: 'Cúpulas, tubos pressurizados, crateras para saltar e robôs de carga cruzando a pista.', colorA: '#9fb4ff', colorB: '#141a33', music: 'race_eclipse', ambience: 'city' },
];

export const TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t])) as Record<TrackId, TrackMeta>;

export const CUPS: readonly CupMeta[] = [
  { id: 'aurora', name: 'Copa Aurora', description: 'Quatro pistas ensolaradas para aprender o caminho.', color: '#ffb24d', tracks: ['porto-lanternas', 'bosque-cristal', 'vale-moinhos', 'canion-solar'] },
  { id: 'eclipse', name: 'Copa Eclipse', description: 'Quatro pistas noturnas e traiçoeiras. Requer um troféu da Copa Aurora.', color: '#8e7bd6', tracks: ['cidade-neon', 'pico-boreal', 'jardim-celeste', 'fortaleza-tempestade'] },
  { id: 'meteoro', name: 'Copa Meteoro', description: 'Quatro pistas exóticas: lagoa, selva, lava e Lua. Requer um troféu da Copa Eclipse.', color: '#ff6a3d', tracks: ['recife-coral', 'templo-esmeralda', 'vulcao-rubro', 'estacao-lunar'] },
];
export const CUP_BY_ID = Object.fromEntries(CUPS.map((c) => [c.id, c])) as Record<CupId, CupMeta>;

/** A Copa Eclipse abre com qualquer troféu da Copa Aurora; a Copa Meteoro, com qualquer troféu da Copa Eclipse. */
export const CUP_UNLOCK: Record<CupId, { type: 'initial' } | { type: 'trophy'; cup: CupId; min: 'bronze' }> = {
  aurora: { type: 'initial' },
  eclipse: { type: 'trophy', cup: 'aurora', min: 'bronze' },
  meteoro: { type: 'trophy', cup: 'eclipse', min: 'bronze' },
};

export const LAPS_PER_RACE = 3;
export const RACERS_PER_RACE = 8;
/** Pontuação por posição de chegada (1º a 8º). */
export const POINTS_BY_POSITION = [15, 12, 10, 8, 6, 4, 2, 1] as const;
