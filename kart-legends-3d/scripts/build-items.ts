/**
 * Gera os GLBs dos itens/objetos de corrida, o manifesto e os ícones de HUD.
 * Uso: npx tsx scripts/build-items.ts   (determinístico)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ASSETS_DIR } from './lib/textures';
import { buildIcons } from './items/icons';
import * as M from './items/models';
import { registerItemMaterials, type ItemEntry } from './items/util';

await registerItemMaterials();
const builders: (() => Promise<ItemEntry>)[] = [
  M.itemBox, M.pulsoSolar, M.bolhaGuardia, M.nevoaPrisma, M.faiscaRastreadora, M.ondaVento, M.cristalSalto, M.raioCorrente, M.cometaGuia,
  M.boostPad, M.ramp, M.finishArch, () => M.trophy('gold'), () => M.trophy('silver'), () => M.trophy('bronze'), M.podium,
];
const items: ItemEntry[] = [];
for (const b of builders) {
  const e = await b();
  items.push(e);
  console.log(`${e.id.padEnd(20)} ${String(e.triangles).padStart(6)} tris ${String(e.bytes).padStart(7)} B  ${e.size.join(' × ')}  clipes: ${e.clips.map((c) => `${c.name} ${c.duration}s`).join(', ') || '—'}`);
}
const icons = await buildIcons();
const file = path.join(ASSETS_DIR, 'items', 'items-manifest.json');
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, JSON.stringify({ version: 1, items, icons }, null, 2) + '\n');
console.log(`manifesto: ${file}; ícones: ${icons.length}`);
