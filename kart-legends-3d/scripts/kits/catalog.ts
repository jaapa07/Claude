/**
 * Modelos de terceiros (CC0) usados no cenário, com a escala que os leva a metros do jogo.
 * Só entram no GLB os modelos listados aqui (nunca o pacote inteiro).
 *
 * - Kenney (https://kenney.nl): Racing Kit 2.0, Nature Kit 2.1, Car Kit 3.1 — cores de material (e, no Car Kit,
 *   a paleta `colormap.png`) viram cor de vértice: um único material sem textura para todos.
 * - Quaternius (https://quaternius.com): Stylized Nature MegaKit [Standard] — casca, pedra e cogumelo viram cor
 *   de vértice (amostrada da textura por face); folhas e flores usam um atlas recortado (alpha test).
 */
export type KitPack = 'racing' | 'nature' | 'car' | 'quaternius';

export interface KitModel {
  /** Nome do nó no GLB e nas listas de posicionamento. */
  id: string;
  pack: KitPack;
  /** Arquivo de origem dentro do pacote (sem extensão). */
  file: string;
  /** Escala uniforme para metros. */
  scale: number;
  /** Fração de triângulos mantida na casca/pedra (simplificação meshoptimizer); folhas nunca são simplificadas. */
  simplify?: number;
  /** Raio de ocupação no chão (m), já em escala. */
  radius: number;
  /** Centraliza a base no eixo (Kenney Racing Kit tem a origem num canto). */
  center?: boolean;
  /** Pilha de N cópias deitadas (pilha de pneus a partir de um pneu solto). */
  stack?: number;
}

export const KENNEY_MODELS: KitModel[] = [
  // Racing Kit — estrutura de autódromo (largada, curvas)
  { id: 'k_grandstand', pack: 'racing', file: 'grandStandCovered', scale: 10, radius: 7, center: true },
  { id: 'k_grandstand_open', pack: 'racing', file: 'grandStand', scale: 10, radius: 7, center: true },
  { id: 'k_banner_red', pack: 'racing', file: 'bannerTowerRed', scale: 8, radius: 2.4, center: true },
  { id: 'k_banner_green', pack: 'racing', file: 'bannerTowerGreen', scale: 8, radius: 2.4, center: true },
  { id: 'k_flag_red', pack: 'racing', file: 'flagRed', scale: 6, radius: 0.8, center: true },
  { id: 'k_flag_green', pack: 'racing', file: 'flagGreen', scale: 6, radius: 0.8, center: true },
  { id: 'k_barrier_red', pack: 'racing', file: 'barrierRed', scale: 9, radius: 1.3, center: true },
  { id: 'k_barrier_white', pack: 'racing', file: 'barrierWhite', scale: 9, radius: 1.3, center: true },
  { id: 'k_light_post', pack: 'racing', file: 'lightPostModern', scale: 9, radius: 0.6, center: true },
  { id: 'k_light_large', pack: 'racing', file: 'lightPostLarge', scale: 9, radius: 1, center: true },
  { id: 'k_pits', pack: 'racing', file: 'pitsGarage', scale: 10, radius: 6, center: true },
  { id: 'k_pits_office', pack: 'racing', file: 'pitsOffice', scale: 10, radius: 6, center: true },
  { id: 'k_tent', pack: 'racing', file: 'tent', scale: 7, radius: 3.6, center: true },
  { id: 'k_tent_roof', pack: 'racing', file: 'tentRoof', scale: 7, radius: 3.6, center: true },
  { id: 'k_camera', pack: 'racing', file: 'camera_exclusive', scale: 6, radius: 1, center: true },
  { id: 'k_radar', pack: 'racing', file: 'radarEquipment', scale: 8, radius: 3, center: true },
  { id: 'k_cone', pack: 'racing', file: 'pylon', scale: 5.5, radius: 0.4, center: true },
  // Car Kit — veículos estacionados (cidade/porto) e pneus para pilhas
  { id: 'c_sedan', pack: 'car', file: 'sedan', scale: 1.8, simplify: 0.45, radius: 2.6 },
  { id: 'c_taxi', pack: 'car', file: 'taxi', scale: 1.8, simplify: 0.45, radius: 2.7 },
  { id: 'c_van', pack: 'car', file: 'van', scale: 1.8, simplify: 0.45, radius: 2.9 },
  { id: 'c_suv', pack: 'car', file: 'suv', scale: 1.8, simplify: 0.45, radius: 2.7 },
  { id: 'c_hatch', pack: 'car', file: 'hatchback-sports', scale: 1.8, simplify: 0.45, radius: 2.5 },
  { id: 'c_police', pack: 'car', file: 'police', scale: 1.8, simplify: 0.45, radius: 2.7 },
  { id: 'c_delivery', pack: 'car', file: 'delivery', scale: 1.8, simplify: 0.45, radius: 3.2 },
  { id: 'c_truck_flat', pack: 'car', file: 'truck-flat', scale: 1.8, simplify: 0.45, radius: 3.4 },
  { id: 'c_tire_stack', pack: 'car', file: 'debris-tire', scale: 1.7, radius: 1, stack: 3, center: true },
  // Nature Kit — pedras, penhascos, tocos, troncos
  { id: 'n_stone_large_a', pack: 'nature', file: 'stone_largeA', scale: 7, radius: 3 },
  { id: 'n_stone_large_c', pack: 'nature', file: 'stone_largeC', scale: 7, radius: 3 },
  { id: 'n_stone_tall_b', pack: 'nature', file: 'stone_tallB', scale: 7, radius: 2 },
  { id: 'n_stone_tall_g', pack: 'nature', file: 'stone_tallG', scale: 7, radius: 2 },
  { id: 'n_stone_small_b', pack: 'nature', file: 'stone_smallB', scale: 6, radius: 0.8 },
  { id: 'n_stone_small_f', pack: 'nature', file: 'stone_smallF', scale: 6, radius: 0.8 },
  { id: 'n_cliff_large', pack: 'nature', file: 'cliff_large_stone', scale: 9, radius: 5 },
  { id: 'n_stump', pack: 'nature', file: 'stump_roundDetailed', scale: 5, radius: 0.8 },
  { id: 'n_log_stack', pack: 'nature', file: 'log_stackLarge', scale: 4, radius: 1.6 },
  { id: 'n_cactus_tall', pack: 'nature', file: 'cactus_tall', scale: 6, radius: 0.8 },
  { id: 'n_cactus_short', pack: 'nature', file: 'cactus_short', scale: 6, radius: 0.8 },
];

export const QUATERNIUS_MODELS: KitModel[] = [
  { id: 'q_tree_1', pack: 'quaternius', file: 'CommonTree_1', scale: 1.15, simplify: 0.12, radius: 3 },
  { id: 'q_tree_3', pack: 'quaternius', file: 'CommonTree_3', scale: 1.15, simplify: 0.15, radius: 3 },
  { id: 'q_tree_5', pack: 'quaternius', file: 'CommonTree_5', scale: 1.15, simplify: 0.15, radius: 3 },
  { id: 'q_pine_1', pack: 'quaternius', file: 'Pine_1', scale: 1.25, simplify: 0.1, radius: 2.4 },
  { id: 'q_pine_3', pack: 'quaternius', file: 'Pine_3', scale: 1.25, simplify: 0.1, radius: 2.4 },
  { id: 'q_pine_5', pack: 'quaternius', file: 'Pine_5', scale: 1.25, simplify: 0.1, radius: 2.4 },
  { id: 'q_twisted_1', pack: 'quaternius', file: 'TwistedTree_1', scale: 0.62, simplify: 0.1, radius: 4 },
  { id: 'q_dead_1', pack: 'quaternius', file: 'DeadTree_1', scale: 1.1, simplify: 0.1, radius: 2.2 },
  { id: 'q_dead_3', pack: 'quaternius', file: 'DeadTree_3', scale: 1.1, simplify: 0.1, radius: 2.2 },
  { id: 'q_bush', pack: 'quaternius', file: 'Bush_Common', scale: 1.3, radius: 1.6 },
  { id: 'q_bush_flowers', pack: 'quaternius', file: 'Bush_Common_Flowers', scale: 1.3, radius: 1.6 },
  { id: 'q_fern', pack: 'quaternius', file: 'Fern_1', scale: 0.3, radius: 1.2 },
  { id: 'q_flowers_3', pack: 'quaternius', file: 'Flower_3_Group', scale: 0.6, radius: 0.7 },
  { id: 'q_plant', pack: 'quaternius', file: 'Plant_1_Big', scale: 0.5, radius: 1 },
  { id: 'q_mushroom', pack: 'quaternius', file: 'Mushroom_Common', scale: 3, radius: 0.9 },
  { id: 'q_rock_1', pack: 'quaternius', file: 'Rock_Medium_1', scale: 1, simplify: 0.6, radius: 1.6 },
  { id: 'q_rock_2', pack: 'quaternius', file: 'Rock_Medium_2', scale: 1, simplify: 0.6, radius: 1.6 },
];

/** Textura de origem de cada material do MegaKit (os arquivos chegaram renomeados: ver docs/ASSET_PIPELINE.md). */
export const QUATERNIUS_TEXTURES: Record<string, { file: string; kind: 'bake' | 'foliage' }> = {
  Bark_NormalTree: { file: '3.webp', kind: 'bake' },
  Bark_TwistedTree: { file: '5.webp', kind: 'bake' },
  Bark_DeadTree: { file: '1.webp', kind: 'bake' },
  Rocks: { file: '23.webp', kind: 'bake' },
  PathRocks: { file: '21.webp', kind: 'bake' },
  Mushrooms: { file: '25.webp', kind: 'bake' },
  Grass: { file: '12.png', kind: 'bake' },
  Leaves_NormalTree: { file: '16.png', kind: 'foliage' },
  Leaves_Pine: { file: '14.webp', kind: 'foliage' },
  Leaves_TwistedTree: { file: '19.png', kind: 'foliage' },
  Flowers: { file: '11.png', kind: 'foliage' },
  Leaves: { file: '18.webp', kind: 'foliage' },
};

/** Células do atlas de folhagem (512×512, grade 3×2 de 170 px): material → [coluna, linha]. */
export const FOLIAGE_ATLAS: Record<string, [number, number]> = {
  Leaves_NormalTree: [0, 0], Leaves_Pine: [1, 0], Leaves_TwistedTree: [2, 0], Flowers: [0, 1], Leaves: [1, 1],
};
export const ATLAS_SIZE = 512;
export const ATLAS_COLS = 3;
export const ATLAS_ROWS = 2;
