import type { SurfaceParams } from '../game/physics';

export interface PlayerDef {
  id: string;
  name: string;
  short: string;
  country: string;
  flag: string; // emoji-free: 3 colour stripes for the HUD flag
  flagColors: [string, string, string];
  style: string;
  body: 'm' | 'f';
  hair: string | null;
  beard?: boolean;
  skin: 'light' | 'dark';
  skinTint: string;
  hairColor: string;
  shirt: string;
  shirtAccent: string;
  shorts: string;
  shoes: string;
  socks: string;
  headband?: string;
  racket: string;
  sponsor: number; // index into sponsor atlas for chest logo
  stats: { power: number; speed: number; serve: number; volley: number; technique: number };
  catchphrase: string;
  unlock?: string;
}

export const PLAYERS: PlayerDef[] = [
  { id: 'rafa', name: 'Rafa Montenegro', short: 'MONTENEGRO', country: 'BRASIL', flag: 'BRA', flagColors: ['#009c3b', '#ffdf00', '#002776'], style: 'Baseliner agressivo', body: 'm', hair: 'hair_simpleparted', skin: 'light', skinTint: '#e9c09a', hairColor: '#2b1a10', shirt: '#ffd400', shirtAccent: '#0a7d32', shorts: '#0b3a8c', shoes: '#ffffff', socks: '#ffffff', headband: '#0a7d32', racket: '#d0102a', sponsor: 0, stats: { power: 85, speed: 75, serve: 70, volley: 55, technique: 80 }, catchphrase: 'Vamos com tudo!' },
  { id: 'kenji', name: 'Kenji Arakawa', short: 'ARAKAWA', country: 'JAPÃO', flag: 'JPN', flagColors: ['#ffffff', '#bc002d', '#ffffff'], style: 'Contra-atacante', body: 'm', hair: 'hair_buzzed', skin: 'light', skinTint: '#f0cfa4', hairColor: '#111111', shirt: '#ffffff', shirtAccent: '#bc002d', shorts: '#1a1a1a', shoes: '#f2f2f2', socks: '#ffffff', racket: '#222222', sponsor: 2, stats: { power: 65, speed: 92, serve: 60, volley: 65, technique: 85 }, catchphrase: 'Cada bola volta.' },
  { id: 'lukas', name: 'Lukas Brenner', short: 'BRENNER', country: 'ALEMANHA', flag: 'GER', flagColors: ['#000000', '#dd0000', '#ffce00'], style: 'Sacador-voleador', body: 'm', hair: 'hair_simpleparted', skin: 'light', skinTint: '#f2d2b6', hairColor: '#c9a15a', shirt: '#1d1d1d', shirtAccent: '#ff5a1f', shorts: '#2a2a2a', shoes: '#ff5a1f', socks: '#ffffff', racket: '#ff5a1f', sponsor: 0, stats: { power: 80, speed: 65, serve: 92, volley: 88, technique: 60 }, catchphrase: 'Saque e rede. Simples.' },
  { id: 'dmitri', name: 'Dmitri Volkov', short: 'VOLKOV', country: 'CROÁCIA', flag: 'CRO', flagColors: ['#ff0000', '#ffffff', '#171796'], style: 'Big server', body: 'm', hair: 'hair_buzzed', beard: true, skin: 'light', skinTint: '#efcdb0', hairColor: '#3a2a1a', shirt: '#c8102e', shirtAccent: '#ffffff', shorts: '#ffffff', shoes: '#1a1a1a', socks: '#c8102e', racket: '#ffffff', sponsor: 4, stats: { power: 90, speed: 60, serve: 95, volley: 60, technique: 60 }, catchphrase: 'Dois saques. Dois pontos.' },
  { id: 'mateo', name: 'Mateo Ruiz', short: 'RUIZ', country: 'ARGENTINA', flag: 'ARG', flagColors: ['#74acdf', '#ffffff', '#74acdf'], style: 'Saibro / top spin', body: 'm', hair: 'hair_long', headband: '#74acdf', skin: 'light', skinTint: '#d9a77c', hairColor: '#1a120c', shirt: '#74acdf', shirtAccent: '#f6b40e', shorts: '#ffffff', shoes: '#ffffff', socks: '#ffffff', racket: '#f6b40e', sponsor: 3, stats: { power: 75, speed: 80, serve: 65, volley: 55, technique: 88 }, catchphrase: 'O saibro é minha casa.' },
  { id: 'amara', name: 'Amara Okafor', short: 'OKAFOR', country: 'NIGÉRIA', flag: 'NGA', flagColors: ['#008751', '#ffffff', '#008751'], style: 'All-round', body: 'f', hair: 'hair_buns', skin: 'dark', skinTint: '#7a4a2c', hairColor: '#0c0806', shirt: '#008751', shirtAccent: '#ffffff', shorts: '#ffffff', shoes: '#ffffff', socks: '#008751', racket: '#008751', sponsor: 1, stats: { power: 78, speed: 82, serve: 75, volley: 75, technique: 75 }, catchphrase: 'Sem pontos fracos.' },
  { id: 'liam', name: "Liam O'Hare", short: "O'HARE", country: 'IRLANDA', flag: 'IRL', flagColors: ['#169b62', '#ffffff', '#ff883e'], style: 'Voleador', body: 'm', hair: 'hair_simpleparted', skin: 'light', skinTint: '#f6d7c3', hairColor: '#a33a12', shirt: '#169b62', shirtAccent: '#ff883e', shorts: '#169b62', shoes: '#ffffff', socks: '#ffffff', racket: '#169b62', sponsor: 5, stats: { power: 65, speed: 78, serve: 72, volley: 92, technique: 70 }, catchphrase: 'Te espero na rede.' },
  { id: 'sofia', name: 'Sofia Lindqvist', short: 'LINDQVIST', country: 'SUÉCIA', flag: 'SWE', flagColors: ['#006aa7', '#fecc00', '#006aa7'], style: 'Defensiva', body: 'f', hair: 'hair_long', skin: 'light', skinTint: '#f5d9c4', hairColor: '#e2c27a', shirt: '#006aa7', shirtAccent: '#fecc00', shorts: '#fecc00', shoes: '#ffffff', socks: '#ffffff', headband: '#fecc00', racket: '#006aa7', sponsor: 1, stats: { power: 60, speed: 90, serve: 60, volley: 60, technique: 90 }, catchphrase: 'Paciência vence.' },
  { id: 'muro', name: '"El Muro"', short: 'EL MURO', country: '???', flag: '???', flagColors: ['#111111', '#f5c542', '#111111'], style: 'Chefe final', body: 'm', hair: null, beard: true, skin: 'dark', skinTint: '#5a3620', hairColor: '#0a0a0a', shirt: '#111111', shirtAccent: '#f5c542', shorts: '#111111', shoes: '#f5c542', socks: '#111111', headband: '#f5c542', racket: '#f5c542', sponsor: 2, stats: { power: 92, speed: 92, serve: 90, volley: 85, technique: 92 }, catchphrase: 'Ninguém passa.', unlock: 'Vença o modo Arcade' },
];

export interface VenueDef {
  id: 'harbor' | 'clay' | 'lawn' | 'neon';
  name: string;
  city: string;
  surfaceName: string;
  hdri: string;
  envIntensity: number;
  bgIntensity: number;
  sun: { color: string; intensity: number; dir: [number, number, number] };
  surface: SurfaceParams & { tex: string; tint: string; outTint: string; repeat: number; rough: number; lineTint: string };
  wall: string;
  wallAccent: string;
  standColor: string;
  seatColors: string[];
  exposure: number;
  fog?: string;
  music: string;
  indoor?: boolean;
}

export const VENUES: VenueDef[] = [
  {
    id: 'harbor', name: 'HARBOR OPEN', city: 'Porto Azul', surfaceName: 'Quadra dura', hdri: 'harbor', envIntensity: 0.9, bgIntensity: 1, exposure: 0.95,
    sun: { color: '#fff4e0', intensity: 3.2, dir: [-0.45, 1, 0.35] },
    surface: { tex: 'hard', tint: '#2c6fb8', outTint: '#2d8a5a', repeat: 10, rough: 0.75, lineTint: '#ffffff', restitution: 0.76, friction: 0.74, spinKick: 0.1 },
    wall: '#0b4f7a', wallAccent: '#0aa2c0', standColor: '#d9dde2', seatColors: ['#0aa2c0', '#0b4f7a', '#e6eef2'], music: 'music_match',
  },
  {
    id: 'clay', name: 'TERRE ROUGE CUP', city: 'Vale Rubro', surfaceName: 'Saibro', hdri: 'clay', envIntensity: 0.8, bgIntensity: 0.9, exposure: 0.9,
    sun: { color: '#ffd9a8', intensity: 3.0, dir: [0.6, 0.62, -0.3] },
    surface: { tex: 'clay', tint: '#d4683a', outTint: '#c86034', repeat: 8, rough: 0.95, lineTint: '#f2ede4', restitution: 0.82, friction: 0.62, spinKick: 0.16 },
    wall: '#1d5a3a', wallAccent: '#d9622b', standColor: '#cfc7b8', seatColors: ['#1d5a3a', '#2f7a4f', '#e8e0d0'], music: 'music_match',
  },
  {
    id: 'lawn', name: 'ROYAL LAWN CLASSIC', city: 'Bramblewood', surfaceName: 'Grama', hdri: 'lawn', envIntensity: 1.0, bgIntensity: 0.9, exposure: 1.0,
    sun: { color: '#f2f4ff', intensity: 1.6, dir: [-0.2, 1, 0.5] },
    surface: { tex: 'grass', tint: '#5f9a3a', outTint: '#5f9a3a', repeat: 9, rough: 0.9, lineTint: '#ffffff', restitution: 0.68, friction: 0.83, spinKick: 0.05 },
    wall: '#203d2a', wallAccent: '#5b2a6e', standColor: '#c9cdc4', seatColors: ['#2c5a3a', '#5b2a6e', '#e8e8e0'], music: 'music_match',
  },
  {
    id: 'neon', name: 'NEON ARENA FINALS', city: 'Cidade Néon', surfaceName: 'Carpete (indoor)', hdri: 'neon', envIntensity: 0.55, bgIntensity: 0.25, exposure: 0.85, indoor: true,
    sun: { color: '#e8f0ff', intensity: 2.2, dir: [0.1, 1, 0.15] },
    surface: { tex: 'carpet', tint: '#22306e', outTint: '#541a6e', repeat: 12, rough: 0.85, lineTint: '#ffffff', restitution: 0.72, friction: 0.8, spinKick: 0.06 },
    wall: '#0a0a24', wallAccent: '#ff2bd6', standColor: '#262640', seatColors: ['#ff2bd6', '#3ff7ff', '#2a2a55'], music: 'music_match', fog: '#0a0820',
  },
];

export const DIFFICULTY = {
  easy: { name: 'Fácil', reaction: 0.32, error: 1.6, aggression: 0.25, speed: 0.82, miss: 0.16 },
  normal: { name: 'Normal', reaction: 0.2, error: 1.0, aggression: 0.5, speed: 0.95, miss: 0.09 },
  hard: { name: 'Difícil', reaction: 0.1, error: 0.55, aggression: 0.75, speed: 1.05, miss: 0.055 },
  boss: { name: 'Chefe', reaction: 0.05, error: 0.35, aggression: 0.85, speed: 1.12, miss: 0.035 },
};
export type DifficultyId = keyof typeof DIFFICULTY;

export const SPONSOR_NAMES = ['VOLTA', 'NIMBUS', 'KAIRO', 'PULSE', 'ARDENT', 'LUMEN'];
