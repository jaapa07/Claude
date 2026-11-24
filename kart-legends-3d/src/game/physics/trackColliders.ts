import type RAPIER from '@dimforge/rapier3d-compat';
import type { RuntimePath, TrackRuntime } from '@/game/tracks/trackRuntime';

export type Rapier = typeof RAPIER;

/** Grupos de colisão: (pertence << 16) | colide-com. */
export const GROUP_STATIC = 0x0001;
export const GROUP_KART = 0x0002;
export const GROUP_OBSTACLE = 0x0004;
export const groups = (member: number, filter: number): number => ((member << 16) | filter) >>> 0;
export const STATIC_GROUPS = groups(GROUP_STATIC, GROUP_KART);
/** Filtro de raio: acerta apenas o cenário estático. */
export const RAY_GROUPS = groups(0xffff, GROUP_STATIC);

const ROAD_MARGIN = 1.5;

function ribbon(path: RuntimePath, verts: number[], idx: number[]): void {
  const base = verts.length / 3;
  for (let i = 0; i < path.n; i++) {
    const k = i * 3;
    const w = path.halfWidth[i]! + ROAD_MARGIN;
    for (const s of [1, -1]) {
      verts.push(path.pos[k]! + path.side[k]! * w * s, path.pos[k + 1]! + path.side[k + 1]! * w * s, path.pos[k + 2]! + path.side[k + 2]! * w * s);
    }
  }
  const last = path.closed ? path.n : path.n - 1;
  for (let i = 0; i < last; i++) {
    if (path.gap[i]) continue;
    const j = (i + 1) % path.n;
    const a = base + i * 2, b = a + 1, c = base + j * 2 + 1, d = base + j * 2;
    idx.push(a, b, c, a, c, d);
  }
}

/** Cria todos os colisores estáticos da pista (leito, terreno, muros, rampas e cenário). */
export function createTrackColliders(R: Rapier, world: RAPIER.World, track: TrackRuntime): void {
  const data = track.data;
  const add = (desc: RAPIER.ColliderDesc): void => {
    world.createCollider(desc.setCollisionGroups(STATIC_GROUPS).setFriction(0).setRestitution(0.1));
  };
  const flags = R.TriMeshFlags.FIX_INTERNAL_EDGES;

  // leito da pista e atalhos
  {
    const verts: number[] = [], idx: number[] = [];
    ribbon(track.main, verts, idx);
    for (const sc of track.shortcuts) ribbon(sc.path, verts, idx);
    add(R.ColliderDesc.trimesh(new Float32Array(verts), new Uint32Array(idx), flags));
  }

  // terreno
  const heights = track.terrainHeights();
  if (heights && data.terrain) {
    const { nx, nz, cell, minX, minZ } = data.terrain;
    const verts = new Float32Array(nx * nz * 3);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 3;
      verts[k] = minX + i * cell; verts[k + 1] = heights[j * nx + i]!; verts[k + 2] = minZ + j * cell;
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
    let q = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, e = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = e; idx[q++] = a; idx[q++] = e; idx[q++] = b;
    }
    add(R.ColliderDesc.trimesh(verts, idx, flags));
  }

  // muros
  {
    const verts: number[] = [], idx: number[] = [];
    const m = track.main;
    const H = data.wallHeight + 1.6;
    for (const [bit, sgn] of [[1, 1], [2, -1]] as const) {
      for (let i = 0; i < m.n; i++) {
        if (!(data.wall[i]! & bit)) continue;
        const j = (i + 1) % m.n;
        const base = verts.length / 3;
        for (const s of [i, j]) {
          const k = s * 3;
          const w = (m.halfWidth[s]! + 0.55) * sgn;
          const x = m.pos[k]! + m.side[k]! * w, y = m.pos[k + 1]! + m.side[k + 1]! * w, z = m.pos[k + 2]! + m.side[k + 2]! * w;
          verts.push(x, y - 0.6, z, x, y + H, z);
        }
        idx.push(base, base + 1, base + 3, base, base + 3, base + 2);
      }
      // Começo de muro depois de trecho aberto: guia inclinada (invisível) que abre 5 m para fora em 4 amostras,
      // para quem vem pela borda ser desviado para dentro em vez de passar por trás do muro.
      for (let i = 0; i < m.n; i++) {
        const prev = (i - 1 + m.n) % m.n;
        if (!(data.wall[i]! & bit) || (data.wall[prev]! & bit)) continue;
        const LEAD = 4;
        for (let t = 0; t < LEAD; t++) {
          const a = (i - LEAD + t + m.n) % m.n, b = (i - LEAD + t + 1 + m.n) % m.n;
          const base = verts.length / 3;
          for (const [s2, f] of [[a, (LEAD - t) / LEAD], [b, (LEAD - t - 1) / LEAD]] as const) {
            const k = s2 * 3;
            const w = (m.halfWidth[s2]! + 0.55 + 5 * f) * sgn;
            const x = m.pos[k]! + m.side[k]! * w, y = m.pos[k + 1]! + m.side[k + 1]! * w, z = m.pos[k + 2]! + m.side[k + 2]! * w;
            verts.push(x, y - 0.6, z, x, y + H, z);
          }
          idx.push(base, base + 1, base + 3, base, base + 3, base + 2);
        }
      }
    }
    if (idx.length) add(R.ColliderDesc.trimesh(new Float32Array(verts), new Uint32Array(idx)));
  }

  // rampas (cunhas)
  for (const r of data.ramps) {
    const sin = Math.sin(r.heading), cos = Math.cos(r.heading);
    const local = (lx: number, ly: number, lz: number): [number, number, number] =>
      [r.pos[0] + lx * cos + lz * sin, r.pos[1] + ly, r.pos[2] - lx * sin + lz * cos];
    const w = r.width / 2, l = r.length / 2;
    const pts = [local(w, -0.05, -l), local(-w, -0.05, -l), local(-w, r.height, l), local(w, r.height, l), local(-w, -0.05, l), local(w, -0.05, l)];
    const tri = [0, 1, 2, 0, 2, 3, 3, 2, 4, 3, 4, 5, 0, 3, 5, 1, 4, 2];
    add(R.ColliderDesc.trimesh(new Float32Array(pts.flat()), new Uint32Array(tri)));
  }

  // cenário (cilindros)
  const pc = data.propColliders;
  for (let i = 0; i + 4 < pc.length; i += 5) {
    const h = pc[i + 4]!;
    add(R.ColliderDesc.cylinder(h / 2, pc[i + 3]!).setTranslation(pc[i]!, pc[i + 1]! + h / 2, pc[i + 2]!));
  }
}
