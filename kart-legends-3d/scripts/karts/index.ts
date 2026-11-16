import type { KartParts } from './assemble';
import { buildBroto } from './broto';
import { buildCometa } from './cometa';
import { buildEngrenagem } from './engrenagem';
import { buildFlecha } from './flecha';
import type { PlateStyle } from './materials';

export interface KartDefinition { id: string; num: number; plate: PlateStyle; build: (plate: string) => KartParts }

export const KART_DEFS: KartDefinition[] = [
  { id: 'flecha', num: 1, plate: { bg: '#f6e2b8', fg: '#b53c1c', ring: '#e2542b' }, build: buildFlecha },
  { id: 'engrenagem', num: 2, plate: { bg: '#3b4a54', fg: '#e3b85a', ring: '#c9953a' }, build: buildEngrenagem },
  { id: 'cometa', num: 3, plate: { bg: '#eef2fb', fg: '#6c5ce7', ring: '#8f99b3' }, build: buildCometa },
  { id: 'broto', num: 4, plate: { bg: '#f3e6c2', fg: '#2f7d3a', ring: '#a06a35' }, build: buildBroto },
];
