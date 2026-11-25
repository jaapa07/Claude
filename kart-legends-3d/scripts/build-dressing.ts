/**
 * Gera a decoração extra (modelos CC0 de kits/*.glb) de cada pista e arena: tracks/<id>.dress.json e
 * arenas/<id>.dress.json. Reconstrói cada pista numa pasta temporária só para ler o traçado, o terreno e o
 * cenário já colocado — os arquivos da pista em public/assets não são tocados (e o script confere que a
 * reconstrução bate byte a byte com eles, ou seja, que a decoração foi pensada sobre a pista publicada).
 * Uso: npx tsx scripts/build-dressing.ts [--only=<id>]
 */
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ARENA_DEFS } from './arenas/defs';
import { ARENA_DRESSING, TRACK_DRESSING, dressArena, dressTrack, type DressData } from './kits/dressing';
import { createIO } from './lib/glb';
import { ASSETS_DIR } from './lib/textures';
import { buildTrack, type TrackContext } from './tracks/build';
import { TRACK_DEFS } from './tracks/defs';
import { registerTrackTextures } from './tracks/textures';

const only = process.argv.slice(2).find((a) => a.startsWith('--only='))?.slice(7);

/** Triângulos de cada modelo dos kits (para o relatório de custo por camada). */
const TRIS = new Map<string, number>();
{
  const io = await createIO();
  for (const kit of ['kenney-scenery', 'quaternius-nature']) {
    const doc = await io.read(path.join(ASSETS_DIR, 'kits', `${kit}.glb`));
    for (const node of doc.getRoot().listNodes()) {
      let t = 0;
      for (const p of node.getMesh()?.listPrimitives() ?? []) t += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3;
      TRIS.set(`${kit.split('-')[0]}:${node.getName()}`, t);
    }
  }
}
/** Objetos e triângulos acumulados por qualidade (Baixa = camada 0, Média = 0–1, Alta = 0–2). */
const tierCount = (d: DressData): string => [0, 1, 2].map((t) => {
  let n = 0, tris = 0;
  for (let k = 0; k < d.items.length; k += 8) if (d.items[k + 6]! <= t) { n++; tris += (TRIS.get(d.models[d.items[k]!]!) ?? 0) * 1; }
  return `${['Baixa', 'Média', 'Alta'][t]} ${n} obj/${(tris / 1000).toFixed(1)}k tri`;
}).join(', ');

await registerTrackTextures();
const { ALL_PROPS, registerPropTextures } = await import('./props/index');
await registerPropTextures();
const tmp = await mkdtemp(path.join(os.tmpdir(), 'kl3d-dress-'));
try {
  for (const def of TRACK_DEFS) {
    if (only && def.id !== only) continue;
    const out = path.join(ASSETS_DIR, 'tracks', `${def.id}.dress.json`);
    const rules = TRACK_DRESSING[def.id];
    if (!rules) { if (existsSync(out)) await rm(out); continue; }
    let ctx: TrackContext | null = null;
    await buildTrack(def, { props: ALL_PROPS, outDir: tmp, keepExistingAnimated: true, onContext: (c) => { ctx = c; } });
    for (const ext of ['glb', 'json']) {
      const a = await readFile(path.join(tmp, `${def.id}.${ext}`)), b = await readFile(path.join(ASSETS_DIR, 'tracks', `${def.id}.${ext}`));
      if (!a.equals(b)) console.warn(`  aviso: ${def.id}.${ext} reconstruído difere do publicado (rode build-tracks antes)`);
    }
    const { data, skipped } = dressTrack(ctx!, rules, def.seed + 9001);
    await writeFile(out, JSON.stringify(data));
    console.log(`${def.id}: ${data.items.length / 8} objetos (${tierCount(data)}), ${skipped} posições recusadas`);
  }
  for (const def of ARENA_DEFS) {
    if (only && def.id !== only) continue;
    const occupied = def.props.map((p) => ({ x: p.x, z: p.z, r: (ALL_PROPS[p.id]?.radius ?? 2) * (p.scale ?? 1) }));
    const data = dressArena(ARENA_DRESSING[def.id], def.seed + 9001, (x, z) => def.ground.height(x, z), occupied);
    await writeFile(path.join(ASSETS_DIR, 'arenas', `${def.id}.dress.json`), JSON.stringify(data));
    console.log(`${def.id}: ${data.items.length / 8} objetos (${tierCount(data)})`);
  }
} finally {
  await rm(tmp, { recursive: true, force: true });
}
