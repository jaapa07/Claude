#!/usr/bin/env node
// For hosts that only serve "web" file types: rewrite every .glb in a build folder as an embedded glTF JSON
// file (<name>.glb.json, buffers/images as base64 data URIs). Build with VITE_JSON_MODELS=1 so the game loads them.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const dir = process.argv[2] || 'dist';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const mime = (u) => (u.endsWith('.png') ? 'image/png' : u.endsWith('.webp') ? 'image/webp' : u.endsWith('.jpg') || u.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream');
for (const f of walk(dir).filter((x) => x.endsWith('.glb'))) {
  const doc = await io.read(f);
  const { json, resources } = await io.writeJSON(doc);
  const embed = (o) => { if (o.uri && resources[o.uri]) o.uri = `data:${mime(o.uri)};base64,${Buffer.from(resources[o.uri]).toString('base64')}`; };
  (json.buffers || []).forEach(embed);
  (json.images || []).forEach(embed);
  writeFileSync(f + '.json', JSON.stringify(json));
  rmSync(f);
  console.log(f, '->', (statSync(f + '.json').size / 1e6).toFixed(2), 'MB');
}
