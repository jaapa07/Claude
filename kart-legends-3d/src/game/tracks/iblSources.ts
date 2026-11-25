/**
 * Recursos baixados do Poly Haven (CC0) e como o jogo os usa. Lido pelo script de conversão
 * (`scripts/build-env.ts`) e pela cena (mapas de ambiente por pista e relevo dos materiais).
 */

/** HDRIs (id do arquivo em assets/env = id no Poly Haven). Usados só para reflexos e luz ambiente. */
export const HDRIS = {
  venice_sunset: { ph: 'venice_sunset' },
  forest_grove: { ph: 'forest_grove' },
  meadow_2: { ph: 'meadow_2' },
  goegap: { ph: 'goegap' },
  shanghai_bund: { ph: 'shanghai_bund' },
  winter_lake_01: { ph: 'winter_lake_01' },
  kloppenheim_06_puresky: { ph: 'kloppenheim_06_puresky' },
  approaching_storm: { ph: 'approaching_storm' },
  secluded_beach: { ph: 'secluded_beach' },
  rainforest_trail: { ph: 'rainforest_trail' },
  the_sky_is_on_fire: { ph: 'the_sky_is_on_fire' },
  rogland_clear_night: { ph: 'rogland_clear_night' },
  studio_small_09: { ph: 'studio_small_09' },
} as const;
export type HdriId = keyof typeof HDRIS;

/** Conjuntos PBR do Poly Haven: mapa de normal (e de rugosidade, quando `rough`). */
export const PH_TEXTURES: Record<string, { ph: string; rough?: boolean }> = {
  asphalt: { ph: 'asphalt_02', rough: true },
  rock: { ph: 'rock_face' },
  sand: { ph: 'coast_sand_01' },
  snow: { ph: 'snow_02' },
  dirt: { ph: 'dirt' },
  grass: { ph: 'leafy_grass' },
  planks: { ph: 'wood_planks' },
  bark: { ph: 'bark_brown_02' },
  volcanic: { ph: 'rock_ground' },
  concrete: { ph: 'concrete_floor_02' },
};

/** Texturas próprias de padrão regular cujo relevo é derivado da própria cor (força do Sobel). */
export const NORMALS_DERIVED: Record<string, number> = {
  trk_cobble: 3, trk_brick: 3, trk_flagstone: 3, trk_temple: 3, trk_marble: 1.2, trk_ice: 1.6, trk_plate: 3,
  aur_stone: 3, aur_block: 2.5, ecl_pedra: 3,
};

export interface DetailRule {
  /** Arquivo em assets/detail (sem o sufixo _n/_r). */
  id: string;
  /** Repetições do relevo por repetição da cor. */
  repeat: number;
  /** Intensidade do mapa de normal. */
  strength: number;
  rough?: boolean;
}

const ph = (id: string, repeat: number, strength = 1, rough = false): DetailRule => ({ id, repeat, strength, rough });
const own = (id: string, strength = 1): DetailRule => ({ id, repeat: 1, strength });

/** Relevo por textura de cor (nome da imagem no GLB). */
export const DETAIL_BY_TEXTURE: Record<string, DetailRule> = {
  trk_asphalt: ph('asphalt', 2, 1, true),
  trk_wet: ph('asphalt', 2, 0.8, true),
  trk_rock: ph('rock', 1, 1.2), aur_rock: ph('rock', 1, 1.2), ecl_rocha: ph('rock', 1, 1.2),
  trk_sand: ph('sand', 2, 0.9), aur_sand: ph('sand', 2, 0.9),
  trk_snow: ph('snow', 2, 0.8), ecl_neve: ph('snow', 2, 0.8),
  trk_dirt: ph('dirt', 2), trk_ground: ph('dirt', 2),
  trk_grass: ph('grass', 2, 0.6), ecl_grama: ph('grass', 2, 0.6),
  trk_wood: ph('planks', 1, 0.8), aur_wood: ph('planks', 1, 0.8), ecl_madeira: ph('planks', 1, 0.8),
  aur_bark: ph('bark', 1, 1.2),
  trk_basalt: ph('volcanic', 1, 1.1), trk_regolith: ph('volcanic', 1, 1),
  ecl_concreto: ph('concrete', 1, 0.8), aur_plaster: ph('concrete', 1, 0.6),
  ...Object.fromEntries(Object.keys(NORMALS_DERIVED).map((k) => [k, own(k)])),
};
