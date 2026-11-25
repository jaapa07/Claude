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
export type SfxId = (typeof SFX_IDS)[number];

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
export const sfxFile = (id: SfxId): string => `audio/sfx/${id}.ogg`;
export const loopFile = (id: LoopId): string => `audio/sfx/${id}.ogg`;
export const ambienceFile = (id: AmbienceId): string => `audio/sfx/amb_${id}.ogg`;

/** Todos os arquivos que `audio.preload()` carrega. */
export const ALL_AUDIO_FILES: readonly string[] = [
  ...MUSIC_IDS.map(musicFile),
  ...SFX_IDS.map(sfxFile),
  ...LOOP_IDS.map(loopFile),
  ...AMBIENCE_IDS.map(ambienceFile),
];
