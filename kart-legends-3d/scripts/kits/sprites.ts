/**
 * Sprites do Particle Pack da Kenney (CC0) no atlas `kits/kenney-particles.webp`, na ordem das células (4×4).
 * O jogo usa os índices 16..31 (`SPRITE.k*` em src/game/vfx/particles.ts) para estas células.
 */
export const KENNEY_SPRITES = [
  'smoke_04', 'smoke_07', 'dirt_02', 'fire_01',
  'flame_05', 'muzzle_02', 'star_06', 'star_08',
  'star_09', 'circle_02', 'light_01', 'spark_02',
  'scorch_02', 'trace_04', 'twirl_01', 'magic_03',
] as const;
