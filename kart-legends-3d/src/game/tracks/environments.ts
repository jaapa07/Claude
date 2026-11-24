import type { TrackId } from '@/data/ids';

export type Weather = 'none' | 'snow' | 'sand' | 'leaves' | 'rain' | 'petals' | 'fireflies' | 'embers';

/** Iluminação, céu e clima de cada pista (somente renderização). */
export interface Environment {
  skyTop: string;
  skyHorizon: string;
  skyBottom: string;
  /** Direção de onde vem a luz do sol/lua. */
  sunDir: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  ambientSky: string;
  ambientGround: string;
  ambientIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  stars: number;
  aurora: number;
  clouds: number;
  weather: Weather;
  lightning: boolean;
  exposure: number;
  bloom: number;
  /** Cor da poeira levantada fora da pista. */
  dust: string;
}

const base: Environment = {
  skyTop: '#3d7fd9', skyHorizon: '#bfe3ff', skyBottom: '#e9f4ff', sunDir: [0.5, 0.8, 0.3], sunColor: '#fff3da', sunIntensity: 2.6,
  ambientSky: '#cfe4ff', ambientGround: '#6f6a55', ambientIntensity: 0.95, fogColor: '#cfe6fb', fogNear: 140, fogFar: 620,
  stars: 0, aurora: 0, clouds: 0.5, weather: 'none', lightning: false, exposure: 1, bloom: 0.35, dust: '#b9a98a',
};

export const ENVIRONMENTS: Record<TrackId, Environment> = {
  'porto-lanternas': {
    ...base, skyTop: '#3b3a7a', skyHorizon: '#ff9a5a', skyBottom: '#ffd08a', sunDir: [-0.75, 0.24, -0.55], sunColor: '#ffb070', sunIntensity: 2.7,
    ambientSky: '#b7a0d8', ambientGround: '#7a5a48', ambientIntensity: 0.95, fogColor: '#f0a878', fogNear: 120, fogFar: 640, clouds: 0.7, bloom: 0.55, dust: '#c9b08a',
  },
  'bosque-cristal': {
    ...base, skyTop: '#14365a', skyHorizon: '#3fa890', skyBottom: '#7fd6b4', sunDir: [0.4, 0.75, -0.5], sunColor: '#c9ffe6', sunIntensity: 1.9,
    ambientSky: '#7fe0c8', ambientGround: '#284a3a', ambientIntensity: 1.0, fogColor: '#4fa58e', fogNear: 50, fogFar: 330, stars: 0.3, clouds: 0.3,
    weather: 'fireflies', bloom: 0.75, dust: '#6f7a4f',
  },
  'vale-moinhos': {
    ...base, skyTop: '#2f7fe0', skyHorizon: '#bfe6ff', skyBottom: '#f2fbff', sunDir: [0.55, 0.8, 0.25], sunIntensity: 2.9,
    fogColor: '#cfe9ff', fogNear: 180, fogFar: 760, clouds: 0.8, weather: 'leaves', bloom: 0.3, dust: '#b38a5a',
  },
  'canion-solar': {
    ...base, skyTop: '#2a6fd0', skyHorizon: '#ffd59a', skyBottom: '#ffe9c4', sunDir: [0.2, 0.9, -0.38], sunColor: '#fff0c4', sunIntensity: 3.2,
    ambientSky: '#ffe2b0', ambientGround: '#a8552f', ambientIntensity: 0.9, fogColor: '#f2c48a', fogNear: 110, fogFar: 520, clouds: 0.15,
    weather: 'sand', bloom: 0.4, dust: '#e0b072',
  },
  'cidade-neon': {
    ...base, skyTop: '#05061a', skyHorizon: '#3a1b6b', skyBottom: '#7a2a8a', sunDir: [-0.3, 0.8, 0.5], sunColor: '#9fb4ff', sunIntensity: 0.9,
    ambientSky: '#7a6cff', ambientGround: '#ff3fa4', ambientIntensity: 0.85, fogColor: '#2a1650', fogNear: 60, fogFar: 460, stars: 0.5, clouds: 0.2,
    weather: 'rain', bloom: 1.0, exposure: 1.1, dust: '#8a8fb0',
  },
  'pico-boreal': {
    ...base, skyTop: '#07153a', skyHorizon: '#2b5a8c', skyBottom: '#7fb6d6', sunDir: [0.5, 0.6, 0.6], sunColor: '#cfe6ff', sunIntensity: 1.7,
    ambientSky: '#9fd0ff', ambientGround: '#dfeeff', ambientIntensity: 1.15, fogColor: '#8fb8d8', fogNear: 60, fogFar: 420, stars: 1, aurora: 1, clouds: 0.1,
    weather: 'snow', bloom: 0.6, dust: '#f2f8ff',
  },
  'jardim-celeste': {
    ...base, skyTop: '#4a8fe8', skyHorizon: '#ffd2ea', skyBottom: '#fff1d6', sunDir: [0.6, 0.7, -0.3], sunColor: '#fff2e0', sunIntensity: 2.8,
    ambientSky: '#dfeaff', ambientGround: '#f7c8e0', ambientIntensity: 1.1, fogColor: '#f3dff0', fogNear: 160, fogFar: 700, clouds: 1,
    weather: 'petals', bloom: 0.5, dust: '#cfe8b0',
  },
  'fortaleza-tempestade': {
    ...base, skyTop: '#0b0d1c', skyHorizon: '#2c2f52', skyBottom: '#4a4470', sunDir: [0.3, 0.7, -0.6], sunColor: '#b9c4f8', sunIntensity: 1.9,
    ambientSky: '#99a0e0', ambientGround: '#5b5078', ambientIntensity: 1.5, fogColor: '#2a2c48', fogNear: 60, fogFar: 400, stars: 0, clouds: 1,
    weather: 'rain', lightning: true, bloom: 0.7, exposure: 1.1, dust: '#6f7080',
  },
  'recife-coral': {
    ...base, skyTop: '#1d7fe0', skyHorizon: '#9ff0ff', skyBottom: '#e6fbff', sunDir: [0.45, 0.85, -0.3], sunColor: '#fff6e0', sunIntensity: 3.0,
    ambientSky: '#c8f4ff', ambientGround: '#e8d2a0', ambientIntensity: 1.0, fogColor: '#bdeefa', fogNear: 170, fogFar: 720, clouds: 0.6,
    bloom: 0.35, dust: '#f0dca8',
  },
  'templo-esmeralda': {
    ...base, skyTop: '#2b6f8a', skyHorizon: '#c9e8a8', skyBottom: '#e8f4c8', sunDir: [-0.4, 0.78, 0.48], sunColor: '#fff0c0', sunIntensity: 2.4,
    ambientSky: '#b8e8a0', ambientGround: '#3a5a2a', ambientIntensity: 1.05, fogColor: '#9cc79a', fogNear: 70, fogFar: 420, clouds: 0.7,
    weather: 'leaves', bloom: 0.45, dust: '#8a6a40',
  },
  'vulcao-rubro': {
    ...base, skyTop: '#1a0a12', skyHorizon: '#a8341c', skyBottom: '#ff7a2a', sunDir: [0.35, 0.55, -0.75], sunColor: '#ffb070', sunIntensity: 1.8,
    ambientSky: '#ff9a6a', ambientGround: '#ff4a1a', ambientIntensity: 1.1, fogColor: '#5a1e16', fogNear: 70, fogFar: 460, stars: 0.2, clouds: 0.9,
    weather: 'embers', bloom: 0.9, exposure: 1.05, dust: '#5a4a48',
  },
  'estacao-lunar': {
    ...base, skyTop: '#000004', skyHorizon: '#0d1230', skyBottom: '#1a2040', sunDir: [-0.55, 0.62, 0.55], sunColor: '#f4f6ff', sunIntensity: 2.7,
    ambientSky: '#8a9cff', ambientGround: '#6a6a78', ambientIntensity: 0.9, fogColor: '#0b0f24', fogNear: 160, fogFar: 760, stars: 1, clouds: 0,
    bloom: 0.8, dust: '#b8b8c0',
  },
};

/** Ambiente neutro do menu e das vitrines. */
export const STUDIO_ENVIRONMENT: Environment = {
  ...base, skyTop: '#0d1030', skyHorizon: '#5b2a7a', skyBottom: '#ff8a4c', sunDir: [0.4, 0.8, 0.5], sunColor: '#fff0e0', sunIntensity: 2.4,
  ambientSky: '#b8a8ff', ambientGround: '#ff9a6a', ambientIntensity: 1.0, fogColor: '#3a1e5a', fogNear: 30, fogFar: 160, stars: 0.6, clouds: 0.3, bloom: 0.6,
};
