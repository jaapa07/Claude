/**
 * Gera as rodas da loja (pneu + aro) que servem em qualquer kart: public/assets/tires/<id>.glb,
 * o manifesto tires/tires-manifest.json e os ícones ui/tires/<id>.webp (256×256, fundo transparente, vista 3/4).
 * Contrato: um nó de malha `tire`, lado esquerdo (face externa em +X), eixo X, raio 1, largura 1 — ver
 * src/game/vehicles/tires.ts. Uso: npx tsx scripts/build-tires.ts [--no-icons]   (determinístico)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { GlbBuilder } from './lib/glb';
import { ASSETS_DIR } from './lib/textures';
import { registerKartMaterials } from './karts/materials';
import { TIRE_DEFS, buildTire, registerTireMaterials } from './tires/models';
import { TireRenderer } from './tires/render';
import { TIRE_IDS } from '../src/game/vehicles/tires';

interface TireEntry { id: string; name: string; file: string; icon: string; triangles: number; bytes: number }

if (TIRE_DEFS.map((d) => d.id).join() !== TIRE_IDS.join()) throw new Error('TIRE_DEFS e TIRE_IDS (src/game/vehicles/tires.ts) divergem');
await registerKartMaterials();
registerTireMaterials();
const tires: TireEntry[] = [];
for (const def of TIRE_DEFS) {
  const model = buildTire(def);
  const b = model.bounds();
  const triangles = Math.round(model.triangleCount());
  if (triangles > 1600) throw new Error(`${def.id}: ${triangles} triângulos (orçamento ~1.500)`);
  const g = new GlbBuilder();
  g.node('tire', { mesh: g.mesh('tire', model) });
  const file = `tires/${def.id}.glb`;
  const bytes = await g.save(path.join(ASSETS_DIR, file));
  tires.push({ id: def.id, name: def.name, file, icon: `ui/tires/${def.id}.webp`, triangles, bytes });
  const f = (n: number): string => n.toFixed(3);
  console.log(`${def.id.padEnd(8)} ${String(triangles).padStart(5)} tris ${String(bytes).padStart(6)} B  x ${f(b.min.x)}..${f(b.max.x)}  y ${f(b.min.y)}..${f(b.max.y)}  z ${f(b.min.z)}..${f(b.max.z)}`);
}
const manifest = path.join(ASSETS_DIR, 'tires', 'tires-manifest.json');
await writeFile(manifest, JSON.stringify({ version: 1, contract: 'nó "tire"; lado esquerdo (face externa +X); eixo X; raio 1; largura 1', tires }, null, 2) + '\n');
console.log(`manifesto: ${manifest}`);

if (!process.argv.includes('--no-icons')) {
  const r = await new TireRenderer().start();
  try {
    for (const t of tires) {
      const png = await r.grid([{ tire: t.id, dir: [1, 0.42, 0.78], zoom: 1.12 }], 512, 1, null);
      const out = path.join(ASSETS_DIR, t.icon);
      await mkdir(path.dirname(out), { recursive: true });
      await sharp(png).resize(256, 256).webp({ quality: 88, alphaQuality: 95 }).toFile(out);
    }
    console.log(`ícones: ${tires.length}`);
  } finally { await r.stop(); }
}
