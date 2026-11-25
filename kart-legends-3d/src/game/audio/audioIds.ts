/**
 * Identificadores e caminhos de todos os arquivos de áudio. Módulo puro (sem DOM nem Vite):
 * é importado tanto pelo jogo quanto por `scripts/build-audio.ts`, que gera exatamente esta lista.
 */

export const MUSIC_IDS = ['menu', 'race_aurora', 'race_eclipse', 'victory', 'defeat'] as const;
export type MusicId = (typeof MUSIC_IDS)[number];

export const AMBIENCE_IDS = ['sea', 'forest', 'meadow', 'desert', 'city', 'blizzard', 'sky', 'storm'] as const;
export type AmbienceId = (typeof AMBIENCE_IDS)[number];

export const SFX_IDS = [
  'ui_move', 'ui_select', 'ui_back', 'ui_error', 'countdown_beep', 'countdown_go', 'finish', 'lap',
  'final_lap', 'collision', 'collision_heavy', 'jump', 'land', 'item_pickup', 'item_roll', 'turbo_1', 'turbo_2',
  'turbo_3', 'boost_pad', 'item_pulso', 'item_bolha', 'item_nevoa', 'item_faisca', 'item_onda', 'item_cristal',
  'shield_break', 'spinout', 'thunder', 'unlock', 'respawn', 'splash',
  'item_raio', 'zap', 'item_cometa', 'comet_ram',
] as const;
/** Efeitos sintetizados por `scripts/build-audio.ts` (um arquivo por id). */
export type SynthSfxId = (typeof SFX_IDS)[number];
/** Efeitos que só existem como gravação de terceiros (sem versão sintetizada). */
export const SAMPLE_ONLY_SFX_IDS = ['purchase'] as const;
export type SfxId = SynthSfxId | (typeof SAMPLE_ONLY_SFX_IDS)[number];

/**
 * Gravações CC0 (Kenney Impact Sounds / Interface Sounds, convertidas por `scripts/build-kits.ts` para
 * `audio/kenney/`). `files` são variações sorteadas a cada disparo. Sem `layer`, a gravação SUBSTITUI o efeito
 * sintetizado; com `layer`, toca junto com ele nesse ganho relativo. `levelOf`: efeito usado como referência
 * de nível (RMS) na conversão.
 */
export interface SampleSfx { files: string[]; layer?: number; levelOf?: SynthSfxId }
const kenney = (...names: string[]): string[] => names.map((n) => `audio/kenney/${n}.ogg`);
export const SAMPLE_SFX: Partial<Record<SfxId, SampleSfx>> = {
  ui_move: { files: kenney('toggle_002') },
  ui_select: { files: kenney('select_002') },
  ui_back: { files: kenney('back_002') },
  ui_error: { files: kenney('error_004') },
  purchase: { files: kenney('confirmation_001'), levelOf: 'ui_select' },
  unlock: { files: kenney('maximize_006'), layer: 0.7 },
  collision: { files: kenney('impactPlate_medium_000', 'impactPlate_medium_001', 'impactPlate_medium_002') },
  collision_heavy: { files: kenney('impactMetal_heavy_000', 'impactMetal_heavy_001', 'impactMetal_heavy_002') },
  land: { files: kenney('impactSoft_heavy_000', 'impactSoft_heavy_002') },
  spinout: { files: kenney('impactPunch_heavy_000', 'impactPunch_heavy_001'), layer: 0.8 },
  shield_break: { files: kenney('impactGlass_medium_000', 'impactGlass_medium_002'), layer: 0.7 },
  comet_ram: { files: kenney('impactMetal_heavy_003'), layer: 0.7 },
};

export const LOOP_IDS = ['drift', 'brake', 'offroad', 'wind_speed', 'drift_sparks'] as const;
export type LoopId = (typeof LOOP_IDS)[number];

/** Músicas que tocam em loop (as demais tocam uma vez). */
export const MUSIC_LOOPS: Record<MusicId, boolean> = {
  menu: true,
  race_aurora: true,
  race_eclipse: true,
  victory: false,
  defeat: false,
};

/** Caminhos relativos a `public/assets/` (use com `assetUrl`). */
export const musicFile = (id: MusicId): string => `audio/music/${id}.ogg`;
export const sfxFile = (id: SynthSfxId): string => `audio/sfx/${id}.ogg`;
/** Arquivos que um efeito usa: as gravações (substituição), ou o sintetizado mais as camadas. */
export const sfxFiles = (id: SfxId): string[] => {
  const s = SAMPLE_SFX[id];
  if (s && s.layer === undefined) return s.files;
  return [...((SFX_IDS as readonly string[]).includes(id) ? [sfxFile(id as SynthSfxId)] : []), ...(s?.files ?? [])];
};
export const loopFile = (id: LoopId): string => `audio/sfx/${id}.ogg`;
export const ambienceFile = (id: AmbienceId): string => `audio/sfx/amb_${id}.ogg`;

/** Todos os arquivos que `audio.preload()` carrega. */
export const ALL_AUDIO_FILES: readonly string[] = [
  ...MUSIC_IDS.map(musicFile),
  ...[...SFX_IDS, ...SAMPLE_ONLY_SFX_IDS].flatMap(sfxFiles),
  ...LOOP_IDS.map(loopFile),
  ...AMBIENCE_IDS.map(ambienceFile),
];
