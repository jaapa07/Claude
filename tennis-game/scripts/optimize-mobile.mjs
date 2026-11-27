// Budget pass over the shipped models (idempotent): phones kill the page when GPU memory or triangle counts run high.
//  - character textures 2048 -> 1024 (the game camera never shows more detail)
//  - heavy decorative props simplified to a few thousand triangles
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, dedup, prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const dir = 'public/assets/models/';

const tris = (doc) => { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) t += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3; return Math.round(t); };

for (const f of ['athlete_m.glb', 'athlete_f.glb']) {
  const doc = await io.read(dir + f);
  const big = doc.getRoot().listTextures().some((t) => (t.getSize()?.[0] ?? 0) > 1024);
  if (!big) { console.log(f, 'textures already <= 1024'); continue; }
  await doc.transform(textureCompress({ encoder: sharp, resize: [1024, 1024] }));
  await io.write(dir + f, doc);
  console.log(f, 'textures ->', doc.getRoot().listTextures().map((t) => t.getSize()?.join('x')).join(','));
}

const PROPS = { 'props/potted_plant_01.glb': 6000, 'props/shrub_01.glb': 6000, 'props/flood_lights.glb': 8000, 'props/plastic_crate_01.glb': 3000 };
for (const [f, target] of Object.entries(PROPS)) {
  const doc = await io.read(dir + f);
  const before = tris(doc);
  if (before <= target * 1.2) { console.log(f, 'already', before); continue; }
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: target / before, error: 0.02 }), dedup(), prune());
  await io.write(dir + f, doc);
  console.log(f, before, '->', tris(doc));
}
