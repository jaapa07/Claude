/** Biblioteca completa de objetos de cenário (todas as pistas) usada pelo construtor de pistas. */
import { BOREAL_PROPS } from './boreal';
import { BOSQUE_PROPS } from './bosque';
import { CANION_PROPS } from './canion';
import { CELESTE_PROPS } from './celeste';
import { CORRIDA_PROPS } from './corrida';
import { FORTALEZA_PROPS } from './fortaleza';
import { NEON_PROPS } from './neon';
import { OBSTACULO_PROPS } from './obstaculos';
import { PORTO_PROPS } from './porto';
import { registerAuroraTextures } from './textures-aurora';
import { registerEclipseTextures } from './textures-eclipse';
import type { PropLibrary } from './types';
import { VALE_PROPS } from './vale';

const libs: PropLibrary[] = [PORTO_PROPS, BOSQUE_PROPS, VALE_PROPS, CANION_PROPS, CORRIDA_PROPS, NEON_PROPS, BOREAL_PROPS, CELESTE_PROPS, FORTALEZA_PROPS, OBSTACULO_PROPS];

export const ALL_PROPS: PropLibrary = {};
for (const lib of libs) {
  for (const [id, def] of Object.entries(lib)) {
    if (ALL_PROPS[id]) throw new Error(`Objeto de cenário duplicado entre bibliotecas: ${id}`);
    ALL_PROPS[id] = def;
  }
}

export const OBSTACLE_IDS = Object.keys(OBSTACULO_PROPS);

export async function registerPropTextures(): Promise<void> {
  await registerAuroraTextures();
  await registerEclipseTextures();
}
