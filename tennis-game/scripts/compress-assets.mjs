#!/usr/bin/env node
// Final size pass (mobile-friendly): meshopt geometry/animation compression for every .glb,
// and tone-mapped JPEG panoramas from the HDRIs (lighter than .hdr and a standard web image type).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { meshopt, resample, prune, dedup, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { execSync } from 'node:child_process';
import { readdirSync, statSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const OUT = join(process.cwd(), 'public', 'assets');
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

// Character meshes keep plain float attributes: the outfit shader reads bind-pose positions in metres.
const KEEP = /(athlete_|crowd_|hair_)/;
for (const f of walk(join(OUT, 'models')).filter((f) => f.endsWith('.glb') && !KEEP.test(f))) {
  const before = statSync(f).size;
  const doc = await io.read(f);
  if (doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === EXTMeshoptCompression.EXTENSION_NAME)) continue;
  const big = /props\//.test(f) && before > 600_000;
  if (big) await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [256, 256], quality: 75 }));
  await doc.transform(dedup(), prune({ keepLeaves: true }), resample(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(f, doc);
  console.log(f.replace(OUT, ''), (before / 1e6).toFixed(2), '->', (statSync(f).size / 1e6).toFixed(2), 'MB');
}

// HDR -> 2048x1024 sRGB JPEG (tone-mapped)
const hdrDir = join(OUT, 'hdri');
if (existsSync(hdrDir)) {
  mkdirSync(join(OUT, 'sky'), { recursive: true });
  for (const f of readdirSync(hdrDir).filter((x) => x.endsWith('.hdr'))) {
    const out = join(OUT, 'sky', f.replace('.hdr', '.jpg'));
    execSync(`ffmpeg -v error -y -i "${join(hdrDir, f)}" -vf "scale=2048:1024" -q:v 3 "${out}"`, { stdio: 'inherit', shell: '/bin/bash' });
    console.log('sky', out.replace(OUT, ''), (statSync(out).size / 1e6).toFixed(2), 'MB');
  }
  rmSync(hdrDir, { recursive: true, force: true }); // the game only ships the JPEG panoramas
}
