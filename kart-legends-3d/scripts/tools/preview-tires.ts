/**
 * Inspeção visual das rodas da loja: cada pneu sozinho (várias vistas) e montado em karts pelo helper do jogo.
 * Uso: npx tsx scripts/tools/preview-tires.ts <pasta-de-saída> [--karts=flecha,faisca,duna,broto] [--size=300]
 * Gera: tires-alone.png (linha por pneu: 3/4, frente, lado externo, interno), mounted-<kart>.png (linha por pneu)
 * e closeup-<kart>.png (roda dianteira e traseira dos dois lados).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { TireRenderer, type Cell } from '../tires/render';
import { TIRE_IDS } from '../../src/game/vehicles/tires';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--'));
if (!outDir) throw new Error('uso: preview-tires.ts <pasta-de-saída> [--karts=a,b] [--size=300]');
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const karts = String(flags.karts ?? 'flecha,faisca,duna,broto').split(',');
const size = Number(flags.size ?? 300);
const only = flags.tires ? String(flags.tires).split(',') : [...TIRE_IDS];
await mkdir(outDir, { recursive: true });

const r = await new TireRenderer().start();
const save = async (name: string, png: Buffer): Promise<void> => { const f = path.join(outDir, name); await writeFile(f, png); console.log('ok', f); };
try {
  const alone: Cell[] = [];
  for (const t of only) for (const dir of [[1, 0.42, 0.78], [0.02, 0.15, 1], [1, 0.05, 0.02], [-1, 0.3, 0.5]] as [number, number, number][]) alone.push({ tire: t, dir });
  await save('tires-alone.png', await r.grid(alone, size, 4));
  for (const k of karts) {
    const cells: Cell[] = [{ kart: k, tire: null, dir: [0.9, 0.55, 1] }, { kart: k, tire: null, dir: [-1, 0.5, -0.7] }];
    for (const t of only) cells.push({ kart: k, tire: t, dir: [0.9, 0.55, 1] }, { kart: k, tire: t, dir: [-1, 0.5, -0.7] });
    await save(`mounted-${k}.png`, await r.grid(cells, size, 4));
    const close: Cell[] = [];
    for (const t of [null, ...only]) {
      close.push({ kart: k, tire: t, focus: 'wheel_fl', dir: [1, 0.25, 0.35], zoom: 0.8 }, { kart: k, tire: t, focus: 'wheel_rr', dir: [-1, 0.25, -0.35], zoom: 0.8 });
    }
    await save(`closeup-${k}.png`, await r.grid(close, Math.round(size * 0.7), 4));
  }
} finally { await r.stop(); }
