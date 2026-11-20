/**
 * Gera os GLBs dos karts e o manifesto. Uso: npx tsx scripts/build-karts.ts [id ...]
 * Determinístico: sem aleatoriedade não semeada e sem carimbo de data.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ASSETS_DIR } from './lib/textures';
import { exportKart, type KartEntry } from './karts/assemble';
import { KART_DEFS } from './karts/index';
import { plateMaterial, registerKartMaterials } from './karts/materials';

const only = process.argv.slice(2);
await registerKartMaterials();
const manifestFile = path.join(ASSETS_DIR, 'karts', 'karts-manifest.json');
await mkdir(path.dirname(manifestFile), { recursive: true });
let previous: KartEntry[] = [];
try { previous = (JSON.parse(await readFile(manifestFile, 'utf8')) as { karts: KartEntry[] }).karts; } catch { /* primeiro build */ }

const karts: KartEntry[] = [];
for (const def of KART_DEFS) {
  if (only.length && !only.includes(def.id)) {
    const old = previous.find((k) => k.id === def.id);
    if (old) karts.push(old);
    continue;
  }
  const plate = await plateMaterial(def.id, def.num, def.plate);
  const parts = def.build(plate);
  const entry = await exportKart(def.id, parts);
  karts.push(entry);
  console.log(`${def.id.padEnd(11)} ${String(entry.triangles).padStart(6)} tris ${String(entry.bytes).padStart(7)} B  rodas ${entry.wheelRadiusFront}/${entry.wheelRadiusRear}  minY corpo ${entry.minBodyY}  tamanho ${entry.size.join(' × ')}`);
}
await writeFile(manifestFile, JSON.stringify({ version: 1, karts }, null, 2) + '\n');
console.log(`manifesto: ${manifestFile}`);
