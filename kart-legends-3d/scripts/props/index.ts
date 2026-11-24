/** Biblioteca completa de objetos de cenário (todas as pistas) usada pelo construtor de pistas. */
import { BOREAL_PROPS } from './boreal';
import { BOSQUE_PROPS } from './bosque';
import { CANION_PROPS } from './canion';
import { CELESTE_PROPS } from './celeste';
import { CORRIDA_PROPS } from './corrida';
import { FORTALEZA_PROPS } from './fortaleza';
import { LUNAR_PROPS } from './lunar';
import { NEON_PROPS } from './neon';
import { OBSTACULO_PROPS } from './obstaculos';
import { METEORO_OBSTACULOS } from './obstaculos-meteoro';
import { PORTO_PROPS } from './porto';
import { RECIFE_PROPS } from './recife';
import { TEMPLO_PROPS } from './templo';
import { registerAuroraTextures } from './textures-aurora';
import { registerEclipseTextures } from './textures-eclipse';
import { registerMeteoroTextures } from './textures-meteoro';
import type { PropLibrary } from './types';
import { VALE_PROPS } from './vale';
import { VULCAO_PROPS } from './vulcao';

const libs: PropLibrary[] = [
  PORTO_PROPS, BOSQUE_PROPS, VALE_PROPS, CANION_PROPS, CORRIDA_PROPS, NEON_PROPS, BOREAL_PROPS, CELESTE_PROPS, FORTALEZA_PROPS, OBSTACULO_PROPS,
  RECIFE_PROPS, TEMPLO_PROPS, VULCAO_PROPS, LUNAR_PROPS, METEORO_OBSTACULOS,
];

export const ALL_PROPS: PropLibrary = {};
for (const lib of libs) {
  for (const [id, def] of Object.entries(lib)) {
    if (ALL_PROPS[id]) throw new Error(`Objeto de cenário duplicado entre bibliotecas: ${id}`);
    ALL_PROPS[id] = def;
  }
}

export const OBSTACLE_IDS = [...Object.keys(OBSTACULO_PROPS), ...Object.keys(METEORO_OBSTACULOS)];

export async function registerPropTextures(): Promise<void> {
  await registerAuroraTextures();
  await registerEclipseTextures();
  await registerMeteoroTextures();
}
