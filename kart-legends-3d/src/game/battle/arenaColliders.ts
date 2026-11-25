import type RAPIER from '@dimforge/rapier3d-compat';
import { STATIC_GROUPS, type Rapier } from '@/game/physics/trackColliders';
import { decodeHeights, type ArenaData } from './arenaTypes';

/** Colisores estáticos de uma arena: chão (malha), caixas, cilindros e rampas (cunhas). */
export function createArenaColliders(R: Rapier, world: RAPIER.World, data: ArenaData): void {
  const add = (desc: RAPIER.ColliderDesc): void => {
    world.createCollider(desc.setCollisionGroups(STATIC_GROUPS).setFriction(0).setRestitution(0.1));
  };
  const flags = R.TriMeshFlags.FIX_INTERNAL_EDGES;

  // chão
  {
    const { nx, nz, cell, minX, minZ } = data.ground;
    const h = decodeHeights(data.ground);
    const verts = new Float32Array(nx * nz * 3);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 3;
      verts[k] = minX + i * cell; verts[k + 1] = h[j * nx + i]!; verts[k + 2] = minZ + j * cell;
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
    let q = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, e = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = e; idx[q++] = a; idx[q++] = e; idx[q++] = b;
    }
    add(R.ColliderDesc.trimesh(verts, idx, flags));
  }

  // caixas (muros, plataformas)
  const b = data.boxes;
  for (let i = 0; i + 6 < b.length; i += 7) {
    const a = b[i + 6]!;
    add(R.ColliderDesc.cuboid(b[i + 3]!, b[i + 4]!, b[i + 5]!)
      .setTranslation(b[i]!, b[i + 1]!, b[i + 2]!)
      .setRotation({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) }));
  }

  // cilindros (fonte, árvores, rochas, postes)
  const c = data.cylinders;
  for (let i = 0; i + 4 < c.length; i += 5) {
    const hh = c[i + 4]! / 2;
    add(R.ColliderDesc.cylinder(hh, c[i + 3]!).setTranslation(c[i]!, c[i + 1]! + hh, c[i + 2]!));
  }

  // rampas (cunhas, iguais às das pistas)
  for (const r of data.ramps) {
    const sin = Math.sin(r.heading), cos = Math.cos(r.heading);
    const local = (lx: number, ly: number, lz: number): [number, number, number] =>
      [r.pos[0] + lx * cos + lz * sin, r.pos[1] + ly, r.pos[2] - lx * sin + lz * cos];
    const w = r.width / 2, l = r.length / 2;
    const pts = [local(w, -0.05, -l), local(-w, -0.05, -l), local(-w, r.height, l), local(w, r.height, l), local(-w, -0.05, l), local(w, -0.05, l)];
    const tri = [0, 1, 2, 0, 2, 3, 3, 2, 4, 3, 4, 5, 0, 3, 5, 1, 4, 2];
    add(R.ColliderDesc.trimesh(new Float32Array(pts.flat()), new Uint32Array(tri)));
  }
}
