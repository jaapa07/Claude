/**
 * Gera as arenas de batalha: public/assets/arenas/<id>.glb + <id>.json.
 * Uso: npx tsx scripts/build-arenas.ts [--only=<id>]
 * Reaproveita as bibliotecas de cenário das pistas (scripts/props) e os materiais de piso/muro das pistas.
 */
import { ARENA_DEFS } from './arenas/defs';
import { buildArena } from './arenas/build';
import { registerTrackTextures } from './tracks/textures';

const only = process.argv.slice(2).find((a) => a.startsWith('--only='))?.slice(7);

await registerTrackTextures();
const { ALL_PROPS, registerPropTextures } = await import('./props/index');
await registerPropTextures();
for (const def of ARENA_DEFS) {
  if (only && def.id !== only) continue;
  const t0 = Date.now();
  const r = await buildArena(def, ALL_PROPS);
  console.log(`${r.id}: ${r.triangles} tri, glb ${(r.glbBytes / 1024).toFixed(0)} kB, json ${(r.jsonBytes / 1024).toFixed(0)} kB, ${r.props} objetos, ${r.colliders} colisores, ${r.crystals} pontos de cristal em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
