#!/usr/bin/env node
// For sandboxed hosts that only serve "web" file types and block WebAssembly / data: / blob: loading:
// every .glb in a build folder becomes
//   <name>.glb.json   { gltf: <glTF JSON, no meshopt>, bin: <base64 of the single binary buffer> }
//   <name>.glb.<n>.png|webp|jpg   its textures as plain image files (loaded same-origin)
// The game (built with VITE_JSON_MODELS=1) rebuilds a GLB in memory and parses it.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { unpartition } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const dir = process.argv[2] || 'dist';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
for (const f of walk(dir).filter((x) => x.endsWith('.glb'))) {
  const doc = await io.read(f); // meshopt is decoded on read
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === EXTMeshoptCompression.EXTENSION_NAME) ext.dispose();
  await doc.transform(unpartition());
  const tex = doc.getRoot().listTextures();
  tex.forEach((t, i) => {
    const ext = t.getMimeType() === 'image/webp' ? 'webp' : t.getMimeType() === 'image/jpeg' ? 'jpg' : 'png';
    const name = `${basename(f)}.${i}.${ext}`;
    writeFileSync(join(f, '..', name), t.getImage());
    t.setURI(name);
  });
  doc.getRoot().listBuffers()[0]?.setURI('model.bin');
  const { json, resources } = await io.writeJSON(doc, { format: 'gltf' });
  const bin = resources['model.bin'];
  if (json.buffers?.[0]) delete json.buffers[0].uri;
  for (const img of json.images || []) delete img.bufferView;
  writeFileSync(f + '.json', JSON.stringify({ gltf: json, bin: bin ? Buffer.from(bin).toString('base64') : '' }));
  rmSync(f);
  console.log(f, '->', (statSync(f + '.json').size / 1e6).toFixed(2), 'MB +', tex.length, 'images');
}
