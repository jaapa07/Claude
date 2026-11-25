/**
 * Construtor de arenas de batalha: ArenaDef → public/assets/arenas/<id>.glb (malha) + <id>.json (dados da simulação).
 * Colisores por primitivas (chão em grade de alturas, caixas, cilindros e cunhas de rampa); visual fundido por material.
 */
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import type { ArenaData, ArenaPlatform, V3 } from '../../src/game/battle/arenaTypes';
import type { AnimatedPropData, RampData } from '../../src/game/tracks/trackTypes';
import { GlbBuilder } from '../lib/glb';
import { Model, box, col, matrixOf, mix, rng, xf } from '../lib/geo';
import { ASSETS_DIR, fbm } from '../lib/textures';
import { uvBox } from '../props/kit-eclipse';
import type { PropLibrary } from '../props/types';
import { balaustrada } from './props';
import type { ArenaDef, Side } from './types';

export interface ArenaReport { id: string; triangles: number; glbBytes: number; jsonBytes: number; props: number; colliders: number; crystals: number }

const r2 = (v: number): number => Math.round(v * 100) / 100;
const v3 = (x: number, y: number, z: number): V3 => [r2(x), r2(y), r2(z)];

/** Eixo local (lx, lz) girado por rotY → mundo (mesma convenção do three.js e do Rapier). */
const rot = (lx: number, lz: number, a: number): [number, number] => [lx * Math.cos(a) + lz * Math.sin(a), -lx * Math.sin(a) + lz * Math.cos(a)];

/** Faixa de triângulos com UV em metros e cor de vértice. */
class Tris {
  pos: number[] = []; nor: number[] = []; uv: number[] = []; color: number[] = [];
  push(p: THREE.Vector3, n: THREE.Vector3, tile: number, c: THREE.Color): void {
    this.pos.push(p.x, p.y, p.z); this.nor.push(n.x, n.y, n.z); this.uv.push(p.x / tile, p.z / tile); this.color.push(c.r, c.g, c.b);
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.color, 3));
    return g;
  }
}

export async function buildArena(def: ArenaDef, lib: PropLibrary): Promise<ArenaReport> {
  const rand = rng(def.seed);
  const G = def.ground;
  const [cx, cz] = def.center;

  /* ---------- chão ---------- */
  const nx = Math.round((G.max - G.min) / G.cell) + 1;
  const heights = new Float32Array(nx * nx);
  for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) heights[j * nx + i] = Math.round(G.height(G.min + i * G.cell, G.min + j * G.cell) * 100) / 100;
  const i16 = new Int16Array(heights.length);
  heights.forEach((h, i) => { i16[i] = Math.round(h * 100); });
  const ground = { minX: G.min, minZ: G.min, cell: G.cell, nx, nz: nx, heights: Buffer.from(i16.buffer).toString('base64') };
  const hAt = (x: number, z: number): number => {
    const fx = Math.max(0, Math.min(nx - 1.001, (x - G.min) / G.cell)), fz = Math.max(0, Math.min(nx - 1.001, (z - G.min) / G.cell));
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const a = heights[j * nx + i]!, b = heights[j * nx + i + 1]!, c = heights[(j + 1) * nx + i]!, d = heights[(j + 1) * nx + i + 1]!;
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  const inPlat = (p: ArenaDef['platforms'][number], x: number, z: number, margin = 0): boolean => {
    const [lx, lz] = rot(x - p.x, z - p.z, -p.rotY);
    return Math.abs(lx) <= p.hx + margin && Math.abs(lz) <= p.hz + margin;
  };
  const supportY = (x: number, z: number): number => {
    let y = hAt(x, z);
    for (const p of def.platforms) if (inPlat(p, x, z)) y = Math.max(y, p.height);
    return y;
  };

  const floor = new Model();
  {
    let hmin = Infinity, hmax = -Infinity;
    for (const h of heights) { hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); }
    const [low, mid, high, cliff] = G.colors.map((c) => col(c)) as [THREE.Color, THREE.Color, THREE.Color, THREE.Color];
    const T = 16;
    const hv = (i: number, j: number): number => heights[Math.min(nx - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))]!;
    for (let tj = 0; tj < nx - 1; tj += T) for (let ti = 0; ti < nx - 1; ti += T) {
      const t = new Tris();
      const vert = (gi: number, gj: number): [THREE.Vector3, THREE.Vector3, THREE.Color] => {
        const x = G.min + gi * G.cell, z = G.min + gj * G.cell, y = hv(gi, gj);
        const n = new THREE.Vector3(hv(gi - 1, gj) - hv(gi + 1, gj), 2 * G.cell, hv(gi, gj - 1) - hv(gi, gj + 1)).normalize();
        const hh = (y - hmin) / (hmax - hmin || 1);
        let c = hh < 0.45 ? mix(low, mid, hh / 0.45) : mix(mid, high, (hh - 0.45) / 0.55);
        c = mix(c, cliff, Math.min(1, Math.max(0, (1 - n.y - 0.06) * 5)));
        c = c.clone().multiplyScalar(0.88 + fbm(x / 40, z / 40, 64, 3, def.seed + 3) * 0.24);
        return [new THREE.Vector3(x, y, z), n, c];
      };
      for (let j = tj; j < Math.min(nx - 1, tj + T); j++) for (let i = ti; i < Math.min(nx - 1, ti + T); i++) {
        const a = vert(i, j), b = vert(i + 1, j), c = vert(i, j + 1), d = vert(i + 1, j + 1);
        for (const v of [a, c, d, a, d, b]) t.push(v[0], v[1], G.tile, v[2]);
      }
      floor.parts.push({ geo: t.geometry(), mat: G.material });
    }
  }
  // pinturas no chão
  for (const d of def.decals) {
    const t = new Tris();
    const c = col(d.color ?? '#ffffff');
    const up = new THREE.Vector3(0, 1, 0);
    const seg = 40;
    const r0 = d.kind === 'disc' ? 0 : d.r0, r1 = d.kind === 'disc' ? d.r : d.r1;
    const P = (a: number, r: number): THREE.Vector3 => { const x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r; return new THREE.Vector3(x, supportY(x, z) + 0.035, z); };
    for (let s = 0; s < seg; s++) {
      const a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2;
      if (r0 === 0) { for (const p of [P(0, 0), P(a1, r1), P(a0, r1)]) t.push(p, up, d.tile, c); } else {
        const p = [P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r1)];
        for (const k of [0, 2, 1, 0, 3, 2]) t.push(p[k]!, up, d.tile, c);
      }
    }
    floor.parts.push({ geo: t.geometry(), mat: d.mat });
  }

  /* ---------- colisores e visuais estáticos ---------- */
  const boxes: number[] = [];
  const cylinders: number[] = [];
  const ramps: RampData[] = [];
  const platforms: ArenaPlatform[] = [];
  const animatedProps: AnimatedPropData[] = [];
  const props = new Model();
  const plats = new Model();
  let propCount = 0;

  for (const w of def.walls) {
    const n = w.pts.length;
    for (let s = 0; s < (w.closed ? n : n - 1); s++) {
      const a = w.pts[s]!, b = w.pts[(s + 1) % n]!;
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      const gy = w.y ?? hAt(mx, mz);
      const bottom = gy - 1.5, top = gy + w.height;
      boxes.push(r2(mx), r2((bottom + top) / 2), r2(mz), r2(w.thick / 2), r2((top - bottom) / 2), r2(len / 2 + w.thick / 2), Math.round(Math.atan2(dx, dz) * 1e4) / 1e4);
      if (w.style === 'balustrade') {
        const pieces = Math.max(1, Math.round(len / 5.5));
        const pl = len / pieces;
        const ang = Math.atan2(-dz, dx);
        for (let k = 0; k < pieces; k++) {
          const t = (k + 0.5) / pieces;
          const x = a[0] + dx * t, z = a[1] + dz * t;
          props.addModel(balaustrada(pl, k % 2 === 0), { p: [x, hAt(x, z), z], r: [0, ang, 0] });
        }
      }
    }
  }

  for (const p of def.platforms) {
    const gy = hAt(p.x, p.z);
    const bottom = Math.min(gy, p.height) - 1;
    boxes.push(r2(p.x), r2((bottom + p.height) / 2), r2(p.z), p.hx, r2((p.height - bottom) / 2), p.hz, p.rotY);
    plats.add(uvBox(xf(box(p.hx * 2, p.height - bottom - 0.12, p.hz * 2), { p: [p.x, bottom + (p.height - bottom - 0.12) / 2, p.z], r: [0, p.rotY, 0] }), p.tile), p.side, '#ffffff');
    plats.add(uvBox(xf(box(p.hx * 2 + 0.3, 0.12, p.hz * 2 + 0.3), { p: [p.x, p.height - 0.06, p.z], r: [0, p.rotY, 0] }), p.tile), p.top, '#ffffff');
    const plat: ArenaPlatform = { x: p.x, z: p.z, y: p.height, hx: p.hx, hz: p.hz, rotY: p.rotY, entries: [] };
    for (const side of p.ramps) {
      const dirs: Record<Side, [number, number]> = { n: [0, 1], s: [0, -1], e: [1, 0], w: [-1, 0] };
      const [sx, sz] = dirs[side];
      const half = sx !== 0 ? p.hx : p.hz;
      const L = p.rampLength;
      // a rampa fica do lado de fora e sobe em direção à plataforma
      const [ox, oz] = rot(sx * (half + L / 2), sz * (half + L / 2), p.rotY);
      const rx = p.x + ox, rz = p.z + oz;
      const [ux, uz] = rot(-sx, -sz, p.rotY);
      const heading = Math.atan2(ux, uz);
      const gy2 = hAt(rx, rz);
      ramps.push({ index: 0, pos: v3(rx, gy2, rz), heading: Math.round(heading * 1e4) / 1e4, width: p.rampWidth, length: L, height: r2(p.height - gy2) });
      plat.entries.push({ foot: v3(rx - ux * L / 2, gy2, rz - uz * L / 2), top: v3(rx + ux * (L / 2 + 2.5), p.height, rz + uz * (L / 2 + 2.5)) });
    }
    platforms.push(plat);
  }

  for (const sp of def.props) {
    const prop = lib[sp.id];
    if (!prop) throw new Error(`[${def.id}] objeto de cenário desconhecido: ${sp.id}`);
    const s = sp.scale ?? 1;
    const y = supportY(sp.x, sp.z) + (sp.dy ?? 0);
    const rotY = sp.rotY === 'center' ? Math.atan2(cx - sp.x, cz - sp.z) : sp.rotY ?? rand() * Math.PI * 2;
    props.addModel(prop.build(rng(Math.floor(rand() * 1e9))), matrixOf({ p: [sp.x, y, sp.z], r: [0, rotY, 0], s }));
    propCount++;
    if (prop.collider && sp.collide !== false) cylinders.push(r2(sp.x), r2(y), r2(sp.z), r2(prop.collider.radius * s), r2(prop.collider.height * s));
    if (prop.animated) {
      if (!existsSync(path.join(ASSETS_DIR, 'props', `${sp.id}.glb`))) throw new Error(`[${def.id}] parte animada ausente: props/${sp.id}.glb (gere as pistas antes)`);
      const pv = new THREE.Vector3(...prop.animated.pivot).multiplyScalar(s).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      animatedProps.push({ model: sp.id, pos: v3(sp.x + pv.x, y + pv.y, sp.z + pv.z), rotY: r2(rotY), scale: s, motion: prop.animated.motion });
    }
  }
  for (const c of def.custom) {
    const s = c.scale ?? 1, rotY = c.rotY ?? 0;
    const y = supportY(c.x, c.z) + (c.dy ?? 0);
    props.addModel(c.build(rng(Math.floor(rand() * 1e9))), matrixOf({ p: [c.x, y, c.z], r: [0, rotY, 0], s }));
    propCount++;
    for (const [dx, dz, r, h] of c.colliders ?? []) {
      const [ox, oz] = rot(dx * s, dz * s, rotY);
      cylinders.push(r2(c.x + ox), r2(y), r2(c.z + oz), r2(r * s), r2(h * s));
    }
  }

  /* ---------- pontos de jogo ---------- */
  const boostPads = def.boostPads.map(([x, z, h]) => ({ pos: v3(x, supportY(x, z) + 0.03, z), heading: Math.round(h * 1e4) / 1e4 }));
  const itemBoxes = def.itemBoxes.map(([x, z]) => v3(x, supportY(x, z), z));
  const spawns = Array.from({ length: 8 }, (_, k) => {
    const a = ((k + 0.5) / 8) * Math.PI * 2;
    const x = cx + Math.sin(a) * def.spawnRadius, z = cz + Math.cos(a) * def.spawnRadius;
    return { pos: v3(x, supportY(x, z), z), heading: Math.round(Math.atan2(cx - x, cz - z) * 1e4) / 1e4 };
  });
  const crownSpawns = def.crownSpawns.map(([x, z]) => v3(x, supportY(x, z), z));

  const blocked = (x: number, z: number, m: number): boolean => {
    for (let i = 0; i < cylinders.length; i += 5) if (Math.hypot(x - cylinders[i]!, z - cylinders[i + 2]!) < cylinders[i + 3]! + m) return true;
    for (const w of def.walls) for (let s = 0; s < (w.closed ? w.pts.length : w.pts.length - 1); s++) {
      const a = w.pts[s]!, b = w.pts[(s + 1) % w.pts.length]!;
      const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
      if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < w.thick / 2 + m) return true;
    }
    for (const r of ramps) {
      const [lx, lz] = rot(x - r.pos[0], z - r.pos[2], -r.heading);
      if (Math.abs(lx) < r.width / 2 + m && Math.abs(lz) < r.length / 2 + m) return true;
    }
    for (const p of def.platforms) {
      // perto da borda de uma plataforma (dentro ou fora) não: o cristal ficaria na quina
      const [lx, lz] = rot(x - p.x, z - p.z, -p.rotY);
      const ex = Math.abs(lx) - p.hx, ez = Math.abs(lz) - p.hz;
      if (Math.max(ex, ez) > -m && Math.max(ex, ez) < m) return true;
    }
    for (const b of boostPads) if (Math.hypot(x - b.pos[0], z - b.pos[2]) < 4.5) return true;
    for (const b of itemBoxes) if (Math.hypot(x - b[0], z - b[2]) < 3.5) return true;
    return false;
  };
  const crystalSpawns: V3[] = [];
  const st = def.crystals.step;
  for (let gz = -def.crystals.r1; gz <= def.crystals.r1; gz += st) for (let gx = -def.crystals.r1; gx <= def.crystals.r1; gx += st) {
    const jx = (rand() - 0.5) * st * 0.5, jz = (rand() - 0.5) * st * 0.5;
    const x = cx + gx + jx, z = cz + gz + jz;
    const d = Math.hypot(x - cx, z - cz);
    if (d < def.crystals.r0 || d > def.crystals.r1 || blocked(x, z, 2.2)) continue;
    crystalSpawns.push(v3(x, supportY(x, z), z));
  }

  const rects = def.platforms.map((p) => ({ x: p.x, z: p.z, hx: p.hx, hz: p.hz, rotY: p.rotY }));
  const circles: { x: number; z: number; r: number }[] = [];
  for (let i = 0; i < cylinders.length; i += 5) if (cylinders[i + 3]! >= 0.5) circles.push({ x: cylinders[i]!, z: cylinders[i + 2]!, r: cylinders[i + 3]! });
  const xs = def.outline.map((p) => p[0]), zs = def.outline.map((p) => p[1]);

  const data: ArenaData = {
    id: def.id, center: def.center, radius: def.radius, ground, boxes, cylinders, ramps, boostPads, itemBoxes, spawns,
    crystalSpawns, crownSpawns, platforms, killY: def.killY, animatedProps, introCamera: def.intro,
    minimap: { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), outline: def.outline.flat(), rects, circles },
  };

  /* ---------- exportação ---------- */
  const b = new GlbBuilder();
  let triangles = 0;
  const node = (name: string, m: Model): void => {
    if (!m.parts.length) return;
    triangles += m.triangleCount();
    b.node(name, { mesh: b.mesh(name, m) });
  };
  node('arena_floor', floor);
  node('arena_platforms', plats);
  node('arena_props', props);
  const outDir = path.join(ASSETS_DIR, 'arenas');
  const glbBytes = await b.save(path.join(outDir, `${def.id}.glb`));
  const json = JSON.stringify(data);
  await writeFile(path.join(outDir, `${def.id}.json`), json);
  return { id: def.id, triangles: Math.round(triangles), glbBytes, jsonBytes: json.length, props: propCount, colliders: boxes.length / 7 + cylinders.length / 5 + ramps.length, crystals: crystalSpawns.length };
}
