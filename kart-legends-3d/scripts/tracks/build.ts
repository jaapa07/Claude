/**
 * Construtor de pistas: traçado autorado (TrackDef) → malha GLB acabada + dados de corrida (JSON).
 * A malha é dividida em setores para frustum culling; o cenário estático é fundido por material.
 */
import * as THREE from 'three';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GlbBuilder } from '../lib/glb';
import { Model, box, col, matrixOf, rng, type ColorLike } from '../lib/geo';
import { ASSETS_DIR } from '../lib/textures';
import { SURFACES, type AnimatedPropData, type TrackData } from '../../src/game/tracks/trackTypes';
import type { PropLibrary } from '../props/types';
import { SPACING, at, racingLine, samplePath, toPathSamples, type Sampled } from './sample';
import { RoadIndex, buildTerrain, terrainTiles, type Terrain } from './terrain';
import type { CP, TrackDef } from './types';

const SECTOR = 48;

/** Acumulador de quadriláteros com normais e cores explícitas. */
class Acc {
  pos: number[] = []; nor: number[] = []; uv: number[] = []; color: number[] = [];
  quad(p: THREE.Vector3[], n: THREE.Vector3 | THREE.Vector3[], uv: [number, number][], c: THREE.Color | THREE.Color[]): void {
    for (const k of [0, 1, 2, 0, 2, 3]) {
      const nn = Array.isArray(n) ? n[k]! : n;
      const cc = Array.isArray(c) ? c[k]! : c;
      this.pos.push(p[k]!.x, p[k]!.y, p[k]!.z);
      this.nor.push(nn.x, nn.y, nn.z);
      this.uv.push(uv[k]![0], uv[k]![1]);
      this.color.push(cc.r, cc.g, cc.b);
    }
  }
  get empty(): boolean { return this.pos.length === 0; }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.color, 3));
    return g;
  }
}

class Sector {
  private readonly accs = new Map<string, Acc>();
  readonly props = new Model();
  acc(mat: string): Acc {
    let a = this.accs.get(mat);
    if (!a) { a = new Acc(); this.accs.set(mat, a); }
    return a;
  }
  model(): Model {
    const m = new Model();
    for (const [mat, a] of this.accs) if (!a.empty) m.parts.push({ geo: a.geometry(), mat });
    return m;
  }
}

const P = (s: Sampled, i: number, lat: number, h = 0): THREE.Vector3 =>
  s.pos[i]!.clone().addScaledVector(s.side[i]!, lat).addScaledVector(s.up[i]!, h);

interface Stop { lat: (i: number) => number; h: number; u: number; shade: number }

/** Faixa contínua entre duas linhas laterais, voltada para cima quando `a` está à esquerda de `b`. */
function strip(acc: Acc, s: Sampled, i: number, j: number, a: Stop, b: Stop, v0: number, v1: number, tint: THREE.Color, normal?: (k: number) => THREE.Vector3): void {
  const pts = [P(s, i, a.lat(i), a.h), P(s, i, b.lat(i), b.h), P(s, j, b.lat(j), b.h), P(s, j, a.lat(j), a.h)];
  const n = normal ? [normal(i), normal(i), normal(j), normal(j)] : new THREE.Vector3().crossVectors(pts[1]!.clone().sub(pts[0]!), pts[3]!.clone().sub(pts[0]!)).normalize();
  const ca = tint.clone().multiplyScalar(a.shade), cb = tint.clone().multiplyScalar(b.shade);
  acc.quad(pts, n, [[a.u, v0], [b.u, v0], [b.u, v1], [a.u, v1]], [ca, cb, cb, ca]);
}

export interface BuildOptions { props: PropLibrary | null; outDir?: string }
export interface BuildReport { id: string; length: number; samples: number; triangles: number; glbBytes: number; jsonBytes: number; props: number; animated: number; colliders: number; warnings: string[] }

export async function buildTrack(def: TrackDef, opts: BuildOptions): Promise<BuildReport> {
  const warnings: string[] = [];
  const rand = rng(def.seed);
  const main = samplePath(def.points, true);
  const n = main.n;
  const next = (i: number): number => (i + 1) % n;

  /* ---------- atalhos ---------- */
  const shortcuts = (def.shortcuts ?? []).map((sc) => {
    const from = at(main, sc.from), to = at(main, sc.to);
    const a = P(main, from, sc.fromOffset ?? 0), b = P(main, to, sc.toOffset ?? 0);
    const first = sc.points[0]!;
    const pts: CP[] = [{ ...first, x: a.x, y: a.y, z: a.z, tag: undefined }, ...sc.points, { x: b.x, y: b.y, z: b.z }];
    return { def: sc, from, to, path: samplePath(pts, false) };
  });
  // nas entradas e saídas de atalho não pode haver muro na pista principal
  for (const sc of shortcuts) for (const j of [sc.from, sc.to]) for (let d = -10; d <= 10; d++) main.wall[(((j + d) % n) + n) % n] = 0;
  const allPaths = [main, ...shortcuts.map((s) => s.path)];
  const index = new RoadIndex(allPaths);

  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const s of allPaths) for (const p of s.pos) {
    bounds.minX = Math.min(bounds.minX, p.x); bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.minZ = Math.min(bounds.minZ, p.z); bounds.maxZ = Math.max(bounds.maxZ, p.z);
    bounds.minY = Math.min(bounds.minY, p.y); bounds.maxY = Math.max(bounds.maxY, p.y);
  }
  const terrain: Terrain | null = buildTerrain(def, allPaths, index, bounds);
  const groundY = (x: number, z: number, fallback: number): number => (terrain ? terrain.heightAt(x, z) : fallback);

  const sectors: Sector[] = Array.from({ length: Math.ceil(n / SECTOR) }, () => new Sector());
  const sectorOf = (i: number): Sector => sectors[Math.min(sectors.length - 1, Math.floor(i / SECTOR))]!;
  const nearestMain = (x: number, z: number): number => {
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i += 2) { const p = main.pos[i]!; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  };

  const white = col('#ffffff');
  const styleOf = (surface: string): string => def.roadStyle[surface as keyof typeof def.roadStyle] ?? surface;
  const paved = (surface: string): boolean => ['asphalt', 'wet', 'marble', 'flagstone', 'cobble'].includes(styleOf(surface));
  const voidTrack = def.terrain === null;

  const pillarColliders: number[] = [];

  /* ---------- pista, marcações, muros, pontes ---------- */
  const roadOf = (s: Sampled, sec: (i: number) => Sector, closed: boolean, isMain: boolean): void => {
    const last = closed ? s.n : s.n - 1;
    let dist = 0;
    for (let i = 0; i < last; i++) {
      const j = closed ? (i + 1) % s.n : i + 1;
      const v0 = dist / 16, v1 = (dist + SPACING) / 16;
      dist += SPACING;
      if (s.gap[i]) continue;
      const S = sec(i);
      const hw = (k: number): number => s.halfWidth[k]!;
      const upN = (k: number): THREE.Vector3 => s.up[k]!;
      const mat = `road_${s.style[i] || styleOf(s.surface[i]!)}`;
      const u = (lat: number): number => (hw(i) - lat) / 16;
      const edge = 1.1;
      const stops: Stop[] = [
        { lat: (k) => hw(k) + 1.5, h: 0, u: u(hw(i) + 1.5), shade: 0.72 },
        { lat: (k) => hw(k) - edge, h: 0, u: u(hw(i) - edge), shade: 1 },
        { lat: (k) => -hw(k) + edge, h: 0, u: u(-hw(i) + edge), shade: 1 },
        { lat: (k) => -hw(k) - 1.5, h: 0, u: u(-hw(i) - 1.5), shade: 0.72 },
      ];
      for (let q = 0; q < 3; q++) strip(S.acc(mat), s, i, j, stops[q]!, stops[q + 1]!, v0, v1, white, upN);

      const elevated = s.bridge[i]! || voidTrack;
      const depth = elevated ? 1.4 : 0.9;
      const dark = col('#3a3532');
      // laterais do leito
      for (const sgn of [1, -1]) {
        const top: Stop = { lat: (k) => sgn * (hw(k) + 1.5), h: 0, u: 0, shade: 0.9 };
        const bot: Stop = { lat: (k) => sgn * (hw(k) + 1.5), h: -depth, u: 0.25, shade: 0.5 };
        const wallMat = `wall_${def.wallStyle === 'neon' ? 'stone' : def.wallStyle}`;
        if (sgn > 0) strip(S.acc(wallMat), s, i, j, bot, top, v0 * 4, v1 * 4, elevated ? white : dark);
        else strip(S.acc(wallMat), s, i, j, top, bot, v0 * 4, v1 * 4, elevated ? white : dark);
      }
      if (elevated) {
        const l: Stop = { lat: (k) => hw(k) + 1.5, h: -depth, u: 0, shade: 0.45 };
        const r: Stop = { lat: (k) => -hw(k) - 1.5, h: -depth, u: 1, shade: 0.45 };
        strip(S.acc(`wall_${def.wallStyle === 'neon' ? 'stone' : def.wallStyle}`), s, i, j, r, l, v0 * 4, v1 * 4, white);
      }

      // marcações
      if (paved(s.surface[i]!) && isMain) {
        const lineColor = def.wallStyle === 'neon' ? col('#ffe14d') : col('#f3efe6');
        for (const sgn of [1, -1]) {
          const a: Stop = { lat: (k) => sgn * (hw(k) - 0.35), h: 0.035, u: 0, shade: 1 };
          const b: Stop = { lat: (k) => sgn * (hw(k) - 0.62), h: 0.035, u: 0, shade: 1 };
          if (sgn > 0) strip(S.acc('mark'), s, i, j, a, b, 0, 0, lineColor, upN); else strip(S.acc('mark'), s, i, j, b, a, 0, 0, lineColor, upN);
        }
        if (i % 6 < 3 && hw(i) > 6) {
          strip(S.acc('mark'), s, i, j, { lat: () => 0.14, h: 0.035, u: 0, shade: 1 }, { lat: () => -0.14, h: 0.035, u: 0, shade: 1 }, 0, 0, lineColor, upN);
        }
      }
      // zebras nas curvas
      if (isMain && Math.abs(s.curvature[i]!) > 0.013 && s.surface[i] !== 'dirt' && s.surface[i] !== 'sand') {
        const c = Math.floor(i / 2) % 2 ? col('#e63b2e') : col('#f5f1e8');
        for (const sgn of [1, -1]) {
          const a: Stop = { lat: (k) => sgn * (hw(k) + 1.45), h: 0.05, u: 0, shade: 1 };
          const b: Stop = { lat: (k) => sgn * (hw(k) + 0.1), h: 0.05, u: 0, shade: 1 };
          if (sgn > 0) strip(S.acc('mark'), s, i, j, a, b, 0, 0, c, upN); else strip(S.acc('mark'), s, i, j, b, a, 0, 0, c, upN);
        }
      }
      // muros
      const H = def.wallHeight ?? 1.3;
      for (const [bit, sgn] of [[1, 1], [2, -1]] as const) {
        if (!isMain || !(s.wall[i]! & bit)) continue;
        const wm = `wall_${def.wallStyle}`;
        const inner0: Stop = { lat: (k) => sgn * (hw(k) + 0.55), h: 0, u: 0, shade: 0.8 };
        const inner1: Stop = { lat: (k) => sgn * (hw(k) + 0.55), h: H, u: H / 4, shade: 1 };
        const outer1: Stop = { lat: (k) => sgn * (hw(k) + 1.25), h: H, u: H / 4 + 0.2, shade: 0.95 };
        const outer0: Stop = { lat: (k) => sgn * (hw(k) + 1.25), h: -depth, u: H / 2 + 0.6, shade: 0.6 };
        const seq = sgn > 0 ? [[inner1, inner0], [outer1, inner1], [outer0, outer1]] : [[inner0, inner1], [inner1, outer1], [outer1, outer0]];
        for (const [a, b] of seq) strip(S.acc(wm), s, i, j, a!, b!, v0 * 4, v1 * 4, white);
      }
      // pilares de ponte
      if (isMain && s.bridge[i] && !voidTrack && i % 12 === 0) {
        const p = s.pos[i]!;
        const base = Math.min(groundY(p.x, p.z, p.y - 30), def.waterY !== undefined ? def.waterY - 4 : Infinity, p.y - 3);
        const h = p.y - depth - base;
        if (h > 1.5) {
          for (const sgn of [1, -1]) {
            const c = P(s, i, sgn * Math.max(0, hw(i) - 1.2), -depth - h / 2);
            if (index.edgeDistanceBelow(c.x, c.z, p.y) < 3) continue;
            pillarColliders.push(c.x, base, c.z, 1.4, h);
            S.props.add(box(2.2, h, 2.2, 0.25), `wall_${def.wallStyle === 'neon' ? 'stone' : def.wallStyle}`, '#d9d2c5', { p: [c.x, c.y, c.z], r: [0, s.heading[i]!, 0] });
          }
        }
      }
    }
  };
  roadOf(main, sectorOf, true, true);
  for (const sc of shortcuts) roadOf(sc.path, (i) => sectorOf(nearestMain(sc.path.pos[i]!.x, sc.path.pos[i]!.z)), false, false);

  // linha de largada/chegada
  for (let i = 0; i < 2; i++) {
    const hw = main.halfWidth[i]!;
    const a: Stop = { lat: () => hw, h: 0.045, u: 0, shade: 1 };
    const b: Stop = { lat: () => -hw, h: 0.045, u: hw, shade: 1 };
    strip(sectorOf(i).acc('checker'), main, i, i + 1, a, b, i, i + 1, white, (k) => main.up[k]!);
  }

  /* ---------- cenário ---------- */
  const placed: { x: number; z: number; r: number }[] = [];
  const platforms: { x: number; z: number; r: number }[] = [];
  const propColliders: number[] = [...pillarColliders];
  const animatedProps: AnimatedPropData[] = [];
  const animatedModels = new Map<string, Model>();
  let propCount = 0;
  const lib = opts.props;
  const getProp = (id: string) => {
    const p = lib![id];
    if (!p) throw new Error(`[${def.id}] objeto de cenário desconhecido: ${id}`);
    return p;
  };
  const place = (id: string, x: number, y: number, z: number, rotY: number, scale: number, span?: number, noCollide = false, isPlatform = false): void => {
    const prop = getProp(id);
    const seed = Math.floor(rand() * 1e9);
    const model = prop.build(rng(seed), span);
    const m = matrixOf({ p: [x, y, z], r: [0, rotY, 0], s: scale });
    sectorOf(nearestMain(x, z)).props.addModel(model, m);
    propCount++;
    if (prop.collider && !noCollide && span === undefined) {
      propColliders.push(x, y, z, prop.collider.radius * scale, prop.collider.height * scale);
    }
    if (span !== undefined) {
      // pilares dos objetos que cruzam a pista
      for (const sgn of [1, -1]) {
        const off = new THREE.Vector3(sgn * (span / 2 + 0.9), 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
        propColliders.push(x + off.x, y, z + off.z, 0.9, 6);
      }
    }
    if (prop.animated) {
      if (!animatedModels.has(id)) animatedModels.set(id, prop.animated.build(rng(def.seed + 77)));
      const pv = new THREE.Vector3(...prop.animated.pivot).multiplyScalar(scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      animatedProps.push({ model: id, pos: [x + pv.x, y + pv.y, z + pv.z], rotY, scale, motion: prop.animated.motion });
    }
    if (!isPlatform) placed.push({ x, z, r: prop.radius * scale });
  };
  const free = (x: number, z: number, r: number): boolean => placed.every((q) => (q.x - x) ** 2 + (q.z - z) ** 2 > (q.r + r) ** 2 * 0.8);
  const pick = (p: string | string[]): string => (Array.isArray(p) ? p[Math.floor(rand() * p.length)]! : p);

  if (lib) {
    for (const sp of def.singles) {
      const i = at(main, sp.at);
      const prop = getProp(sp.prop);
      if (sp.over) {
        const span = main.halfWidth[i]! * 2 + 4.5;
        const p = main.pos[i]!;
        place(sp.prop, p.x, p.y + (sp.dy ?? 0), p.z, main.heading[i]! + (sp.rotY ?? 0), sp.scale ?? 1, span);
      } else {
        const p = P(main, i, sp.offset ?? 0);
        const onRoad = Math.abs(sp.offset ?? 0) < main.halfWidth[i]! + 1.5;
        const y = (onRoad || sp.platform ? main.pos[i]!.y : groundY(p.x, p.z, p.y)) + (sp.dy ?? 0);
        const toRoad = Math.atan2(main.pos[i]!.x - p.x, main.pos[i]!.z - p.z);
        place(sp.prop, p.x, y, p.z, sp.rotY !== undefined ? main.heading[i]! + sp.rotY : toRoad, sp.scale ?? 1, undefined, !!sp.platform, !!sp.platform);
        if (sp.platform) {
          propColliders.push(p.x, y - 3, p.z, prop.radius * (sp.scale ?? 1) * 0.9, 3);
          platforms.push({ x: p.x, z: p.z, r: prop.radius * (sp.scale ?? 1) * 0.85 });
        }
      }
    }
    for (const rule of def.scenery) {
      const a = at(main, rule.from);
      let b = at(main, rule.to);
      if (b <= a) b += n;
      const sides = rule.side === 'both' ? [1, -1] : rule.side === 'left' ? [1] : [-1];
      for (const sgn of sides) {
        let d = rand() * rule.every;
        while (a * SPACING + d < b * SPACING) {
          const i = Math.floor(a + d / SPACING) % n;
          d += rule.every * (0.75 + rand() * 0.5);
          const id = pick(rule.prop);
          const prop = getProp(id);
          const scale = rule.scale ? rule.scale[0] + rand() * (rule.scale[1] - rule.scale[0]) : 1;
          const lat = sgn * (main.halfWidth[i]! + 1.6 + rule.dist[0] + rand() * (rule.dist[1] - rule.dist[0]) + prop.radius * scale);
          const p = P(main, i, lat);
          const r = prop.radius * scale;
          if (index.edgeDistance(p.x, p.z) < r + 1.4) continue;
          if (!free(p.x, p.z, r)) continue;
          if (voidTrack && rule.dist[0] >= 0 && !platforms.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < q.r - r * 0.5)) continue;
          const y = main.bridge[i] || voidTrack ? main.pos[i]!.y : groundY(p.x, p.z, main.pos[i]!.y);
          if (def.waterY !== undefined && y < def.waterY - 0.3 && !main.bridge[i]) continue;
          const face = rule.face ?? 'road';
          const rot = face === 'random' ? rand() * Math.PI * 2 : face === 'along' ? main.heading[i]! : Math.atan2(main.pos[i]!.x - p.x, main.pos[i]!.z - p.z);
          place(id, p.x, y - 0.05, p.z, rot, scale, undefined, rule.noCollide);
        }
      }
    }
    for (const rule of def.scatter ?? []) {
      let tries = 0, done = 0;
      while (done < rule.count && tries++ < rule.count * 60) {
        const x = bounds.minX - 140 + rand() * (bounds.maxX - bounds.minX + 280);
        const z = bounds.minZ - 140 + rand() * (bounds.maxZ - bounds.minZ + 280);
        const d = index.edgeDistance(x, z, 240);
        if (d < rule.dist[0] || d > rule.dist[1]) continue;
        const id = pick(rule.prop);
        const prop = getProp(id);
        const scale = rule.scale ? rule.scale[0] + rand() * (rule.scale[1] - rule.scale[0]) : 1;
        if (!free(x, z, prop.radius * scale)) continue;
        const y = rule.y ? rule.y[0] + rand() * (rule.y[1] - rule.y[0]) : groundY(x, z, 0) - 0.1;
        if (!rule.y && def.waterY !== undefined && y < def.waterY - 0.3) continue;
        place(id, x, y, z, rand() * Math.PI * 2, scale, undefined, true);
        done++;
      }
      if (done < rule.count) warnings.push(`scatter ${String(rule.prop)}: ${done}/${rule.count} colocados`);
    }
  }

  /* ---------- dados de corrida ---------- */
  const { line, speed } = racingLine(main);
  const v3 = (v: THREE.Vector3): [number, number, number] => [Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100, Math.round(v.z * 100) / 100];
  const grid = Array.from({ length: 8 }, (_, k) => {
    const back = 7 + k * 3.6;
    const i = (((n - Math.round(back / SPACING)) % n) + n) % n;
    return { pos: v3(P(main, i, k % 2 === 0 ? 3 : -3)), heading: main.heading[i]! };
  });
  const itemRows = def.items.map((ref) => {
    const i = at(main, ref);
    const hw = main.halfWidth[i]!;
    const fr = hw >= 7 ? [-0.66, -0.33, 0, 0.33, 0.66] : hw >= 5 ? [-0.6, 0, 0.6] : [-0.4, 0.4];
    return { index: i, offsets: fr.map((f) => Math.round(f * hw * 10) / 10) };
  });
  const boostPads = (def.boostPads ?? []).map((b) => {
    const i = at(main, b.at);
    return { index: i, offset: b.offset ?? 0, pos: v3(P(main, i, b.offset ?? 0, 0.03)), heading: main.heading[i]! };
  });
  const ramps = (def.ramps ?? []).map((r) => {
    const i = at(main, r.at);
    return { index: i, pos: v3(P(main, i, r.offset ?? 0)), heading: main.heading[i]!, width: r.width ?? Math.min(main.halfWidth[i]! * 2 - 1, 11), length: r.length ?? 7, height: r.height ?? 1.6 };
  });
  const obstacles = (def.obstacles ?? []).map((o) => {
    const i = at(main, o.at);
    return { id: o.id, kind: o.kind, model: o.model, a: v3(P(main, i, o.from, o.y ?? 0)), b: v3(P(main, i, o.to, o.y ?? 0)), period: o.period, phase: o.phase ?? 0, radius: o.radius, index: i };
  });
  const minimapPts: number[] = [];
  for (let i = 0; i < n; i += 3) minimapPts.push(Math.round(main.pos[i]!.x * 10) / 10, Math.round(main.pos[i]!.z * 10) / 10);
  const data: TrackData = {
    id: def.id, length: n * SPACING, spacing: SPACING, count: n,
    main: toPathSamples(main),
    offroad: SURFACES.indexOf(def.offroad),
    wall: main.wall, wallHeight: def.wallHeight ?? 1.3,
    killY: Math.min(bounds.minY, terrain ? Math.min(...terrain.heights) : bounds.minY) - 28,
    checkpoints: Array.from({ length: 12 }, (_, k) => Math.round((k * n) / 12)),
    grid,
    racingLine: line.map((x) => Math.round(x * 100) / 100),
    speedHint: speed.map((x) => Math.round(x * 1000) / 1000),
    shortcuts: shortcuts.map((sc) => ({ id: sc.def.id, from: sc.from, to: sc.to, samples: toPathSamples(sc.path), length: sc.path.n * SPACING, risky: !!sc.def.risky })),
    itemRows, boostPads, ramps, obstacles,
    terrain: terrain?.data ?? null,
    propColliders: propColliders.map((x) => Math.round(x * 100) / 100),
    animatedProps,
    waterY: def.waterY ?? null,
    introCamera: def.intro.map((c) => {
      const i = at(main, c.at), j = at(main, c.lookAt);
      const pos = main.pos[i]!.clone().addScaledVector(main.side[i]!, c.offset[0]).add(new THREE.Vector3(0, c.offset[1], 0)).addScaledVector(main.tan[i]!, c.offset[2]);
      return { pos: v3(pos), target: v3(main.pos[j]!.clone().add(new THREE.Vector3(0, 1.2, 0))) };
    }),
    minimap: { points: minimapPts, minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ },
  };

  /* ---------- exportação ---------- */
  const b = new GlbBuilder();
  let triangles = 0;
  sectors.forEach((sec, k) => {
    const road = sec.model();
    if (road.parts.length) { triangles += road.triangleCount(); b.node(`sec${k}_road`, { mesh: b.mesh(`sec${k}_road`, road) }); }
    if (sec.props.parts.length) { triangles += sec.props.triangleCount(); b.node(`sec${k}_props`, { mesh: b.mesh(`sec${k}_props`, sec.props) }); }
  });
  if (terrain) {
    terrainTiles(def, terrain).forEach((g, k) => {
      const m = new Model();
      m.parts.push({ geo: g.toNonIndexed(), mat: def.terrain!.material });
      triangles += m.triangleCount();
      b.node(`terrain${k}`, { mesh: b.mesh(`terrain${k}`, m) });
    });
  }
  if (def.waterY !== undefined) {
    const acc = new Acc();
    const m = 900, y = def.waterY;
    const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minZ + bounds.maxZ) / 2;
    const c: ColorLike = '#ffffff';
    acc.quad(
      [new THREE.Vector3(cx - m, y, cz - m), new THREE.Vector3(cx - m, y, cz + m), new THREE.Vector3(cx + m, y, cz + m), new THREE.Vector3(cx + m, y, cz - m)],
      new THREE.Vector3(0, 1, 0), [[0, 0], [0, m / 10], [m / 10, m / 10], [m / 10, 0]], col(c));
    const wm = new Model();
    wm.parts.push({ geo: acc.geometry(), mat: 'water' });
    b.node('water', { mesh: b.mesh('water', wm) });
  }
  const outDir = opts.outDir ?? path.join(ASSETS_DIR, 'tracks');
  const glbBytes = await b.save(path.join(outDir, `${def.id}.glb`));
  const json = JSON.stringify(data);
  await writeFile(path.join(outDir, `${def.id}.json`), json);
  for (const [id, model] of animatedModels) {
    const ab = new GlbBuilder();
    ab.node(id, { mesh: ab.mesh(id, model) });
    await ab.save(path.join(ASSETS_DIR, 'props', `${id}.glb`));
  }
  return { id: def.id, length: n * SPACING, samples: n, triangles: Math.round(triangles), glbBytes, jsonBytes: json.length, props: propCount, animated: animatedProps.length, colliders: propColliders.length / 5, warnings };
}
