/**
 * Decoração extra das pistas e arenas com os modelos CC0 (kits/*.glb), gravada à parte da pista em
 * `tracks/<id>.dress.json` / `arenas/<id>.dress.json`. É SÓ visual: sem colisor, fora da faixa de rodagem, longe
 * de atalhos e do cenário existente — malha, colisão, dados de corrida e linha da IA da pista não mudam.
 *
 * Camadas (`tier`): 0 = todas as qualidades, 1 = Média e Alta, 2 = só Alta. A cena desenha só o que a qualidade
 * permite, fundido por material em blocos de terreno (poucas chamadas de desenho).
 */
import type { ArenaId } from '../../src/data/battle';
import type { TrackId } from '../../src/data/ids';
import { rng } from '../lib/geo';
import { SPACING, at } from '../tracks/sample';
import type { TrackContext } from '../tracks/build';
import type { At } from '../tracks/types';
import { KENNEY_MODELS, QUATERNIUS_MODELS } from './catalog';

export type Tier = 0 | 1 | 2;
type Side = 'left' | 'right' | 'both';
type Face = 'road' | 'along' | 'random' | 'away';

interface Common {
  models: string[];
  tier: Tier;
  /** Cor multiplicada (sRGB hex) — encaixa pedras, cactos e folhagem na paleta da pista. */
  tint?: string;
  scale?: [number, number];
  face?: Face;
}
export type Rule = Common & (
  | { kind: 'along'; from: At; to: At; side: Side; every: number; dist: [number, number] }
  /** Lado de fora das curvas mais fechadas (pilhas de pneus, barreiras, bandeiras). */
  | { kind: 'corners'; minCurv: number; every: number; dist: [number, number]; max: number }
  | { kind: 'scatter'; count: number; dist: [number, number] }
);

export interface DressData {
  version: 1;
  /** `kit:id` — kit = 'kenney' (kits/kenney-scenery.glb) ou 'quaternius' (kits/quaternius-nature.glb). */
  models: string[];
  tints: string[];
  /** 8 números por objeto: modelo, x, y, z, rotY, escala, camada, tinta (−1 = sem). */
  items: number[];
}

const RADIUS = new Map([...KENNEY_MODELS, ...QUATERNIUS_MODELS].map((m) => [m.id, m.radius]));
const kitOf = (id: string): string => (id.startsWith('q_') ? 'quaternius' : 'kenney');
const BIG = 2.2;

/* --------------------------------------------------------------- receitas reaproveitadas */

const START_STAND = (side: Side, dist: [number, number] = [9, 12]): Rule[] => [
  { kind: 'along', models: ['k_grandstand', 'k_grandstand_open'], from: 'largada-30', to: 'largada+34', side, every: 13, dist, tier: 0 },
  { kind: 'along', models: ['k_banner_red', 'k_banner_green'], from: 'largada+40', to: 'largada+90', side, every: 22, dist: [4, 7], tier: 1 },
  { kind: 'along', models: ['k_flag_red', 'k_flag_green'], from: 'largada-60', to: 'largada-24', side, every: 9, dist: [1.5, 3], tier: 1, face: 'along' },
  { kind: 'along', models: ['k_light_large'], from: 'largada-80', to: 'largada+90', side, every: 34, dist: [1.2, 2], tier: 2, face: 'along' },
];
const PADDOCK = (side: Side): Rule[] => [
  { kind: 'along', models: ['k_tent', 'k_tent_roof'], from: 'largada-110', to: 'largada-50', side, every: 11, dist: [8, 12], tier: 1 },
  { kind: 'along', models: ['k_cone'], from: 'largada-110', to: 'largada-40', side, every: 7, dist: [3, 6], tier: 2, face: 'random' },
];
const TYRES = (minCurv: number, max: number, dist: [number, number] = [2.5, 4]): Rule[] => [
  { kind: 'corners', models: ['c_tire_stack'], minCurv, every: 5, dist, max: Math.min(4, max), tier: 0, face: 'random' },
  { kind: 'corners', models: ['c_tire_stack'], minCurv, every: 5, dist, max, tier: 1, face: 'random' },
  { kind: 'corners', models: ['k_barrier_red', 'k_barrier_white'], minCurv: minCurv * 0.8, every: 2.6, dist: [dist[0] + 2, dist[1] + 2], max: max * 2, tier: 1, face: 'along' },
];
/**
 * Árvores (folhagem recortada, a parte mais cara): nenhuma na Baixa — lá a pista ganha só pedras/tocos leves
 * (`STONES`) e o GLB da Quaternius nem é baixado —, algumas na Média e a mata cheia só na Alta.
 */
const FOREST = (count: number, models: string[], tint?: string): Rule[] => [
  { kind: 'scatter', models, count: Math.round(count * 0.25), dist: [12, 60], tier: 1, scale: [0.85, 1.3], face: 'random', ...(tint ? { tint } : {}) },
  { kind: 'scatter', models, count: Math.round(count * 0.5), dist: [20, 110], tier: 2, scale: [0.85, 1.3], face: 'random', ...(tint ? { tint } : {}) },
];
/** Marcos leves da Baixa nas pistas de natureza: pedras e tocos da Kenney (poucas dezenas de triângulos cada). */
const STONES = (count: number, tint: string, models = ['n_stone_large_a', 'n_stone_large_c', 'n_stone_tall_g', 'n_stone_small_b']): Rule[] => [
  { kind: 'scatter', models, count, dist: [8, 40], tier: 0, scale: [0.8, 1.4], face: 'random', tint },
];
const UNDERGROWTH = (count: number, models: string[], tint?: string): Rule[] => [
  { kind: 'scatter', models, count: Math.round(count * 0.3), dist: [3, 16], tier: 1, scale: [0.8, 1.3], face: 'random', ...(tint ? { tint } : {}) },
  { kind: 'scatter', models, count: Math.round(count * 0.6), dist: [3, 30], tier: 2, scale: [0.8, 1.3], face: 'random', ...(tint ? { tint } : {}) },
];

export const TRACK_DRESSING: Partial<Record<TrackId, Rule[]>> = {
  'porto-lanternas': [
    { kind: 'along', models: ['n_log_stack'], from: 'cais+5', to: 'cais+70', side: 'both', every: 30, dist: [2, 4], tier: 0, face: 'along' },
    { kind: 'along', models: ['c_delivery', 'c_van', 'c_truck_flat'], from: 'cais+10', to: 'cais+60', side: 'both', every: 24, dist: [3, 6], tier: 0, face: 'along' },
    { kind: 'along', models: ['c_delivery', 'c_van', 'c_truck_flat', 'c_sedan'], from: 'cais-10', to: 'cais+90', side: 'both', every: 14, dist: [3, 6], tier: 1, face: 'along' },
    { kind: 'along', models: ['c_sedan', 'c_hatch', 'c_van'], from: 'feira-30', to: 'arco-10', side: 'both', every: 24, dist: [3, 7], tier: 2, face: 'along' },
    ...FOREST(30, ['q_tree_1', 'q_tree_3', 'q_tree_5']),
    ...UNDERGROWTH(40, ['q_bush_flowers', 'q_flowers_3', 'q_bush']),
  ],
  'bosque-cristal': [
    ...STONES(6, '#8f9a92', ['n_stone_large_a', 'n_stone_small_b', 'n_stump', 'n_log_stack']),
    ...FOREST(70, ['q_tree_1', 'q_tree_3', 'q_tree_5', 'q_pine_1', 'q_pine_3']),
    ...UNDERGROWTH(80, ['q_bush', 'q_fern', 'q_mushroom', 'q_flowers_3', 'q_bush_flowers', 'q_plant']),
    { kind: 'scatter', models: ['q_rock_1', 'q_rock_2', 'n_stump', 'n_log_stack'], count: 14, dist: [4, 30], tier: 1, face: 'random', tint: '#9aa39a' },
  ],
  'vale-moinhos': [
    ...START_STAND('right'),
    ...PADDOCK('left'),
    ...TYRES(0.02, 10),
    ...FOREST(40, ['q_tree_1', 'q_tree_3', 'q_tree_5', 'q_pine_3']),
    ...UNDERGROWTH(50, ['q_bush_flowers', 'q_flowers_3', 'q_bush']),
    { kind: 'scatter', models: ['n_log_stack', 'n_stump'], count: 8, dist: [6, 24], tier: 1, face: 'random' },
  ],
  'canion-solar': [
    ...START_STAND('right'),
    ...PADDOCK('left'),
    ...TYRES(0.022, 10),
    { kind: 'scatter', models: ['n_cactus_tall', 'n_cactus_short'], count: 26, dist: [6, 60], tier: 1, face: 'random', tint: '#7fae5a' },
    { kind: 'scatter', models: ['n_cactus_tall', 'n_cactus_short'], count: 8, dist: [8, 40], tier: 0, face: 'random', tint: '#7fae5a' },
    { kind: 'scatter', models: ['q_dead_1', 'q_dead_3'], count: 12, dist: [12, 70], tier: 1, face: 'random', tint: '#c9a27a' },
    { kind: 'scatter', models: ['n_stone_tall_b', 'n_stone_tall_g', 'n_stone_large_a', 'n_stone_large_c', 'n_cliff_large'], count: 24, dist: [14, 90], tier: 1, face: 'random', tint: '#d39058', scale: [0.9, 1.6] },
    { kind: 'scatter', models: ['n_stone_small_b', 'n_stone_small_f'], count: 30, dist: [3, 30], tier: 2, face: 'random', tint: '#d39058' },
  ],
  'cidade-neon': [
    { kind: 'along', models: ['c_sedan', 'c_taxi', 'c_van', 'c_suv', 'c_hatch'], from: 'largada+40', to: 'largada+140', side: 'both', every: 60, dist: [2.6, 4], tier: 1, face: 'along' },
    { kind: 'along', models: ['c_sedan', 'c_taxi', 'c_van', 'c_suv', 'c_hatch', 'c_police', 'c_delivery'], from: 'largada+60', to: 'largada-60', side: 'both', every: 70, dist: [2.6, 4], tier: 1, face: 'along' },
    { kind: 'along', models: ['c_sedan', 'c_taxi', 'c_van', 'c_suv', 'c_hatch', 'c_police', 'c_delivery'], from: 'largada+90', to: 'largada-90', side: 'both', every: 34, dist: [2.6, 4], tier: 2, face: 'along' },
    { kind: 'along', models: ['k_light_post'], from: 'largada+20', to: 'largada-20', side: 'both', every: 36, dist: [0.9, 1.2], tier: 2, face: 'away' },
    ...START_STAND('left', [4, 6]).slice(0, 2),
    { kind: 'corners', models: ['k_cone'], minCurv: 0.025, every: 3, dist: [1.2, 2.5], max: 20, tier: 2, face: 'random' },
  ],
  'pico-boreal': [
    ...START_STAND('right'),
    ...STONES(5, '#c4d0de'),
    ...TYRES(0.022, 8),
    ...FOREST(60, ['q_pine_1', 'q_pine_3', 'q_pine_5'], '#bcd3cc'),
    { kind: 'scatter', models: ['n_stone_large_a', 'n_stone_large_c', 'n_stone_tall_g', 'q_rock_1'], count: 18, dist: [8, 60], tier: 1, face: 'random', tint: '#c4d0de', scale: [0.8, 1.4] },
    { kind: 'scatter', models: ['n_log_stack', 'n_stump'], count: 8, dist: [6, 26], tier: 2, face: 'random', tint: '#dfe6ee' },
  ],
  'fortaleza-tempestade': [
    ...STONES(6, '#6a6f80', ['n_stone_tall_b', 'n_stone_tall_g', 'n_cliff_large']),
    ...FOREST(26, ['q_dead_1', 'q_dead_3', 'q_twisted_1'], '#7d7f8c'),
    { kind: 'scatter', models: ['n_stone_tall_b', 'n_stone_tall_g', 'n_cliff_large', 'q_rock_1', 'q_rock_2'], count: 22, dist: [10, 80], tier: 1, face: 'random', tint: '#6a6f80', scale: [0.9, 1.6] },
  ],
  'recife-coral': [
    ...STONES(5, '#e0cfa0'),
    ...UNDERGROWTH(40, ['q_bush', 'q_plant', 'q_fern', 'q_bush_flowers'], '#d8f0b0'),
    { kind: 'scatter', models: ['q_rock_1', 'q_rock_2', 'n_stone_large_a'], count: 16, dist: [6, 40], tier: 1, face: 'random', tint: '#e0cfa0' },
  ],
  'templo-esmeralda': [
    ...STONES(6, '#8f9e7c', ['n_stone_large_a', 'n_stone_tall_b', 'n_stump']),
    ...FOREST(50, ['q_twisted_1', 'q_tree_1', 'q_tree_3', 'q_tree_5'], '#b8dca8'),
    ...UNDERGROWTH(80, ['q_fern', 'q_plant', 'q_bush', 'q_mushroom', 'q_flowers_3']),
    { kind: 'scatter', models: ['q_rock_1', 'q_rock_2'], count: 14, dist: [5, 40], tier: 1, face: 'random', tint: '#a8b890' },
  ],
  'vulcao-rubro': [
    ...STONES(6, '#5a4844', ['n_stone_tall_b', 'n_stone_tall_g', 'n_cliff_large']),
    ...FOREST(24, ['q_dead_1', 'q_dead_3'], '#5a4844'),
    { kind: 'scatter', models: ['n_stone_tall_b', 'n_stone_tall_g', 'n_cliff_large', 'n_stone_large_c'], count: 24, dist: [10, 80], tier: 1, face: 'random', tint: '#5a4844', scale: [0.9, 1.6] },
  ],
  'estacao-lunar': [
    { kind: 'along', models: ['k_radar'], from: 'largada+30', to: 'largada+140', side: 'both', every: 50, dist: [8, 14], tier: 0 },
    { kind: 'along', models: ['k_light_large'], from: 'largada-60', to: 'largada+60', side: 'both', every: 30, dist: [1.2, 2], tier: 1, face: 'along' },
    { kind: 'scatter', models: ['n_stone_large_a', 'n_stone_large_c', 'n_stone_small_b', 'n_stone_small_f', 'q_rock_1'], count: 30, dist: [6, 80], tier: 1, face: 'random', tint: '#a8a8b2', scale: [0.8, 1.5] },
  ],
};

/* --------------------------------------------------------------- motor de posicionamento */

class Sink {
  readonly models: string[] = [];
  readonly tints: string[] = [];
  readonly items: number[] = [];
  readonly placed: { x: number; z: number; r: number }[] = [];
  add(id: string, x: number, y: number, z: number, rot: number, scale: number, tier: Tier, tint?: string): void {
    const key = `${kitOf(id)}:${id}`;
    let m = this.models.indexOf(key);
    if (m < 0) { m = this.models.length; this.models.push(key); }
    let t = -1;
    if (tint) { t = this.tints.indexOf(tint); if (t < 0) { t = this.tints.length; this.tints.push(tint); } }
    const r2 = (v: number): number => Math.round(v * 100) / 100;
    this.items.push(m, r2(x), r2(y), r2(z), Math.round(rot * 1000) / 1000, r2(scale), tier, t);
    this.placed.push({ x, z, r: (RADIUS.get(id) ?? 1) * scale });
  }
  data(): DressData { return { version: 1, models: this.models, tints: this.tints, items: this.items }; }
}

export function dressTrack(ctx: TrackContext, rules: Rule[], seed: number): { data: DressData; skipped: number } {
  const { main, index, def } = ctx;
  const sink = new Sink();
  const rand = rng(seed);
  let skipped = 0;
  const n = main.n;
  const pick = (list: string[]): string => list[Math.floor(rand() * list.length)]!;
  const free = (x: number, z: number, r: number): boolean =>
    ctx.placed.every((q) => (q.x - x) ** 2 + (q.z - z) ** 2 > ((q.r + r) * 0.9) ** 2)
    && sink.placed.every((q) => (q.x - x) ** 2 + (q.z - z) ** 2 > ((q.r + r) * 0.9) ** 2);

  /** Coloca se couber: fora da pista e dos atalhos, sem encostar em nada, acima da água. */
  const tryPlace = (rule: Rule, id: string, x: number, z: number, i: number, walled: boolean): boolean => {
    const scale = rule.scale ? rule.scale[0] + rand() * (rule.scale[1] - rule.scale[0]) : 1;
    const r = (RADIUS.get(id) ?? 1) * scale;
    // grandes e sem muro na frente: longe o bastante para não ficarem no caminho de quem corta por fora
    const clear = walled ? 0.8 : r > BIG ? 6 : 0.6;
    if (index.edgeDistance(x, z) < r + clear) { skipped++; return false; }
    if (!free(x, z, r)) { skipped++; return false; }
    const y = main.bridge[i] ? main.pos[i]!.y : ctx.groundY(x, z, main.pos[i]!.y);
    if (def.waterY !== undefined && y < def.waterY + 0.3) { skipped++; return false; }
    const p = main.pos[i]!;
    const face = rule.face ?? 'road';
    const rot = face === 'random' ? rand() * Math.PI * 2 : face === 'along' ? main.heading[i]! + (rand() < 0.5 ? 0 : Math.PI)
      : face === 'away' ? Math.atan2(x - p.x, z - p.z) : Math.atan2(p.x - x, p.z - z);
    sink.add(id, x, y - 0.05, z, rot, scale, rule.tier, rule.tint);
    return true;
  };
  const lateral = (i: number, sgn: number, dist: [number, number], id: string): [number, number] => {
    const lat = sgn * (main.halfWidth[i]! + 1.6 + dist[0] + rand() * (dist[1] - dist[0]) + (RADIUS.get(id) ?? 1));
    const p = main.pos[i]!, s = main.side[i]!;
    return [p.x + s.x * lat, p.z + s.z * lat];
  };
  const walledOn = (i: number, sgn: number): boolean => !!(main.wall[i]! & (sgn > 0 ? 1 : 2));

  if (ctx.voidTrack) return { data: sink.data(), skipped };
  for (const rule of rules) {
    if (rule.kind === 'along') {
      const a = at(main, rule.from);
      let b = at(main, rule.to);
      if (b <= a) b += n;
      for (const sgn of rule.side === 'both' ? [1, -1] : rule.side === 'left' ? [1] : [-1]) {
        for (let d = rand() * rule.every * 0.5; a * SPACING + d < b * SPACING; d += rule.every * (0.85 + rand() * 0.3)) {
          const i = Math.floor(a + d / SPACING) % n;
          const id = pick(rule.models);
          const [x, z] = lateral(i, sgn, rule.dist, id);
          tryPlace(rule, id, x, z, i, walledOn(i, sgn));
        }
      }
    } else if (rule.kind === 'corners') {
      let count = 0;
      const step = Math.max(1, Math.round(rule.every / SPACING));
      const start = Math.floor(rand() * step);
      for (let i = start; i < n && count < rule.max; i += step) {
        const c = main.curvature[i]!;
        if (Math.abs(c) < rule.minCurv || main.bridge[i] || main.gap[i]) continue;
        const sgn = c > 0 ? -1 : 1; // lado de fora da curva
        const id = pick(rule.models);
        const [x, z] = lateral(i, sgn, rule.dist, id);
        if (tryPlace(rule, id, x, z, i, walledOn(i, sgn))) count++;
      }
    } else {
      let lo = Infinity, hi = -Infinity, lz = Infinity, hz = -Infinity;
      for (const p of main.pos) { lo = Math.min(lo, p.x); hi = Math.max(hi, p.x); lz = Math.min(lz, p.z); hz = Math.max(hz, p.z); }
      let done = 0, tries = 0;
      while (done < rule.count && tries++ < rule.count * 80) {
        const x = lo - 120 + rand() * (hi - lo + 240), z = lz - 120 + rand() * (hz - lz + 240);
        const ed = index.edgeDistance(x, z, 160);
        if (ed < rule.dist[0] || ed > rule.dist[1]) continue;
        let best = 0, bd = Infinity;
        for (let i = 0; i < n; i += 3) { const p = main.pos[i]!; const dd = (p.x - x) ** 2 + (p.z - z) ** 2; if (dd < bd) { bd = dd; best = i; } }
        if (tryPlace(rule, pick(rule.models), x, z, best, false)) done++;
      }
    }
  }
  return { data: sink.data(), skipped };
}

/* --------------------------------------------------------------- arenas */

export interface ArenaDressRule { models: string[]; count: number; r: [number, number]; tier: Tier; tint?: string; scale?: [number, number]; face?: 'center' | 'random' }

export const ARENA_DRESSING: Record<ArenaId, ArenaDressRule[]> = {
  'praca-coreto': [
    { models: ['c_sedan', 'c_taxi', 'c_van'], count: 2, r: [76, 92], tier: 0, face: 'random' },
    { models: ['q_tree_1', 'q_tree_3', 'q_tree_5'], count: 12, r: [74, 108], tier: 1, scale: [1, 1.3], face: 'random' },
    { models: ['c_sedan', 'c_taxi', 'c_van', 'c_hatch'], count: 4, r: [76, 96], tier: 1, face: 'random' },
    { models: ['q_bush_flowers', 'q_flowers_3', 'q_bush'], count: 24, r: [70, 100], tier: 2, face: 'random' },
  ],
  'cratera-lunar': [
    { models: ['k_radar'], count: 3, r: [72, 96], tier: 0, face: 'center' },
    { models: ['k_light_large'], count: 4, r: [68, 80], tier: 1, face: 'center' },
    { models: ['n_stone_large_a', 'n_stone_large_c', 'n_stone_tall_g', 'q_rock_1'], count: 22, r: [68, 108], tier: 1, tint: '#a8a8b2', scale: [0.8, 1.6], face: 'random' },
  ],
};

export function dressArena(rules: ArenaDressRule[], seed: number, groundY: (x: number, z: number) => number, occupied: { x: number; z: number; r: number }[]): DressData {
  const sink = new Sink();
  const rand = rng(seed);
  for (const rule of rules) {
    let done = 0, tries = 0;
    while (done < rule.count && tries++ < rule.count * 80) {
      const a = rand() * Math.PI * 2, d = rule.r[0] + rand() * (rule.r[1] - rule.r[0]);
      const x = Math.sin(a) * d, z = Math.cos(a) * d;
      const id = rule.models[Math.floor(rand() * rule.models.length)]!;
      const scale = rule.scale ? rule.scale[0] + rand() * (rule.scale[1] - rule.scale[0]) : 1;
      const r = (RADIUS.get(id) ?? 1) * scale;
      const hit = (q: { x: number; z: number; r: number }): boolean => (q.x - x) ** 2 + (q.z - z) ** 2 < ((q.r + r) * 0.9) ** 2;
      if (occupied.some(hit) || sink.placed.some(hit)) continue;
      const rot = rule.face === 'center' ? Math.atan2(-x, -z) : rand() * Math.PI * 2;
      sink.add(id, x, groundY(x, z) - 0.05, z, rot, scale, rule.tier, rule.tint);
      done++;
    }
  }
  return sink.data();
}
