/** Depuração: triângulos do `body` por linha do arquivo do kart. Uso: npx tsx scripts/karts/tricount.ts flecha */
import { Model } from '../lib/geo';
import { KART_DEFS } from './index';
import { registerKartMaterials } from './materials';

const id = process.argv[2] ?? 'flecha';
const perModel = new Map<Model, Map<string, number>>();
const tris = (m: Model): number => m.triangleCount();
for (const name of ['add', 'addModel'] as const) {
  const orig = Model.prototype[name] as (...a: unknown[]) => Model;
  (Model.prototype[name] as unknown) = function (this: Model, ...a: unknown[]): Model {
    const before = tris(this);
    const out = orig.apply(this, a);
    const line = (new Error().stack ?? '').split('\n').find((l) => l.includes(`/${id}.ts`))?.match(/:(\d+):\d+\)?$/)?.[1] ?? '?';
    const counts = perModel.get(this) ?? new Map<string, number>();
    perModel.set(this, counts);
    counts.set(line, (counts.get(line) ?? 0) + tris(this) - before);
    return out;
  };
}
await registerKartMaterials();
const def = KART_DEFS.find((k) => k.id === id);
if (!def) throw new Error(`kart desconhecido: ${id}`);
const parts = def.build('std');
console.log(`body ${tris(parts.body)}  roda diant. ${tris(parts.wheelFront)}  roda tras. ${tris(parts.wheelRear)}  volante ${tris(parts.steering)}`);
for (const [line, n] of [...(perModel.get(parts.body) ?? [])].sort((a, b) => b[1] - a[1]).slice(0, 28)) console.log(`  linha ${line.padStart(4)}: ${n}`);
