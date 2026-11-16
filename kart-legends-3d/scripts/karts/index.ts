import type { KartParts } from './assemble';
import { buildBroto } from './broto';
import { buildCometa } from './cometa';
import { buildDuna } from './duna';
import { buildEngrenagem } from './engrenagem';
import { buildFaisca } from './faisca';
import { buildFlecha } from './flecha';
import { buildGeada } from './geada';
import { buildMare } from './mare';
import type { PlateStyle } from './materials';

export interface KartDefinition { id: string; num: number; plate: PlateStyle; build: (plate: string) => KartParts }

export const KART_DEFS: KartDefinition[] = [
  { id: 'flecha', num: 1, plate: { bg: '#f6e2b8', fg: '#b53c1c', ring: '#e2542b' }, build: buildFlecha },
  { id: 'engrenagem', num: 2, plate: { bg: '#3b4a54', fg: '#e3b85a', ring: '#c9953a' }, build: buildEngrenagem },
  { id: 'cometa', num: 3, plate: { bg: '#eef2fb', fg: '#6c5ce7', ring: '#8f99b3' }, build: buildCometa },
  { id: 'broto', num: 4, plate: { bg: '#f3e6c2', fg: '#2f7d3a', ring: '#a06a35' }, build: buildBroto },
  { id: 'faisca', num: 5, plate: { bg: '#ffd23f', fg: '#a8222f', ring: '#e23b4e' }, build: buildFaisca },
  { id: 'mare', num: 6, plate: { bg: '#f3ead7', fg: '#156a94', ring: '#d1a64a' }, build: buildMare },
  { id: 'duna', num: 7, plate: { bg: '#efc56a', fg: '#4f2512', ring: '#7a3b1e' }, build: buildDuna },
  { id: 'geada', num: 8, plate: { bg: '#27364a', fg: '#b8ecfa', ring: '#58c7e8' }, build: buildGeada },
];
