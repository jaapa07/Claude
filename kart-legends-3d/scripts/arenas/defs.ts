/** As arenas de batalha, autoradas à mão. */
import { arbusto, balizaBorda, banco, chafariz, coreto } from './props';
import type { ArenaDef, XZ } from './types';

const TAU = Math.PI * 2;
const ring = (r: number, n: number, a0 = 0): XZ[] => Array.from({ length: n }, (_, k) => {
  const a = a0 + (k / n) * TAU;
  return [Math.round(Math.sin(a) * r * 100) / 100, Math.round(Math.cos(a) * r * 100) / 100];
});
const smooth = (t: number): number => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };

/* ====================== Praça do Coreto ====================== */

const OCT: XZ[] = [[-46, -60], [46, -60], [60, -46], [60, 46], [46, 60], [-46, 60], [-60, 46], [-60, -46]];
const TERRACES: { x: number; z: number; ramps: ('n' | 's' | 'e' | 'w')[] }[] = [
  { x: 36, z: 36, ramps: ['w', 's'] }, { x: -36, z: 36, ramps: ['e', 's'] },
  { x: 36, z: -36, ramps: ['w', 'n'] }, { x: -36, z: -36, ramps: ['e', 'n'] },
];
const CORETO_PILLARS = Array.from({ length: 8 }, (_, i): [number, number, number, number] => {
  const a = (i / 8) * TAU + Math.PI / 8;
  return [Math.cos(a) * 5, Math.sin(a) * 5, 0.3, 4.2];
});

export const PRACA_CORETO: ArenaDef = {
  id: 'praca-coreto', seed: 4101, center: [0, 0], radius: 56, killY: -20,
  ground: {
    min: -112, max: 112, cell: 4, height: () => 0, material: 'road_cobble', tile: 5,
    colors: ['#d9b896', '#d9b896', '#d9b896', '#b89878'],
  },
  decals: [
    { kind: 'disc', x: 0, z: 0, r: 57, mat: 'road_flagstone', tile: 4.5, color: '#ffe6c8' },
    { kind: 'ring', x: 0, z: 0, r0: 5.8, r1: 12, mat: 'road_marble', tile: 6, color: '#f6efe4' },
    { kind: 'ring', x: 0, z: 0, r0: 21, r1: 27, mat: 'road_cobble', tile: 4, color: '#e3c3a3' },
    ...[45, 135, 225, 315].map((d): ArenaDef['decals'][number] => {
      const a = (d * Math.PI) / 180;
      return { kind: 'disc', x: Math.round(Math.sin(a) * 17 * 100) / 100, z: Math.round(Math.cos(a) * 17 * 100) / 100, r: 3.4, mat: 'road_grass', tile: 4, color: '#bfe3a0' };
    }),
  ],
  walls: [{ pts: OCT, closed: true, height: 6, thick: 0.8, style: 'balustrade' }],
  platforms: TERRACES.map((t) => ({
    x: t.x, z: t.z, hx: 8, hz: 8, rotY: 0, height: 2.4, top: 'road_grass', side: 'wall_stone', tile: 3,
    ramps: t.ramps, rampWidth: 7, rampLength: 10,
  })),
  props: [
    ...[45, 135, 225, 315].map((d) => { const a = (d * Math.PI) / 180; return { id: 'arvore-campo', x: Math.sin(a) * 17, z: Math.cos(a) * 17, scale: 1.3 }; }),
    // árvores nos cantos externos de três canteiros (o quarto tem o coreto)
    { id: 'arvore-campo', x: 41.5, z: 41.5, scale: 1.1 }, { id: 'arvore-campo', x: -41.5, z: 41.5, scale: 1.1 }, { id: 'arvore-campo', x: 41.5, z: -41.5, scale: 1.1 },
    { id: 'banca-mercado', x: -53, z: 14, rotY: 'center' }, { id: 'banca-mercado', x: 53, z: -14, rotY: 'center' },
    { id: 'banca-mercado', x: 14, z: 53, rotY: 'center' },
    // casario em volta da praça (fora do muro)
    ...[-34, -17, 0, 17, 34].flatMap((u, k) => [
      { id: k % 2 ? 'casa-porto-torre' : 'casa-porto', x: u, z: 73, rotY: 'center' as const, collide: false },
      { id: k % 2 ? 'casa-porto' : 'casa-porto-torre', x: u, z: -73, rotY: 'center' as const, collide: false },
      { id: k % 2 ? 'casa-porto-torre' : 'casa-porto', x: 73, z: u, rotY: 'center' as const, collide: false },
      { id: k % 2 ? 'casa-porto' : 'casa-porto-torre', x: -73, z: u, rotY: 'center' as const, collide: false },
    ]),
    ...([[64, 64], [-64, 64], [64, -64], [-64, -64], [76, 58], [58, 76], [-76, 58], [-58, 76], [76, -58], [58, -76], [-76, -58], [-58, -76]] as XZ[])
      .map(([x, z]) => ({ id: 'arvore-campo', x, z, scale: 1.4, collide: false })),
    ...([[66, 30], [-66, -30], [30, -66], [-30, 66]] as XZ[]).map(([x, z]) => ({ id: 'lanterna-poste', x, z, collide: false })),
  ],
  custom: [
    { name: 'chafariz', build: chafariz, x: 0, z: 0, colliders: [[0, 0, 5.45, 1.8]] },
    { name: 'coreto', build: () => coreto(), x: -36, z: -36, colliders: CORETO_PILLARS },
    ...([[38, 38], [-38, 38], [38, -38]] as XZ[]).map(([x, z]) => ({ name: 'arbusto', build: arbusto, x: x + Math.sign(x) * 2.5, z: z - Math.sign(z) * 4, colliders: [[0, 0, 0.9, 1.4]] as [number, number, number, number][] })),
    ...([[-25, 57], [25, 57], [-25, -57], [25, -57], [57, 25], [57, -25], [-57, 25], [-57, -25]] as XZ[]).map(([x, z]) => ({
      name: 'banco', build: () => banco(), x, z, rotY: Math.atan2(-x, -z), colliders: [[0, 0, 1.0, 1.0]] as [number, number, number, number][],
    })),
  ],
  boostPads: [0, 90, 180, 270].map((d): [number, number, number] => {
    const a = (d * Math.PI) / 180;
    return [Math.sin(a) * 24, Math.cos(a) * 24, a + Math.PI / 2];
  }),
  itemBoxes: [
    ...[45, 135, 225, 315].map((d): XZ => { const a = (d * Math.PI) / 180; return [Math.sin(a) * 10.5, Math.cos(a) * 10.5]; }),
    [46, 0], [-46, 0], [0, 46], [0, -46],
    ...TERRACES.map((t): XZ => [t.x, t.z]),
  ],
  spawnRadius: 46,
  crownSpawns: [[0, -14], [14, 0], [-14, 0], [0, 14], [-36, -36]],
  crystals: { r0: 7, r1: 56, step: 7 },
  intro: [
    { pos: [70, 30, 70], target: [0, 2, 0] },
    { pos: [-30, 12, -8], target: [-36, 4, -36] },
    { pos: [0, 9, 34], target: [0, 2, 0] },
  ],
  outline: OCT,
};

/* ====================== Cratera Lunar ====================== */

const CRATERS: [number, number, number, number][] = [[26, -16, 7, 1.0], [-24, 22, 7.5, 1.1], [-28, -20, 6.5, 0.9], [16, 31, 6, 0.8]];

function craterHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  let h: number;
  if (r < 46) h = 0;
  else if (r < 60) h = 7 * smooth((r - 46) / 14);
  else if (r < 66) h = 7 + 1.5 * smooth((r - 60) / 6);
  else if (r < 82) h = 8.5 - 4.5 * smooth((r - 66) / 16);
  else h = 4 + Math.sin(x * 0.05) * Math.cos(z * 0.04) * 3;
  for (const [cx, cz, cr, depth] of CRATERS) {
    const d = Math.hypot(x - cx, z - cz);
    if (d < cr) h -= depth * (1 - (d / cr) ** 2);
    h += 0.45 * Math.exp(-(((d - cr) / 1.6) ** 2));
  }
  if (r < 46) h += 0.1 * Math.sin(x * 0.31) * Math.sin(z * 0.27);
  return h;
}

export const CRATERA_LUNAR: ArenaDef = {
  id: 'cratera-lunar', seed: 4202, center: [0, 0], radius: 50, killY: -25,
  ground: {
    min: -112, max: 112, cell: 2.5, height: craterHeight, material: 'terr_regolith', tile: 10,
    colors: ['#8b8c97', '#a6a7b1', '#c6c7cf', '#74757f'],
  },
  decals: [
    { kind: 'ring', x: 0, z: 0, r0: 45.4, r1: 46.2, mat: 'glow_cyan', tile: 4 },
    { kind: 'ring', x: 0, z: 0, r0: 36, r1: 40, mat: 'road_plate', tile: 6, color: '#c9ccd8' },
  ],
  walls: [{ pts: ring(62, 32), closed: true, height: 6, thick: 1, style: 'none' }],
  platforms: [{
    x: 0, z: 0, hx: 9, hz: 9, rotY: Math.PI / 4, height: 2.6, top: 'road_plate', side: 'wall_metal', tile: 4,
    ramps: ['n', 's', 'e', 'w'], rampWidth: 9, rampLength: 10,
  }],
  props: [
    ...[30, 90, 150, 210, 270, 330].map((d) => { const a = (d * Math.PI) / 180; return { id: 'rocha-lunar', x: Math.sin(a) * 29, z: Math.cos(a) * 29, scale: 2.4 }; }),
    // base lunar além da borda
    ...[0, 40, 80, 120, 160, 200, 240, 280, 320].map((d, k) => {
      const a = ((d + 12) * Math.PI) / 180;
      const ids = ['cupula', 'modulo-lunar', 'antena-radar', 'painel-solar', 'caixa-carga', 'cupula', 'painel-solar', 'modulo-lunar', 'antena-radar'];
      return { id: ids[k]!, x: Math.sin(a) * 76, z: Math.cos(a) * 76, rotY: 'center' as const, collide: false };
    }),
    { id: 'foguete', x: -70, z: -92, collide: false },
    { id: 'planeta', x: -260, z: -330, dy: 170, collide: false },
  ],
  custom: ring(63.5, 16).map(([x, z]) => ({ name: 'baliza', build: () => balizaBorda(), x, z })),
  boostPads: [0, 90, 180, 270].map((d): [number, number, number] => {
    const a = (d * Math.PI) / 180;
    return [Math.sin(a) * 38, Math.cos(a) * 38, a - Math.PI / 2];
  }),
  itemBoxes: [
    [24, 0], [-24, 0], [0, 24], [0, -24],
    ...[45, 135, 225, 315].map((d): XZ => { const a = (d * Math.PI) / 180; return [Math.sin(a) * 43, Math.cos(a) * 43]; }),
    [0, 0],
  ],
  spawnRadius: 44,
  crownSpawns: [[0, 0], [0, 32], [32, 0], [0, -32], [-32, 0]],
  crystals: { r0: 0, r1: 49, step: 7 },
  intro: [
    { pos: [0, 40, 95], target: [0, 0, 0] },
    { pos: [30, 8, 20], target: [0, 3, 0] },
    { pos: [-40, 14, -40], target: [0, 2, 0] },
  ],
  outline: ring(62, 32),
};

export const ARENA_DEFS: ArenaDef[] = [PRACA_CORETO, CRATERA_LUNAR];
